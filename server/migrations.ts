import { db } from "../db";
import { sql } from "drizzle-orm";
import { log } from "./vite";

/**
 * Migrations code to run at startup
 * This handles creating or altering database tables
 */
export async function migrationCode() {
  try {
    // Create or update users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL DEFAULT '',
        linkedin_id TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL DEFAULT '',
        last_name TEXT NOT NULL DEFAULT '',
        display_name TEXT NOT NULL DEFAULT '',
        profile_picture_url TEXT NOT NULL DEFAULT '',
        linkedin_profile_url TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create or update interview_preps table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS interview_preps (
        id TEXT PRIMARY KEY,
        job_title TEXT NOT NULL,
        company TEXT NOT NULL,
        job_url TEXT,
        resume_text TEXT,
        linkedin_url TEXT,
        data JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        user_id INTEGER REFERENCES users(id)
      );
    `);

    // Create or update user_responses table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_responses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        interview_prep_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        round_id TEXT NOT NULL,
        situation TEXT,
        action TEXT,
        result TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create or update feedback table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT,
        comment TEXT NOT NULL,
        nps_score INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    log("Database schema created/updated successfully");
    return true;
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
}