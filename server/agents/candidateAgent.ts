import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought, InterviewRound, InterviewQuestion, TalkingPoint } from "../../client/src/types";

/**
 * Interface for a formatted answer in SAR format
 */
interface SARAnswer {
  situation: string;
  action: string;
  result: string;
  missingInfo: boolean;
  exampleScenario?: string;
}

/**
 * Candidate Agent - Generates structured responses to interview questions
 * This agent uses candidate profile data to create Situation-Action-Result formatted answers
 * and identifies areas where the candidate should provide additional information
 */
export async function generateCandidateAnswers(
  interviewRounds: InterviewRound[],
  candidateProfile: any,
  candidateHighlights: any,
  resumeText: string
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Candidate Agent",
    thought: "Starting to generate structured candidate answers in Situation-Action-Result format.",
    sourcesConsulted: []
  });
  
  try {
    const enhancedRounds: InterviewRound[] = [];
    
    // Process each round and generate answers for each question
    for (const round of interviewRounds) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Candidate Agent",
        thought: `Generating answers for ${round.questions.length} questions in the ${round.name} round.`,
        sourcesConsulted: []
      });
      
      const enhancedQuestions: InterviewQuestion[] = [];
      
      for (const question of round.questions) {
        // Find relevant experience from candidate profile that relates to this question
        const relevantStrengths = candidateHighlights.relevantPoints || [];
        
        thoughts.push({
          timestamp: Date.now(),
          agent: "Candidate Agent",
          thought: `Analyzing question: "${question.question}" to identify relevant experiences from resume.`,
          sourcesConsulted: ["Resume", "Candidate Profile"]
        });
        
        // Generate a SAR (Situation-Action-Result) formatted answer
        const answerPrompt = `
          You're helping a job candidate prepare for an interview question.
          
          Question: "${question.question}"
          
          Resume Text:
          ${resumeText}
          
          Candidate Strengths:
          ${JSON.stringify(relevantStrengths)}
          
          Generate a structured answer in Situation-Action-Result format:
          
          1. Identify if there's enough information in the resume to answer this question
          2. If there's enough information, create a clear SAR response
          3. If there's NOT enough information, create placeholder text and an example scenario
          
          Format your response as a JSON object with this structure:
          {
            "situation": "Clear description of the situation or challenge faced",
            "action": "Specific actions the candidate took to address the situation",
            "result": "Measurable outcomes and what was learned",
            "missingInfo": boolean (true if candidate needs to fill in details),
            "exampleScenario": "Optional example scenario if missing information" 
          }
        `;
        
        // Get SAR formatted answer from OpenAI
        const sarAnswer = await callOpenAIWithJSON<SARAnswer>(answerPrompt);
        
        // Create enhanced talking points based on the SAR answer
        const enhancedTalkingPoints: TalkingPoint[] = [];
        
        // Add SAR components as talking points
        if (sarAnswer.situation) {
          enhancedTalkingPoints.push({
            id: `${question.id}-situation`,
            text: `Situation: ${sarAnswer.situation}`
          });
        }
        
        if (sarAnswer.action) {
          enhancedTalkingPoints.push({
            id: `${question.id}-action`,
            text: `Action: ${sarAnswer.action}`
          });
        }
        
        if (sarAnswer.result) {
          enhancedTalkingPoints.push({
            id: `${question.id}-result`,
            text: `Result: ${sarAnswer.result}`
          });
        }
        
        // Add missing info note if needed
        if (sarAnswer.missingInfo && sarAnswer.exampleScenario) {
          enhancedTalkingPoints.push({
            id: `${question.id}-missing`,
            text: `Note: *You should elaborate with your own experience here. For example:* ${sarAnswer.exampleScenario}`
          });
        }
        
        thoughts.push({
          timestamp: Date.now(),
          agent: "Candidate Agent",
          thought: `Generated structured SAR answer with ${enhancedTalkingPoints.length} talking points.${sarAnswer.missingInfo ? " Answer requires additional input from candidate." : ""}`,
          sourcesConsulted: []
        });
        
        // Add the enhanced question with SAR talking points
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
      agent: "Candidate Agent",
      thought: `Successfully generated SAR-formatted answers for all interview questions across ${enhancedRounds.length} rounds.`,
      sourcesConsulted: []
    });
    
    return { rounds: enhancedRounds, thoughts };
  } catch (error: any) {
    console.error("Error in candidate agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Candidate Agent",
      thought: `Error generating candidate answers: ${error.message}`,
      sourcesConsulted: []
    });
    
    throw new Error("Failed to generate candidate answers: " + error.message);
  }
}