import { fetchWithRetry } from "./http.js";

const MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1") + "/embeddings";
const BATCH_SIZE = 64;

/** Turns an array of strings into an array of embedding vectors (same order). */
export async function embedTexts(texts, signal) {
    const vectors = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const response = await fetchWithRetry(URL, {
            method: "POST",
            signal,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({ model: MODEL, input: batch })
        });
        const { data } = await response.json();
        if (!Array.isArray(data) || data.length !== batch.length) {
            throw new Error("Unexpected response from the embeddings API");
        }
        data.sort((a, b) => a.index - b.index);
        for (const item of data) vectors.push(item.embedding);
    }
    return vectors;
}
