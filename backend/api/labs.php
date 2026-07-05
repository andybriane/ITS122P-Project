<?php
/**
 * Lab Results API
 * Pineda Dental Clinic — Plain PHP Backend
 *
 * GET    /api/labs.php             -> list all (not soft-deleted), staff only
 * GET    /api/labs.php?id=5        -> get one with patient info
 * POST   /api/labs.php             -> staff only, multipart/form-data upload
 * PUT    /api/labs.php?id=5        -> staff only, JSON body (status/notes)
 * DELETE /api/labs.php?id=5        -> staff only, soft-delete
 *
 * SCHEMA (from actual SQL dump):
 *   lab_results
 *     id, patient_id, test_type, file_path (nullable),
 *     status ('Pending'|'Delayed'|'Ready'|'Reviewed'),
 *     doctor_notes, uploaded_by (FK -> users.id),
 *     created_at, updated_at, deleted_at
 *
 * POST is multipart/form-data, NOT JSON, because it carries a file:
 *   patient_id   (required)
 *   test_type    (required)
 *   file         (required, the uploaded file itself)
 *   doctor_notes (optional)
 */

require '../config/cors.php';
require '../config/database.php';
require '../utils/auth_check.php'; // All lab endpoints require staff auth — exposes $auth_user

header('Content-Type: application/json');

function respond(bool $success, $data, string $message, int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => $success, 'data' => $data, 'message' => $message]);
    exit;
}

const VALID_STATUSES = ['Pending', 'Delayed', 'Ready', 'Reviewed'];
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const UPLOAD_DIR = '../uploads/labs/';

/**
 * Fetches one lab result row joined with patient basics.
 */
function fetchLab(PDO $pdo, int $labId): array|false {
    $stmt = $pdo->prepare(
        "SELECT lab_results.*,
                patients.first_name, patients.last_name,
                patients.email AS patient_email
         FROM lab_results
         INNER JOIN patients ON patients.id = lab_results.patient_id
         WHERE lab_results.id = ? AND lab_results.deleted_at IS NULL"
    );
    $stmt->execute([$labId]);
    return $stmt->fetch();
}

$method = $_SERVER['REQUEST_METHOD'];

// ---------------------------------------------------------------
// GET
// ---------------------------------------------------------------
if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $lab = fetchLab($pdo, (int) $_GET['id']);
        if (!$lab) {
            respond(false, null, 'Lab result not found.', 404);
        }
        respond(true, $lab, 'Lab result retrieved.');
    }

    $stmt = $pdo->query(
        "SELECT lab_results.*,
                patients.first_name, patients.last_name,
                patients.email AS patient_email
         FROM lab_results
         INNER JOIN patients ON patients.id = lab_results.patient_id
         WHERE lab_results.deleted_at IS NULL
         ORDER BY lab_results.created_at DESC"
    );
    respond(true, $stmt->fetchAll(), 'Lab results retrieved.');
}

// ---------------------------------------------------------------
// POST — multipart/form-data upload.
//
// Fields (form-data, NOT JSON):
//   patient_id   (required)
//   test_type    (required)
//   file         (required)
//   doctor_notes (optional)
// ---------------------------------------------------------------
if ($method === 'POST') {
    $patientId   = isset($_POST['patient_id']) ? (int) $_POST['patient_id'] : null;
    $testType    = trim($_POST['test_type'] ?? '');
    $doctorNotes = trim($_POST['doctor_notes'] ?? '');

    if (!$patientId || $testType === '') {
        respond(false, null, 'patient_id and test_type are required.', 400);
    }

    // Verify patient exists and isn't soft-deleted
    $patientCheck = $pdo->prepare('SELECT id FROM patients WHERE id = ? AND deleted_at IS NULL');
    $patientCheck->execute([$patientId]);
    if (!$patientCheck->fetch()) {
        respond(false, null, 'Patient not found.', 404);
    }

    if (!isset($_FILES['file']) || $_FILES['file']['error'] === UPLOAD_ERR_NO_FILE) {
        respond(false, null, 'A file is required.', 400);
    }

    $file = $_FILES['file'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        respond(false, null, 'File upload failed (error code ' . $file['error'] . ').', 400);
    }

    if ($file['size'] > MAX_FILE_BYTES) {
        respond(false, null, 'File exceeds the 10MB size limit.', 400);
    }

    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, ALLOWED_EXTENSIONS, true)) {
        respond(false, null, 'File type not allowed. Use PDF, JPG, or PNG.', 400);
    }

    if (!is_dir(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0755, true);
    }

    // Unique filename: lab_<patientId>_<timestamp>_<random>.<ext>
    $uniqueName = 'lab_' . $patientId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
    $destination = UPLOAD_DIR . $uniqueName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        respond(false, null, 'Could not save the uploaded file.', 500);
    }

    // file_path stored as a relative web path, e.g. uploads/labs/lab_3_....pdf
    $filePath = 'uploads/labs/' . $uniqueName;

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            "INSERT INTO lab_results
                (patient_id, test_type, file_path, status, doctor_notes, uploaded_by, created_at, updated_at)
             VALUES (?, ?, ?, 'Pending', ?, ?, NOW(), NOW())"
        );
        $stmt->execute([
            $patientId,
            $testType,
            $filePath,
            $doctorNotes ?: null,
            $auth_user['id'],
        ]);
        $labId = (int) $pdo->lastInsertId();

        $pdo->commit();

        respond(true, fetchLab($pdo, $labId), 'Lab result uploaded.', 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        // Clean up the file we just saved, since the DB row didn't make it
        if (file_exists($destination)) {
            unlink($destination);
        }
        respond(false, null, 'Could not save lab result: ' . $e->getMessage(), 500);
    }
}

// ---------------------------------------------------------------
// PUT — update status and/or doctor_notes. JSON body (no file
// re-upload supported here; that would be a separate endpoint/flow).
//
// Body (any subset):
// {
//   status: "Reviewed",
//   doctor_notes: "..."
// }
// ---------------------------------------------------------------
if ($method === 'PUT') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
    if (!$id) {
        respond(false, null, 'id is required in the query string.', 400);
    }

    $current = fetchLab($pdo, $id);
    if (!$current) {
        respond(false, null, 'Lab result not found.', 404);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    $status       = trim($input['status'] ?? $current['status']);
    $doctorNotes  = array_key_exists('doctor_notes', $input)
        ? trim($input['doctor_notes'])
        : $current['doctor_notes'];

    if (!in_array($status, VALID_STATUSES, true)) {
        respond(false, null, 'status must be one of: ' . implode(', ', VALID_STATUSES), 400);
    }

    $pdo->prepare(
        'UPDATE lab_results
         SET status = ?, doctor_notes = ?, updated_at = NOW()
         WHERE id = ?'
    )->execute([$status, $doctorNotes ?: null, $id]);

    respond(true, fetchLab($pdo, $id), 'Lab result updated.');
}

// ---------------------------------------------------------------
// DELETE — soft-delete only.
// ---------------------------------------------------------------
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
    if (!$id) {
        respond(false, null, 'id is required in the query string.', 400);
    }

    $check = $pdo->prepare('SELECT id FROM lab_results WHERE id = ? AND deleted_at IS NULL');
    $check->execute([$id]);
    if (!$check->fetch()) {
        respond(false, null, 'Lab result not found.', 404);
    }

    $pdo->prepare('UPDATE lab_results SET deleted_at = NOW() WHERE id = ?')->execute([$id]);

    respond(true, null, 'Lab result deleted.');
}

respond(false, null, 'Method not allowed.', 405);