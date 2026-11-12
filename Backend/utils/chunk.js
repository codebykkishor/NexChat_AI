/**
 * Splits text into overlapping chunks of roughly `size` characters.
 * It prefers to cut at a paragraph end, then a sentence end, then a space,
 * so chunks do not stop in the middle of a word. The overlap keeps context
 * that sits on a boundary available in both neighbouring chunks.
 */
export function chunkText(text, { size = 800, overlap = 150 } = {}) {
    if (overlap >= size) throw new Error("overlap must be smaller than size");

    const clean = String(text)
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    if (!clean) return [];

    const chunks = [];
    let start = 0;
    while (start < clean.length) {
        let end = Math.min(start + size, clean.length);

        if (end < clean.length) {
            const windowStart = start + Math.floor(size * 0.7);
            const tail = clean.slice(windowStart, end);
            const para = tail.lastIndexOf("\n\n");
            const sentence = Math.max(tail.lastIndexOf(". "), tail.lastIndexOf("? "), tail.lastIndexOf("! "), tail.lastIndexOf(".\n"));
            const space = tail.lastIndexOf(" ");
            const rel = para >= 0 ? para + 2 : sentence >= 0 ? sentence + 2 : space >= 0 ? space + 1 : -1;
            if (rel > 0) end = windowStart + rel;
        }

        const piece = clean.slice(start, end).trim();
        if (piece) chunks.push(piece);
        if (end >= clean.length) break;

        let next = Math.max(end - overlap, start + 1);
        const space = clean.indexOf(" ", next);
        if (space !== -1 && space - next < 40) next = space + 1; // start the next chunk at a word boundary
        start = next;
    }
    return chunks;
}
