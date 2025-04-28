import { GradingResult, CandidateHighlights } from "@/types";
import { callOpenAIWithJSON } from "../utils/openai";

export interface GradingRequest {
  question: string;
  responseText: string;
  candidateHighlights: CandidateHighlights;
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
    const systemPrompt = `You are an expert interview coach responsible for evaluating interview responses using the Situation-Action-Result (SAR) framework.
Focus on these key evaluation areas:
1. Structure - Does the response follow the SAR format with clear sections?
2. Detail - Is the response specific with examples, metrics and achievements?
3. Relevance - Does the response directly address the question asked?
4. Impact - Does the response highlight the candidate's unique contributions?

Your evaluation should be constructive, specific, and actionable. Provide a numerical score (1-10) and clear feedback on strengths and areas for improvement.

Additionally, analyze the candidate's highlights (relevant points from their resume) and suggest specific points they could incorporate to strengthen their response.

Please respond with the following JSON format:
{
  "score": number (1-10),
  "feedback": "overall feedback on the response",
  "strengths": ["specific strength 1", "specific strength 2", ...],
  "improvements": ["specific improvement 1", "specific improvement 2", ...],
  "suggestedPoints": {
    "situation": ["specific point 1", "specific point 2", ...],
    "action": ["specific point 1", "specific point 2", ...],
    "result": ["specific point 1", "specific point 2", ...]
  }
}`;

    // Extract candidate highlights for contextual grading
    const relevantPoints = candidateHighlights?.relevantPoints || [];
    const keyMetrics = candidateHighlights?.keyMetrics || [];
    const directExperienceQuotes = candidateHighlights?.directExperienceQuotes || [];
    const suggestedTalkingPoints = candidateHighlights?.suggestedTalkingPoints || [];
    
    // Build a context-rich prompt
    const prompt = `
Question: ${question}

Candidate Response:
${responseText}

Candidate Highlights from Resume:
${relevantPoints.map(point => `- ${point}`).join('\n')}

${keyMetrics && keyMetrics.length > 0 ? `Key Metrics:\n${keyMetrics.map(metric => `- ${metric}`).join('\n')}\n` : ''}

${directExperienceQuotes && directExperienceQuotes.length > 0 ? 
  `Direct Experience Quotes:\n${directExperienceQuotes.map(q => `- ${q.skill}: "${q.quote}" (${q.context})`).join('\n')}\n` : ''}

${suggestedTalkingPoints && suggestedTalkingPoints.length > 0 ? 
  `Suggested Talking Points:\n${suggestedTalkingPoints.map(category => 
    `- ${category.category}: ${category.points.join(', ')}`).join('\n')}\n` : ''}

Evaluate this interview response and provide constructive feedback. Suggest specific points from their resume that could strengthen their answer.`;

    const result = await callOpenAIWithJSON<GradingResult>(prompt, systemPrompt);
    
    // Ensure result is properly formatted
    return {
      score: Math.max(1, Math.min(10, result.score || 5)),
      feedback: result.feedback || "Your response shows potential but needs improvement in structure and specificity.",
      strengths: result.strengths || ["You've provided an answer that addresses the question"],
      improvements: result.improvements || ["Try using the SAR format more explicitly", "Include more specific examples"],
      suggestedPoints: {
        situation: result.suggestedPoints?.situation || [],
        action: result.suggestedPoints?.action || [],
        result: result.suggestedPoints?.result || []
      }
    };
  } catch (error) {
    console.error("Error grading response:", error);
    
    // Return a fallback result if grading fails
    const defaultGrading: GradingResult = {
      score: 5,
      feedback: "We encountered an issue while grading your response. Here's some general feedback instead.",
      strengths: [
        "You've provided a response to the question",
        "You've made an effort to address the key points"
      ],
      improvements: [
        "Try to structure your answer using the Situation-Action-Result format",
        "Include specific examples and metrics where possible",
        "Connect your experience directly to the requirements of the role"
      ],
      suggestedPoints: {
        situation: [],
        action: [],
        result: []
      }
    };
    
    return defaultGrading;
  }
}