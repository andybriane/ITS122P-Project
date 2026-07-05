<?php
/**
 * TEMPORARY connection test — delete this file once you've confirmed it works.
 * Visit: http://localhost/pineda-dentalclinic-api/test.php
 */

require 'config/cors.php';
require 'config/database.php';

header('Content-Type: application/json');

try {
    // Simple query to prove the connection is alive and can see the real schema
    $stmt = $pdo->query('SHOW TABLES');
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode([
        'success' => true,
        'data' => [
            'connected'   => true,
            'table_count' => count($tables),
            'tables'      => $tables,
        ],
        'message' => 'Database connection successful.',
    ], JSON_PRETTY_PRINT);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'data'    => null,
        'message' => 'Query failed: ' . $e->getMessage(),
    ]);
}