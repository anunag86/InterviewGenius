import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  linkedinId: text("linkedin_id").notNull().unique(),
});

export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(2, "Username must be at least 2 characters"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
  linkedinId: (schema) => schema.min(3, "LinkedIn ID must be at least 3 characters"),
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
  userId: integer("user_id"), // Optional for anonymous users
});

// User responses to interview questions in SAR format
export const userResponses = pgTable("user_responses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  interviewPrepId: text("interview_prep_id").notNull(),
  questionId: text("question_id").notNull(),
  roundId: text("round_id").notNull(),
  situation: text("situation"),
  action: text("action"),
  result: text("result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const insertUserResponseSchema = createInsertSchema(userResponses, {
  situation: (schema) => schema.min(3, "Situation must be at least 3 characters"),
  action: (schema) => schema.min(3, "Action must be at least 3 characters"),
  result: (schema) => schema.min(3, "Result must be at least 3 characters")
}).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertUserResponse = z.infer<typeof insertUserResponseSchema>;
export type UserResponse = typeof userResponses.$inferSelect;

// Define relationship between users and interview preps
export const usersRelations = relations(users, ({ many }) => ({
  interviewPreps: many(interviewPreps),
  userResponses: many(userResponses)
}));

export const interviewPrepsRelations = relations(interviewPreps, ({ one, many }) => ({
  user: one(users, {
    fields: [interviewPreps.userId],
    references: [users.id]
  }),
  userResponses: many(userResponses)
}));

export const userResponsesRelations = relations(userResponses, ({ one }) => ({
  user: one(users, {
    fields: [userResponses.userId],
    references: [users.id]
  }),
  interviewPrep: one(interviewPreps, {
    fields: [userResponses.interviewPrepId],
    references: [interviewPreps.id]
  })
}));
