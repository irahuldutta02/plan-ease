"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StepContent } from "@/components/wizard/step-content";
import { StepSkip, StepStart } from "@/components/wizard/step-dates";
import { StepReview } from "@/components/wizard/step-review";
import { StepTime } from "@/components/wizard/step-time";
import { apiFetch, browserTimezone, errorMessage } from "@/lib/api-client";
import { celebrate } from "@/lib/celebrate";
import { treeToPayload, validateTree } from "@/lib/course-tree";
import { addDays, isValidISODate, todayIn, WEEKDAYS } from "@/lib/dates";
import {
  buildSchedule,
  getStartDateAvailability,
  summarizeContent,
} from "@/lib/scheduler";
import { formatDuration } from "@/lib/time";

const DRAFT_KEY = "planease:wizard:v1";
const STEPS = ["Content", "Study time", "Start date", "Skip days", "Review"];

const defaultWeekly = () =>
  Object.fromEntries(WEEKDAYS.map((key) => [key, 60]));
const emptyDraft = () => ({
  step: 0,
  title: "",
  mode: "json",
  jsonText: "",
  tree: [],
  weeklyMinutes: defaultWeekly(),
  ratio: { a: 1, b: 1 },
  startDate: null,
  skipDates: [],
});

/** Merge a saved draft into the defaults, discarding anything stale or malformed. */
function restoreDraft(saved, today) {
  const draft = emptyDraft();
  if (!saved || typeof saved !== "object") return draft;
  if (typeof saved.title === "string") draft.title = saved.title.slice(0, 100);
  if (saved.mode === "json" || saved.mode === "manual") draft.mode = saved.mode;
  if (typeof saved.jsonText === "string")
    draft.jsonText = saved.jsonText.slice(0, 1_000_000);
  if (Array.isArray(saved.tree)) draft.tree = saved.tree;
  const weekly = saved.weeklyMinutes;
  if (
    weekly &&
    WEEKDAYS.every(
      (key) =>
        Number.isInteger(weekly[key]) &&
        weekly[key] >= 0 &&
        weekly[key] <= 1440,
    )
  ) {
    draft.weeklyMinutes = weekly;
  }
  if (saved.ratio?.a > 0 && saved.ratio?.b > 0)
    draft.ratio = { a: saved.ratio.a, b: saved.ratio.b };
  if (isValidISODate(saved.startDate) && saved.startDate >= today)
    draft.startDate = saved.startDate;
  if (Array.isArray(saved.skipDates)) {
    draft.skipDates = saved.skipDates.filter(
      (d) => isValidISODate(d) && d >= today,
    );
  }
  if (
    Number.isInteger(saved.step) &&
    saved.step >= 0 &&
    saved.step < STEPS.length
  )
    draft.step = saved.step;
  return draft;
}

function WizardSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col gap-4 bg-card p-4 md:bg-background md:p-8">
      <Skeleton className="h-12" />
      <Skeleton className="h-14" />
      <Skeleton className="h-64" />
    </div>
  );
}

export function PlanWizard() {
  const router = useRouter();
  const [draft, setDraft] = useState(null); // null until the saved draft is read
  const [today, setToday] = useState(null);
  const [direction, setDirection] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    const now = todayIn(browserTimezone());
    let saved = null;
    try {
      saved = JSON.parse(window.localStorage.getItem(DRAFT_KEY));
    } catch {
      // No usable saved draft
    }
    setToday(now);
    setDraft(restoreDraft(saved, now));
  }, []);

  // Save the draft shortly after every change so leaving never loses work
  useEffect(() => {
    if (!draft) return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Storage unavailable; the wizard still works, it just can't resume
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [draft]);

  const update = useCallback(
    (patch) => setDraft((current) => ({ ...current, ...patch })),
    [],
  );

  const timezone = useMemo(() => browserTimezone(), []);
  const sections = useMemo(
    () => treeToPayload(draft?.tree ?? []),
    [draft?.tree],
  );
  const treeIssues = useMemo(
    () => validateTree(draft?.tree ?? []),
    [draft?.tree],
  );
  const titleError =
    draft && !draft.title.trim() ? "Give your plan a title." : null;
  const contentValid = !titleError && treeIssues.length === 0;

  const content = useMemo(
    () =>
      draft && contentValid
        ? summarizeContent(sections, draft.ratio)
        : { lectureSeconds: 0, effectiveSeconds: 0 },
    [draft, contentValid, sections],
  );

  const todayAvailability = useMemo(
    () =>
      draft && today
        ? getStartDateAvailability({
            date: today,
            today,
            weeklyMinutes: draft.weeklyMinutes,
            skipDates: draft.skipDates,
          })
        : { available: true, reason: null },
    [draft, today],
  );

  /** Estimate for Step 2: starts today, no skip days. */
  const estimate = useMemo(() => {
    if (!draft || !today || !contentValid)
      return { ok: false, error: { message: "Add your course first." } };
    return buildSchedule({
      sections,
      weeklyMinutes: draft.weeklyMinutes,
      ratio: draft.ratio,
      startDate: today,
      today,
      timezone,
    });
  }, [draft, today, contentValid, sections, timezone]);

  const startDate = draft?.startDate ?? null;
  const schedule = useMemo(() => {
    if (!draft || !today || !contentValid || !startDate || draft.step < 3)
      return null;
    return buildSchedule({
      sections,
      weeklyMinutes: draft.weeklyMinutes,
      ratio: draft.ratio,
      startDate,
      skipDates: draft.skipDates,
      today,
      timezone,
    });
  }, [draft, today, contentValid, startDate, sections, timezone]);

  // Keep the start date valid: default to today, or tomorrow if today has no study time
  useEffect(() => {
    if (!draft || !today || draft.step < 2) return;
    if (
      !draft.startDate ||
      (draft.startDate === today && !todayAvailability.available)
    ) {
      update({
        startDate: todayAvailability.available ? today : addDays(today, 1),
      });
    }
  }, [draft, today, todayAvailability, update]);

  // A skip day before the start date has no effect, so drop it
  useEffect(() => {
    if (!draft?.startDate) return;
    if (draft.skipDates.some((date) => date < draft.startDate)) {
      update({
        skipDates: draft.skipDates.filter((date) => date >= draft.startDate),
      });
    }
  }, [draft, update]);

  if (!draft || !today) return <WizardSkeleton />;

  const step = draft.step;
  const last = step === STEPS.length - 1;

  function canProceed() {
    if (step === 0) return contentValid;
    if (step === 1) return estimate.ok;
    if (step === 2) return Boolean(draft.startDate);
    if (step === 4) return Boolean(schedule?.ok);
    return true;
  }

  function go(delta) {
    setDirection(delta);
    setShowErrors(false);
    setSubmitError(null);
    update({ step: step + delta });
    document.getElementById("wizard-scroll")?.scrollTo({ top: 0 });
  }

  async function createPlan() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const data = await apiFetch("/api/plans", {
        method: "POST",
        body: {
          title: draft.title.trim(),
          sections,
          ratio: draft.ratio,
          weeklyMinutes: draft.weeklyMinutes,
          startDate: draft.startDate,
          skipDates: draft.skipDates,
          timezone,
        },
      });
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Nothing to clean up
      }
      toast.success("Plan created! Let's get going 🚀");
      celebrate("big");
      router.replace(`/plans/${data.id}`);
    } catch (error) {
      setSubmitError(errorMessage(error));
      setSubmitting(false);
    }
  }

  function onNext() {
    if (!canProceed()) {
      setShowErrors(true);
      return;
    }
    if (last) createPlan();
    else go(1);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background bg-[radial-gradient(70rem_30rem_at_50%_-14rem,var(--primary-soft),transparent_70%)] md:p-8">
      <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col bg-card md:h-[calc(100dvh-4rem)] md:overflow-hidden md:rounded-3xl md:shadow-card">
        <header className="border-b border-border pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center gap-2 px-2 md:px-4">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close. Your draft is saved."
              onClick={() => router.push("/plans")}
            >
              <X className="size-5" aria-hidden="true" />
            </Button>
            <h1 className="flex-1 text-lg font-semibold tracking-tight">
              New plan
            </h1>
            <p
              className="pr-3 text-sm text-muted-foreground md:hidden"
              aria-live="polite"
            >
              Step {step + 1}/{STEPS.length}
            </p>
          </div>

          <ol
            aria-label="Progress"
            className="hidden items-center px-6 pb-4 md:flex"
          >
            {STEPS.map((name, index) => (
              <li
                key={name}
                aria-current={index === step ? "step" : undefined}
                className="flex flex-1 items-center gap-2 last:flex-none"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors ${
                    index < step
                      ? "bg-primary text-primary-foreground"
                      : index === step
                        ? "bg-primary text-primary-foreground ring-4 ring-primary-soft"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < step ? (
                    <Check
                      className="size-4"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`text-sm font-medium ${index === step ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {name}
                </span>
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`mx-1 h-0.5 flex-1 rounded ${index < step ? "bg-primary" : "bg-border"}`}
                  />
                )}
              </li>
            ))}
          </ol>

          <div className="px-4 pb-3 md:hidden">
            <ol className="grid grid-cols-5 gap-1.5" aria-label="Progress">
              {STEPS.map((name, index) => (
                <li
                  key={name}
                  aria-current={index === step ? "step" : undefined}
                  className={`h-1.5 rounded-full transition-colors ${index <= step ? "bg-primary" : "bg-muted"}`}
                >
                  <span className="sr-only">{name}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {STEPS[step]}
            </p>
          </div>
        </header>

        <div
          id="wizard-scroll"
          className="flex-1 overflow-x-hidden overflow-y-auto"
        >
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -32 }}
              transition={{ duration: 0.18 }}
              className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-8"
            >
              {step === 0 && (
                <StepContent
                  draft={draft}
                  update={update}
                  titleError={titleError}
                  treeIssues={treeIssues}
                  showErrors={showErrors}
                  onClear={() => setDraft(emptyDraft())}
                />
              )}
              {step === 1 && (
                <StepTime
                  draft={draft}
                  update={update}
                  content={content}
                  estimate={estimate}
                />
              )}
              {step === 2 && (
                <StepStart
                  draft={draft}
                  update={update}
                  today={today}
                  availability={todayAvailability}
                />
              )}
              {step === 3 && (
                <StepSkip draft={draft} update={update} today={today} />
              )}
              {step === 4 && schedule && (
                <StepReview
                  draft={draft}
                  today={today}
                  schedule={schedule}
                  sections={sections}
                  submitError={submitError}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="border-t border-border bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex w-full gap-3 px-4 pt-3 md:px-6 md:pb-1">
            {step > 0 && (
              <Button
                variant="outline"
                size="lg"
                className="shrink-0"
                onClick={() => go(-1)}
                disabled={submitting}
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
                Back
              </Button>
            )}
            <Button
              size="lg"
              className="flex-1 md:ml-auto md:max-w-72"
              onClick={onNext}
              disabled={submitting || (step > 0 && !canProceed())}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  Creating…
                </>
              ) : last ? (
                <>
                  <Check className="size-5" aria-hidden="true" />
                  {submitError ? "Try again" : "Create plan"}
                </>
              ) : (
                <>
                  Next
                  {step === 0 && content.lectureSeconds > 0
                    ? ` · ${formatDuration(content.lectureSeconds)}`
                    : ""}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
