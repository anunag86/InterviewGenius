import { db } from "@db";
import { interviewPreps } from "@shared/schema";
import { eq, lt, desc, and, isNull } from "drizzle-orm";
import { addDays } from "date-fns";

/**
 * Storage interface for persisting and retrieving data
 */
export const storage = {
  // Save an interview preparation to the database
  saveInterviewPrep: async (id: string, data: any, jobUrl: string, resumeText: string, linkedinUrl?: string) => {
    try {
      const jobDetails = data.jobDetails || {};
      
      const thirtyDaysFromNow = addDays(new Date(), 30);
      
      await db.insert(interviewPreps).values({
        id,
        jobTitle: jobDetails.title || 'Untitled Position',
        company: jobDetails.company || 'Unknown Company',
        jobUrl,
        resumeText,
        linkedinUrl: linkedinUrl || null,
        data,
        createdAt: new Date(),
        expiresAt: thirtyDaysFromNow
      }).onConflictDoUpdate({
        target: interviewPreps.id,
        set: {
          jobTitle: jobDetails.title || 'Untitled Position',
          company: jobDetails.company || 'Unknown Company',
          jobUrl,
          resumeText,
          linkedinUrl: linkedinUrl || null,
          data,
          expiresAt: thirtyDaysFromNow
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
      
      return result[0];
    } catch (error) {
      console.error("Error getting interview prep:", error);
      return null;
    }
  },

  // Get all recent interview preparations from the database (only non-expired ones)
  getRecentInterviewPreps: async (limit = 10) => {
    try {
      const now = new Date();
      const results = await db.select({
        id: interviewPreps.id,
        jobTitle: interviewPreps.jobTitle,
        company: interviewPreps.company,
        createdAt: interviewPreps.createdAt,
        expiresAt: interviewPreps.expiresAt
      })
        .from(interviewPreps)
        // No WHERE condition - we'll filter in JS
        .orderBy(desc(interviewPreps.createdAt))
        .limit(limit);
      
      // Filter out expired items in JS since we can't directly compare with the current date in the query
      return results.filter(item => new Date(item.expiresAt) > now);
    } catch (error) {
      console.error("Error getting recent interview preps:", error);
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
  },

  // Delete expired interview preparations
  deleteExpiredInterviewPreps: async () => {
    try {
      const now = new Date();
      const result = await db.delete(interviewPreps)
        .where(lt(interviewPreps.expiresAt, now))
        .returning({ id: interviewPreps.id });
      
      console.log(`Deleted ${result.length} expired interview preparations`);
      return result.length;
    } catch (error) {
      console.error("Error deleting expired interview preps:", error);
      return 0;
    }
  }
};
