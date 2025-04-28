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
      
      // Gather all direct quotes and metrics from the candidate's profile
      const specificMetrics = candidateProfile.quantifiableAchievements || [];
      const directExperiences = candidateProfile.professionalExperience || [];
      const rawHighlights = candidateProfile.rawHighlights || [];
      const verbatimResponsibilities: string[] = [];
      const verbatimAchievements: string[] = [];
      
      // Extract verbatim responsibilities and achievements from professional experience
      if (Array.isArray(directExperiences)) {
        directExperiences.forEach((exp: any) => {
          if (exp.verbatimResponsibilities && Array.isArray(exp.verbatimResponsibilities)) {
            verbatimResponsibilities.push(...exp.verbatimResponsibilities);
          }
          if (exp.verbatimAchievements && Array.isArray(exp.verbatimAchievements)) {
            verbatimAchievements.push(...exp.verbatimAchievements);
          }
        });
      }
      
      // Extract additional specifics from the highlighter agent
      const verbatimSkillsAndExperiences = candidateHighlights.verbatimSkillsAndExperiences || [];
      const specificResumeMetrics = candidateHighlights.specificMetrics || [];
      const suggestedTalkingPoints = candidateHighlights.suggestedTalkingPoints || [];
      
      // Create a prompt that incorporates company values, job requirements, and candidate profile with RAW DATA
      const questionPrompt = `
        You are the Interviewer Preparer Agent for ${jobDetails.company}'s ${jobDetails.title} role.
        
        Job Details:
        ${JSON.stringify(jobDetails, null, 2)}
        
        Company Values:
        ${JSON.stringify(companyValues, null, 2)}
        
        Team Information:
        ${JSON.stringify(teamInfo, null, 2)}
        
        ============ CANDIDATE'S EXACT RESUME DATA ============
        VERBATIM PROFESSIONAL EXPERIENCE:
        ${JSON.stringify(directExperiences, null, 2)}
        
        VERBATIM RESPONSIBILITIES (DIRECT QUOTES FROM RESUME):
        ${JSON.stringify(verbatimResponsibilities, null, 2)}
        
        VERBATIM ACHIEVEMENTS WITH METRICS (DIRECT QUOTES FROM RESUME):
        ${JSON.stringify(verbatimAchievements, null, 2)}
        
        ADDITIONAL VERBATIM METRICS FROM RESUME:
        ${JSON.stringify(specificResumeMetrics, null, 2)}
        
        VERBATIM SKILLS AND EXPERIENCES (DIRECT QUOTES):
        ${JSON.stringify(verbatimSkillsAndExperiences, null, 2)}
        
        RAW RESUME HIGHLIGHTS (DIRECT QUOTES):
        ${JSON.stringify(rawHighlights, null, 2)}
        
        SUGGESTED TALKING POINTS WITH EVIDENCE:
        ${JSON.stringify(suggestedTalkingPoints, null, 2)}
        =====================================================
        
        Candidate Strengths:
        ${JSON.stringify(strengths, null, 2)}
        
        Candidate Areas for Development:
        ${JSON.stringify(gaps, null, 2)}
        
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
        
        CRITICAL INSTRUCTIONS FOR TALKING POINTS:
        1. Each talking point MUST be a COMPREHENSIVE PARAGRAPH (3-5 sentences)
        2. Use EXACT QUOTES from the candidate's resume (use the VERBATIM sections above)
        3. Each talking point MUST include the following components:
           - EXACT company name and precise timeframe from the resume (e.g., "Microsoft (June 2018-April 2021)")
           - EXACT role and responsibilities using the candidate's own words
           - SPECIFIC METRICS exactly as they appear in the resume (percentages, dollar figures, team sizes)
           - EXACT technologies, methodologies, or frameworks mentioned
           - Concrete business impact with specific results
        4. IMPORTANT: Do not paraphrase or summarize! Use the candidate's exact wording from their resume.
        5. Example of a good talking point (though your talking points should use the candidate's ACTUAL resume data):
           "At Microsoft (June 2018-April 2021) as a Senior Software Engineer, I led the redesign of our authentication service that supported 250 million daily active users. I implemented a zero-trust security model using OAuth 2.0 and JWT tokens, which reduced security incidents by 73% in the first quarter after deployment. My team of 7 engineers also optimized API response times from 120ms to 35ms, resulting in a 22% improvement in overall application performance and saving $1.2M in infrastructure costs annually. This project was recognized with a Microsoft Gold Star Award and was adopted as the security standard across 12 product teams."
        6. The last talking point for each question should address how to answer if the candidate lacks direct experience, but must still be substantive and include transferable skills from the resume.
        
        Format your response as a JSON array with this structure:
        [
          {
            "id": "unique-id-1",
            "question": "Detailed question text",
            "talkingPoints": [
              {
                "id": "tp-1",
                "text": "Talking point with EXACT quotes and metrics from the resume"
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