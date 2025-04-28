import { db } from "@db";
import { interviewPreps, users, InsertUser } from "@shared/schema";
import { eq, lt, desc, and, isNull } from "drizzle-orm";
import { addDays } from "date-fns";

/**
 * Storage interface for persisting and retrieving data
 */
export const storage = {
  // User Authentication Methods
  
  // Get user by ID
  getUser: async (id: number) => {
    try {
      const result = await db.select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error getting user:", error);
      return null;
    }
  },
  
  // Get user by LinkedIn ID
  getUserByLinkedInId: async (linkedinId: string) => {
    try {
      const result = await db.select()
        .from(users)
        .where(eq(users.linkedinId, linkedinId))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error getting user by LinkedIn ID:", error);
      return null;
    }
  },
  
  // Get user by username
  getUserByUsername: async (username: string) => {
    try {
      const result = await db.select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return null;
    }
  },
  
  // Create a new user with manual registration
  createUser: async (userData: InsertUser) => {
    try {
      // Ensure username is unique by adding a random suffix if needed
      let uniqueUsername = userData.username;
      let usernameExists = await storage.getUserByUsername(uniqueUsername);
      
      // If username exists, add random suffix until unique
      if (usernameExists) {
        let attempts = 0;
        while (usernameExists && attempts < 10) {
          const randomSuffix = Math.floor(Math.random() * 1000);
          uniqueUsername = `${userData.username}${randomSuffix}`;
          usernameExists = await storage.getUserByUsername(uniqueUsername);
          attempts++;
        }
      }
      
      // Create the user with sanitized data
      const result = await db.insert(users).values({
        ...userData,
        username: uniqueUsername,
        createdAt: new Date(),
        lastLoginAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },
  
  // Create a new user from LinkedIn profile
  createUserFromLinkedIn: async (userData: {
    linkedinId: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
    linkedinProfileUrl?: string;
  }) => {
    try {
      // Ensure username is unique by adding a random suffix if needed
      let uniqueUsername = userData.username;
      let usernameExists = await storage.getUserByUsername(uniqueUsername);
      
      // If username exists, add random suffix until unique
      if (usernameExists) {
        let attempts = 0;
        while (usernameExists && attempts < 10) {
          const randomSuffix = Math.floor(Math.random() * 1000);
          uniqueUsername = `${userData.username}${randomSuffix}`;
          usernameExists = await storage.getUserByUsername(uniqueUsername);
          attempts++;
        }
      }
      
      // Create the user with sanitized data
      const result = await db.insert(users).values({
        username: uniqueUsername,
        linkedinId: userData.linkedinId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: `${userData.firstName} ${userData.lastName}`,
        profilePictureUrl: userData.profilePictureUrl || '',
        linkedinProfileUrl: userData.linkedinProfileUrl || '',
        lastLoginAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating user from LinkedIn:", error);
      throw error;
    }
  },
  
  // Update user's last login time
  updateLastLogin: async (userId: number) => {
    try {
      await db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error("Error updating last login:", error);
      return false;
    }
  },
  
  // Interview Preparation Methods
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
