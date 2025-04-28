import { Request, Response } from "express";
import { storage } from "../storage";
import { InsertUser } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Make scrypt use promises
const scryptAsync = promisify(scrypt);

/**
 * Hash a password using scrypt
 */
async function hashPassword(password: string): Promise<string> {
  // Generate a salt
  const salt = randomBytes(16).toString("hex");
  
  // Hash the password with the salt
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  
  // Return the hashed password with the salt
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Verify a password against a stored hash
 */
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // Get the stored hash and salt
  const [storedHash, salt] = hashedPassword.split(".");
  
  // Hash the provided password with the same salt
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  const suppliedHash = buf.toString("hex");
  
  // Compare the hashes using constant-time comparison
  return timingSafeEqual(
    Buffer.from(storedHash, "hex"),
    Buffer.from(suppliedHash, "hex")
  );
}

/**
 * Register a new user
 */
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    
    // Check if username is already taken
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Create new user
    const userData: InsertUser = {
      username,
      email: email || "",
      password: hashedPassword,
      firstName: "",
      lastName: "",
      displayName: username,
      profilePictureUrl: "",
      linkedinProfileUrl: ""
    };
    
    // Insert the user into the database
    const user = await storage.createUser(userData);
    
    // Set user ID in session
    if (req.session) {
      req.session.userId = user.id;
    }
    
    // Return the user data without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
};

/**
 * Login with username and password
 */
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    
    // Get the user by username
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    // Check if the user has a password (might be a LinkedIn-only user)
    if (!user.password) {
      return res.status(401).json({ error: "This account doesn't have a password. Please use LinkedIn login." });
    }
    
    // Verify the password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    // Update last login time
    await storage.updateLastLogin(user.id);
    
    // Set user ID in session
    if (req.session) {
      req.session.userId = user.id;
    }
    
    // Return the user data without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ error: "Failed to login" });
  }
};