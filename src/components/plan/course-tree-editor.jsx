"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { moveItem, uid } from "@/lib/course-tree";
import { formatClock, formatDuration, parseDuration } from "@/lib/time";

function LessonSheet({ target, tree, onClose, onChange }) {
  const section = target ? tree[target.si] : null;
  const existing =
    target && target.li !== null ? section?.lessons[target.li] : null;
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (target) {
      setTitle(existing?.title ?? "");
      setDuration(existing ? formatClock(existing.durationSeconds) : "");
    }
  }, [target, existing]);

  if (!target || !section) return null;
  const parsed = parseDuration(duration);
  const canSave = title.trim().length > 0 && parsed.ok;

  const updateLessons = (lessons) =>
    onChange(tree.map((s, i) => (i === target.si ? { ...s, lessons } : s)));

  function save() {
    if (!canSave) return;
    if (existing) {
      updateLessons(
        section.lessons.map((lesson, i) =>
          i === target.li
            ? {
                ...lesson,
                title: title.trim(),
                durationSeconds: parsed.seconds,
              }
            : lesson,
        ),
      );
    } else {
      updateLessons([
        ...section.lessons,
        {
          key: uid(),
          title: title.trim(),
          durationSeconds: parsed.seconds,
          completed: false,
        },
      ]);
    }
    onClose();
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={existing ? "Edit lesson" : "Add lesson"}
      description={section.title || `Section ${target.si + 1}`}
      footer={
        <>
          {existing && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Delete lesson"
              onClick={() => {
                updateLessons(
                  section.lessons.filter((_, i) => i !== target.li),
                );
                onClose();
              }}
            >
              <Trash2 className="size-5 text-danger" aria-hidden="true" />
            </Button>
          )}
          {existing && (
            <>
              <Button
                variant="outline"
                size="icon"
                aria-label="Move lesson up"
                disabled={target.li === 0}
                onClick={() => {
                  updateLessons(moveItem(section.lessons, target.li, -1));
                  onClose();
                }}
              >
                <ArrowUp className="size-5" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Move lesson down"
                disabled={target.li === section.lessons.length - 1}
                onClick={() => {
                  updateLessons(moveItem(section.lessons, target.li, 1));
                  onClose();
                }}
              >
                <ArrowDown className="size-5" aria-hidden="true" />
              </Button>
            </>
          )}
          <Button
            className="flex-1"
            size="lg"
            disabled={!canSave}
            onClick={save}
          >
            {existing ? "Save" : "Add lesson"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Title
          <Input
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lesson title"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Duration
          <Input
            value={duration}
            inputMode="numeric"
            onChange={(e) => setDuration(e.target.value)}
            placeholder="mm:ss, h:mm:ss or 1h 5m"
            aria-invalid={duration !== "" && !parsed.ok}
          />
          {duration !== "" && !parsed.ok ? (
            <span className="text-sm font-normal text-danger">
              {parsed.error}
            </span>
          ) : parsed.ok ? (
            <span className="text-sm font-normal text-muted-foreground">
              {formatDuration(parsed.seconds)}
            </span>
          ) : (
            <span className="text-sm font-normal text-muted-foreground">
              Examples: 12:30, 1:05:00, 45m
            </span>
          )}
        </label>
      </div>
    </Sheet>
  );
}

function SectionSheet({ target, tree, onClose, onChange }) {
  const existing = target && target.si !== null ? tree[target.si] : null;
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (target) setTitle(existing?.title ?? "");
  }, [target, existing]);

  if (!target) return null;
  const canSave = title.trim().length > 0;

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={existing ? "Edit section" : "Add section"}
      footer={
        <>
          {existing && (
            <>
              <Button
                variant="outline"
                size="icon"
                aria-label="Delete section"
                onClick={() => {
                  onChange(tree.filter((_, i) => i !== target.si));
                  onClose();
                }}
              >
                <Trash2 className="size-5 text-danger" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Move section up"
                disabled={target.si === 0}
                onClick={() => {
                  onChange(moveItem(tree, target.si, -1));
                  onClose();
                }}
              >
                <ArrowUp className="size-5" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Move section down"
                disabled={target.si === tree.length - 1}
                onClick={() => {
                  onChange(moveItem(tree, target.si, 1));
                  onClose();
                }}
              >
                <ArrowDown className="size-5" aria-hidden="true" />
              </Button>
            </>
          )}
          <Button
            className="flex-1"
            size="lg"
            disabled={!canSave}
            onClick={() => {
              if (existing) {
                onChange(
                  tree.map((s, i) =>
                    i === target.si ? { ...s, title: title.trim() } : s,
                  ),
                );
              } else {
                onChange([
                  ...tree,
                  { key: uid(), title: title.trim(), lessons: [] },
                ]);
              }
              onClose();
            }}
          >
            {existing ? "Save" : "Add section"}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5 pt-1 text-sm font-medium">
        Section title
        <Input
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Introduction"
        />
      </label>
    </Sheet>
  );
}

/**
 * The editable sections and lessons tree. Tap a row to edit it in a sheet;
 * reorder and delete live in the sheet footer so rows stay easy to tap.
 */
export function CourseTreeEditor({ tree, onChange }) {
  const [collapsed, setCollapsed] = useState({});
  const [lessonTarget, setLessonTarget] = useState(null);
  const [sectionTarget, setSectionTarget] = useState(null);

  return (
    <div className="flex flex-col gap-3">
      {tree.length === 0 && (
        <p className="rounded-2xl bg-muted p-4 text-center text-sm text-muted-foreground">
          No sections yet. Add your first one below.
        </p>
      )}

      {tree.map((section, si) => {
        const seconds = section.lessons.reduce(
          (sum, lesson) => sum + lesson.durationSeconds,
          0,
        );
        const isCollapsed = collapsed[section.key];
        return (
          <section
            key={section.key}
            className="rounded-2xl border border-border bg-background"
          >
            <div className="flex items-center">
              <button
                type="button"
                aria-expanded={!isCollapsed}
                aria-label={`${section.title || "Untitled section"}, ${section.lessons.length} lessons`}
                onClick={() =>
                  setCollapsed((c) => ({
                    ...c,
                    [section.key]: !c[section.key],
                  }))
                }
                className="flex min-h-14 min-w-0 flex-1 items-center gap-2 px-4 text-left"
              >
                <ChevronDown
                  className={cn(
                    "size-5 shrink-0 transition",
                    isCollapsed && "-rotate-90",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {si + 1} · {section.title || "Untitled section"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {section.lessons.length} lessons · {formatDuration(seconds)}
                  </span>
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit section ${si + 1}`}
                onClick={() => setSectionTarget({ si })}
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
            </div>

            {!isCollapsed && (
              <div className="border-t border-border">
                <ul>
                  {section.lessons.map((lesson, li) => (
                    <li
                      key={lesson.key}
                      className="border-b border-border last:border-b-0"
                    >
                      <button
                        type="button"
                        onClick={() => setLessonTarget({ si, li })}
                        className="flex min-h-12 w-full items-center gap-3 px-4 text-left hover:bg-muted"
                      >
                        {lesson.completed ? (
                          <Check
                            className="size-4 shrink-0 text-success"
                            aria-label="Completed"
                          />
                        ) : (
                          <span className="w-4 shrink-0 text-center text-xs text-muted-foreground">
                            {li + 1}
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {lesson.title}
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                          {formatClock(lesson.durationSeconds)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setLessonTarget({ si, li: null })}
                  className="flex min-h-12 w-full items-center gap-2 px-4 text-sm font-medium text-accent-text hover:bg-muted"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add lesson
                </button>
              </div>
            )}
          </section>
        );
      })}

      <Button variant="outline" onClick={() => setSectionTarget({ si: null })}>
        <Plus className="size-4" aria-hidden="true" />
        Add section
      </Button>

      <LessonSheet
        target={lessonTarget}
        tree={tree}
        onClose={() => setLessonTarget(null)}
        onChange={onChange}
      />
      <SectionSheet
        target={sectionTarget}
        tree={tree}
        onClose={() => setSectionTarget(null)}
        onChange={onChange}
      />
    </div>
  );
}
