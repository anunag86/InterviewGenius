import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Interview preparations table
export const interviewPreps = pgTable("interview_preps", {
  id: text("id").primaryKey(),
  jobTitle: text("job_title").notNull(),
  company: text("company").notNull(),
  jobUrl: text("job_url"),
  resumeText: text("resume_text"),
  linkedinUrl: text("linkedin_url"),
  data: jsonb("data").notNull(), // JSON data for interview prep results
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Will be set to createdAt + 30 days
  userId: text("user_id"), // Optional for anonymous users
});

// Feedback table
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  comment: text("comment").notNull(),
  npsScore: integer("nps_score").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertFeedbackSchema = createInsertSchema(feedback, {
  comment: (schema) => schema.min(3, "Feedback must be at least 3 characters"),
  npsScore: (schema) => schema.min(0, "Score must be between 0 and 10").max(10, "Score must be between 0 and 10")
}).omit({ id: true, createdAt: true });

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

export const insertInterviewPrepSchema = createInsertSchema(interviewPreps);
export type InterviewPrep = typeof interviewPreps.$inferSelect;
export type InsertInterviewPrep = z.infer<typeof insertInterviewPrepSchema>;

// Define relationship between users and interview preps
export const usersRelations = relations(users, ({ many }) => ({
  interviewPreps: many(interviewPreps)
}));

export const interviewPrepsRelations = relations(interviewPreps, ({ one }) => ({
  user: one(users, {
    fields: [interviewPreps.userId],
    references: [users.id]
  })
}));
