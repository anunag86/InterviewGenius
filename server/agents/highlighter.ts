import { analyzeDocument, callOpenAIWithJSON } from "../utils/openai";
import { AgentThought } from "../../client/src/types";

// Highlighter agent that identifies relevant and non-relevant points from the resume
export async function highlightResumePoints(
  resumeText: string, 
  jobAnalysis: any,
  profileAnalysis: any
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Highlighter",
    thought: "Starting analysis to identify relevant and non-relevant points from the resume for this job position.",
    sourcesConsulted: ["Resume document", "Job analysis", "Profile analysis"]
  });
  
  // Create a condensed version of job analysis for the prompt
  const jobSummary = await callOpenAIWithJSON(`
    Summarize the following job analysis in a concise format focusing only on the key requirements,
    skills, and qualifications. Keep it under 500 words.
    
    ${JSON.stringify(jobAnalysis)}
  `);
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Highlighter",
    thought: "Extracted key job requirements and qualifications from the job analysis.",
    sourcesConsulted: ["Job analysis"]
  });
  
  const systemPrompt = `
    You are an expert Highlighter agent. Your task is to analyze a candidate's resume against a specific job
    posting and identify the relevant matches and gaps.
    
    Think like a recruiting manager who is screening resumes for an open position.
    
    Focus on two main sections:
    
    1. RELEVANT POINTS: Identify 4-6 bullet points from the candidate's resume that align well with
       the job requirements. These should be the candidate's strongest selling points for this specific role.
       For each point, briefly explain why it's relevant to the job posting.
       
    2. GAP AREAS: Identify 2-4 bullet points where the candidate's resume shows potential gaps compared
       to the job requirements. These could be missing skills, insufficient experience in certain areas,
       or other factors that might raise questions during the hiring process.
       For each gap, provide a brief explanation of why it might be a concern.
    
    Make your analysis objective and focused on the specific job requirements.
    
    Job Analysis Summary:
    ${JSON.stringify(jobSummary)}
    
    Respond with a JSON object containing these details organized in a structured format.
    
    JSON Format:
    {
      "relevantPoints": [
        "Point 1: Why it's relevant",
        "Point 2: Why it's relevant",
        ...
      ],
      "gapAreas": [
        "Gap 1: Why it's a potential gap",
        "Gap 2: Why it's a potential gap",
        ...
      ]
    }
  `;

  try {
    thoughts.push({
      timestamp: Date.now(),
      agent: "Highlighter",
      thought: "Analyzing resume content against job requirements to identify matches and gaps.",
      sourcesConsulted: ["Resume document", "Job analysis"]
    });
    
    const highlightAnalysis = await analyzeDocument(resumeText, systemPrompt);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Highlighter",
      thought: "Completed highlighting of relevant points and gap areas in the resume.",
      sourcesConsulted: ["Resume document", "Job analysis"]
    });
    
    return { analysis: highlightAnalysis, thoughts };
  } catch (error) {
    console.error("Error in highlighter agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Highlighter",
      thought: `Error highlighting resume points: ${error.message}`,
      sourcesConsulted: ["Resume document", "Job analysis"]
    });
    
    throw new Error("Failed to highlight resume points: " + error.message);
  }
}