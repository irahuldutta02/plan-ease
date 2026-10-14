"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatClock, formatDuration } from "@/lib/time";

const SWIPE_DISTANCE = 90;

/**
 * Today's lesson as a large card. Tap the circle or swipe right to complete,
 * tap the text to expand. Unchecking is the same tap on the circle.
 */
export function LessonCard({ planId, item, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const dragged = useRef(false);
  const x = useMotionValue(0);
  const revealOpacity = useTransform(x, [0, SWIPE_DISTANCE], [0, 1]);

  return (
    <li className="relative overflow-hidden rounded-2xl">
      <motion.div
        aria-hidden="true"
        style={{ opacity: revealOpacity }}
        className="absolute inset-0 flex items-center bg-success-soft pl-6 text-success"
      >
        <Check className="size-7" strokeWidth={3} />
      </motion.div>

      <motion.div
        drag={item.done ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.5 }}
        dragMomentum={false}
        style={{ x }}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_DISTANCE) onToggle(true);
          setTimeout(() => {
            dragged.current = false;
          }, 50);
        }}
        animate={{ opacity: item.done ? 0.75 : 1 }}
        className="relative rounded-2xl border border-border bg-card shadow-card"
      >
        <div className="flex items-center gap-1 pr-2">
          {/* biome-ignore lint/a11y/useSemanticElements: animated round checkbox */}
          <button
            type="button"
            role="checkbox"
            aria-checked={item.done}
            aria-label={`${item.done ? "Mark incomplete" : "Mark complete"}: ${item.lessonTitle}`}
            onClick={() => onToggle(!item.done)}
            className="grid size-16 shrink-0 place-items-center"
          >
            <motion.span
              animate={{ scale: item.done ? [1, 1.25, 1] : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 14 }}
              className={cn(
                "grid size-8 place-items-center rounded-full border-2 transition-colors",
                item.done
                  ? "border-success bg-success text-card"
                  : "border-muted-foreground/50",
              )}
            >
              {item.done && (
                <Check className="size-5" strokeWidth={3} aria-hidden="true" />
              )}
            </motion.span>
          </button>

          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => {
              if (!dragged.current) setExpanded((value) => !value);
            }}
            className="flex min-h-16 min-w-0 flex-1 items-center gap-2 py-2 text-left"
          >
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate font-semibold",
                  item.done && "text-muted-foreground line-through",
                )}
              >
                {item.lessonTitle}
              </span>
              <span className="block truncate text-sm text-muted-foreground">
                {item.sectionTitle} · {formatDuration(item.seconds)}
                {item.parts > 1 && ` · Part ${item.part}/${item.parts}`}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-5 shrink-0 text-muted-foreground transition",
                expanded && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
        </div>

        {expanded && (
          <dl className="grid grid-cols-2 gap-3 border-t border-border px-5 py-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Lecture length</dt>
              <dd className="font-medium tabular-nums">
                {formatClock(item.durationSeconds)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Today at your speed</dt>
              <dd className="font-medium tabular-nums">
                {formatDuration(item.seconds)}
              </dd>
            </div>
            {item.parts > 1 && (
              <div className="col-span-2 text-muted-foreground">
                This lesson is split over {item.parts} days. Completing it marks
                the whole lesson done.
              </div>
            )}
            <div className="col-span-2">
              <Link
                href={`/plans/${planId}`}
                className="font-medium text-accent-text underline-offset-4 hover:underline"
              >
                Open plan
              </Link>
            </div>
          </dl>
        )}
      </motion.div>
    </li>
  );
}
