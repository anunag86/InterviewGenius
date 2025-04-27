import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought } from "../../client/src/types";

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
      
      Please identify:
      1. Relevant points from the resume that directly match the job requirements (skills, experience, qualifications)
      2. Gaps or potential weaknesses in the candidate's profile compared to the job requirements
      
      Focus on substantive matches and gaps, not just keyword matches. Consider both technical and soft skills.
      
      Response format:
      {
        "relevantPoints": [
          "Point 1 - specific experience or skill that matches the job requirements",
          "Point 2 - ...",
          ...
        ],
        "gapAreas": [
          "Gap 1 - specific skill or experience missing or weak compared to requirements",
          "Gap 2 - ...",
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
    const highlightResult = await callOpenAIWithJSON(highlightPrompt);
    
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
    
    return { analysis: highlightResult, thoughts };
  } catch (error) {
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