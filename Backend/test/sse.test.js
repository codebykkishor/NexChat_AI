import test from "node:test";
import assert from "node:assert/strict";
import { createSSEParser } from "../utils/sse.js";

test("parses complete data lines", () => {
    const out = [];
    const p = createSSEParser(d => out.push(d));
    p.push('data: {"a":1}\n\ndata: {"a":2}\n\n');
    assert.deepEqual(out, ['{"a":1}', '{"a":2}']);
});

test("handles an event split across network chunks", () => {
    const out = [];
    const p = createSSEParser(d => out.push(d));
    p.push('data: {"tok');
    assert.deepEqual(out, []);
    p.push('en":"hi"}\n\n');
    assert.deepEqual(out, ['{"token":"hi"}']);
});

test("ignores non-data lines and passes [DONE] through", () => {
    const out = [];
    const p = createSSEParser(d => out.push(d));
    p.push(": keep-alive\nevent: ping\ndata: [DONE]\n\n");
    assert.deepEqual(out, ["[DONE]"]);
});

test("flush emits a final line without trailing newline", () => {
    const out = [];
    const p = createSSEParser(d => out.push(d));
    p.push("data: last");
    p.flush();
    assert.deepEqual(out, ["last"]);
});
