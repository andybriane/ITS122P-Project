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
$password = $input['password'] ?? '';
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Email and password are required.']);
    exit;
}

$logStmt = $pdo->prepare(
    'INSERT INTO access_logs (email_attempted, ip_address, status, login_timestamp)
     VALUES (?, ?, ?, NOW())'
);

$stmt = $pdo->prepare('SELECT id, email, password, role, first_name, last_name FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    $logStmt->execute([$email, $ip, 'Failed']);
    http_response_code(401);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Invalid email or password.']);
    exit;
}

// Password is correct. Log success here; OTP issuance happens in request-otp.php.
$logStmt->execute([$email, $ip, 'Success']);

echo json_encode([
    'success' => true,
    'data' => [
        'email' => $user['email'],
        'role'  => $user['role'],
        'name'  => trim($user['first_name'] . ' ' . $user['last_name']),
    ],
    'message' => 'Password verified. Proceed to OTP.',
]);