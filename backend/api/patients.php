<?php
/**
 * Patients API — full CRUD
 * Pineda Dental Clinic — Plain PHP Backend
 *
 * GET    /api/patients.php           -> list all active patients (deleted_at IS NULL)
 * GET    /api/patients.php?id=5      -> get one patient
 * POST   /api/patients.php           -> create a patient
 * PUT    /api/patients.php?id=5      -> update a patient
 * DELETE /api/patients.php?id=5      -> cascade soft-delete: patient + their
 *                                        appointments + invoices + lab_results
 *
 * All patient data is sensitive (real names, contact info, medical notes),
 * so every method here requires a valid staff session via auth_check.php —
 * unlike services.php, there is no public GET.
 *
 * High-risk notification: whenever is_high_risk transitions from 0 to 1
 * (on create with is_high_risk=1, or on update where it was 0 and becomes 1),
 * a row is inserted into `notifications` so staff see an alert. Re-saving an
 * already-high-risk patient does NOT re-fire this — only the 0->1 transition does.
 */

require '../config/cors.php';
require '../config/database.php';
require '../utils/auth_check.php'; // exposes $auth_user, kills request with 401 if invalid

header('Content-Type: application/json');

function respond(bool $success, $data, string $message, int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => $success, 'data' => $data, 'message' => $message]);
    exit;
}

function notifyHighRisk(PDO $pdo, string $patientName): void {
    $stmt = $pdo->prepare(
        'INSERT INTO notifications (type, message, is_read, created_at, updated_at)
         VALUES (?, ?, 0, NOW(), NOW())'
    );
    $stmt->execute([
        'high_risk_patient',
        "Patient {$patientName} has been flagged as high-risk.",
    ]);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM patients WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$_GET['id']]);
        $patient = $stmt->fetch();

        if (!$patient) {
            respond(false, null, 'Patient not found.', 404);
        }
        respond(true, $patient, 'Patient retrieved.');
    }

    $stmt = $pdo->query(
        'SELECT * FROM patients WHERE deleted_at IS NULL ORDER BY last_name, first_name'
    );
    $patients = $stmt->fetchAll();
    respond(true, $patients, 'Patients retrieved.');
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $firstName = trim($input['first_name'] ?? '');
    $lastName = trim($input['last_name'] ?? '');
    $email = trim($input['email'] ?? '') ?: null;
    $phone = trim($input['phone'] ?? '') ?: null;
    $age = isset($input['age']) && $input['age'] !== '' ? (int) $input['age'] : null;
    $isHighRisk = !empty($input['is_high_risk']) ? 1 : 0;
    $lastVisit = $input['last_visit'] ?? null;
    $notes = $input['notes'] ?? null;

    if ($firstName === '' || $lastName === '') {
        respond(false, null, 'first_name and last_name are required.', 400);
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            'INSERT INTO patients
                (first_name, last_name, email, phone, age, is_high_risk, last_visit, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())'
        );
        $stmt->execute([$firstName, $lastName, $email, $phone, $age, $isHighRisk, $lastVisit, $notes]);

        $newId = (int) $pdo->lastInsertId();

        // Trigger: a brand-new patient created already flagged as high-risk
        // counts as a 0->1 transition (there was no prior row at all).
        if ($isHighRisk === 1) {
            notifyHighRisk($pdo, "{$firstName} {$lastName}");
        }

        $pdo->commit();

        $created = $pdo->prepare('SELECT * FROM patients WHERE id = ?');
        $created->execute([$newId]);

        respond(true, $created->fetch(), 'Patient created.', 201);
    } catch (PDOException $e) {
        $pdo->rollBack();
        respond(false, null, 'Could not create patient: ' . $e->getMessage(), 500);
    }
}

if ($method === 'PUT') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        respond(false, null, 'id is required in the query string.', 400);
    }

    $existingStmt = $pdo->prepare('SELECT * FROM patients WHERE id = ? AND deleted_at IS NULL');
    $existingStmt->execute([$id]);
    $existing = $existingStmt->fetch();

    if (!$existing) {
        respond(false, null, 'Patient not found.', 404);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $firstName = trim($input['first_name'] ?? '');
    $lastName = trim($input['last_name'] ?? '');
    $email = trim($input['email'] ?? '') ?: null;
    $phone = trim($input['phone'] ?? '') ?: null;
    $age = isset($input['age']) && $input['age'] !== '' ? (int) $input['age'] : null;
    $isHighRisk = !empty($input['is_high_risk']) ? 1 : 0;
    $lastVisit = $input['last_visit'] ?? null;
    $notes = $input['notes'] ?? null;

    if ($firstName === '' || $lastName === '') {
        respond(false, null, 'first_name and last_name are required.', 400);
    }

    // Capture the 0->1 transition before we overwrite the row
    $wasHighRisk = (int) $existing['is_high_risk'] === 1;
    $justBecameHighRisk = !$wasHighRisk && $isHighRisk === 1;

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            'UPDATE patients
             SET first_name = ?, last_name = ?, email = ?, phone = ?, age = ?,
                 is_high_risk = ?, last_visit = ?, notes = ?, updated_at = NOW()
             WHERE id = ?'
        );
        $stmt->execute([$firstName, $lastName, $email, $phone, $age, $isHighRisk, $lastVisit, $notes, $id]);

        if ($justBecameHighRisk) {
            notifyHighRisk($pdo, "{$firstName} {$lastName}");
        }

        $pdo->commit();

        $updated = $pdo->prepare('SELECT * FROM patients WHERE id = ?');
        $updated->execute([$id]);

        respond(true, $updated->fetch(), 'Patient updated.');
    } catch (PDOException $e) {
        $pdo->rollBack();
        respond(false, null, 'Could not update patient: ' . $e->getMessage(), 500);
    }
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        respond(false, null, 'id is required in the query string.', 400);
    }

    $existing = $pdo->prepare('SELECT * FROM patients WHERE id = ? AND deleted_at IS NULL');
    $existing->execute([$id]);
    if (!$existing->fetch()) {
        respond(false, null, 'Patient not found.', 404);
    }

    // Manual cascade soft-delete: the real FK constraints on appointments,
    // invoices, and lab_results are ON DELETE CASCADE, but that only fires on
    // a hard DELETE. Since we soft-delete (just stamp deleted_at), we have to
    // replicate that cascade ourselves here, in one transaction so it's
    // all-or-nothing — if any step fails, nothing is marked deleted.
    try {
        $pdo->beginTransaction();

        // invoices first (they reference appointment_id, which we're about to
        // soft-delete too — order doesn't matter functionally here since we're
        // not nulling FKs, but doing children-of-children first keeps it tidy)
        $pdo->prepare('UPDATE invoices SET deleted_at = NOW() WHERE patient_id = ? AND deleted_at IS NULL')
            ->execute([$id]);

        $pdo->prepare('UPDATE lab_results SET deleted_at = NOW() WHERE patient_id = ? AND deleted_at IS NULL')
            ->execute([$id]);

        $pdo->prepare('UPDATE appointments SET deleted_at = NOW() WHERE patient_id = ? AND deleted_at IS NULL')
            ->execute([$id]);

        $pdo->prepare('UPDATE patients SET deleted_at = NOW() WHERE id = ?')
            ->execute([$id]);

        $pdo->commit();

        respond(true, null, 'Patient and all related records deleted.');
    } catch (PDOException $e) {
        $pdo->rollBack();
        respond(false, null, 'Could not delete patient: ' . $e->getMessage(), 500);
    }
}

respond(false, null, 'Method not allowed.', 405);