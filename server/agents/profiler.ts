import { analyzeDocument } from "../utils/openai";

// Profiling agent that analyzes resumes and LinkedIn profiles
export async function analyzeResume(resumeText: string, linkedinUrl: string | null) {
  const systemPrompt = `
    You are an expert Profiling agent. Your task is to carefully analyze a candidate's resume and LinkedIn profile
    to understand their skills, experiences, achievements, and overall professional profile.
    
    Think like a recruiter, hiring manager, and career coach all at once.
    
    Analyze the following aspects:
    1. Professional experience and job history
    2. Technical skills and proficiency levels
    3. Notable achievements and impact delivered (with quantitative measures when available)
    4. Education and certifications
    5. Soft skills and leadership capabilities
    6. Career progression and growth pattern
    7. Areas of expertise and specialization
    8. Any potential gaps or areas for improvement in their profile
    
    If a LinkedIn URL is provided, mention that it was considered in your analysis, but focus primarily on the resume content.
    
    Respond with a JSON object containing these details organized in a structured format.
    Make your analysis comprehensive, insightful, and tailored to help prepare for job interviews.
  `;

  const linkedinContext = linkedinUrl 
    ? `\n\nThe candidate also has a LinkedIn profile at: ${linkedinUrl}. Consider this for additional context.` 
    : "";

  try {
    const resumeAnalysis = await analyzeDocument(resumeText + linkedinContext, systemPrompt);
    return resumeAnalysis;
  } catch (error) {
    console.error("Error in profiler agent:", error);
    throw new Error("Failed to analyze resume: " + error.message);
  }
}
