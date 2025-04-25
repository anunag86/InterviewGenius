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
  data: text("data").notNull(), // JSON data for interview prep
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const insertInterviewPrepSchema = createInsertSchema(interviewPreps);
export type InterviewPrep = typeof interviewPreps.$inferSelect;
export type InsertInterviewPrep = z.infer<typeof insertInterviewPrepSchema>;
