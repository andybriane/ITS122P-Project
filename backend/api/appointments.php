<?php
/**
 * Appointments API
 * Pineda Dental Clinic — Plain PHP Backend
 *
 * GET    /api/appointments.php             -> list all (not soft-deleted)
 * GET    /api/appointments.php?id=5        -> get one, with its services
 * POST   /api/appointments.php             -> create (PUBLIC — used by the booking page,
 *                                             auto-registers the patient if the email is new)
 * PUT    /api/appointments.php?id=5        -> STAFF ONLY: update date/time/doctor/status
 * DELETE /api/appointments.php?id=5        -> STAFF ONLY: soft-delete
 *
 * REAL CONFIRMED SCHEMA (from the actual SQL dump):
 *
 *   appointments
 *     id, patient_id, doctor_id (nullable, FK -> users.id), appointment_date,
 *     appointment_time, end_time (nullable), duration_minutes (default 30),
 *     status ('Pending'|'Confirmed'|'In Chair'|'Completed'|'Cancelled'),
 *     source ('Online'|'Admin'), patient_notes, total_estimated_price,
 *     created_at, updated_at, deleted_at
 *
 *   appointment_service (pivot)
 *     id, appointment_id, service_id, created_at, updated_at
 *
 * Note: doctor_id points straight at users.id (the doctor's login), NOT
 * at staff_profiles.id. "No preference" bookings leave doctor_id NULL.
 *
 * Double-booking rule: two live (not soft-deleted, not Cancelled)
 * appointments cannot share the same doctor_id + appointment_date +
 * appointment_time. A "no preference" booking (doctor_id IS NULL) never
 * collides with this check on creation, since no specific doctor's slot
 * is being claimed yet.
 */

require '../config/cors.php';
require '../config/database.php';

header('Content-Type: application/json');

function respond(bool $success, $data, string $message, int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => $success, 'data' => $data, 'message' => $message]);
    exit;
}

const VALID_STATUSES = ['Pending', 'Confirmed', 'In Chair', 'Completed', 'Cancelled'];

/**
 * Returns true if the given date/time/duration overlaps any other live
 * appointment ON THE SAME DATE — clinic-wide, since the clinic only has
 * one chair, regardless of which doctor (or "no preference") is booked.
 * $excludeId lets an UPDATE check against everyone else's slot without
 * tripping on itself.
 *
 * Overlap rule: two ranges [startA, endA) and [startB, endB) overlap
 * whenever startA < endB AND endA > startB.
 */
function isSlotTaken(PDO $pdo, string $date, string $startTime, string $endTime, ?int $excludeId = null): bool {
    $sql = "SELECT COUNT(*) FROM appointments
            WHERE appointment_date = ?
              AND deleted_at IS NULL AND status != 'Cancelled'
              AND appointment_time < ?
              AND COALESCE(end_time, ADDTIME(appointment_time, '00:30:00')) > ?";
    $params = [$date, $endTime, $startTime];

    if ($excludeId !== null) {
        $sql .= ' AND id != ?';
        $params[] = $excludeId;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int) $stmt->fetchColumn() > 0;
}

function fetchServicesForAppointment(PDO $pdo, int $appointmentId): array {
    $stmt = $pdo->prepare(
        'SELECT services.id, services.name, services.category, services.price
         FROM appointment_service
         INNER JOIN services ON services.id = appointment_service.service_id
         WHERE appointment_service.appointment_id = ?'
    );
    $stmt->execute([$appointmentId]);
    return $stmt->fetchAll();
}

/**
 * Sums the price of the given service IDs, validating each one actually
 * exists and isn't soft-deleted. Throws if any ID is invalid, so the
 * caller's transaction can roll back cleanly instead of silently saving
 * a wrong total.
 */
function calculateTotalPrice(PDO $pdo, array $serviceIds): float {
    $total = 0.0;
    $stmt = $pdo->prepare('SELECT price FROM services WHERE id = ? AND deleted_at IS NULL');
    foreach ($serviceIds as $serviceId) {
        $stmt->execute([(int) $serviceId]);
        $price = $stmt->fetchColumn();
        if ($price === false) {
            throw new RuntimeException("Service ID {$serviceId} does not exist.");
        }
        $total += (float) $price;
    }
    return $total;
}

/**
 * Confirms a user ID actually belongs to a doctor. Prevents accidentally
 * (or maliciously) booking an appointment against an admin/staff login.
 */
function isValidDoctor(PDO $pdo, int $doctorId): bool {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE id = ? AND role = 'doctor' AND deleted_at IS NULL");
    $stmt->execute([$doctorId]);
    return (int) $stmt->fetchColumn() > 0;
}

/**
 * Non-fatal version of the auth_check.php lookup: returns the
 * authenticated user's id/role if a valid Bearer token is present,
 * or null if there's no token / it's invalid / expired. Unlike
 * auth_check.php, this never exits the request — the public booking
 * page is allowed to have no token at all.
 */
function tryGetAuthUser(PDO $pdo): ?array {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = null;
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'authorization') {
            $authHeader = $value;
            break;
        }
    }

    if (!$authHeader || !preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        return null;
    }

    $token = trim($matches[1]);
    if ($token === '') {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT auth_tokens.user_id, auth_tokens.expires_at, users.role
         FROM auth_tokens
         INNER JOIN users ON users.id = auth_tokens.user_id
         WHERE auth_tokens.token = ?'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    if (!$row || strtotime($row['expires_at']) < time()) {
        return null;
    }

    return ['id' => (int) $row['user_id'], 'role' => $row['role']];
}

$method = $_SERVER['REQUEST_METHOD'];

// ---------------------------------------------------------------
// GET — staff only.
// ---------------------------------------------------------------
if ($method === 'GET') {
    require '../utils/auth_check.php';

    if (isset($_GET['id'])) {
 $stmt = $pdo->prepare(
            "SELECT appointments.*, patients.first_name, patients.last_name,
                    patients.email, patients.phone
             FROM appointments
             INNER JOIN patients ON patients.id = appointments.patient_id
             WHERE appointments.id = ? AND appointments.deleted_at IS NULL"
        );
        $stmt->execute([$_GET['id']]);
        $appointment = $stmt->fetch();

        if (!$appointment) {
            respond(false, null, 'Appointment not found.', 404);
        }

        $appointment['services'] = fetchServicesForAppointment($pdo, (int) $appointment['id']);
        respond(true, $appointment, 'Appointment retrieved.');
    }

$stmt = $pdo->query(
        "SELECT appointments.*, patients.first_name, patients.last_name,
                patients.email, patients.phone,
                CASE WHEN inv.id IS NOT NULL THEN 1 ELSE 0 END AS has_invoice,
                COALESCE((
                    SELECT JSON_ARRAYAGG(JSON_OBJECT('id', s.id, 'name', s.name, 'category', s.category, 'price', s.price))
                    FROM appointment_service aps
                    INNER JOIN services s ON s.id = aps.service_id
                    WHERE aps.appointment_id = appointments.id
                ), JSON_ARRAY()) AS services_json
         FROM appointments
         INNER JOIN patients ON patients.id = appointments.patient_id
         LEFT JOIN invoices inv ON inv.appointment_id = appointments.id AND inv.deleted_at IS NULL
         WHERE appointments.deleted_at IS NULL
         ORDER BY appointments.appointment_date, appointments.appointment_time"
    );
    $appointments = $stmt->fetchAll();
    foreach ($appointments as &$appt) {
        $appt['services'] = json_decode($appt['services_json'], true);
        unset($appt['services_json']);
    }
    unset($appt);
    respond(true, $appointments, 'Appointments retrieved.');
}

// ---------------------------------------------------------------
// POST — PUBLIC (source='Online') when hit with no auth token, or used
// by staff (source='Admin') when called with a valid Bearer token. We
// can't require auth up front since the public booking page has none.
//
// Body shape:
// {
//   first_name, last_name, email, phone,   <- patient identity
//   doctor_id (nullable),                   <- "no preference" = null
//   date, time,                              <- 'YYYY-MM-DD', 'HH:MM'
//   service_ids: [1, 2, ...],                <- at least one
//   notes (optional),
//   duration_minutes (optional, default 30)
// }
// ---------------------------------------------------------------
if ($method === 'POST') {
    // A valid Bearer token means a staff member is creating this booking
    // from the dashboard (source='Admin'). No token, or an invalid one,
    // means it's the public booking page (source='Online') — we don't
    // hard-reject a bad token here since an anonymous visitor legitimately
    // has none at all.
    $maybeStaff = tryGetAuthUser($pdo);
    $source = $maybeStaff ? 'Admin' : 'Online';

    $input = json_decode(file_get_contents('php://input'), true);

    $firstName = trim($input['first_name'] ?? '');
    $lastName = trim($input['last_name'] ?? '');
    $email = trim($input['email'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $doctorId = isset($input['doctor_id']) && $input['doctor_id'] !== '' ? (int) $input['doctor_id'] : null;
    $date = trim($input['date'] ?? '');
    $time = trim($input['time'] ?? '');
    $serviceIds = $input['service_ids'] ?? [];
    $notes = trim($input['notes'] ?? '');
    $durationMinutes = isset($input['duration_minutes']) ? (int) $input['duration_minutes'] : 30;

    if ($firstName === '' || $lastName === '' || $email === '' || $phone === '' || $date === '' || $time === '') {
        respond(false, null, 'first_name, last_name, email, phone, date, and time are all required.', 400);
    }

    if (!is_array($serviceIds) || count($serviceIds) === 0) {
        respond(false, null, 'At least one service_id is required.', 400);
    }

    if ($doctorId !== null && !isValidDoctor($pdo, $doctorId)) {
        respond(false, null, 'Selected doctor was not found.', 400);
    }

    // Clinic hours: 9 AM - 4 PM, closed Sundays.
    $hour = (int) substr($time, 0, 2);
    if ($hour < 9 || $hour > 15) {
        respond(false, null, 'Please select a time during clinic hours (9:00 AM - 4:00 PM).', 400);
    }
    $dayOfWeek = (int) date('w', strtotime($date));
    if ($dayOfWeek === 0) {
        respond(false, null, 'The clinic is closed on Sundays. Please choose another day.', 400);
    }

$endTime = date('H:i:s', strtotime($time) + $durationMinutes * 60);

    if (isSlotTaken($pdo, $date, $time, $endTime)) {
        respond(false, null, 'This time slot is already booked. Please select another time.', 409);
    }

    try {
        $pdo->beginTransaction();

        $totalPrice = calculateTotalPrice($pdo, $serviceIds);

        // Auto-register: reuse the patient if the email already exists,
        // otherwise create a bare-minimum patient record.
        $existing = $pdo->prepare('SELECT id FROM patients WHERE email = ? AND deleted_at IS NULL');
        $existing->execute([$email]);
        $patientRow = $existing->fetch();

        if ($patientRow) {
            $patientId = (int) $patientRow['id'];
            $pdo->prepare('UPDATE patients SET phone = ?, updated_at = NOW() WHERE id = ?')
                ->execute([$phone, $patientId]);
        } else {
            $insertPatient = $pdo->prepare(
                'INSERT INTO patients
                    (first_name, last_name, email, phone, age, is_high_risk, last_visit, notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, NULL, 0, NULL, NULL, NOW(), NOW())'
            );
            $insertPatient->execute([$firstName, $lastName, $email, $phone]);
            $patientId = (int) $pdo->lastInsertId();
        }

        $insertAppt = $pdo->prepare(
            "INSERT INTO appointments
                (patient_id, doctor_id, appointment_date, appointment_time, end_time,
                 duration_minutes, status, source, patient_notes, total_estimated_price,
                 created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, NOW(), NOW())"
        );
        $insertAppt->execute([
            $patientId, $doctorId, $date, $time, $endTime,
            $durationMinutes, $source, $notes ?: null, $totalPrice,
        ]);
        $appointmentId = (int) $pdo->lastInsertId();

        $insertPivot = $pdo->prepare(
            'INSERT INTO appointment_service (appointment_id, service_id, created_at, updated_at)
             VALUES (?, ?, NOW(), NOW())'
        );
        foreach ($serviceIds as $serviceId) {
            $insertPivot->execute([$appointmentId, (int) $serviceId]);
        }

        $pdo->commit();

 $created = $pdo->prepare(
            'SELECT appointments.*, patients.first_name, patients.last_name,
                    patients.email, patients.phone
             FROM appointments
             INNER JOIN patients ON patients.id = appointments.patient_id
             WHERE appointments.id = ?'
        );
        $created->execute([$appointmentId]);
        $appointment = $created->fetch();
        $appointment['services'] = fetchServicesForAppointment($pdo, $appointmentId);

        respond(true, $appointment, 'Appointment booked.', 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        respond(false, null, 'Could not book appointment: ' . $e->getMessage(), 500);
    }
}

// ---------------------------------------------------------------
// Everything below requires a staff session.
// ---------------------------------------------------------------
require '../utils/auth_check.php';

// ---------------------------------------------------------------
// PUT — staff reschedules, reassigns doctor, changes status, or
// updates the service list for an appointment.
// Body can include any subset of: doctor_id, date, time, status, notes,
// service_ids, duration_minutes
// ---------------------------------------------------------------
if ($method === 'PUT') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        respond(false, null, 'id is required in the query string.', 400);
    }

    $existing = $pdo->prepare('SELECT * FROM appointments WHERE id = ? AND deleted_at IS NULL');
    $existing->execute([$id]);
    $current = $existing->fetch();

    if (!$current) {
        respond(false, null, 'Appointment not found.', 404);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    $doctorId = array_key_exists('doctor_id', $input)
        ? ($input['doctor_id'] !== '' && $input['doctor_id'] !== null ? (int) $input['doctor_id'] : null)
        : ($current['doctor_id'] !== null ? (int) $current['doctor_id'] : null);
    $date = trim($input['date'] ?? $current['appointment_date']);
    $time = trim($input['time'] ?? $current['appointment_time']);
    $status = trim($input['status'] ?? $current['status']);
    $notes = array_key_exists('notes', $input) ? trim($input['notes']) : $current['patient_notes'];
    $durationMinutes = isset($input['duration_minutes']) ? (int) $input['duration_minutes'] : (int) $current['duration_minutes'];
    $serviceIds = $input['service_ids'] ?? null; // null = leave the pivot rows untouched

    if (!in_array($status, VALID_STATUSES, true)) {
        respond(false, null, 'status must be one of: ' . implode(', ', VALID_STATUSES), 400);
    }

    if ($doctorId !== null && !isValidDoctor($pdo, $doctorId)) {
        respond(false, null, 'Selected doctor was not found.', 400);
    }

$endTime = date('H:i:s', strtotime($time) + $durationMinutes * 60);

    $currentDoctorId = $current['doctor_id'] !== null ? (int) $current['doctor_id'] : null;
    $slotChanged = $doctorId !== $currentDoctorId
        || $date !== $current['appointment_date']
        || $time !== $current['appointment_time']
        || $durationMinutes !== (int) $current['duration_minutes'];
    if ($slotChanged && isSlotTaken($pdo, $date, $time, $endTime, (int) $id)) {
        respond(false, null, 'This time slot is already booked. Please select another time.', 409);
    }

    try {
        $pdo->beginTransaction();

        $totalPrice = $current['total_estimated_price'];
        if ($serviceIds !== null) {
            if (!is_array($serviceIds) || count($serviceIds) === 0) {
                throw new RuntimeException('service_ids must be a non-empty array when provided.');
            }
            $totalPrice = calculateTotalPrice($pdo, $serviceIds);
        }

        $pdo->prepare(
            'UPDATE appointments
             SET doctor_id = ?, appointment_date = ?, appointment_time = ?, end_time = ?,
                 duration_minutes = ?, status = ?, patient_notes = ?, total_estimated_price = ?,
                 updated_at = NOW()
             WHERE id = ?'
        )->execute([$doctorId, $date, $time, $endTime, $durationMinutes, $status, $notes, $totalPrice, $id]);

        if ($serviceIds !== null) {
            $pdo->prepare('DELETE FROM appointment_service WHERE appointment_id = ?')->execute([$id]);
            $insertPivot = $pdo->prepare(
                'INSERT INTO appointment_service (appointment_id, service_id, created_at, updated_at)
                 VALUES (?, ?, NOW(), NOW())'
            );
            foreach ($serviceIds as $serviceId) {
                $insertPivot->execute([$id, (int) $serviceId]);
            }
        }

        $pdo->commit();

$updated = $pdo->prepare(
            'SELECT appointments.*, patients.first_name, patients.last_name,
                    patients.email, patients.phone
             FROM appointments
             INNER JOIN patients ON patients.id = appointments.patient_id
             WHERE appointments.id = ?'
        );
        $updated->execute([$id]);
        $appointment = $updated->fetch();
        $appointment['services'] = fetchServicesForAppointment($pdo, (int) $id);

        respond(true, $appointment, 'Appointment updated.');
    } catch (Exception $e) {
        $pdo->rollBack();
        respond(false, null, 'Could not update appointment: ' . $e->getMessage(), 500);
    }
}

// ---------------------------------------------------------------
// DELETE — soft-delete only.
// ---------------------------------------------------------------
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        respond(false, null, 'id is required in the query string.', 400);
    }

    $existing = $pdo->prepare('SELECT id FROM appointments WHERE id = ? AND deleted_at IS NULL');
    $existing->execute([$id]);
    if (!$existing->fetch()) {
        respond(false, null, 'Appointment not found.', 404);
    }

    $pdo->prepare('UPDATE appointments SET deleted_at = NOW() WHERE id = ?')->execute([$id]);

    respond(true, null, 'Appointment deleted.');
}

respond(false, null, 'Method not allowed.', 405);