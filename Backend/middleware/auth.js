import jwt from "jsonwebtoken";

export function signToken(userId) {
    return jwt.sign({}, process.env.JWT_SECRET, { subject: String(userId), expiresIn: "7d", algorithm: "HS256" });
}

// Protects a route: expects "Authorization: Bearer <token>" and sets req.userId.
export function requireAuth(req, res, next) {
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Authentication required" });
    }
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
        req.userId = payload.sub;
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}
