import { db } from "@db";
import { interviewPreps } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Storage interface for persisting and retrieving data
 */
export const storage = {
  // Save an interview preparation to the database
  saveInterviewPrep: async (id: string, data: any) => {
    try {
      await db.insert(interviewPreps).values({
        id,
        data: JSON.stringify(data),
        createdAt: new Date()
      }).onConflictDoUpdate({
        target: interviewPreps.id,
        set: {
          data: JSON.stringify(data),
          updatedAt: new Date()
        }
      });
      return true;
    } catch (error) {
      console.error("Error saving interview prep:", error);
      return false;
    }
  },

  // Get an interview preparation from the database
  getInterviewPrep: async (id: string) => {
    try {
      const result = await db.select()
        .from(interviewPreps)
        .where(eq(interviewPreps.id, id))
        .limit(1);
      
      if (result.length === 0) {
        return null;
      }
      
      return {
        ...result[0],
        data: JSON.parse(result[0].data)
      };
    } catch (error) {
      console.error("Error getting interview prep:", error);
      return null;
    }
  },

  // Get all interview preparations from the database
  getAllInterviewPreps: async () => {
    try {
      const results = await db.select()
        .from(interviewPreps)
        .orderBy(interviewPreps.createdAt);
      
      return results.map(item => ({
        ...item,
        data: JSON.parse(item.data)
      }));
    } catch (error) {
      console.error("Error getting all interview preps:", error);
      return [];
    }
  },

  // Delete an interview preparation from the database
  deleteInterviewPrep: async (id: string) => {
    try {
      await db.delete(interviewPreps)
        .where(eq(interviewPreps.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting interview prep:", error);
      return false;
    }
  }
};
