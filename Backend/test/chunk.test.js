import test from "node:test";
import assert from "node:assert/strict";
import { chunkText } from "../utils/chunk.js";

const words = n => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

test("empty or whitespace text gives no chunks", () => {
    assert.deepEqual(chunkText(""), []);
    assert.deepEqual(chunkText("   \n\n  "), []);
});

test("short text stays in one chunk", () => {
    assert.deepEqual(chunkText("Hello world."), ["Hello world."]);
});

test("long text is split, and no chunk is longer than size", () => {
    const chunks = chunkText(words(1000), { size: 300, overlap: 50 });
    assert.ok(chunks.length > 5);
    for (const c of chunks) assert.ok(c.length <= 300, `chunk too long: ${c.length}`);
});

test("chunks do not cut words in half", () => {
    const chunks = chunkText(words(500), { size: 200, overlap: 40 });
    const valid = new Set(words(500).split(" "));
    for (const c of chunks) for (const w of c.split(" ")) assert.ok(valid.has(w), `broken word: ${w}`);
});

test("neighbouring chunks overlap", () => {
    const chunks = chunkText(words(500), { size: 200, overlap: 60 });
    for (let i = 1; i < chunks.length; i++) {
        const lastWordsOfPrev = chunks[i - 1].split(" ").slice(-3);
        assert.ok(lastWordsOfPrev.some(w => chunks[i].includes(w)), `no overlap between chunk ${i - 1} and ${i}`);
    }
});

test("all content is covered: first and last words appear", () => {
    const chunks = chunkText(words(400), { size: 250, overlap: 50 });
    assert.ok(chunks[0].startsWith("word0"));
    assert.ok(chunks.at(-1).endsWith("word399"));
});

test("prefers to break at a paragraph boundary", () => {
    const text = "A".repeat(10) + " " + "b".repeat(180) + "\n\n" + "C".repeat(100);
    const chunks = chunkText(text, { size: 220, overlap: 20 });
    assert.ok(chunks[0].endsWith("b".repeat(180)));
});

test("rejects overlap >= size", () => {
    assert.throws(() => chunkText("x", { size: 100, overlap: 100 }));
});
