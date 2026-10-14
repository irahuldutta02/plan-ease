import { MAX_LESSON_SECONDS } from "./time.js";

/**
 * Validation for the course JSON shape:
 *   [{ section, title, lessons: [{ lesson, title, durationSeconds }] }]
 * Errors carry the failing path, e.g. `$[1].lessons[2].durationSeconds`.
 */

export const LIMITS = {
  sections: 200,
  lessons: 3000,
  titleLength: 200,
};

const MAX_ERRORS = 50;

/**
 * @typedef {{ path: string, message: string }} ValidationIssue
 * @typedef {{ lesson: number, title: string, durationSeconds: number }} CourseLesson
 * @typedef {{ section: number, title: string, lessons: CourseLesson[] }} CourseSection
 */

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate parsed JSON. On success returns sections renumbered 1..n so the
 * numbering always matches the order the user sees.
 * @param {unknown} data
 * @returns {{ ok: true, sections: CourseSection[] } | { ok: false, errors: ValidationIssue[] }}
 */
export function validateCourse(data) {
  /** @type {ValidationIssue[]} */
  const errors = [];
  const report = (path, message) => {
    if (errors.length < MAX_ERRORS) errors.push({ path, message });
  };

  const checkTitle = (value, path, label) => {
    if (typeof value !== "string" || !value.trim()) {
      report(path, `${label} title must be a non-empty string.`);
      return null;
    }
    if (value.trim().length > LIMITS.titleLength) {
      report(
        path,
        `${label} title must be at most ${LIMITS.titleLength} characters.`,
      );
      return null;
    }
    return value.trim();
  };

  const checkNumber = (value, path, label) => {
    if (!Number.isInteger(value) || value < 1) {
      report(path, `"${label}" must be a whole number, 1 or higher.`);
    }
  };

  if (!Array.isArray(data)) {
    report("$", "The top level must be an array of sections.");
    return { ok: false, errors };
  }
  if (data.length === 0) {
    report("$", "Add at least one section.");
    return { ok: false, errors };
  }
  if (data.length > LIMITS.sections) {
    report("$", `A course can have at most ${LIMITS.sections} sections.`);
    return { ok: false, errors };
  }

  let lessonCount = 0;
  const sections = [];

  data.forEach((rawSection, si) => {
    const sectionPath = `$[${si}]`;
    if (!isPlainObject(rawSection)) {
      report(sectionPath, "Each section must be an object.");
      return;
    }
    checkNumber(rawSection.section, `${sectionPath}.section`, "section");
    const title = checkTitle(
      rawSection.title,
      `${sectionPath}.title`,
      "Section",
    );

    // An empty section is allowed (it simply holds no work); see the total check below
    if (!Array.isArray(rawSection.lessons)) {
      report(`${sectionPath}.lessons`, "Each section needs a lessons array.");
      return;
    }

    const lessons = [];
    rawSection.lessons.forEach((rawLesson, li) => {
      const lessonPath = `${sectionPath}.lessons[${li}]`;
      lessonCount += 1;
      if (!isPlainObject(rawLesson)) {
        report(lessonPath, "Each lesson must be an object.");
        return;
      }
      checkNumber(rawLesson.lesson, `${lessonPath}.lesson`, "lesson");
      const lessonTitle = checkTitle(
        rawLesson.title,
        `${lessonPath}.title`,
        "Lesson",
      );
      const seconds = rawLesson.durationSeconds;
      if (!Number.isInteger(seconds) || seconds < 1) {
        report(
          `${lessonPath}.durationSeconds`,
          "durationSeconds must be a whole number of seconds, 1 or higher.",
        );
      } else if (seconds > MAX_LESSON_SECONDS) {
        report(
          `${lessonPath}.durationSeconds`,
          "A single lesson can be at most 24 hours (86400 seconds).",
        );
      } else if (lessonTitle) {
        lessons.push({
          lesson: li + 1,
          title: lessonTitle,
          durationSeconds: seconds,
          // Existing lessons carry their stored id so progress survives edits
          ...(typeof rawLesson.id === "string" && { id: rawLesson.id }),
        });
      }
    });

    if (title) sections.push({ section: si + 1, title, lessons });
  });

  if (lessonCount > LIMITS.lessons) {
    report(
      "$",
      `A course can have at most ${LIMITS.lessons} lessons in total.`,
    );
  }
  if (errors.length === 0 && lessonCount === 0) {
    report("$", "Add at least one lesson.");
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, sections };
}

/**
 * Parse and validate JSON text from a paste box or an uploaded file.
 * @param {string} text
 */
export function parseCourseJson(text) {
  if (typeof text !== "string" || !text.trim()) {
    return {
      ok: false,
      errors: [{ path: "$", message: "Paste or upload some JSON first." }],
    };
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      errors: [{ path: "$", message: `Not valid JSON: ${error.message}` }],
    };
  }
  return validateCourse(data);
}
