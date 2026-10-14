import { Schema } from "mongoose";
import { connectMongoose } from "@/lib/db";

const lessonSchema = new Schema({
  lesson: { type: Number, required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  durationSeconds: { type: Number, required: true, min: 1 },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
});

const sectionSchema = new Schema({
  section: { type: Number, required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  lessons: [lessonSchema],
});

const minutes = { type: Number, required: true, min: 0, max: 1440 };

const planSchema = new Schema(
  {
    // Better Auth user id, stored as a string (we do not own a User model)
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    sections: [sectionSchema],
    ratio: {
      a: { type: Number, required: true, min: 0.01 },
      b: { type: Number, required: true, min: 0.01 },
    },
    weeklyMinutes: {
      mon: minutes,
      tue: minutes,
      wed: minutes,
      thu: minutes,
      fri: minutes,
      sat: minutes,
      sun: minutes,
    },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    skipDates: [String], // YYYY-MM-DD
    timezone: { type: String, required: true },
  },
  { timestamps: true },
);

planSchema.index({ userId: 1, updatedAt: -1 });

/** The Plan model on the shared connection (safe across hot reloads). */
export async function getPlanModel() {
  const connection = await connectMongoose();
  return connection.models.Plan || connection.model("Plan", planSchema);
}
