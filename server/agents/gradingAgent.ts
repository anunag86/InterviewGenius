import { analyzeDocument } from "../utils/openai";
import { CandidateHighlights } from "../../client/src/types";

export interface GradingResult {
  score: number;          // 1-10 score
  feedback: string;       // Overall assessment
  strengths: string[];    // What was done well
  improvements: string[]; // Suggestions for improvement
  suggestedPoints: {      // Resume points that could be incorporated
    situation: string[];
    action: string[];
    result: string[];
  };
}

/**
 * Grading Agent
 * 
 * This agent evaluates user responses to interview questions based on best practices and
 * provides constructive feedback with personalized suggestions from the user's profile.
 * It analyzes responses for structure, detail, clarity, and relevance.
 */
export async function gradeResponse(
  question: string,
  responseText: string,
  candidateHighlights: CandidateHighlights
): Promise<GradingResult> {
  try {
    // Default response in case of error
    const defaultGrading: GradingResult = {
      score: 7,
      feedback: "Your response demonstrates understanding of the SAR format. Consider adding more specific details and metrics to strengthen your answer.",
      strengths: [
        "Good structure following the SAR format",
        "Clear narrative flow"
      ],
      improvements: [
        "Add specific metrics to demonstrate impact",
        "Include more context in the situation section"
      ],
      suggestedPoints: {
        situation: [],
        action: [],
        result: []
      }
    };

    // Create the system prompt for evaluation
    const systemPrompt = `You are an expert interview coach with experience grading thousands of interview responses.
    You understand the importance of structured answers using the Situation-Action-Result format in interviews.
    
    Your task is to evaluate a candidate's response to an interview question and provide a score and constructive feedback.
    Score the response on a scale of 1-10 based on:
    1. Structure: How well the response follows the SAR format
    2. Specificity: The use of concrete examples and data points
    3. Relevance: How well the response addresses the question
    4. Impact: The significance of the results described
    
    Then, recommend specific points from the candidate's background that could strengthen the response.
    
    Format your analysis as valid JSON with the following structure:
    {
      "score": number (1-10),
      "feedback": "overall assessment",
      "strengths": ["strength1", "strength2", ...],
      "improvements": ["improvement1", "improvement2", ...],
      "suggestedPoints": {
        "situation": ["point1", "point2", ...],
        "action": ["point1", "point2", ...],
        "result": ["point1", "point2", ...]
      }
    }`;

    // Create the user prompt with all information
    const userPrompt = `
    INTERVIEW QUESTION:
    ${question}
    
    CANDIDATE'S RESPONSE:
    ${responseText}
    
    CANDIDATE BACKGROUND INFORMATION:
    Relevant Experience Points: ${JSON.stringify(candidateHighlights.relevantPoints)}
    ${candidateHighlights.directExperienceQuotes ? `Direct Experience Quotes: ${JSON.stringify(candidateHighlights.directExperienceQuotes)}` : ''}
    ${candidateHighlights.keyMetrics ? `Key Metrics: ${JSON.stringify(candidateHighlights.keyMetrics)}` : ''}
    
    Please evaluate this response and provide constructive feedback with specific suggestions from the candidate's background.`;

    // Call OpenAI for analysis
    const analysis = await analyzeDocument<GradingResult>(userPrompt, systemPrompt);
    
    // Return the analysis or default if something goes wrong with the structure
    return analysis || defaultGrading;
  } catch (error) {
    console.error("Error in grading agent:", error);
    
    // Return default grading in case of error
    return {
      score: 6,
      feedback: "We encountered an issue while analyzing your response. However, using the SAR format is a great start. Try to include specific metrics and details from your experience.",
      strengths: ["Using structured format for your answer"],
      improvements: ["Add specific metrics when possible", "Provide more context about the situation"],
      suggestedPoints: {
        situation: [],
        action: [],
        result: []
      }
    };
  }
}