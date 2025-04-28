import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought, InterviewRound, JobDetails } from "../../client/src/types";

/**
 * Interviewer Preparer Agent - Generates tailored interview questions with specific talking points
 * 
 * This agent uses knowledge of the hiring company, job role, and candidate profile to:
 * 1. Generate relevant questions for different interview rounds based on company's typical interview structure
 * 2. Create specific, personalized talking points for each question based on the candidate's resume
 * 3. Include alternative talking points for areas where the candidate lacks direct experience
 * 4. Align questions and talking points with the company's values and culture
 * 5. Focus on the candidate's strengths while addressing potential gaps
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
    agent: "Interviewer Preparer Agent",
    thought: `Initializing enhanced interview preparation process for ${jobDetails.title} at ${jobDetails.company}.`,
    sourcesConsulted: []
  });
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Interviewer Preparer Agent",
    thought: `Starting question and talking points generation based on company research and candidate profile. This consolidated agent now handles both question generation and talking points creation in a single workflow.`,
    sourcesConsulted: []
  });
  
  try {
    // Analyze interview structure from interview patterns
    const interviewRounds = interviewPatterns.interviewRounds || [];
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interviewer Preparer Agent",
      thought: `Identified ${interviewRounds.length} interview rounds from company research.`,
      sourcesConsulted: ["Interview Patterns Research"]
    });
    
    // Identify company leadership principles and values
    const companyValues = companyInfo.companyInfo?.culture || [];
    const teamInfo = companyInfo.companyInfo?.teamInfo || [];
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interviewer Preparer Agent",
      thought: `Analyzing company values and culture to align questions with ${jobDetails.company}'s focus areas.`,
      sourcesConsulted: ["Company Research"]
    });
    
    // Identify candidate's strengths and gaps
    const strengths = candidateHighlights.relevantPoints || [];
    const gaps = candidateHighlights.gapAreas || [];
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interviewer Preparer Agent",
      thought: `Analyzing candidate's ${strengths.length} strengths and ${gaps.length} areas for development to tailor questions and talking points.`,
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
        agent: "Interviewer Preparer Agent",
        thought: `Generating questions and talking points for "${round.roundName}" which focuses on ${round.focus}.`,
        sourcesConsulted: ["Interview Pattern Research"]
      });
      
      // Create a prompt that incorporates company values, job requirements, and candidate profile
      const questionPrompt = `
        You are the Interviewer Preparer Agent for ${jobDetails.company}'s ${jobDetails.title} role.
        
        Job Details:
        ${JSON.stringify(jobDetails)}
        
        Company Values:
        ${JSON.stringify(companyValues)}
        
        Team Information:
        ${JSON.stringify(teamInfo)}
        
        Candidate Resume & LinkedIn Profile Details:
        ${JSON.stringify(candidateProfile)}
        
        Candidate Strengths:
        ${JSON.stringify(strengths)}
        
        Candidate Areas for Development:
        ${JSON.stringify(gaps)}
        
        You're preparing content for the "${round.roundName}" round which focuses on "${round.focus}".
        
        Generate at least 5 tailored, in-depth interview questions for this round that:
        1. Probe into relevant experiences based on the candidate's background
        2. Address potential gaps in the candidate's profile
        3. Align with ${jobDetails.company}'s values and culture
        4. Assess specific skills required for the ${jobDetails.title} role
        5. Feel authentic and specific to this company (not generic questions)
        
        For each question, you MUST include:
        1. The question itself (clear and specific)
        2. 3-5 specific talking points that would make for a strong answer
        3. These talking points MUST be COMPREHENSIVE PARAGRAPHS (3-5 sentences each) that provide detailed context and full descriptions
        4. Include EXTENSIVE details directly quoted from the candidate's resume and LinkedIn profile
        5. Each talking point MUST include:
           - The specific company and timeframe where the experience occurred
           - The candidate's exact role and responsibilities in the situation
           - Quantifiable metrics and achievements with precise numbers (percentages, dollar amounts, time saved, team sizes, etc.)
           - The methodologies, technologies, or approaches used
           - The business impact and value delivered to the organization
        6. Format each talking point as a complete, detailed paragraph that provides the full story, NOT just a short phrase
        7. IMPORTANT: Do not use short bullet points. Each talking point should be a substantial paragraph of 3-5 sentences with all relevant context
        8. Example format (but with MUCH more detail specific to the candidate):
           "During my tenure at Amazon (2019-2021) as a Senior Risk Manager, I was responsible for evaluating critical escalation processes across 5 international markets. I identified systemic bottlenecks that were causing delays in issue resolution and designed a comprehensive risk assessment framework involving 12 key metrics. By implementing this framework and training cross-functional teams of 20+ analysts, I reduced escalation resolution time by 89% and recovered $20M in operational costs within the first year. This initiative was recognized by senior leadership and adopted as the company standard for all risk mitigation procedures globally."
        9. At least one talking point should address how to answer if the candidate lacks direct experience, but still be substantive and detailed
        
        Format your response as a JSON array with this structure:
        [
          {
            "id": "unique-id-1",
            "question": "Detailed question text",
            "talkingPoints": [
              {
                "id": "tp-1",
                "text": "Talking point with specific reference to candidate experience"
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
        agent: "Interviewer Preparer Agent",
        thought: `Generated ${questions.length} tailored questions with talking points for the ${round.roundName} round.`,
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
      agent: "Interviewer Preparer Agent",
      thought: `Successfully generated tailored questions with specific talking points for ${enhancedRounds.length} interview rounds.`,
      sourcesConsulted: []
    });
    
    return { rounds: enhancedRounds, thoughts };
  } catch (error: any) {
    console.error("Error in Interviewer Preparer Agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interviewer Preparer Agent",
      thought: `Error generating interview questions and talking points: ${error.message}`,
      sourcesConsulted: []
    });
    
    throw new Error("Failed to generate interview questions and talking points: " + error.message);
  }
}