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
        // Extract existing talking points to build upon
        const existingPoints = question.talkingPoints.map(tp => tp.text).join("\n");
        
        thoughts.push({
          timestamp: Date.now(),
          agent: "Candidate Narrative Agent",
          thought: `Developing SAR narrative structure for question: "${question.question}" based on existing talking points.`,
          sourcesConsulted: ["Candidate Points", "Candidate Profile", "Candidate Highlights"]
        });
        
        // Generate a SAR (Situation-Action-Result) narrative structure
        const narrativePrompt = `
          You're helping a job candidate structure their answer using the talking points previously identified.
          
          Question: "${question.question}"
          
          Existing Talking Points:
          ${existingPoints}
          
          Candidate Strengths:
          ${JSON.stringify(candidateHighlights.relevantPoints || [])}
          
          Create a narrative structure in Situation-Action-Result format that:
          1. Uses ONLY the information from the talking points provided
          2. Organizes the points into a clear narrative flow
          3. Does NOT add new facts or experiences not mentioned in the talking points
          
          Format your response as a JSON object with this structure:
          {
            "situation": "How to frame the situation or challenge faced, using specific details from talking points",
            "action": "How to describe the actions taken, using specific details from talking points",
            "result": "How to articulate the outcome and impact, using specific details from talking points",
            "guidance": "Brief overall guidance on how to tell this story effectively"
          }
          
          IMPORTANT: This should be narrative guidance, not a complete answer. Use phrases like "You might describe..." or "Consider framing..." to show this is guidance. 
          Only use information from the existing talking points - do not invent new experiences.
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