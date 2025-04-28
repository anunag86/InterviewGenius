import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought, InterviewRound, InterviewQuestion, TalkingPoint } from "../../client/src/types";

/**
 * Interface for candidate talking points
 */
interface QuestionPoints {
  points: string[];
  relevance: string;
}

/**
 * Candidate Points Agent - Generates relevant talking points for interview questions
 * This agent uses candidate profile data from the profiler and highlighter agents
 * to identify relevant experiences and skills for each question
 */
export async function generateCandidatePoints(
  interviewRounds: InterviewRound[],
  candidateProfile: any,
  candidateHighlights: any,
  resumeText: string
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Candidate Points Agent",
    thought: "Starting to generate relevant talking points based on candidate resume and strengths.",
    sourcesConsulted: []
  });
  
  try {
    const enhancedRounds: InterviewRound[] = [];
    
    // Process each round and generate points for each question
    for (const round of interviewRounds) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Candidate Points Agent",
        thought: `Identifying talking points for ${round.questions.length} questions in the ${round.name} round.`,
        sourcesConsulted: []
      });
      
      const enhancedQuestions: InterviewQuestion[] = [];
      
      for (const question of round.questions) {
        // Find relevant experience from candidate profile that relates to this question
        const relevantStrengths = candidateHighlights.relevantPoints || [];
        
        thoughts.push({
          timestamp: Date.now(),
          agent: "Candidate Points Agent",
          thought: `Analyzing question: "${question.question}" to identify relevant experiences from resume.`,
          sourcesConsulted: ["Resume", "Candidate Profile", "Candidate Highlights"]
        });
        
        // Generate talking points based on resume and highlights
        const pointsPrompt = `
          You're helping identify relevant talking points from a candidate's resume for an interview question.
          
          Question: "${question.question}"
          
          Resume Text:
          ${resumeText}
          
          Candidate Strengths:
          ${JSON.stringify(relevantStrengths)}
          
          Candidate Profile Information:
          ${JSON.stringify(candidateProfile)}
          
          Generate 3-5 specific talking points extracted directly from the resume and candidate profile that:
          1. Are directly relevant to answering this interview question
          2. Highlight specific accomplishments, skills, or experiences from the resume
          3. Relate to the strengths identified in the candidate profile
          
          Format your response as a JSON object with this structure:
          {
            "points": [
              "Point 1 with specific accomplishment or skill from resume",
              "Point 2 with specific example from resume",
              ...
            ],
            "relevance": "Brief explanation of how these points relate to the question"
          }
          
          IMPORTANT: Only include points that are explicitly mentioned in the resume or candidate profile. Do NOT invent examples or experiences not present in the provided information.
        `;
        
        // Get talking points from OpenAI
        const pointsResponse = await callOpenAIWithJSON<QuestionPoints>(pointsPrompt);
        
        // Create talking points array
        const enhancedTalkingPoints: TalkingPoint[] = [];
        
        // Add bullet points for each talking point
        if (pointsResponse.points && pointsResponse.points.length > 0) {
          pointsResponse.points.forEach((point, index) => {
            enhancedTalkingPoints.push({
              id: `${question.id}-point-${index}`,
              text: point // Clean text without bullets - CSS will handle formatting
            });
          });
          
          // Add relevance explanation as the last point with a special format
          if (pointsResponse.relevance) {
            enhancedTalkingPoints.push({
              id: `${question.id}-relevance`,
              text: pointsResponse.relevance
            });
          }
        } else {
          // Fallback if no points were generated
          enhancedTalkingPoints.push({
            id: `${question.id}-no-points`,
            text: `You should provide specific examples from your experience for this question.`
          });
        }
        
        thoughts.push({
          timestamp: Date.now(),
          agent: "Candidate Points Agent",
          thought: `Generated ${enhancedTalkingPoints.length} relevant talking points based on resume and candidate profile.`,
          sourcesConsulted: []
        });
        
        // Add the enhanced question with talking points
        enhancedQuestions.push({
          ...question,
          talkingPoints: enhancedTalkingPoints
        });
      }
      
      // Add the enhanced round with all its questions
      enhancedRounds.push({
        ...round,
        questions: enhancedQuestions
      });
    }
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Candidate Points Agent",
      thought: `Successfully generated relevant talking points for all interview questions across ${enhancedRounds.length} rounds.`,
      sourcesConsulted: []
    });
    
    return { rounds: enhancedRounds, thoughts };
  } catch (error: any) {
    console.error("Error in candidate points agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Candidate Points Agent",
      thought: `Error generating talking points: ${error.message}`,
      sourcesConsulted: []
    });
    
    throw new Error("Failed to generate candidate talking points: " + error.message);
  }
}