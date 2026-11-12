import test from "node:test";
import assert from "node:assert/strict";
import { cosineSimilarity, topK } from "../utils/vector.js";

const close = (a, b) => Math.abs(a - b) < 1e-9;

test("identical vectors score 1, orthogonal 0, opposite -1", () => {
    assert.ok(close(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1));
    assert.ok(close(cosineSimilarity([1, 0], [0, 1]), 0));
    assert.ok(close(cosineSimilarity([1, 0], [-1, 0]), -1));
});

test("scale does not change similarity", () => {
    assert.ok(close(cosineSimilarity([1, 2], [2, 4]), 1));
});

test("zero vector gives 0 instead of NaN", () => {
    assert.equal(cosineSimilarity([0, 0], [1, 2]), 0);
});

test("different lengths throw", () => {
    assert.throws(() => cosineSimilarity([1], [1, 2]));
});

test("topK returns best first, limits k, and removes the embedding", () => {
    const items = [
        { id: "far", embedding: [0, 1] },
        { id: "near", embedding: [1, 0.1] },
        { id: "mid", embedding: [1, 1] }
    ];
    const res = topK([1, 0], items, 2);
    assert.deepEqual(res.map(r => r.id), ["near", "mid"]);
    assert.equal("embedding" in res[0], false);
    assert.ok(res[0].score > res[1].score);
});

test("topK drops results below minScore", () => {
    const items = [{ id: "a", embedding: [1, 0] }, { id: "b", embedding: [0, 1] }];
    assert.deepEqual(topK([1, 0], items, 5, 0.5).map(r => r.id), ["a"]);
});
