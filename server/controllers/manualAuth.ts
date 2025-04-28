import { Request, Response } from "express";
import { db } from "../../db";
import { users, insertUserSchema } from "../../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Handle manual LinkedIn profile information
 * This is a fallback for when OAuth isn't working
 */
export const handleManualLinkedInProfile = async (req: Request, res: Response) => {
  try {
    const { linkedinUrl, fullname, email } = req.body;
    
    // Validate required fields
    if (!linkedinUrl || !fullname || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Validate LinkedIn URL format
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/;
    if (!linkedinRegex.test(linkedinUrl)) {
      return res.status(400).json({ error: "Invalid LinkedIn URL format" });
    }
    
    // Extract LinkedIn ID from the URL
    const urlParts = linkedinUrl.split('/');
    const linkedinId = urlParts[urlParts.length - 1].replace(/\/$/, '');
    
    // Extract first and last name
    const nameParts = fullname.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    console.log(`MANUAL AUTH: Processing user ${firstName} ${lastName} (${email}) with LinkedIn URL ${linkedinUrl}`);
    
    // Find or create user by LinkedIn ID (since email field might be missing)
    let user = await db.query.users.findFirst({
      where: eq(users.linkedinId, linkedinId)
    });
    
    if (!user) {
      console.log("MANUAL AUTH: Creating new user");
      
      const userData = {
        linkedinId,
        email,
        firstName,
        lastName,
        displayName: fullname.trim(),
        profilePictureUrl: "",
        linkedinProfileUrl: linkedinUrl,
        lastLoginAt: new Date()
      };
      
      try {
        // Remove email if it's causing problems
        const cleanedUserData = {
          linkedinId,
          firstName,
          lastName,
          displayName: fullname.trim(),
          profilePictureUrl: "",
          linkedinProfileUrl: linkedinUrl,
          lastLoginAt: new Date()
        };
        
        const validatedData = insertUserSchema.parse(cleanedUserData);
        console.log("MANUAL AUTH: Inserting user with data:", JSON.stringify(cleanedUserData));
        
        const [newUser] = await db.insert(users).values(validatedData).returning();
        user = newUser;
        console.log("MANUAL AUTH: User created successfully", user.id);
      } catch (error) {
        console.error("MANUAL AUTH: Error creating user:", error);
        
        // Provide more detailed error message for debugging
        let errorMessage = "Failed to create user";
        if (error instanceof Error) {
          errorMessage = `Failed to create user: ${error.message}`;
        }
        
        return res.status(500).json({ error: errorMessage });
      }
    } else {
      console.log("MANUAL AUTH: Updating existing user", user.id);
      
      try {
        await db
          .update(users)
          .set({
            firstName,
            lastName,
            displayName: fullname.trim(),
            linkedinProfileUrl: linkedinUrl,
            lastLoginAt: new Date()
          })
          .where(eq(users.linkedinId, linkedinId));
      } catch (error) {
        console.error("MANUAL AUTH: Error updating user:", error);
        // Continue with existing user even if update fails
      }
    }
    
    // Set session
    req.session.userId = user.id;
    req.session.linkedinId = linkedinId;
    req.session.linkedinProfileUrl = linkedinUrl;
    
    console.log("MANUAL AUTH: User session established");
    return res.status(200).json({ success: true, user: { id: user.id, name: fullname } });
  } catch (error) {
    console.error("MANUAL AUTH: Unhandled error:", error);
    
    // Provide more detailed error for debugging
    let errorMessage = "Authentication failed";
    if (error instanceof Error) {
      errorMessage = `Authentication failed: ${error.message}`;
      
      // Special handling for database errors
      if (error.message.includes("column") && error.message.includes("does not exist")) {
        errorMessage = "Database schema issue - please contact support. We're working on fixing this!";
      }
    }
    
    return res.status(500).json({ error: errorMessage });
  }
};