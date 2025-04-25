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
