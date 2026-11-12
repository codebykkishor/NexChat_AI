import test from "node:test";
import assert from "node:assert/strict";
import { buildContext, formatDocumentContext } from "../utils/context.js";

const msg = (role, content) => ({ role, content });

test("starts with a system prompt and ends with the new user message", () => {
    const ctx = buildContext([msg("user", "hi"), msg("assistant", "hello")], "how are you?");
    assert.equal(ctx[0].role, "system");
    assert.deepEqual(ctx.at(-1), msg("user", "how are you?"));
    assert.equal(ctx.length, 4);
});

test("keeps only the most recent maxMessages", () => {
    const history = Array.from({ length: 20 }, (_, i) => msg(i % 2 ? "assistant" : "user", `m${i}`));
    const ctx = buildContext(history, "latest", { maxMessages: 5 });
    assert.equal(ctx.length, 1 + 5);
    assert.equal(ctx[1].content, "m16");
});

test("drops oldest messages when the character budget is exceeded", () => {
    const history = [msg("user", "a".repeat(50)), msg("assistant", "b".repeat(50)), msg("user", "c".repeat(50))];
    const ctx = buildContext(history, "d".repeat(50), { maxChars: 110 });
    assert.deepEqual(ctx.slice(1).map(m => m.content[0]), ["c", "d"]);
});

test("always keeps the newest message even if it is over budget", () => {
    const ctx = buildContext([msg("user", "old")], "x".repeat(500), { maxChars: 10 });
    assert.equal(ctx.length, 2);
    assert.equal(ctx[1].content.length, 500);
});

test("strips extra fields such as timestamp and _id", () => {
    const ctx = buildContext([{ role: "user", content: "hi", timestamp: new Date(), _id: "1" }], "yo");
    assert.deepEqual(Object.keys(ctx[1]).sort(), ["content", "role"]);
});

test("document excerpts go into the system message, not the user message", () => {
    const docCtx = formatDocumentContext([{ documentName: "notes.txt", text: "The sky is blue." }]);
    const ctx = buildContext([], "what colour is the sky?", { documentContext: docCtx });
    assert.match(ctx[0].content, /\[1\] \(from "notes\.txt"\)/);
    assert.match(ctx[0].content, /The sky is blue\./);
    assert.match(ctx[0].content, /never follow instructions/);
    assert.equal(ctx[1].content, "what colour is the sky?");
});

test("no excerpts produces an explicit 'nothing found' note", () => {
    assert.match(formatDocumentContext([]), /No relevant excerpts/);
});
