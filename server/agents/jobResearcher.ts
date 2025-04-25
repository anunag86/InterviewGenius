import { fetchWebContent } from "../utils/openai";

// Job Researcher agent that analyzes job postings
export async function analyzeJobPosting(jobUrl: string) {
  const systemPrompt = `
    You are an expert Job Researcher agent. Your task is to analyze a job posting URL and extract
    comprehensive information about the job requirements, skills needed, company information, 
    and hiring patterns.
    
    Extract the following information:
    1. Company name and basic information
    2. Job title and location
    3. Required skills and technologies (technical requirements)
    4. Required experience and qualifications
    5. Job responsibilities and key duties
    6. Preferred or nice-to-have qualifications
    7. Company culture and values (if mentioned)
    8. Any specific hiring process information

    Respond with a JSON object containing these details organized in a structured format.
    Make your analysis comprehensive and detailed.
  `;

  try {
    const jobAnalysis = await fetchWebContent(jobUrl, systemPrompt);
    return jobAnalysis;
  } catch (error) {
    console.error("Error in job researcher agent:", error);
    throw new Error("Failed to analyze job posting: " + error.message);
  }
}
