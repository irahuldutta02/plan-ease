import { MAX_LESSON_SECONDS } from "./time.js";

/**
 * The editable course tree used by the wizard and the lesson editor.
 * Items carry a client-only `key` for React; stored lessons keep their `id`.
 *
 * @typedef {{ key: string, id?: string, title: string, durationSeconds: number, completed?: boolean }} TreeLesson
 * @typedef {{ key: string, title: string, lessons: TreeLesson[] }} TreeSection
 */

let counter = 0;
export function uid() {
  counter += 1;
  return `k${Date.now().toString(36)}${counter.toString(36)}`;
}

/** @returns {TreeSection[]} */
export function treeFromSections(sections) {
  return sections.map((section) => ({
    key: uid(),
    title: section.title,
    lessons: section.lessons.map((lesson) => ({
      key: uid(),
      ...(lesson.id && { id: lesson.id }),
      title: lesson.title,
      durationSeconds: lesson.durationSeconds,
      completed: Boolean(lesson.completed),
    })),
  }));
}

/** API/scheduler shape: sequential numbers, no client keys. */
export function treeToPayload(tree) {
  return tree.map((section, si) => ({
    section: si + 1,
    title: section.title.trim(),
    lessons: section.lessons.map((lesson, li) => ({
      lesson: li + 1,
      ...(lesson.id && { id: lesson.id }),
      title: lesson.title.trim(),
      durationSeconds: lesson.durationSeconds,
    })),
  }));
}

export function treeCounts(tree) {
  let lessons = 0;
  let seconds = 0;
  for (const section of tree) {
    lessons += section.lessons.length;
    for (const lesson of section.lessons) seconds += lesson.durationSeconds;
  }
  return { sections: tree.length, lessons, seconds };
}

/** Problems that stop a tree from being saved. */
export function validateTree(tree) {
  const issues = [];
  if (treeCounts(tree).lessons === 0) {
    issues.push("Add at least one lesson to your course.");
  }
  tree.forEach((section, si) => {
    if (!section.title.trim()) issues.push(`Section ${si + 1} needs a title.`);
    section.lessons.forEach((lesson, li) => {
      if (!lesson.title.trim())
        issues.push(`Section ${si + 1}, lesson ${li + 1} needs a title.`);
      if (
        !Number.isInteger(lesson.durationSeconds) ||
        lesson.durationSeconds < 1 ||
        lesson.durationSeconds > MAX_LESSON_SECONDS
      ) {
        issues.push(`Section ${si + 1}, lesson ${li + 1} needs a duration.`);
      }
    });
  });
  return issues;
}

/** Move `list[index]` by `delta` positions; returns a new array. */
export function moveItem(list, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}
