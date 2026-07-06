<?php
/**
 * Mailer helper
 * Pineda Dental Clinic — Plain PHP Backend
 *
 * Wraps PHPMailer + Gmail SMTP so nothing else in the codebase needs
 * to know PHPMailer exists. Any endpoint that needs to send an email
 * just does:
 *
 *   require_once '../utils/Mailer.php';
 *   $result = send_email($to, $subject, $html, $text);
 *
 * $result is always ['success' => bool, 'message' => string].
 */

require_once __DIR__ . '/../config/email.php';
require_once __DIR__ . '/../vendor/phpmailer/phpmailer/src/Exception.php';
require_once __DIR__ . '/../vendor/phpmailer/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../vendor/phpmailer/phpmailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

/**
 * Send a single HTML email via Gmail SMTP.
 *
 * @param string $to      Recipient email address
 * @param string $subject Email subject line
 * @param string $html    HTML email body
 * @param string $text    Plain-text fallback body (optional — falls back to strip_tags($html))
 * @return array{success: bool, message: string}
 */
function send_email(string $to, string $subject, string $html, string $text = ''): array
{
    global $emailConfig;

    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'message' => 'Invalid recipient email address'];
    }

    if (empty($emailConfig['username']) || empty($emailConfig['password'])
        || $emailConfig['username'] === 'youraddress@gmail.com') {
        return [
            'success' => false,
            'message' => 'SMTP is not configured. Fill in backend/.env with your Gmail address and app password (see .env.example).',
        ];
    }

    $mail = new PHPMailer(true);

    try {
        // --- Server settings ---
        $mail->isSMTP();
        $mail->Host       = $emailConfig['host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $emailConfig['username'];
        $mail->Password   = $emailConfig['password'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = $emailConfig['port'];

        // --- Recipients ---
        $mail->setFrom($emailConfig['username'], $emailConfig['fromName']);
        $mail->addAddress($to);

        // --- Content ---
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $html;
        $mail->AltBody = $text !== '' ? $text : strip_tags($html);

        $mail->send();

        return ['success' => true, 'message' => 'Email sent'];
    } catch (PHPMailerException $e) {
        error_log("EMAIL FAILED TO: $to | ERROR: {$mail->ErrorInfo}");
        return ['success' => false, 'message' => 'Failed to send email: ' . $mail->ErrorInfo];
    }
}
