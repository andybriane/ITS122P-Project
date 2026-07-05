<?php
/**
 * Services API — full CRUD
 * Pineda Dental Clinic — Plain PHP Backend
 *
 * GET    /api/services.php           -> list all active services (deleted_at IS NULL)
 * GET    /api/services.php?id=5      -> get one service
 * POST   /api/services.php           -> create a service (requires auth)
 * PUT    /api/services.php?id=5      -> update a service (requires auth)
 * DELETE /api/services.php?id=5      -> soft-delete a service (requires auth)
 *
 * Reading the price list is public (the public Services.jsx page needs it with
 * no login). Writing requires a valid staff session, since only admin/doctor
 * should be able to add, edit, or remove services.
 */

require '../config/cors.php';
require '../config/database.php';

header('Content-Type: application/json');

function respond(bool $success, $data, string $message, int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => $success, 'data' => $data, 'message' => $message]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// --- GET: public, no auth required ---
if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare('SELECT * FROM services WHERE id = ? AND deleted_at IS NULL');
        $stmt->execute([$_GET['id']]);
        $service = $stmt->fetch();

        if (!$service) {
            respond(false, null, 'Service not found.', 404);
        }
        respond(true, $service, 'Service retrieved.');
    }

    $stmt = $pdo->query(
        'SELECT * FROM services WHERE deleted_at IS NULL ORDER BY category, name'
    );
    $services = $stmt->fetchAll();
    respond(true, $services, 'Services retrieved.');
}

// --- POST, PUT, DELETE: staff only ---
require '../utils/auth_check.php'; // exposes $auth_user, kills request with 401 if invalid

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $category = trim($input['category'] ?? '');
    $name = trim($input['name'] ?? '');
    $price = $input['price'] ?? null;

    if ($category === '' || $name === '' || $price === null || !is_numeric($price)) {
        respond(false, null, 'category, name, and a numeric price are required.', 400);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO services (category, name, price, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())'
    );
    $stmt->execute([$category, $name, $price]);

    $newId = (int) $pdo->lastInsertId();
    $created = $pdo->prepare('SELECT * FROM services WHERE id = ?');
    $created->execute([$newId]);

    respond(true, $created->fetch(), 'Service created.', 201);
}

if ($method === 'PUT') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        respond(false, null, 'id is required in the query string.', 400);
    }

    $existing = $pdo->prepare('SELECT * FROM services WHERE id = ? AND deleted_at IS NULL');
    $existing->execute([$id]);
    if (!$existing->fetch()) {
        respond(false, null, 'Service not found.', 404);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $category = trim($input['category'] ?? '');
    $name = trim($input['name'] ?? '');
    $price = $input['price'] ?? null;

    if ($category === '' || $name === '' || $price === null || !is_numeric($price)) {
        respond(false, null, 'category, name, and a numeric price are required.', 400);
    }

    $stmt = $pdo->prepare(
        'UPDATE services SET category = ?, name = ?, price = ?, updated_at = NOW() WHERE id = ?'
    );
    $stmt->execute([$category, $name, $price, $id]);

    $updated = $pdo->prepare('SELECT * FROM services WHERE id = ?');
    $updated->execute([$id]);

    respond(true, $updated->fetch(), 'Service updated.');
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        respond(false, null, 'id is required in the query string.', 400);
    }

    $existing = $pdo->prepare('SELECT * FROM services WHERE id = ? AND deleted_at IS NULL');
    $existing->execute([$id]);
    if (!$existing->fetch()) {
        respond(false, null, 'Service not found.', 404);
    }

    // Soft delete: services has a deleted_at column, so we never hard-delete
    // here. Existing appointments/invoices may still reference this service_id,
    // and a hard delete would orphan or break those records.
    $stmt = $pdo->prepare('UPDATE services SET deleted_at = NOW() WHERE id = ?');
    $stmt->execute([$id]);

    respond(true, null, 'Service deleted.');
}

respond(false, null, 'Method not allowed.', 405);