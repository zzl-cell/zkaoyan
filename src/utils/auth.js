/**
 * Auth utilities — delegates token storage to storage.js (single source of truth).
 * Token key: zky_token (via storage.js)
 */
import { getToken } from './storage'

// Re-export storage functions for backward compatibility
export { getToken, setToken, clearAll as removeToken } from './storage'

/**
 * Check if JWT token is expired.
 * Mock tokens (no dots) are treated as always valid.
 */
export function isTokenExpired() {
  const token = getToken()
  if (!token) return false
  // Mock tokens are not JWTs — treat as always valid
  if (!token.includes('.')) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    // Malformed JWT — treat as expired
    return true
  }
}
