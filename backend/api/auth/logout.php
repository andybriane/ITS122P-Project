<?php
require '../../config/cors.php';
require '../../config/database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Method not allowed.']);
    exit;
}

$headers = function_exists('getallheaders') ? getallheaders() : [];

$authHeader = null;
foreach ($headers as $key => $value) {
    if (strtolower($key) === 'authorization') {
        $authHeader = $value;
        break;
    }
}

if (!$authHeader || !preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Missing or malformed Authorization header.']);
    exit;
}

$token = trim($matches[1]);

$stmt = $pdo->prepare('DELETE FROM auth_tokens WHERE token = ?');
$stmt->execute([$token]);

// Whether or not a row actually matched, logout always reports success —
// the end state the frontend cares about (no valid session) is the same either way.
echo json_encode([
    'success' => true,
    'data'    => null,
    'message' => 'Logged out successfully.',
]);