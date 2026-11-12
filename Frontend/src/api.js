import { API_URL } from "./config.js";

// Token + email are kept in localStorage so a refresh keeps you logged in.
// (Trade-off: httpOnly cookies are safer against XSS; localStorage is simpler for a SPA + separate API.)
const TOKEN_KEY = "sigmagpt_token";
const EMAIL_KEY = "sigmagpt_email";

const read = key => { try { return localStorage.getItem(key); } catch { return null; } };

export const getToken = () => read(TOKEN_KEY);
export const getEmail = () => read(EMAIL_KEY);

export const saveAuth = (token, email) => {
    try { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(EMAIL_KEY, email); } catch { /* storage unavailable */ }
};
export const clearAuth = () => {
    try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(EMAIL_KEY); } catch { /* storage unavailable */ }
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = fn => { onUnauthorized = fn; };

// fetch() against the backend that adds the login token and logs out if the server says it is invalid/expired.
export async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (response.status === 401 && token) onUnauthorized();
    return response;
}
