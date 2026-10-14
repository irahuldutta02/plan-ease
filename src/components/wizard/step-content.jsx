"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CourseTreeEditor } from "@/components/plan/course-tree-editor";
import { JsonImport } from "@/components/plan/json-import";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ConfirmSheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { treeCounts, treeFromSections } from "@/lib/course-tree";
import { formatDuration } from "@/lib/time";

const MODES = [
  { value: "json", label: "Import JSON" },
  { value: "manual", label: "Build manually" },
];

/** Step 1: plan title plus the course, either imported or built by hand. */
export function StepContent({
  draft,
  update,
  titleError,
  treeIssues,
  showErrors,
  onClear,
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const counts = treeCounts(draft.tree);

  return (
    <div className="flex flex-col gap-6">
      <Field label="Plan title" error={showErrors ? titleError : null}>
        {(id) => (
          <Input
            id={id}
            value={draft.title}
            maxLength={100}
            placeholder="e.g. Python Bootcamp"
            onChange={(event) => update({ title: event.target.value })}
          />
        )}
      </Field>

      <div
        role="radiogroup"
        aria-label="How to add your course"
        className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1"
      >
        {MODES.map((mode) => (
          // biome-ignore lint/a11y/useSemanticElements: styled segmented control
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={draft.mode === mode.value}
            onClick={() => update({ mode: mode.value })}
            className={cn(
              "min-h-11 rounded-xl text-sm font-medium transition",
              draft.mode === mode.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {draft.mode === "json" ? (
        <>
          <JsonImport
            text={draft.jsonText}
            onTextChange={(jsonText) => update({ jsonText })}
            onImport={(sections) => {
              const tree = treeFromSections(sections);
              const imported = treeCounts(tree);
              update({ tree, mode: "manual" });
              toast.success(
                `Imported ${imported.sections} sections and ${imported.lessons} lessons`,
              );
            }}
          />
          {counts.lessons > 0 && (
            <p className="rounded-2xl bg-primary-soft p-4 text-sm">
              You already have {counts.lessons} lessons in the editor. Importing
              replaces them.
            </p>
          )}
        </>
      ) : (
        <CourseTreeEditor
          tree={draft.tree}
          onChange={(tree) => update({ tree })}
        />
      )}

      {counts.lessons > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {counts.sections} sections · {counts.lessons} lessons ·{" "}
          {formatDuration(counts.seconds)} of lectures
        </p>
      )}

      {showErrors && treeIssues.length > 0 && (
        <ul
          role="alert"
          className="rounded-2xl bg-danger-soft p-4 text-sm text-danger"
        >
          {treeIssues.slice(0, 4).map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
          {treeIssues.length > 4 && <li>…and {treeIssues.length - 4} more</li>}
        </ul>
      )}

      {(counts.lessons > 0 || draft.title) && (
        <>
          <Button
            variant="ghost"
            className="self-center text-muted-foreground"
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Clear this draft
          </Button>
          <ConfirmSheet
            open={confirmClear}
            onOpenChange={setConfirmClear}
            title="Clear this draft?"
            description="Your title, course and settings will be removed."
            confirmLabel="Clear draft"
            danger
            onConfirm={() => {
              setConfirmClear(false);
              onClear();
            }}
          />
        </>
      )}
    </div>
  );
}
