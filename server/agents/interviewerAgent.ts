import { callOpenAIWithJSON } from "../utils/openai";
import { 
  AgentThought, 
  InterviewRound, 
  TalkingPoint, 
  InterviewQuestion 
} from "../../client/src/types";

/**
 * Interviewer Preparer Agent
 * 
 * This agent generates tailored interview questions and talking points based on
 * the company, role, and candidate profile. It creates questions for each identified
 * interview round, ensuring they align with the company culture and job requirements.
 */
export async function generateInterviewQuestions(
  jobAnalysis: any,
  profileAnalysis: any,
  companyInfo: any,
  interviewPatterns: any,
  candidateHighlights: any
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Interviewer Preparer",
    thought: "Starting to craft tailored interview questions based on job requirements, company information, and candidate's profile.",
    sourcesConsulted: []
  });
  
  try {
    // Extract key information for question generation
    const companyName = jobAnalysis.companyName || "the company";
    const jobTitle = jobAnalysis.jobTitle || "the role";
    const rounds = interviewPatterns.interviewRounds || [];
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interviewer Preparer",
      thought: `Generating customized questions for ${rounds.length} interview rounds at ${companyName} for the ${jobTitle} position.`,
      sourcesConsulted: []
    });
    
    // Create fully populated interview rounds
    const interviewRounds: InterviewRound[] = [];
    
    // Process each round and generate tailored questions
    for (const round of rounds) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Interviewer Preparer",
        thought: `Creating tailored questions for the "${round.roundName}" round focusing on ${round.focus}.`,
        sourcesConsulted: []
      });
      
      const roundPrompt = `
        You are an expert interview question generator.
        
        Create 5 highly specific interview questions for the "${round.roundName}" round at ${companyName} for a ${jobTitle} position.
        
        Round Information:
        - Focus: ${round.focus}
        - Format: ${round.format || "Standard interview"}
        - Skills evaluated: ${round.skillsEvaluated?.join(", ") || "Relevant skills for the position"}
        
        Company Information:
        ${JSON.stringify(companyInfo, null, 2)}
        
        Job Requirements:
        ${JSON.stringify(jobAnalysis, null, 2)}
        
        Candidate Background:
        ${JSON.stringify(candidateHighlights, null, 2)}
        
        For each question:
        1. Create a clear, specific question that is highly relevant to this exact role at this company
        2. For each question, generate 3-5 detailed talking points that the candidate should mention
        3. These talking points should directly incorporate SPECIFIC evidence from the candidate's resume
        4. Include EXACT METRICS and ACHIEVEMENTS from the resume when relevant
        5. Reference specific technologies, projects or responsibilities from the resume
        
        Format your response as this JSON:
        {
          "questions": [
            {
              "id": "q1",
              "question": "The complete question text",
              "talkingPoints": [
                {
                  "id": "tp1",
                  "text": "Detailed talking point with specific evidence from resume"
                },
                {
                  "id": "tp2",
                  "text": "Detailed talking point with specific evidence from resume"
                },
                ...
              ]
            },
            ...
          ]
        }
        
        Make questions highly specific to this role, company, and the candidate's background.
        DO NOT generate generic questions that could apply to any role.
      `;
      
      // Generate questions for this round
      const roundQuestionsResult = await callOpenAIWithJSON<{ questions: any[] }>(roundPrompt);
      
      const questions: InterviewQuestion[] = roundQuestionsResult.questions.map((q: any, qIndex: number) => {
        // Process talking points
        const talkingPoints: TalkingPoint[] = q.talkingPoints.map((tp: any, tpIndex: number) => {
          return {
            id: tp.id || `tp-${Date.now()}-${qIndex}-${tpIndex}`,
            text: tp.text
          };
        });
        
        return {
          id: q.id || `q-${Date.now()}-${qIndex}`,
          question: q.question,
          talkingPoints: talkingPoints
        };
      });
      
      thoughts.push({
        timestamp: Date.now(),
        agent: "Interviewer Preparer",
        thought: `Generated ${questions.length} tailored questions for the "${round.roundName}" round with a total of ${questions.reduce((sum, q) => sum + q.talkingPoints.length, 0)} specific talking points.`,
        sourcesConsulted: []
      });
      
      // Add this round to our collection
      interviewRounds.push({
        id: round.id,
        name: round.roundName,
        focus: round.focus,
        questions: questions
      });
    }
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interviewer Preparer",
      thought: `Successfully generated a complete interview preparation guide with ${interviewRounds.length} rounds and ${interviewRounds.reduce((sum, r) => sum + r.questions.length, 0)} total questions.`,
      sourcesConsulted: []
    });
    
    return { analysis: { interviewRounds }, thoughts };
  } catch (error: any) {
    console.error("Error in interviewer preparer agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interviewer Preparer",
      thought: `Error generating interview questions: ${error.message}`,
      sourcesConsulted: []
    });
    
    throw new Error("Failed to generate interview questions: " + error.message);
  }
}