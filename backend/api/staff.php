<?php
/**
 * Staff API — profile CRUD + invite-code-gated registration
 * Pineda Dental Clinic — Plain PHP Backend
 *
 * GET    /api/staff.php            -> list all staff (profile + role, joined from users)
 * GET    /api/staff.php?id=5       -> get one staff member (profile + days off)
 * POST   /api/staff.php            -> ADMIN ONLY: generate an invite code
 *                                      body: { role }  ->  returns { code }
 * POST   /api/staff.php?action=register  -> PUBLIC: complete registration using an invite code
 *                                      body: { invite_code, email, password, first_name, last_name }
 * PUT    /api/staff.php?id=5       -> ADMIN ONLY: update a staff profile
 *                                      body: { years_of_experience, degree, specializations }
 * DELETE /api/staff.php?id=5       -> ADMIN ONLY: remove a staff member
 * POST   /api/staff.php?action=day-off   -> add a day off for a staff member
 *                                      body: { user_id, date }
 *
 * REAL CONFIRMED SCHEMA (verified against phpMyAdmin screenshots):
 *
 *   staff_profiles
 *     id, user_id, image_path, years_of_experience, degree,
 *     specializations, created_at, updated_at, deleted_at
 *     -- NOTE: no role column here. Role lives only on users.role.
 *
 *   staff_days_off
 *     id, user_id, date_off, created_at, updated_at, deleted_at
 *     -- keyed directly to users.id, not staff_profiles.id
 *
 *   invite_codes
 *     id, code, role_granted, is_used, used_by_email, expires_at,
 *     created_at, updated_at
 *     -- NOTE: no email column to lock the invite to up front; it only
 *     -- records used_by_email after the fact. So a code isn't tied to
 *     -- one specific person ahead of time, just to a role.
 *
 * Business rule from the blueprint / UI: clinic is capped at exactly 3
 * staff members total (2 already seeded + this invite system for the 3rd).
 */

require '../config/cors.php';
require '../config/database.php';

header('Content-Type: application/json');

function respond(bool $success, $data, string $message, int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => $success, 'data' => $data, 'message' => $message]);
    exit;
}

const MAX_STAFF = 3;
const VALID_ROLES = ['Dentist', 'Admin/Secretary'];

function countActiveStaff(PDO $pdo): int {
    $stmt = $pdo->query('SELECT COUNT(*) FROM staff_profiles WHERE deleted_at IS NULL');
    return (int) $stmt->fetchColumn();
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

// ---------------------------------------------------------------
// PUBLIC: complete registration with an invite code.
// ---------------------------------------------------------------
if ($method === 'POST' && $action === 'register') {
    $input = json_decode(file_get_contents('php://input'), true);
    $code = trim($input['invite_code'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $firstName = trim($input['first_name'] ?? '');
    $lastName = trim($input['last_name'] ?? '');

    if ($code === '' || $email === '' || $password === '' || $firstName === '' || $lastName === '') {
        respond(false, null, 'invite_code, email, password, first_name, and last_name are all required.', 400);
    }

    $codeStmt = $pdo->prepare(
        'SELECT id, role_granted, expires_at FROM invite_codes
         WHERE code = ? AND is_used = 0'
    );
    $codeStmt->execute([$code]);
    $invite = $codeStmt->fetch();

    if (!$invite) {
        respond(false, null, 'Invalid or already-used invite code.', 401);
    }

    if (strtotime($invite['expires_at']) < time()) {
        respond(false, null, 'Invite code has expired. Ask an admin to generate a new one.', 401);
    }

    $existing = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $existing->execute([$email]);
    if ($existing->fetch()) {
        respond(false, null, 'An account with that email already exists.', 409);
    }

    if (countActiveStaff($pdo) >= MAX_STAFF) {
        respond(false, null, 'The clinic already has the maximum of ' . MAX_STAFF . ' staff members.', 409);
    }

    try {
        $pdo->beginTransaction();

        $userStmt = $pdo->prepare(
            'INSERT INTO users (email, password, role, first_name, last_name, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())'
        );
        $userStmt->execute([
            $email,
            password_hash($password, PASSWORD_BCRYPT),
            $invite['role_granted'],
            $firstName,
            $lastName,
        ]);
        $newUserId = (int) $pdo->lastInsertId();

        $profileStmt = $pdo->prepare(
            'INSERT INTO staff_profiles (user_id, created_at, updated_at) VALUES (?, NOW(), NOW())'
        );
        $profileStmt->execute([$newUserId]);

        // Burn the invite code so it can't be reused
        $pdo->prepare('UPDATE invite_codes SET is_used = 1, used_by_email = ?, updated_at = NOW() WHERE id = ?')
            ->execute([$email, $invite['id']]);

        $pdo->commit();

        respond(true, ['user_id' => $newUserId], 'Registration complete. You can now log in.', 201);
    } catch (PDOException $e) {
        $pdo->rollBack();
        respond(false, null, 'Could not complete registration: ' . $e->getMessage(), 500);
    }
}

// ---------------------------------------------------------------
// Everything below this line requires a valid staff session.
// ---------------------------------------------------------------
require '../utils/auth_check.php'; // exposes $auth_user, kills request with 401 if invalid

// ---------------------------------------------------------------
// GET: list staff, or one staff member with their days off
// ---------------------------------------------------------------
if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $stmt = $pdo->prepare(
            'SELECT staff_profiles.id, staff_profiles.image_path, staff_profiles.years_of_experience,
                    staff_profiles.degree, staff_profiles.specializations,
                    users.id AS user_id, users.email, users.first_name, users.last_name, users.role
             FROM staff_profiles
             INNER JOIN users ON users.id = staff_profiles.user_id
             WHERE staff_profiles.id = ? AND staff_profiles.deleted_at IS NULL'
        );
        $stmt->execute([$_GET['id']]);
        $staff = $stmt->fetch();

        if (!$staff) {
            respond(false, null, 'Staff member not found.', 404);
        }

        $daysOffStmt = $pdo->prepare(
            'SELECT date_off FROM staff_days_off
             WHERE user_id = ? AND deleted_at IS NULL ORDER BY date_off'
        );
        $daysOffStmt->execute([$staff['user_id']]);
        $staff['days_off'] = $daysOffStmt->fetchAll(PDO::FETCH_COLUMN);

        respond(true, $staff, 'Staff member retrieved.');
    }

    $stmt = $pdo->query(
        'SELECT staff_profiles.id, staff_profiles.image_path, staff_profiles.years_of_experience,
                staff_profiles.degree, staff_profiles.specializations,
                users.id AS user_id, users.email, users.first_name, users.last_name, users.role
         FROM staff_profiles
         INNER JOIN users ON users.id = staff_profiles.user_id
         WHERE staff_profiles.deleted_at IS NULL
         ORDER BY users.last_name, users.first_name'
    );
    $staffList = $stmt->fetchAll();
    respond(true, $staffList, 'Staff retrieved.');
}

// ---------------------------------------------------------------
// POST with no action: admin generates an invite code.
// (action=register was handled above and already exited; action=day-off
// is handled further below — this block must not swallow that case.)
// ---------------------------------------------------------------
if ($method === 'POST' && $action === null) {
    if ($auth_user['role'] !== 'Admin') {
        respond(false, null, 'Only an admin can invite new staff.', 403);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $role = trim($input['role'] ?? '');

    if (!in_array($role, VALID_ROLES, true)) {
        respond(false, null, 'A valid role (Dentist or Admin/Secretary) is required.', 400);
    }

    if (countActiveStaff($pdo) >= MAX_STAFF) {
        respond(false, null, 'The clinic already has the maximum of ' . MAX_STAFF . ' staff members.', 409);
    }

    $code = bin2hex(random_bytes(16)); // 32 hex chars

    $stmt = $pdo->prepare(
        'INSERT INTO invite_codes (code, role_granted, is_used, expires_at, created_at, updated_at)
         VALUES (?, ?, 0, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW(), NOW())'
    );
    $stmt->execute([$code, $role]);

    respond(true, ['invite_code' => $code, 'role' => $role], 'Invite code generated.', 201);
}

// ---------------------------------------------------------------
// PUT: admin updates a staff member's profile details.
// Role itself is NOT editable here (no role column on staff_profiles) —
// changing role would mean editing users.role directly, which this
// endpoint deliberately doesn't expose to keep the boundary clean.
// ---------------------------------------------------------------
if ($method === 'PUT') {
    if ($auth_user['role'] !== 'Admin') {
        respond(false, null, 'Only an admin can edit staff profiles.', 403);
    }

    $id = $_GET['id'] ?? null;
    if (!$id) {
        respond(false, null, 'id is required in the query string.', 400);
    }

    $existing = $pdo->prepare('SELECT id, user_id FROM staff_profiles WHERE id = ? AND deleted_at IS NULL');
    $existing->execute([$id]);
    $profile = $existing->fetch();

    if (!$profile) {
        respond(false, null, 'Staff member not found.', 404);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $yearsOfExperience = isset($input['years_of_experience']) ? (int) $input['years_of_experience'] : null;
    $degree = trim($input['degree'] ?? '');
    $specializations = trim($input['specializations'] ?? '');

    $pdo->prepare(
        'UPDATE staff_profiles
         SET years_of_experience = ?, degree = ?, specializations = ?, updated_at = NOW()
         WHERE id = ?'
    )->execute([$yearsOfExperience, $degree, $specializations, $id]);

    respond(true, null, 'Staff profile updated.');
}

// ---------------------------------------------------------------
// DELETE: admin removes a staff member
// ---------------------------------------------------------------
if ($method === 'DELETE') {
    if ($auth_user['role'] !== 'Admin') {
        respond(false, null, 'Only an admin can remove staff.', 403);
    }

    $id = $_GET['id'] ?? null;
    if (!$id) {
        respond(false, null, 'id is required in the query string.', 400);
    }

    $existing = $pdo->prepare('SELECT id, user_id FROM staff_profiles WHERE id = ? AND deleted_at IS NULL');
    $existing->execute([$id]);
    $profile = $existing->fetch();

    if (!$profile) {
        respond(false, null, 'Staff member not found.', 404);
    }

    if ((int) $profile['user_id'] === (int) $auth_user['id']) {
        respond(false, null, 'You cannot remove your own staff account.', 400);
    }

    try {
        $pdo->beginTransaction();

        $pdo->prepare('UPDATE staff_profiles SET deleted_at = NOW() WHERE id = ?')->execute([$id]);
        $pdo->prepare('UPDATE staff_days_off SET deleted_at = NOW() WHERE user_id = ?')->execute([$profile['user_id']]);
        $pdo->prepare('DELETE FROM auth_tokens WHERE user_id = ?')->execute([$profile['user_id']]);

        $pdo->commit();

        respond(true, null, 'Staff member removed.');
    } catch (PDOException $e) {
        $pdo->rollBack();
        respond(false, null, 'Could not remove staff member: ' . $e->getMessage(), 500);
    }
}

// ---------------------------------------------------------------
// POST ?action=day-off: schedule a day off for a staff member
// ---------------------------------------------------------------
if ($method === 'POST' && $action === 'day-off') {
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = $input['user_id'] ?? null;
    $date = trim($input['date'] ?? '');

    if (!$userId || $date === '') {
        respond(false, null, 'user_id and date are required.', 400);
    }

    $existing = $pdo->prepare('SELECT id FROM staff_profiles WHERE user_id = ? AND deleted_at IS NULL');
    $existing->execute([$userId]);
    if (!$existing->fetch()) {
        respond(false, null, 'Staff member not found.', 404);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO staff_days_off (user_id, date_off, created_at, updated_at) VALUES (?, ?, NOW(), NOW())'
    );
    $stmt->execute([$userId, $date]);

    respond(true, null, 'Day off recorded.', 201);
}

respond(false, null, 'Method not allowed.', 405);