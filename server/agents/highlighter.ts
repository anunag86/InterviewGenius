import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought, CandidateHighlights } from "../../client/src/types";

// Interface for highlight result
interface HighlightResult {
  relevantPoints: string[];
  gapAreas: string[];
  verbatimSkillsAndExperiences?: string[];
  specificMetrics?: string[];
  suggestedTalkingPoints?: Array<{
    skill: string;
    resumeEvidence: string;
    context: string;
  }>;
}

// Highlighter Agent that extracts relevant resume points and identifies gaps
export async function highlightResumePoints(
  resumeText: string,
  jobAnalysis: any,
  profileAnalysis: any
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Highlighter",
    thought: "Starting analysis to highlight resume strengths and identify gaps for this specific job.",
    sourcesConsulted: ["Resume", "Job Analysis", "Profile Analysis"]
  });
  
  try {
    // Get the job details and required skills
    const jobTitle = jobAnalysis.jobTitle || "the role";
    const companyName = jobAnalysis.companyName || "the company";
    const requiredSkills = jobAnalysis.requiredSkills || [];
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Highlighter",
      thought: `Analyzing resume against ${requiredSkills.length} identified required skills for ${jobTitle} at ${companyName}.`,
      sourcesConsulted: ["Job Analysis"]
    });
    
    // Create a prompt to highlight the resume strengths and gaps based on the job requirements
    const highlightPrompt = `
      You are a Resume Highlighter Agent specializing in identifying strengths and gaps in candidate profiles.
      Your task is to analyze a candidate's resume text and profile against a specific job description
      and highlight relevant points that match the job requirements as well as identify potential gaps.
      
      Resume Text:
      ${resumeText}
      
      Profile Analysis:
      ${JSON.stringify(profileAnalysis)}
      
      Job Analysis:
      ${JSON.stringify(jobAnalysis)}
      
      IMPORTANT: Extract SPECIFIC and DETAILED content directly from the resume. You MUST:
      1. Include EXACT quotes from the resume showing the candidate's experiences
      2. Include all quantifiable metrics exactly as they appear (numbers, percentages, dollar amounts, team sizes)
      3. Maintain the specific context (company names, project titles, exact dates/timeframes)
      4. Include technical terms, methodologies, and tools exactly as mentioned
      5. For each relevant point, include the FULL CONTEXT with company, role, and time period
      
      Please identify:
      1. Relevant points from the resume that directly match the job requirements (skills, experience, qualifications)
      2. Gaps or potential weaknesses in the candidate's profile compared to the job requirements
      
      Focus on substantive matches and gaps, not just keyword matches. Consider both technical and soft skills.
      
      Response format:
      {
        "relevantPoints": [
          "COMPANY NAME (EXACT DATES) - ROLE: Direct quote of achievement with specific metrics and detailed context",
          "COMPANY NAME (EXACT DATES) - ROLE: Another direct quote with complete context and metrics",
          ...
        ],
        "verbatimSkillsAndExperiences": [
          "Direct quote showing technical skill X with context",
          "Direct quote showing experience Y with context",
          ...
        ],
        "specificMetrics": [
          "COMPANY NAME - Direct quote of metric",
          "COMPANY NAME - Direct quote of another metric",
          ...
        ],
        "gapAreas": [
          "Gap 1 - specific skill or experience missing or weak compared to requirements",
          "Gap 2 - ...",
          ...
        ],
        "suggestedTalkingPoints": [
          {
            "skill": "Required skill from job posting",
            "resumeEvidence": "Direct quote from resume showing relevant experience",
            "context": "Company name and timeframe"
          },
          ...
        ]
      }
    `;
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Highlighter",
      thought: "Extracting relevant strengths and identifying potential gaps between resume and job requirements.",
      sourcesConsulted: ["Resume", "Job Analysis", "Profile Analysis"]
    });
    
    // Call the OpenAI API to analyze the resume
    const highlightResult = await callOpenAIWithJSON<HighlightResult>(highlightPrompt);
    
    // Check if we have valid results
    if (!highlightResult.relevantPoints || !highlightResult.gapAreas) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Highlighter",
        thought: "Failed to extract proper highlights from resume. Output format was incorrect.",
        sourcesConsulted: []
      });
      
      throw new Error("Failed to extract proper highlights from resume");
    }
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Highlighter",
      thought: `Successfully identified ${highlightResult.relevantPoints.length} relevant strengths and ${highlightResult.gapAreas.length} potential gap areas.`,
      sourcesConsulted: ["Resume", "Job Analysis"]
    });
    
    // Create a properly typed result with enhanced data
    const analysis: CandidateHighlights = {
      relevantPoints: highlightResult.relevantPoints,
      gapAreas: highlightResult.gapAreas,
      verbatimSkillsAndExperiences: highlightResult.verbatimSkillsAndExperiences || [],
      specificMetrics: highlightResult.specificMetrics || [],
      suggestedTalkingPoints: highlightResult.suggestedTalkingPoints || []
    };
    
    return { analysis, thoughts };
  } catch (error: any) {
    console.error("Error in highlighter agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Highlighter",
      thought: `Error highlighting resume points: ${error.message}`,
      sourcesConsulted: []
    });
    
    throw new Error("Failed to highlight resume points: " + error.message);
  }
}