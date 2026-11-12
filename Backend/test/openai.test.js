import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

// A fake OpenAI server so streaming, retry and embedding logic can be tested without network or an API key.
let mode = "ok";
let calls = 0;
let lastEmbeddingInput = null;

const server = http.createServer((req, res) => {
    calls++;
    let body = "";
    req.on("data", c => (body += c));
    req.on("end", () => {
        if (mode === "retry" && calls === 1) { res.writeHead(429, { "Content-Type": "application/json" }); return res.end("{}"); }
        if (mode === "unauthorized") {
            res.writeHead(401, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: { message: "bad key" } }));
        }

        if (req.url.endsWith("/embeddings")) {
            const input = JSON.parse(body).input;
            lastEmbeddingInput = input;
            // Return out of order on purpose; the client must sort by index.
            const data = input.map((text, index) => ({ index, embedding: [text.length, index] })).reverse();
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ data }));
        }

        res.writeHead(200, { "Content-Type": "text/event-stream" });
        const ev = t => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`;
        const payload = ev("Hel") + ev("lo ") + ev("world") + "data: [DONE]\n\n";
        res.write(payload.slice(0, 30)); // split mid-event on purpose
        setTimeout(() => { res.write(payload.slice(30)); res.end(); }, 10);
    });
});
await new Promise(r => server.listen(0, r));
process.env.OPENAI_BASE_URL = `http://127.0.0.1:${server.address().port}`;
process.env.OPENAI_API_KEY = "test";
const { streamChatCompletion, OpenAIError } = await import("../utils/openai.js");
const { embedTexts } = await import("../utils/embeddings.js");

test.after(() => server.close());

test("streams tokens in order and returns the full reply", async () => {
    mode = "ok"; calls = 0;
    const tokens = [];
    const full = await streamChatCompletion([{ role: "user", content: "hi" }], t => tokens.push(t));
    assert.deepEqual(tokens, ["Hel", "lo ", "world"]);
    assert.equal(full, "Hello world");
});

test("retries once after a 429 and then succeeds", async () => {
    mode = "retry"; calls = 0;
    const full = await streamChatCompletion([{ role: "user", content: "hi" }], () => {});
    assert.equal(full, "Hello world");
    assert.equal(calls, 2);
});

test("throws OpenAIError with the API message on a non-retryable error", async () => {
    mode = "unauthorized"; calls = 0;
    await assert.rejects(
        () => streamChatCompletion([{ role: "user", content: "hi" }], () => {}),
        err => err instanceof OpenAIError && err.status === 401 && err.message === "bad key"
    );
    assert.equal(calls, 1);
});

test("embedTexts returns one vector per text, in the original order", async () => {
    mode = "ok"; calls = 0;
    const vectors = await embedTexts(["a", "bb", "ccc"]);
    assert.deepEqual(vectors, [[1, 0], [2, 1], [3, 2]]);
});

test("embedTexts splits large inputs into batches of at most 64", async () => {
    mode = "ok"; calls = 0;
    const texts = Array.from({ length: 150 }, (_, i) => `t${i}`);
    const vectors = await embedTexts(texts);
    assert.equal(vectors.length, 150);
    assert.equal(calls, 3); // 64 + 64 + 22
    assert.equal(lastEmbeddingInput.length, 22);
});
