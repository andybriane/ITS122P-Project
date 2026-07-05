<?php
require '../../config/cors.php';
require '../../config/database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Method not allowed.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');
$otp = trim($input['otp'] ?? '');

if ($email === '' || $otp === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Email and OTP are required.']);
    exit;
}

$stmt = $pdo->prepare(
    'SELECT id, otp_code, expires_at FROM otp_codes
     WHERE email = ?
     ORDER BY id DESC
     LIMIT 1'
);
$stmt->execute([$email]);
$row = $stmt->fetch();

if (!$row || $row['otp_code'] !== $otp) {
    http_response_code(401);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Invalid OTP code.']);
    exit;
}

if (strtotime($row['expires_at']) < time()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'OTP expired. Please request a new code.']);
    exit;
}

$userStmt = $pdo->prepare('SELECT id, email, role, first_name, last_name FROM users WHERE email = ?');
$userStmt->execute([$email]);
$user = $userStmt->fetch();

if (!$user) {
    http_response_code(404);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'User not found.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Issue a fresh session token, valid for 8 hours
    $token = bin2hex(random_bytes(32)); // 64 hex chars, matches auth_tokens.token VARCHAR(64)

    $tokenStmt = $pdo->prepare(
        'INSERT INTO auth_tokens (user_id, token, expires_at, created_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 8 HOUR), NOW())'
    );
    $tokenStmt->execute([$user['id'], $token]);

    // Consume the OTP so it can't be reused
    $pdo->prepare('DELETE FROM otp_codes WHERE id = ?')->execute([$row['id']]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'data' => [
            'token' => $token,
            'user'  => [
                'id'    => $user['id'],
                'email' => $user['email'],
                'role'  => $user['role'],
                'name'  => trim($user['first_name'] . ' ' . $user['last_name']),
            ],
        ],
        'message' => 'Login successful.',
    ]);
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Token issuance failed: ' . $e->getMessage()]);
}