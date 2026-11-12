import express from "express";
import User from "../models/User.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { isValidEmail, normalizeEmail, passwordError } from "../utils/validators.js";
import { signToken } from "../middleware/auth.js";

const router = express.Router();

// Used so a login for an unknown email takes about as long as a real one (hides which emails exist).
const DUMMY_HASH = await hashPassword("not-a-real-password");

router.post("/register", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!isValidEmail(email)) return res.status(400).json({ error: "Enter a valid email address" });
    const pwError = passwordError(password);
    if (pwError) return res.status(400).json({ error: pwError });

    try {
        const user = await User.create({ email, passwordHash: await hashPassword(password) });
        res.status(201).json({ token: signToken(user._id), user: { email: user.email } });
    } catch (err) {
        if (err?.code === 11000) return res.status(409).json({ error: "An account with this email already exists" });
        console.error(err);
        res.status(500).json({ error: "Could not create account" });
    }
});

router.post("/login", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    try {
        const user = await User.findOne({ email });
        const ok = await verifyPassword(password, user ? user.passwordHash : DUMMY_HASH);
        if (!user || !ok) return res.status(401).json({ error: "Invalid email or password" });
        res.json({ token: signToken(user._id), user: { email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed" });
    }
});

export default router;
