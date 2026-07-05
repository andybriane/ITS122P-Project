<?php
/**
 * Database connection (PDO)
 * Pineda Dental Clinic — Plain PHP Backend
 *
 * Exposes a single $pdo connection using PDO + prepared statements only.
 * Every other file just does: require '../config/database.php'; then uses $pdo.
 */

$DB_HOST = '127.0.0.1';
$DB_NAME = 'pineda_dentalclinic_db';
$DB_USER = 'root';
$DB_PASS = 'root';
$DB_CHARSET = 'utf8mb4';

$dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset={$DB_CHARSET}";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // throw on SQL errors instead of silently failing
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // rows come back as assoc arrays, ready for json_encode
    PDO::ATTR_EMULATE_PREPARES   => false,                    // use REAL prepared statements (prevents SQL injection at the driver level)
];

try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'data'    => null,
        'message' => 'Database connection failed: ' . $e->getMessage(),
    ]);
    exit;
}