export function cosineSimilarity(a, b) {
    if (a.length !== b.length) throw new Error("Vectors must have the same length");
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Returns the k items most similar to queryVec, best first, dropping anything below minScore.
 * Each result is the original item (without its embedding) plus a `score`.
 */
export function topK(queryVec, items, k = 4, minScore = 0) {
    return items
        .map(({ embedding, ...rest }) => ({ ...rest, score: cosineSimilarity(queryVec, embedding) }))
        .filter(r => r.score >= minScore)
        .sort((x, y) => y.score - x.score)
        .slice(0, k);
}
