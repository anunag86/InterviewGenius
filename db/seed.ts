import { db } from "./index";
import * as schema from "@shared/schema";

async function seed() {
  try {
    console.log("🌱 Seeding database...");
    
    // Add your seed data here if needed
    // For this application, we don't need initial seed data
    // The interview preps will be created as users use the application

    console.log("✅ Database seeding completed successfully");
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
  }
}

seed();
