import { Request, Response } from "express";
import { db } from "../../db";
import { feedback, insertFeedbackSchema } from "../../shared/schema";
import { ZodError } from "zod";

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    // Validate the request body
    const validatedData = insertFeedbackSchema.parse(req.body);
    
    // Insert the feedback
    const [newFeedback] = await db.insert(feedback)
      .values(validatedData)
      .returning();
    
    return res.status(201).json({
      message: "Feedback submitted successfully",
      feedback: newFeedback
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Invalid feedback data",
        errors: error.errors
      });
    }
    
    return res.status(500).json({
      message: "Failed to submit feedback"
    });
  }
};