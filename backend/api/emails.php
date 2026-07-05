<?php
/**
 * Email API
 * Pineda Dental Clinic — Plain PHP Backend
 *
 * POST /api/emails.php -> receives an email payload from the frontend
 * and sends it. For now, logs it (see TODO) so you can verify the whole
 * flow works before wiring in a real provider.
 */

require_once '../config/cors.php';
require_once '../config/database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$to = $input['to'] ?? '';
$subject = $input['subject'] ?? '';
$text = $input['text'] ?? '';
$html = $input['html'] ?? '';
$templateType = $input['templateType'] ?? '';

if (empty($to) || empty($subject) || empty($html)) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}

// TODO: Replace with real email provider (SendGrid/PHPMailer/Gmail SMTP) — Step coming later
error_log("EMAIL [$templateType] TO: $to | SUBJECT: $subject");

echo json_encode([
    'success' => true,
    'message' => 'Email queued',
    'to' => $to,
    'templateType' => $templateType,
]);