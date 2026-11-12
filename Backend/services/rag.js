import Chunk from "../models/Chunk.js";
import Document from "../models/Document.js";
import { embedTexts } from "../utils/embeddings.js";
import { topK } from "../utils/vector.js";

/**
 * Finds the chunks of this user's documents that are most similar to the query.
 * Flow: embed the query -> load the user's chunk vectors -> cosine similarity -> top k.
 * (Fine for a personal-size collection. For a big one, use a vector index such as Atlas Vector Search.)
 */
export async function retrieveContext(userId, query, { k = 4, minScore = 0.2, signal } = {}) {
    if (!(await Chunk.exists({ userId }))) return [];

    const [queryVec] = await embedTexts([query], signal);
    const chunks = await Chunk.find({ userId }).select("+embedding text documentId index").lean();
    const top = topK(queryVec, chunks, k, minScore);
    if (!top.length) return [];

    const ids = [...new Set(top.map(t => String(t.documentId)))];
    const docs = await Document.find({ _id: { $in: ids } }, "name").lean();
    const names = new Map(docs.map(d => [String(d._id), d.name]));

    return top.map(t => ({
        documentName: names.get(String(t.documentId)) || "Unknown document",
        chunkIndex: t.index,
        text: t.text,
        score: Number(t.score.toFixed(3))
    }));
}
