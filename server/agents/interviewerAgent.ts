import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought, InterviewRound, JobDetails } from "../../client/src/types";

/**
 * Interviewer Preparer Agent - Generates tailored interview questions based on company research
 * This agent uses knowledge of the hiring company, job role, and candidate profile
 * to generate relevant questions for different interview rounds and provides specific talking points
 * for each question based on candidate's resume and the job requirements.
 */
export async function generateInterviewQuestions(
  jobDetails: JobDetails,
  companyInfo: any,
  interviewPatterns: any,
  candidateProfile: any,
  candidateHighlights: any
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Interviewer Agent",
    thought: `Starting question generation for ${jobDetails.title} at ${jobDetails.company} based on company research and candidate profile.`,
    sourcesConsulted: []
  });
  
  try {
    // Analyze interview structure from interview patterns
    const interviewRounds = interviewPatterns.interviewRounds || [];
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interviewer Agent",
      thought: `Identified ${interviewRounds.length} interview rounds from company research.`,
      sourcesConsulted: ["Interview Patterns Research"]
    });
    
    // Identify company leadership principles and values
    const companyValues = companyInfo.companyInfo?.culture || [];
    const teamInfo = companyInfo.companyInfo?.teamInfo || [];
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interviewer Agent",
      thought: `Analyzing company values and culture to align questions with ${jobDetails.company}'s focus areas.`,
      sourcesConsulted: ["Company Research"]
    });
    
    // Identify candidate's strengths and gaps
    const strengths = candidateHighlights.relevantPoints || [];
    const gaps = candidateHighlights.gapAreas || [];
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interviewer Agent",
      thought: `Analyzing candidate's ${strengths.length} strengths and ${gaps.length} areas for development to tailor questions.`,
      sourcesConsulted: ["Candidate Profile", "Resume Analysis"]
    });
    
    // If we have no interview rounds from the pattern researcher, create default rounds
    let roundsToProcess = interviewRounds.length > 0 ? interviewRounds : [
      {
        roundName: "Initial Screen",
        focus: "General fit and background verification",
        format: "Phone or video call with recruiter or hiring manager"
      },
      {
        roundName: "Technical Assessment",
        focus: "Technical skills relevant to the role",
        format: "Coding challenge, system design, or technical problem-solving"
      },
      {
        roundName: "Behavioral Interview",
        focus: "Past experiences and behavior patterns",
        format: "Structured behavioral questions with the team"
      },
      {
        roundName: "Culture Fit",
        focus: "Alignment with company values and culture",
        format: "Conversation with team members and potential peers"
      }
    ];
    
    // Generate tailored questions for each round
    const enhancedRounds: InterviewRound[] = [];
    
    for (const round of roundsToProcess) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Interviewer Agent",
        thought: `Generating questions for "${round.roundName}" which focuses on ${round.focus}.`,
        sourcesConsulted: ["Interview Pattern Research"]
      });
      
      // Create a prompt that incorporates company values, job requirements, and candidate profile
      const questionPrompt = `
        You are an expert interviewer at ${jobDetails.company} for the ${jobDetails.title} role.
        
        Job Details:
        ${JSON.stringify(jobDetails)}
        
        Company Values:
        ${JSON.stringify(companyValues)}
        
        Team Information:
        ${JSON.stringify(teamInfo)}
        
        Candidate Strengths:
        ${JSON.stringify(strengths)}
        
        Candidate Areas for Development:
        ${JSON.stringify(gaps)}
        
        You're conducting the "${round.roundName}" round which focuses on "${round.focus}".
        
        Generate at least 5 tailored, in-depth interview questions for this round that:
        1. Probe into relevant experiences based on the candidate's background
        2. Address potential gaps in the candidate's profile
        3. Align with ${jobDetails.company}'s values and culture
        4. Assess specific skills required for the ${jobDetails.title} role
        5. Feel authentic and specific to this company (not generic questions)
        
        For each question, include:
        1. The question itself (clear and specific)
        2. 3-4 specific talking points that would make for a strong answer
        
        Format your response as a JSON array with this structure:
        [
          {
            "id": "unique-id-1",
            "question": "Detailed question text",
            "talkingPoints": [
              {
                "id": "tp-1",
                "text": "Talking point 1"
              },
              ...
            ]
          },
          ...
        ]
      `;
      
      // Get tailored questions from OpenAI
      const questionsResult = await callOpenAIWithJSON<any[]>(questionPrompt);
      
      // Ensure we have an array of questions
      const questions = Array.isArray(questionsResult) ? questionsResult : [];
      
      thoughts.push({
        timestamp: Date.now(),
        agent: "Interviewer Agent",
        thought: `Generated ${questions.length} tailored questions for the ${round.roundName} round.`,
        sourcesConsulted: []
      });
      
      // Add to our enhanced rounds
      enhancedRounds.push({
        id: round.id || `round-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: round.roundName,
        focus: round.focus,
        questions: questions
      });
    }
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interviewer Agent",
      thought: `Successfully generated tailored questions for ${enhancedRounds.length} interview rounds.`,
      sourcesConsulted: []
    });
    
    return { rounds: enhancedRounds, thoughts };
  } catch (error: any) {
    console.error("Error in interviewer agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interviewer Agent",
      thought: `Error generating interview questions: ${error.message}`,
      sourcesConsulted: []
    });
    
    throw new Error("Failed to generate interview questions: " + error.message);
  }
}