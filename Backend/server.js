import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import documentRoutes from "./routes/documents.js";
import chatRoutes from "./routes/chat.js";

const PORT = process.env.PORT || 8080;

// Fail fast on missing configuration instead of failing later in confusing ways.
for (const name of ["MONGODB_URI", "OPENAI_API_KEY", "JWT_SECRET"]) {
    if (!process.env[name]) {
        console.error(`Missing required environment variable: ${name}`);
        process.exit(1);
    }
}
if (process.env.JWT_SECRET.length < 16) {
    console.error("JWT_SECRET must be at least 16 characters long");
    process.exit(1);
}

const app = express();
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY)); // needed behind Render/Heroku etc.

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));

const limiter = (windowMs, limit, message) =>
    rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: message } });

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Documents are mounted first because uploads need a bigger JSON body limit than the rest of the API.
app.use("/api/documents",
    limiter(60 * 60 * 1000, 20, "Too many uploads. Please try again later."),
    express.json({ limit: "600kb" }),
    documentRoutes);

app.use(express.json({ limit: "100kb" }));
app.use("/api/auth", limiter(15 * 60 * 1000, 20, "Too many attempts. Please try again in a few minutes."), authRoutes);
app.use("/api/chat", limiter(60 * 1000, 20, "Too many requests. Please slow down and try again shortly."));
app.use("/api", chatRoutes);

// Last-resort error handler (bad JSON, oversized bodies, etc.)
app.use((err, req, res, next) => {
    console.error(err);
    if (err.status === 413) return res.status(413).json({ error: "Request too large" });
    res.status(err.status || 500).json({ error: err.status === 400 ? "Invalid request" : "Server error" });
});

try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected with Database!");
    app.listen(PORT, () => console.log(`server running on ${PORT}`));
} catch (err) {
    console.error("Failed to connect with DB", err);
    process.exit(1);
}
