"use client";

import { FileUp, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseCourseJson } from "@/lib/course-json";

const EXAMPLE = `[
  {
    "section": 1,
    "title": "Introduction",
    "lessons": [
      { "lesson": 1, "title": "Welcome", "durationSeconds": 600 }
    ]
  }
]`;

/**
 * Paste or upload course JSON. On success calls `onImport(sections)`; on
 * failure lists every problem with its path (e.g. `$[1].lessons[2].title`).
 */
export function JsonImport({ text, onTextChange, onImport }) {
  const [errors, setErrors] = useState([]);
  const fileInput = useRef(null);

  function runImport(source) {
    const result = parseCourseJson(source);
    if (result.ok) {
      setErrors([]);
      onImport(result.sections);
    } else {
      setErrors(result.errors);
    }
  }

  async function onFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      setErrors([
        { path: "$", message: "That file is over 1 MB. Is it the right one?" },
      ]);
      return;
    }
    const content = await file.text();
    onTextChange(content);
    runImport(content);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Course JSON
        <textarea
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          rows={6}
          spellCheck={false}
          placeholder="Paste your JSON here"
          className="w-full rounded-2xl border border-border bg-background p-4 font-mono text-base shadow-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => fileInput.current?.click()}>
          <FileUp className="size-4" aria-hidden="true" />
          Upload file
        </Button>
        <Button onClick={() => runImport(text)}>Validate &amp; import</Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onFile}
        />
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl bg-danger-soft p-4 text-sm text-danger"
        >
          <p className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="size-4" aria-hidden="true" />
            Fix{" "}
            {errors.length === 1
              ? "this problem"
              : `these ${errors.length} problems`}{" "}
            and try again
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {errors.map((error) => (
              <li key={`${error.path}-${error.message}`}>
                <code className="break-all rounded bg-card px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {error.path}
                </code>
                <span className="mt-0.5 block">{error.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="rounded-2xl bg-muted p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          Expected format
        </summary>
        <pre className="mt-3 overflow-x-auto font-mono text-xs">{EXAMPLE}</pre>
        <p className="mt-2 text-muted-foreground">
          Every section needs <code>section</code>, <code>title</code> and{" "}
          <code>lessons</code>. Every lesson needs <code>lesson</code>,{" "}
          <code>title</code> and <code>durationSeconds</code> (whole seconds).
        </p>
      </details>
    </div>
  );
}
