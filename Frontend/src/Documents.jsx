import "./Documents.css";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./api.js";

const MAX_CHARS = 200000; // keep in sync with the backend limit

function Documents() {
    const [docs, setDocs] = useState([]);
    const [status, setStatus] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInput = useRef(null);

    const loadDocs = async () => {
        try {
            const response = await apiFetch("/documents");
            if (response.ok) setDocs(await response.json());
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        loadDocs();
    }, []);

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow picking the same file again later
        if (!file) return;

        setStatus("");
        if (!/\.(txt|md)$/i.test(file.name)) {
            setStatus("Only .txt and .md files are supported.");
            return;
        }

        setUploading(true);
        try {
            const text = await file.text();
            if (text.length > MAX_CHARS) throw new Error("File is too large (max 200,000 characters).");

            const response = await apiFetch("/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: file.name, text })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Upload failed.");

            setStatus(`Added "${file.name}" (${data.chunkCount} chunks).`);
            await loadDocs();
        } catch (err) {
            setStatus(err.message);
        }
        setUploading(false);
    };

    const removeDoc = async (id) => {
        try {
            const response = await apiFetch(`/documents/${id}`, { method: "DELETE" });
            if (response.ok) setDocs(prev => prev.filter(d => d._id !== id));
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <div className="documents">
            <div className="documentsHeader">
                <span>My documents</span>
                <button onClick={() => fileInput.current?.click()} disabled={uploading}>
                    {uploading ? "Uploading..." : "+ Add"}
                </button>
                <input ref={fileInput} type="file" accept=".txt,.md" hidden onChange={handleFile} />
            </div>

            {status && <p className="documentsStatus">{status}</p>}

            <ul>
                {docs.map(doc => (
                    <li key={doc._id}>
                        <span title={doc.name}>{doc.name}</span>
                        <i className="fa-solid fa-xmark" onClick={() => removeDoc(doc._id)}></i>
                    </li>
                ))}
                {docs.length === 0 && <li className="documentsEmpty">No documents yet</li>}
            </ul>
        </div>
    );
}

export default Documents;
