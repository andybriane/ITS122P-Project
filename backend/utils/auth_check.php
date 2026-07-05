<?php
/**
 * Shared Bearer token validator.
 * Any protected endpoint does: require '../utils/auth_check.php';
 * after requiring cors.php + database.php. On success, $auth_user is
 * available as ['id' => ..., 'email' => ..., 'role' => ...].
 */

function fail_unauthorized(string $message): void {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'data'    => null,
        'message' => $message,
    ]);
    exit;
}

$headers = function_exists('getallheaders') ? getallheaders() : [];

// getallheaders() keys aren't guaranteed casing, so check case-insensitively
$authHeader = null;
foreach ($headers as $key => $value) {
    if (strtolower($key) === 'authorization') {
        $authHeader = $value;
        break;
    }
}

if (!$authHeader || !preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
    fail_unauthorized('Missing or malformed Authorization header.');
}

$token = trim($matches[1]);

if ($token === '') {
    fail_unauthorized('Empty token.');
}

$stmt = $pdo->prepare(
    'SELECT auth_tokens.user_id, auth_tokens.expires_at,
            users.email, users.role, users.first_name, users.last_name
     FROM auth_tokens
     INNER JOIN users ON users.id = auth_tokens.user_id
     WHERE auth_tokens.token = ?'
);
$stmt->execute([$token]);
$row = $stmt->fetch();

if (!$row) {
    fail_unauthorized('Invalid token.');
}

if (strtotime($row['expires_at']) < time()) {
    fail_unauthorized('Token expired. Please log in again.');
}

$auth_user = [
    'id'    => (int) $row['user_id'],
    'email' => $row['email'],
    'role'  => $row['role'],
    'name'  => trim($row['first_name'] . ' ' . $row['last_name']),
];