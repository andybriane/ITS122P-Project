<?php
/**
 * Invoices API
 * Pineda Dental Clinic — Plain PHP Backend
 *
 * GET    /api/invoices.php             -> list all (not soft-deleted), staff only
 * GET    /api/invoices.php?id=5        -> get one with breakdown
 * GET    /api/invoices.php?appointment_id=5  -> get invoice for a specific appointment
 * POST   /api/invoices.php             -> create invoice from an appointment
 * PUT    /api/invoices.php?id=5        -> update payment method / status / is_senior_pwd
 * DELETE /api/invoices.php?id=5        -> soft-delete
 *
 * PRICING RULES (blueprint-locked):
 *   base_price     = total_estimated_price from the appointment
 *   discount_amount = base_price * 0.20  (only when is_senior_pwd = 1)
 *   tax_amount     = (base_price - discount_amount) * 0.12
 *   grand_total    = (base_price - discount_amount) + tax_amount
 *
 * SCHEMA (from actual SQL dump):
 *   invoices
 *     id, appointment_id (UNIQUE), patient_id,
 *     base_price, discount_amount, tax_amount, grand_total,
 *     is_senior_pwd, payment_method, status ('Unpaid'|'Paid'),
 *     processed_by (FK -> users.id), created_at, updated_at, deleted_at
 */

require '../config/cors.php';
require '../config/database.php';
require '../utils/auth_check.php'; // All invoice endpoints require staff auth

header('Content-Type: application/json');

function respond(bool $success, $data, string $message, int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => $success, 'data' => $data, 'message' => $message]);
    exit;
}

const VALID_PAYMENT_METHODS = ['Cash', 'Credit Card', 'GCash', 'HMO', 'Insurance'];
const DISCOUNT_RATE = 0.20;
const VAT_RATE      = 0.12;

/**
 * Calculates all pricing fields from a base price and senior/PWD flag.
 * Returns an associative array ready to spread into a SQL execute() call.
 */
function calculatePricing(float $basePrice, bool $isSeniorPwd): array {
    $discountAmount = $isSeniorPwd ? round($basePrice * DISCOUNT_RATE, 2) : 0.00;
    $discounted     = $basePrice - $discountAmount;
    $taxAmount      = round($discounted * VAT_RATE, 2);
    $grandTotal     = round($discounted + $taxAmount, 2);

    return [
        'base_price'      => $basePrice,
        'discount_amount' => $discountAmount,
        'tax_amount'      => $taxAmount,
        'grand_total'     => $grandTotal,
    ];
}

/**
 * Fetches one invoice row joined with patient + appointment basics.
 */
function fetchInvoice(PDO $pdo, int $invoiceId): array|false {
    $stmt = $pdo->prepare(
        "SELECT invoices.*,
                patients.first_name, patients.last_name,
                patients.email AS patient_email, patients.phone AS patient_phone,
                appointments.appointment_date, appointments.appointment_time,
                appointments.total_estimated_price AS appointment_total
         FROM invoices
         INNER JOIN patients     ON patients.id     = invoices.patient_id
         INNER JOIN appointments ON appointments.id = invoices.appointment_id
         WHERE invoices.id = ? AND invoices.deleted_at IS NULL"
    );
    $stmt->execute([$invoiceId]);
    return $stmt->fetch();
}

$method = $_SERVER['REQUEST_METHOD'];

// ---------------------------------------------------------------
// GET
// ---------------------------------------------------------------
if ($method === 'GET') {
    // Single invoice by invoice ID
    if (isset($_GET['id'])) {
        $invoice = fetchInvoice($pdo, (int) $_GET['id']);
        if (!$invoice) {
            respond(false, null, 'Invoice not found.', 404);
        }
        respond(true, $invoice, 'Invoice retrieved.');
    }

    // Single invoice by appointment ID
    if (isset($_GET['appointment_id'])) {
        $stmt = $pdo->prepare(
            "SELECT invoices.*,
                    patients.first_name, patients.last_name,
                    patients.email AS patient_email, patients.phone AS patient_phone,
                    appointments.appointment_date, appointments.appointment_time,
                    appointments.total_estimated_price AS appointment_total
             FROM invoices
             INNER JOIN patients     ON patients.id     = invoices.patient_id
             INNER JOIN appointments ON appointments.id = invoices.appointment_id
             WHERE invoices.appointment_id = ? AND invoices.deleted_at IS NULL"
        );
        $stmt->execute([(int) $_GET['appointment_id']]);
        $invoice = $stmt->fetch();
        if (!$invoice) {
            respond(false, null, 'No invoice found for this appointment.', 404);
        }
        respond(true, $invoice, 'Invoice retrieved.');
    }

    // List all
    $stmt = $pdo->query(
        "SELECT invoices.*,
                patients.first_name, patients.last_name,
                patients.email AS patient_email,
                appointments.appointment_date, appointments.appointment_time
         FROM invoices
         INNER JOIN patients     ON patients.id     = invoices.patient_id
         INNER JOIN appointments ON appointments.id = invoices.appointment_id
         WHERE invoices.deleted_at IS NULL
         ORDER BY invoices.created_at DESC"
    );
    respond(true, $stmt->fetchAll(), 'Invoices retrieved.');
}

// ---------------------------------------------------------------
// POST — Create invoice from an existing appointment.
//
// Body:
// {
//   appointment_id: 5,
//   is_senior_pwd: false,       (optional, default false)
//   payment_method: "Cash",     (optional — can pay later)
//   status: "Unpaid"            (optional, default "Unpaid")
// }
// ---------------------------------------------------------------
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $appointmentId = isset($input['appointment_id']) ? (int) $input['appointment_id'] : null;
    $isSeniorPwd   = !empty($input['is_senior_pwd']);
    $paymentMethod = isset($input['payment_method']) ? trim($input['payment_method']) : null;
    $status        = trim($input['status'] ?? 'Unpaid');

    if (!$appointmentId) {
        respond(false, null, 'appointment_id is required.', 400);
    }

    if ($paymentMethod !== null && !in_array($paymentMethod, VALID_PAYMENT_METHODS, true)) {
        respond(false, null, 'payment_method must be one of: ' . implode(', ', VALID_PAYMENT_METHODS), 400);
    }

    if (!in_array($status, ['Unpaid', 'Paid'], true)) {
        respond(false, null, 'status must be Unpaid or Paid.', 400);
    }

    // Verify appointment exists and isn't deleted
    $apptStmt = $pdo->prepare(
        'SELECT id, patient_id, total_estimated_price FROM appointments
         WHERE id = ? AND deleted_at IS NULL'
    );
    $apptStmt->execute([$appointmentId]);
    $appointment = $apptStmt->fetch();

    if (!$appointment) {
        respond(false, null, 'Appointment not found.', 404);
    }

    // Guard: one invoice per appointment (enforced by DB UNIQUE but give a clean message)
    $dupCheck = $pdo->prepare(
        'SELECT id FROM invoices WHERE appointment_id = ? AND deleted_at IS NULL'
    );
    $dupCheck->execute([$appointmentId]);
    if ($dupCheck->fetch()) {
        respond(false, null, 'An invoice already exists for this appointment.', 409);
    }

    $basePrice = (float) $appointment['total_estimated_price'];
    $pricing   = calculatePricing($basePrice, $isSeniorPwd);

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            "INSERT INTO invoices
                (appointment_id, patient_id, base_price, discount_amount, tax_amount,
                 grand_total, is_senior_pwd, payment_method, status, processed_by,
                 created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())"
        );
        $stmt->execute([
            $appointmentId,
            $appointment['patient_id'],
            $pricing['base_price'],
            $pricing['discount_amount'],
            $pricing['tax_amount'],
            $pricing['grand_total'],
            $isSeniorPwd ? 1 : 0,
            $paymentMethod,
            $status,
            $auth_user['id'], // injected by auth_check.php
        ]);
        $invoiceId = (int) $pdo->lastInsertId();

        $pdo->commit();

        $created = fetchInvoice($pdo, $invoiceId);
        respond(true, $created, 'Invoice created.', 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        respond(false, null, 'Could not create invoice: ' . $e->getMessage(), 500);
    }
}

// ---------------------------------------------------------------
// PUT — Update payment method, status, or recalculate if
//        is_senior_pwd changes.
//
// Body (any subset):
// {
//   is_senior_pwd: true,
//   payment_method: "GCash",
//   status: "Paid"
// }
// ---------------------------------------------------------------
if ($method === 'PUT') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
    if (!$id) {
        respond(false, null, 'id is required in the query string.', 400);
    }

    $current = fetchInvoice($pdo, $id);
    if (!$current) {
        respond(false, null, 'Invoice not found.', 404);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    $isSeniorPwd   = array_key_exists('is_senior_pwd', $input)
                        ? (bool) $input['is_senior_pwd']
                        : (bool) $current['is_senior_pwd'];
    $paymentMethod = array_key_exists('payment_method', $input)
                        ? (trim($input['payment_method']) ?: null)
                        : $current['payment_method'];
    $status        = trim($input['status'] ?? $current['status']);

    if ($paymentMethod !== null && !in_array($paymentMethod, VALID_PAYMENT_METHODS, true)) {
        respond(false, null, 'payment_method must be one of: ' . implode(', ', VALID_PAYMENT_METHODS), 400);
    }

    if (!in_array($status, ['Unpaid', 'Paid'], true)) {
        respond(false, null, 'status must be Unpaid or Paid.', 400);
    }

    // Recalculate pricing only if senior/PWD status changed
    $pricing = calculatePricing((float) $current['base_price'], $isSeniorPwd);

    $pdo->prepare(
        'UPDATE invoices
         SET is_senior_pwd = ?, payment_method = ?, status = ?,
             discount_amount = ?, tax_amount = ?, grand_total = ?,
             processed_by = ?, updated_at = NOW()
         WHERE id = ?'
    )->execute([
        $isSeniorPwd ? 1 : 0,
        $paymentMethod,
        $status,
        $pricing['discount_amount'],
        $pricing['tax_amount'],
        $pricing['grand_total'],
         $auth_user['id'],
        $id,
    ]);

    respond(true, fetchInvoice($pdo, $id), 'Invoice updated.');
}

// ---------------------------------------------------------------
// DELETE — soft-delete only.
// ---------------------------------------------------------------
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
    if (!$id) {
        respond(false, null, 'id is required in the query string.', 400);
    }

    $check = $pdo->prepare('SELECT id FROM invoices WHERE id = ? AND deleted_at IS NULL');
    $check->execute([$id]);
    if (!$check->fetch()) {
        respond(false, null, 'Invoice not found.', 404);
    }

    $pdo->prepare('UPDATE invoices SET deleted_at = NOW() WHERE id = ?')->execute([$id]);

    respond(true, null, 'Invoice deleted.');
}

respond(false, null, 'Method not allowed.', 405);