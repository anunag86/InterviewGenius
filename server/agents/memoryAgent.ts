import { db } from "../../db";
import { userResponses, insertUserResponseSchema } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { AgentThought, UserResponse } from "../../client/src/types";

/**
 * Store user response to an interview question
 */
export async function storeUserResponse(
  userId: string,
  interviewPrepId: string,
  questionId: string,
  roundId: string,
  content: { situation: string; action: string; result: string }
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Memory Manager",
    thought: `Storing user response for question ${questionId} in interview prep ${interviewPrepId}`,
    sourcesConsulted: []
  });
  
  try {
    // Check if there's an existing response for this question
    const existingResponses = await db.query.userResponses.findMany({
      where: and(
        eq(userResponses.interviewPrepId, interviewPrepId),
        eq(userResponses.questionId, questionId),
        eq(userResponses.roundId, roundId)
      )
    });
    
    // If there's an existing response, update it
    if (existingResponses && existingResponses.length > 0) {
      const existingId = existingResponses[0].id;
      
      await db.update(userResponses)
        .set({
          situation: content.situation,
          action: content.action,
          result: content.result,
          updatedAt: new Date()
        })
        .where(eq(userResponses.id, existingId));
      
      thoughts.push({
        timestamp: Date.now(),
        agent: "Memory Manager",
        thought: `Updated existing response for question ${questionId}`,
        sourcesConsulted: []
      });
      
      return { success: true, thoughts };
    }
    
    // Otherwise, create a new response
    const responseData = insertUserResponseSchema.parse({
      interviewPrepId,
      questionId,
      roundId,
      situation: content.situation,
      action: content.action,
      result: content.result,
      updatedAt: new Date()
    });
    
    await db.insert(userResponses).values(responseData);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Memory Manager",
      thought: `Successfully stored new response for question ${questionId}`,
      sourcesConsulted: []
    });
    
    return { success: true, thoughts };
  } catch (error: any) {
    console.error("Error storing user response:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Memory Manager",
      thought: `Error storing user response: ${error.message}`,
      sourcesConsulted: []
    });
    
    return { success: false, error: error.message, thoughts };
  }
}

/**
 * Store any other user memory (not used in the new architecture but maintained for compatibility)
 */
export async function storeUserMemory(
  userId: string,
  interviewPrepId: string,
  key: string,
  value: any
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Memory Manager",
    thought: `This function is deprecated in the new architecture.`,
    sourcesConsulted: []
  });
  
  // This function is kept for backward compatibility
  return { success: true, thoughts };
}

/**
 * Get all user responses for an interview prep
 */
export async function getUserResponses(interviewPrepId: string): Promise<UserResponse[]> {
  try {
    const responses = await db.query.userResponses.findMany({
      where: eq(userResponses.interviewPrepId, interviewPrepId)
    });
    
    // Convert from database model to client model
    return responses.map(r => ({
      questionId: r.questionId,
      roundId: r.roundId,
      situation: r.situation || "",
      action: r.action || "",
      result: r.result || "",
      updatedAt: r.updatedAt.toISOString()
    }));
  } catch (error) {
    console.error("Error getting user responses:", error);
    return [];
  }
}