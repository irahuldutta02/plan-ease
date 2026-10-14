const PERCENT_MARKS = [25, 50, 75];

/**
 * What did completing a lesson achieve? Compares plan summaries from before
 * and after. Most significant first.
 * @returns {{ kind: "plan" | "percent" | "section", text: string }[]}
 */
export function detectMilestones(before, after) {
  const found = [];
  if (after.finished && !before.finished) {
    found.push({ kind: "plan", text: "Plan complete! You did it 🏆" });
    return found;
  }
  for (const mark of [...PERCENT_MARKS].reverse()) {
    if (after.progressPct >= mark && before.progressPct < mark) {
      found.push({ kind: "percent", text: `${mark}% of the plan done 🎯` });
      break;
    }
  }
  if (after.sectionsDone > before.sectionsDone) {
    found.push({ kind: "section", text: "Section finished ✨" });
  }
  return found;
}
