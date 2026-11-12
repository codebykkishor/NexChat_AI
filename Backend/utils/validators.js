export const normalizeEmail = email => String(email ?? "").trim().toLowerCase();

export function isValidEmail(email) {
    return typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Returns an error message, or null when the password is acceptable.
export function passwordError(password) {
    if (typeof password !== "string") return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (password.length > 128) return "Password is too long";
    return null;
}
