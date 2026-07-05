import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

/**
 * Wraps a route element. If there's no auth token in localStorage,
 * redirect to /login instead of rendering the protected page.
 *
 * This only checks that a token EXISTS locally — it doesn't verify the
 * token is still valid against the backend (not expired, not deleted by
 * logout elsewhere). That's fine for routing purposes: any dashboard API
 * call with a bad token will get a 401 from auth_check.php anyway, which
 * individual pages should handle by redirecting to /login themselves.
 */
export default function ProtectedRoute({ children }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}