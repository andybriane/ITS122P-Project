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

if ($email === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Email is required.']);
    exit;
}

// Confirm this email belongs to a real user before issuing a code
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if (!$stmt->fetch()) {
    http_response_code(404);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'No account found for that email.']);
    exit;
}

// 6-digit numeric OTP, zero-padded (random_int can return e.g. 7 -> "000007")
$otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

$insert = $pdo->prepare(
    'INSERT INTO otp_codes (email, otp_code, expires_at, created_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW())'
);
$insert->execute([$email, $otp]);

echo json_encode([
    'success' => true,
    'data' => [
        'otp' => $otp, // dev-mode only: simulates SMS/email delivery, zero cost
    ],
    'message' => 'OTP generated.',
]);