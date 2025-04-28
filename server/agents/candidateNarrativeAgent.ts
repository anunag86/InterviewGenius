import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought, InterviewRound, InterviewQuestion, TalkingPoint } from "../../client/src/types";

/**
 * Interface for a narrative guidance in SAR format
 */
interface SARNarrative {
  situation: string;
  action: string;
  result: string;
  guidance: string;
}

/**
 * Candidate Narrative Agent - Generates structured narrative guidance
 * This agent builds upon the talking points from the Candidate Points Agent
 * to create a clear narrative structure using the Situation-Action-Result format
 */
export async function generateCandidateNarrative(
  interviewRounds: InterviewRound[],
  candidateProfile: any,
  candidateHighlights: any
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Candidate Narrative Agent",
    thought: "Starting to generate narrative guidance using Situation-Action-Result format.",
    sourcesConsulted: []
  });
  
  try {
    const enhancedRounds: InterviewRound[] = [];
    
    // Process each round and generate narrative guidance for each question
    for (const round of interviewRounds) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Candidate Narrative Agent",
        thought: `Creating narrative structure for ${round.questions.length} questions in the ${round.name} round.`,
        sourcesConsulted: []
      });
      
      const enhancedQuestions: InterviewQuestion[] = [];
      
      for (const question of round.questions) {
        thoughts.push({
          timestamp: Date.now(),
          agent: "Candidate Narrative Agent",
          thought: `Developing high-level SAR narrative guidance for question: "${question.question}"`,
          sourcesConsulted: ["Candidate Profile", "Candidate Highlights"]
        });
        
        // Generate a SAR (Situation-Action-Result) narrative structure
        const narrativePrompt = `
          You're creating HIGH-LEVEL STRATEGIC NARRATIVE GUIDANCE for a job interview question.
          
          Question: "${question.question}"
          
          Candidate Strengths:
          ${JSON.stringify(candidateHighlights.relevantPoints || [])}
          
          Candidate Gap Areas:
          ${JSON.stringify(candidateHighlights.gapAreas || [])}
          
          Your task is to provide GENERAL STRATEGIC GUIDANCE on how to approach this question using the SAR (Situation-Action-Result) framework. DO NOT provide specific examples - these will be added later by another agent.
          
          Format your response as a JSON object with this structure:
          {
            "situation": "Strategic advice on how to frame the context and challenge (e.g., 'Start by describing a situation where you faced a similar challenge to show your experience with...')",
            "action": "Strategic advice on what types of actions to highlight (e.g., 'Emphasize your analytical approach and how you collaborated with stakeholders to...')",
            "result": "Strategic advice on what outcomes to highlight (e.g., 'Focus on both quantitative results like metrics improved and qualitative outcomes like improved team dynamics')",
            "guidance": "Overall interview strategy for this question type, including potential follow-up questions to prepare for"
          }
          
          IMPORTANT: This should be high-level strategic guidance only, NOT specific examples or experiences. The talking points with concrete examples will be generated separately. Use phrases like "Consider highlighting..." or "Structure your answer to demonstrate..."
        `;
        
        // Get narrative guidance from OpenAI
        const sarNarrative = await callOpenAIWithJSON<SARNarrative>(narrativePrompt);
        
        // Create a narrative guidance text
        let narrativeText = `Suggested Narrative Structure:\n\n`;
        
        if (sarNarrative.situation) {
          narrativeText += `Situation: ${sarNarrative.situation}\n\n`;
        }
        
        if (sarNarrative.action) {
          narrativeText += `Action: ${sarNarrative.action}\n\n`;
        }
        
        if (sarNarrative.result) {
          narrativeText += `Result: ${sarNarrative.result}\n\n`;
        }
        
        if (sarNarrative.guidance) {
          narrativeText += `Guidance: ${sarNarrative.guidance}`;
        }
        
        // Log the narrative guidance for debugging
        console.log(`Generated narrative for question '${question.id}': ${narrativeText.substring(0, 50)}...`);
        
        thoughts.push({
          timestamp: Date.now(),
          agent: "Candidate Narrative Agent",
          thought: `Generated structured SAR narrative guidance to complement the existing talking points.`,
          sourcesConsulted: []
        });
        
        // Create an enhanced question with narrative field
        const enhancedQuestion: InterviewQuestion = {
          ...question,
          narrative: narrativeText
        };
        
        // Add the enhanced question
        enhancedQuestions.push(enhancedQuestion);
      }
      
      // Add the enhanced round with all its questions
      enhancedRounds.push({
        ...round,
        questions: enhancedQuestions
      });
    }
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Candidate Narrative Agent",
      thought: `Successfully generated narrative guidance for all interview questions across ${enhancedRounds.length} rounds.`,
      sourcesConsulted: []
    });
    
    return { rounds: enhancedRounds, thoughts };
  } catch (error: any) {
    console.error("Error in candidate narrative agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Candidate Narrative Agent",
      thought: `Error generating narrative guidance: ${error.message}`,
      sourcesConsulted: []
    });
    
    throw new Error("Failed to generate candidate narrative guidance: " + error.message);
  }
}