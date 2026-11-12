import { createContext, useCallback, useEffect, useState } from "react";
import { apiFetch, clearAuth, getEmail, getToken, saveAuth, setUnauthorizedHandler } from "./api.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(getToken());
    const [email, setEmail] = useState(getEmail());

    const logout = useCallback(() => {
        clearAuth();
        setToken(null);
        setEmail(null);
    }, []);

    useEffect(() => {
        setUnauthorizedHandler(logout);
    }, [logout]);

    // mode is "login" or "register"
    const authenticate = async (mode, emailInput, password) => {
        const response = await apiFetch(`/auth/${mode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailInput, password })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Authentication failed");
        saveAuth(data.token, data.user.email);
        setToken(data.token);
        setEmail(data.user.email);
    };

    return (
        <AuthContext.Provider value={{ token, email, authenticate, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
