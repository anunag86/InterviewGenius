import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought, CandidateHighlights } from "../../client/src/types";

/**
 * Enhanced interface for detailed highlight results
 */
interface HighlightResult {
  relevantPoints: string[];
  gapAreas: string[];
  keyMetrics: string[];
  directExperienceQuotes: {
    skill: string;
    quote: string;
    context: string;
  }[];
  suggestedTalkingPoints: {
    category: string;
    points: string[];
  }[];
}

/**
 * Highlighter Agent
 * 
 * This agent analyzes a resume against job requirements to identify
 * relevant points and potential gaps. It extracts SPECIFIC quotes
 * and metrics directly from the resume that align with job requirements.
 */
export async function highlightResumePoints(
  resumeText: string,
  jobAnalysis: any,
  profileAnalysis: any
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Highlighter",
    thought: "Starting detailed analysis to identify specific strengths and gaps between the candidate's profile and job requirements.",
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
      thought: `Analyzing candidate's resume against ${requiredSkills.length} identified required skills for ${jobTitle} at ${companyName}.`,
      sourcesConsulted: ["Job Analysis"]
    });
    
    // Create a prompt to highlight the resume strengths and gaps based on the job requirements
    const highlightPrompt = `
      You are an expert Resume Highlighter Agent.
      
      Your task is to analyze a candidate's resume against a specific job description
      and extract HIGHLY SPECIFIC examples and achievements that directly relate to the job requirements.
      
      Resume Text:
      ${resumeText}
      
      Detailed Profile Analysis:
      ${JSON.stringify(profileAnalysis, null, 2)}
      
      Job Analysis:
      ${JSON.stringify(jobAnalysis, null, 2)}
      
      I need you to:
      
      1. Extract SPECIFIC AND DETAILED points from the resume that directly match the job requirements
         - These MUST be nearly EXACT QUOTES from the resume with minimal paraphrasing
         - Include precise METRICS (numbers, percentages, dollar amounts, team sizes, etc.)
         - Include COMPANY NAMES and DATES to provide full context
         - Format as complete statements that could be directly used in an interview
      
      2. Identify KEY METRICS and ACHIEVEMENTS that demonstrate impact
         - Extract ONLY direct quotes containing quantifiable results
         - Include the full context of each metric
      
      3. Extract DIRECT EXPERIENCE QUOTES for each major required skill
         - For each required skill/technology, find an EXACT QUOTE showing direct experience
         - Include where and when this experience was gained
      
      4. Identify GAPS or areas where the candidate lacks direct experience
         - For each gap, suggest how the candidate might address it in an interview
         - Identify transferable skills that could compensate for these gaps
      
      5. Create SUGGESTED TALKING POINTS categorized by skill/requirement area
         - These should be based on SPECIFIC evidence from the resume
         - Format as complete statements ready for use in interviews
      
      Remember: This is NOT about general summaries. Focus on extracting SPECIFIC, DETAILED evidence directly from the resume that shows exact experience relevant to this job.
      
      Format your response as this JSON:
      {
        "relevantPoints": [
          "COMPANY NAME (DATES) - EXACT QUOTE with specific details and metrics showing relevance to job requirement 1",
          "COMPANY NAME (DATES) - EXACT QUOTE with specific details and metrics showing relevance to job requirement 2",
          ...
        ],
        "keyMetrics": [
          "Increased revenue by X% at COMPANY through implementation of...",
          "Reduced costs by $X at COMPANY by...",
          ...
        ],
        "directExperienceQuotes": [
          {
            "skill": "Required skill from job",
            "quote": "EXACT QUOTE showing experience with this skill",
            "context": "COMPANY NAME (DATES)"
          },
          ...
        ],
        "gapAreas": [
          "Specific gap 1: How candidate might address it",
          "Specific gap 2: How candidate might address it",
          ...
        ],
        "suggestedTalkingPoints": [
          {
            "category": "Technical Skills",
            "points": [
              "Detailed talking point 1 with specifics from resume",
              "Detailed talking point 2 with specifics from resume",
              ...
            ]
          },
          {
            "category": "Leadership Experience",
            "points": [
              "Detailed talking point 1 with specifics from resume",
              "Detailed talking point 2 with specifics from resume",
              ...
            ]
          },
          ...
        ]
      }
    `;
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Highlighter",
      thought: "Extracting specific, detailed evidence from resume that matches job requirements, including direct quotes, metrics, and context.",
      sourcesConsulted: ["Resume", "Job Analysis", "Profile Analysis"]
    });
    
    // Call the OpenAI API to analyze the resume
    const highlightResult = await callOpenAIWithJSON<HighlightResult>(highlightPrompt);
    
    // Log some metrics about what we found
    thoughts.push({
      timestamp: Date.now(),
      agent: "Highlighter",
      thought: `Identified ${highlightResult.relevantPoints.length} specific resume points that directly match job requirements.`,
      sourcesConsulted: ["Resume", "Job Analysis"]
    });
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Highlighter",
      thought: `Extracted ${highlightResult.keyMetrics.length} key metrics and ${highlightResult.directExperienceQuotes.length} direct experience quotes.`,
      sourcesConsulted: ["Resume", "Profile Analysis"]
    });
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Highlighter",
      thought: `Identified ${highlightResult.gapAreas.length} potential gaps with suggested approaches for addressing them.`,
      sourcesConsulted: ["Resume", "Job Analysis"]
    });
    
    // Create a simplified CandidateHighlights object for the frontend
    // This matches the expected interface while also storing detailed data
    const analysis: CandidateHighlights = {
      relevantPoints: highlightResult.relevantPoints,
      gapAreas: highlightResult.gapAreas,
      keyMetrics: highlightResult.keyMetrics,
      directExperienceQuotes: highlightResult.directExperienceQuotes,
      suggestedTalkingPoints: highlightResult.suggestedTalkingPoints
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