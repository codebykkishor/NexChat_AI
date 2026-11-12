import express from "express";
import Thread from "../models/Thread.js";
import { requireAuth } from "../middleware/auth.js";
import { streamChatCompletion, OpenAIError } from "../utils/openai.js";
import { buildContext, formatDocumentContext } from "../utils/context.js";
import { retrieveContext } from "../services/rag.js";

const router = express.Router();

const MAX_MESSAGE_LENGTH = 4000;
const THREAD_ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;
const MAX_CONTEXT_MESSAGES = Number(process.env.CONTEXT_MAX_MESSAGES) || 12;

const makeTitle = text => (text.length > 50 ? text.slice(0, 50).trim() + "…" : text);

// Every query below includes userId, so a user can only ever touch their own threads.

router.get("/thread", requireAuth, async (req, res) => {
    try {
        const threads = await Thread.find({ userId: req.userId }, "threadId title updatedAt").sort({ updatedAt: -1 });
        res.json(threads);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch threads" });
    }
});

router.get("/thread/:threadId", requireAuth, async (req, res) => {
    try {
        const thread = await Thread.findOne({ threadId: req.params.threadId, userId: req.userId });
        if (!thread) return res.status(404).json({ error: "Thread not found" });
        res.json(thread.messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch chat" });
    }
});

router.delete("/thread/:threadId", requireAuth, async (req, res) => {
    try {
        const deleted = await Thread.findOneAndDelete({ threadId: req.params.threadId, userId: req.userId });
        if (!deleted) return res.status(404).json({ error: "Thread not found" });
        res.json({ success: "Thread deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete thread" });
    }
});

// Chat: validates input, optionally retrieves excerpts from the user's documents (RAG),
// sends recent history as context, and streams the reply as Server-Sent Events.
router.post("/chat", requireAuth, async (req, res) => {
    const { threadId } = req.body ?? {};
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const useDocs = req.body?.useDocs === true;

    if (typeof threadId !== "string" || !THREAD_ID_PATTERN.test(threadId)) {
        return res.status(400).json({ error: "Invalid threadId" });
    }
    if (!message) return res.status(400).json({ error: "Message cannot be empty" });
    if (message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
    }

    // Abort the OpenAI request if the user closes the tab.
    const controller = new AbortController();
    res.on("close", () => { if (!res.writableEnded) controller.abort(); });

    let streamStarted = false;
    const send = obj => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    try {
        let thread = await Thread.findOne({ threadId, userId: req.userId });
        if (!thread) thread = new Thread({ userId: req.userId, threadId, title: makeTitle(message), messages: [] });

        // RAG step: find the most relevant excerpts BEFORE streaming starts, so failures return plain JSON errors.
        let sources = [];
        let documentContext;
        if (useDocs) {
            const chunks = await retrieveContext(req.userId, message, { signal: controller.signal });
            sources = chunks.map(({ documentName, chunkIndex, score }) => ({ documentName, chunkIndex, score }));
            documentContext = formatDocumentContext(chunks);
        }

        const context = buildContext(thread.messages, message, { maxMessages: MAX_CONTEXT_MESSAGES, documentContext });

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();
        streamStarted = true;

        if (useDocs) send({ sources });

        const reply = await streamChatCompletion(context, token => send({ token }), controller.signal);

        if (reply) {
            thread.messages.push({ role: "user", content: message });
            thread.messages.push({ role: "assistant", content: reply, sources: useDocs ? sources : undefined });
            thread.updatedAt = new Date();
            await thread.save();
        }
        send({ done: true });
        res.end();
    } catch (err) {
        if (controller.signal.aborted) return; // client left, nothing to send
        console.error(err);
        const userMessage = err instanceof OpenAIError && err.status === 429
            ? "The AI service is busy right now. Please try again in a moment."
            : "Something went wrong while generating the reply.";
        if (streamStarted) { send({ error: userMessage }); res.end(); }
        else res.status(500).json({ error: userMessage });
    }
});

export default router;
