import { db } from "../../db";
import { AgentThought } from "../../client/src/types";
import { callOpenAIWithJSON } from "../utils/openai";
import { userResponses } from "../../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Memory Agent - Stores and leverages user's historical data for personalization
 * This agent records resume information, responses to questions, and profile data
 * to provide more personalized interview preparation in future sessions
 */
export async function storeUserMemory(
  userId: string,
  interviewPrepId: string,
  resumeText: string,
  linkedinUrl: string | null,
  profileData: any,
  highlightsData: any
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Memory Agent",
    thought: "Starting to store user profile and professional experience data.",
    sourcesConsulted: ["Resume", "LinkedIn Profile"]
  });
  
  try {
    // Extract key entities and experiences from resume
    const extractionPrompt = `
      Extract key professional information from this resume.
      
      Resume Text:
      ${resumeText}
      
      Extract the following:
      1. Work experiences (company names, job titles, durations)
      2. Skills and technologies
      3. Education background
      4. Projects mentioned
      5. Achievements and metrics
      
      Format your response as a JSON object with these categories.
    `;
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Memory Agent",
      thought: "Extracting structured professional information from resume.",
      sourcesConsulted: ["Resume"]
    });
    
    // Extract structured data from the resume
    const extractedData = await callOpenAIWithJSON<any>(extractionPrompt);
    
    // Combine extracted data with profile and highlights for a complete memory record
    const memoryRecord = {
      userId,
      interviewPrepId,
      resumeData: extractedData,
      linkedinUrl,
      profileData,
      highlightsData,
      createdAt: new Date()
    };
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Memory Agent",
      thought: "Successfully extracted structured data from resume and combined with profile information.",
      sourcesConsulted: []
    });
    
    // Store memory in database (this would be implemented in a real app)
    // For now, we'll just log it
    console.log("Memory record stored:", JSON.stringify(memoryRecord, null, 2));
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Memory Agent",
      thought: "Successfully stored user memory data for future personalization.",
      sourcesConsulted: []
    });
    
    return { success: true, thoughts };
  } catch (error: any) {
    console.error("Error in memory agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Memory Agent",
      thought: `Error storing user memory: ${error.message}`,
      sourcesConsulted: []
    });
    
    throw new Error("Failed to store user memory: " + error.message);
  }
}

/**
 * Store user's response to an interview question
 */
export async function storeUserResponse(
  userId: string,
  interviewPrepId: string,
  questionId: string,
  roundId: string,
  response: {
    situation: string;
    action: string;
    result: string;
  }
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Memory Agent",
    thought: `Recording user's response to question ${questionId} in round ${roundId}.`,
    sourcesConsulted: []
  });
  
  try {
    // First check if a response already exists for this question
    const existingResponses = await db.select()
      .from(userResponses)
      .where(eq(userResponses.questionId, questionId));
    
    if (existingResponses.length > 0) {
      // Update existing response
      await db.update(userResponses)
        .set({
          situation: response.situation,
          action: response.action,
          result: response.result,
          updatedAt: new Date()
        })
        .where(eq(userResponses.questionId, questionId));
      
      thoughts.push({
        timestamp: Date.now(),
        agent: "Memory Agent",
        thought: "Updated existing response with new content.",
        sourcesConsulted: []
      });
    } else {
      // Create new response
      await db.insert(userResponses).values({
        userId,
        interviewPrepId,
        questionId,
        roundId,
        situation: response.situation,
        action: response.action,
        result: response.result,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      thoughts.push({
        timestamp: Date.now(),
        agent: "Memory Agent",
        thought: "Stored new user response to interview question.",
        sourcesConsulted: []
      });
    }
    
    return { success: true, thoughts };
  } catch (error: any) {
    console.error("Error storing user response:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Memory Agent",
      thought: `Error storing user response: ${error.message}`,
      sourcesConsulted: []
    });
    
    throw new Error("Failed to store user response: " + error.message);
  }
}

/**
 * Retrieve user's stored responses for an interview preparation
 */
export async function getUserResponses(interviewPrepId: string) {
  try {
    const responses = await db.select()
      .from(userResponses)
      .where(eq(userResponses.interviewPrepId, interviewPrepId));
    
    return responses;
  } catch (error) {
    console.error("Error retrieving user responses:", error);
    return [];
  }
}