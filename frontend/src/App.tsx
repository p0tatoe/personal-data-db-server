import { useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";

type UploadResult = { total: number; uploadedList: number; interaction: number };

type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "done"; result: UploadResult }
  | { kind: "error"; message: string };

const ACCEPTED = [".html", ".htm", ".json"];

function isAccepted(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED.some((ext) => name.endsWith(ext));
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function choose(chosen: File | undefined) {
    if (!chosen) return;
    if (!isAccepted(chosen)) {
      setFile(null);
      setStatus({ kind: "error", message: "Choose an .html or .json file." });
      return;
    }
    setFile(chosen);
    setStatus({ kind: "idle" });
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0]);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setStatus({ kind: "uploading" });

    try {
      // The file itself is the request body; the server works out the format.
      const res = await fetch("/api/uploads", { method: "POST", body: file });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? `Upload failed (${res.status})`);
      }
      setStatus({ kind: "done", result: body as UploadResult });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    }
  }

  const uploading = status.kind === "uploading";

  return (
    <main>
      <h1>Personal Data</h1>
      <p className="lede">
        Upload the <strong>Advertisers using your activity or information</strong>{" "}
        file from your Facebook data download, in HTML or JSON format.
      </p>

      <form onSubmit={onSubmit}>
        <label
          className={`dropzone${dragging ? " dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            onChange={(e) => choose(e.target.files?.[0])}
            disabled={uploading}
          />
          {file ? (
            <span>
              <strong>{file.name}</strong> · {formatSize(file.size)}
            </span>
          ) : (
            <span>
              Drop a file here, or <u>browse</u>
            </span>
          )}
        </label>

        <button type="submit" disabled={!file || uploading}>
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </form>

      <div aria-live="polite">
        {status.kind === "error" && <p className="message error">{status.message}</p>}
        {status.kind === "done" && (
          <div className="message success">
            <p>
              Imported <strong>{status.result.total.toLocaleString()}</strong> advertiser entries.
            </p>
            <dl>
              <dt>From uploaded lists</dt>
              <dd>{status.result.uploadedList.toLocaleString()}</dd>
              <dt>From interactions</dt>
              <dd>{status.result.interaction.toLocaleString()}</dd>
            </dl>
          </div>
        )}
      </div>
    </main>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
