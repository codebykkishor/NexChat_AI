import express from "express";
import mongoose from "mongoose";
import Document from "../models/Document.js";
import Chunk from "../models/Chunk.js";
import { requireAuth } from "../middleware/auth.js";
import { chunkText } from "../utils/chunk.js";
import { embedTexts } from "../utils/embeddings.js";
import { OpenAIError } from "../utils/http.js";

const router = express.Router();
router.use(requireAuth);

const MAX_DOC_CHARS = 200_000;
const MAX_DOCS_PER_USER = 10;

router.get("/", async (req, res) => {
    try {
        const docs = await Document.find({ userId: req.userId }, "name chunkCount createdAt").sort({ createdAt: -1 });
        res.json(docs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch documents" });
    }
});

// Upload: split into chunks, embed every chunk, store chunks + vectors.
router.post("/", async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 120) : "";
    const text = typeof req.body?.text === "string" ? req.body.text : "";

    if (!name) return res.status(400).json({ error: "Document name is required" });
    if (!text.trim()) return res.status(400).json({ error: "The document is empty" });
    if (text.length > MAX_DOC_CHARS) {
        return res.status(400).json({ error: `Document too large (max ${MAX_DOC_CHARS.toLocaleString()} characters)` });
    }

    try {
        if (await Document.countDocuments({ userId: req.userId }) >= MAX_DOCS_PER_USER) {
            return res.status(400).json({ error: `You can store up to ${MAX_DOCS_PER_USER} documents. Delete one first.` });
        }

        const pieces = chunkText(text);
        const vectors = await embedTexts(pieces); // embed first, so a failure leaves nothing half-saved

        const doc = await Document.create({ userId: req.userId, name, chunkCount: pieces.length });
        try {
            await Chunk.insertMany(pieces.map((piece, i) => ({
                userId: req.userId, documentId: doc._id, index: i, text: piece, embedding: vectors[i]
            })));
        } catch (err) {
            await Document.deleteOne({ _id: doc._id });
            throw err;
        }
        res.status(201).json({ _id: doc._id, name: doc.name, chunkCount: doc.chunkCount, createdAt: doc.createdAt });
    } catch (err) {
        console.error(err);
        if (err instanceof OpenAIError) return res.status(502).json({ error: "The embedding service failed. Please try again." });
        res.status(500).json({ error: "Failed to save document" });
    }
});

router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid document id" });
    try {
        const deleted = await Document.findOneAndDelete({ _id: id, userId: req.userId });
        if (!deleted) return res.status(404).json({ error: "Document not found" });
        await Chunk.deleteMany({ documentId: id, userId: req.userId });
        res.json({ success: "Document deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete document" });
    }
});

export default router;
