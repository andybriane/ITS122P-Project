<?php
/**
 * Email API
 * Pineda Dental Clinic — Plain PHP Backend
 *
 * POST /api/emails.php -> receives an email payload from the frontend
 * and hands it off to the Mailer helper (utils/Mailer.php), which
 * handles all the PHPMailer / Gmail SMTP details.
 */

require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../utils/Mailer.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$to = trim($input['to'] ?? '');
$subject = trim($input['subject'] ?? '');
$text = $input['text'] ?? '';
$html = $input['html'] ?? '';
$templateType = $input['templateType'] ?? '';

if (empty($to) || empty($subject) || empty($html)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}

$result = send_email($to, $subject, $html, $text);

if (!$result['success']) {
    http_response_code(500);
    echo json_encode($result);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Email sent',
    'to' => $to,
    'templateType' => $templateType,
]);
