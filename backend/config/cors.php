<?php
/**
 * CORS headers + OPTIONS preflight handling
 * Pineda Dental Clinic — Plain PHP Backend
 *
 * Allows the Vite dev server (http://localhost:5173) specifically — not a wildcard —
 * because we need credentials/Authorization headers to work, which wildcard origins block anyway.
 */

$allowed_origin = 'http://localhost:5173';

header("Access-Control-Allow-Origin: {$allowed_origin}");
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Browsers send an OPTIONS preflight before the real request for non-simple
// requests (e.g. anything with a JSON body or an Authorization header).
// We just need to answer it with 200 and stop — no real work happens here.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}