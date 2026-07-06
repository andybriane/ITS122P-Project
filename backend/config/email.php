<?php
/**
 * Email / SMTP configuration
 * Pineda Dental Clinic — Plain PHP Backend
 *
 * Loads Gmail SMTP credentials from backend/.env (git-ignored) and
 * exposes them as a single $emailConfig array. See .env.example for
 * the fields you need to fill in.
 */

function load_env_file(string $path): array
{
    $values = [];

    if (!file_exists($path)) {
        return $values;
    }

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#')) {
            continue; // skip blank lines and comments
        }

        if (!str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);

        // Strip surrounding quotes, e.g. SMTP_FROM_NAME="Pineda Dental Clinic"
        if (strlen($value) >= 2 && $value[0] === '"' && $value[strlen($value) - 1] === '"') {
            $value = substr($value, 1, -1);
        }

        $values[$key] = $value;
    }

    return $values;
}

$envValues = load_env_file(__DIR__ . '/../.env');

$emailConfig = [
    'host'     => $envValues['SMTP_HOST'] ?? 'smtp.gmail.com',
    'port'     => (int) ($envValues['SMTP_PORT'] ?? 587),
    'username' => $envValues['SMTP_USER'] ?? '',
    'password' => $envValues['SMTP_PASS'] ?? '',
    'fromName' => $envValues['SMTP_FROM_NAME'] ?? 'Pineda Dental Clinic',
];
