// Minimal Server-Sent-Events parser. Network chunks can split an event in the middle,
// so we buffer text and only emit complete "data: ..." lines.

export function createSSEParser(onData) {
    let buffer = "";
    return {
        push(chunk) {
            buffer += chunk;
            const lines = buffer.split("\n");
            buffer = lines.pop(); // last piece may be incomplete, keep it for next chunk
            for (const raw of lines) {
                const line = raw.trim();
                if (!line.startsWith("data:")) continue;
                onData(line.slice(5).trim());
            }
        },
        flush() {
            if (buffer.trim().startsWith("data:")) onData(buffer.trim().slice(5).trim());
            buffer = "";
        }
    };
}
