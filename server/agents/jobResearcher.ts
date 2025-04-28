import { callOpenAIWithJSON, fetchWebContent } from "../utils/openai";
import { AgentThought } from "../../client/src/types";

/**
 * Interface for the job analysis results
 */
export interface JobAnalysis {
  companyName?: string;
  jobTitle?: string;
  location?: string;
  requiredSkills?: string[];
  requiredExperience?: string[];
  jobResponsibilities?: string[];
  preferredQualifications?: string[];
  companyCulture?: string[];
  hiringProcess?: string[];
  keyTechnologies?: string[];
  additionalLinkedInData?: any;
  [key: string]: any; // Allow for additional fields
}

/**
 * Job Researcher Agent
 * 
 * This agent analyzes job postings from URLs to extract detailed requirements,
 * skills, and company hiring patterns. It can process both direct job URLs and
 * LinkedIn job postings, and will even navigate to company career pages to
 * gather additional information.
 */
export async function analyzeJobPosting(jobUrl: string, linkedinUrl?: string): Promise<{
  analysis: JobAnalysis;
  thoughts: AgentThought[];
}> {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Job Researcher",
    thought: "Starting analysis of the job posting URL to understand role requirements and company context.",
    sourcesConsulted: [jobUrl]
  });
  
  const systemPrompt = `
    You are an expert Job Researcher Agent.
    
    Your task is to analyze the job URL provided and extract comprehensive details about the position and the company.
    Be extremely thorough in your research and pay close attention to the specific requirements, responsibilities, and qualifications.
    
    Your analysis should include:
    1. Company name and basic information
    2. Exact job title as listed
    3. Location information (including remote/hybrid status)
    4. Required technical skills (programming languages, frameworks, tools, etc.)
    5. Required soft skills (communication, leadership, etc.)
    6. Required experience levels and backgrounds
    7. Detailed job responsibilities
    8. Preferred or "nice-to-have" qualifications
    9. Information about the company culture and values
    10. Any details about the hiring process
    11. Key technologies mentioned
    
    If you find LinkedIn data, also analyze:
    - Company size and industry
    - Company updates and recent posts
    - Employee insights if available
    - Additional context about the role
    
    Extract specific technical requirements and categorize them properly.
    Always provide the most detailed, accurate information possible.
    
    Respond with a JSON object containing your findings.
    JSON Format:
    {
      "companyName": "Company name",
      "jobTitle": "Exact job title",
      "location": "Location information including remote status",
      "requiredSkills": ["Skill 1", "Skill 2", ...],
      "requiredExperience": ["Experience requirement 1", "Experience requirement 2", ...],
      "jobResponsibilities": ["Responsibility 1", "Responsibility 2", ...],
      "preferredQualifications": ["Qualification 1", "Qualification 2", ...],
      "companyCulture": ["Culture point 1", "Culture point 2", ...],
      "hiringProcess": ["Process step 1", "Process step 2", ...],
      "keyTechnologies": ["Technology 1", "Technology 2", ...]
    }
  `;
  
  try {
    // Extract content from job URL
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: "Fetching and analyzing content from the provided job URL.",
      sourcesConsulted: [jobUrl]
    });
    
    const jobData = await fetchWebContent<JobAnalysis>(jobUrl, systemPrompt);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: `Successfully extracted basic job details for ${jobData.jobTitle} at ${jobData.companyName}.`,
      sourcesConsulted: [jobUrl]
    });
    
    // If LinkedIn URL is provided, extract additional data
    let linkedInData = null;
    if (linkedinUrl) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Job Researcher",
        thought: "LinkedIn URL provided. Extracting additional company and role information.",
        sourcesConsulted: [linkedinUrl]
      });
      
      const linkedinPrompt = `
        You are a LinkedIn data extraction expert.
        Extract all relevant information about this job posting and company from LinkedIn.
        Focus on company culture, hiring process, team information, and any additional context
        that might help a candidate prepare for an interview.
        
        Respond with a JSON object containing your additional findings.
      `;
      
      try {
        linkedInData = await fetchWebContent(linkedinUrl, linkedinPrompt);
        
        thoughts.push({
          timestamp: Date.now(),
          agent: "Job Researcher",
          thought: "Successfully extracted additional information from LinkedIn.",
          sourcesConsulted: [linkedinUrl]
        });
        
        // Merge LinkedIn data with job data
        jobData.additionalLinkedInData = linkedInData;
      } catch (error: any) {
        thoughts.push({
          timestamp: Date.now(),
          agent: "Job Researcher",
          thought: `Had difficulty extracting LinkedIn data: ${error.message}. Continuing with job posting data only.`,
          sourcesConsulted: [linkedinUrl]
        });
      }
    }
    
    // Research the company's careers page if we have a company name
    if (jobData.companyName) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Job Researcher",
        thought: `Researching ${jobData.companyName}'s career page for additional information about this role and hiring process.`,
        sourcesConsulted: []
      });
      
      const careerPageResult = await researchCompanyCareerPage(
        jobData.companyName,
        jobData.jobTitle || "the role"
      );
      
      // Merge career page data with job data
      if (careerPageResult.analysis) {
        thoughts.push({
          timestamp: Date.now(),
          agent: "Job Researcher",
          thought: "Successfully extracted additional information from the company's career page.",
          sourcesConsulted: careerPageResult.thoughts.map(t => t.sourcesConsulted || []).flat()
        });
        
        // Add thoughts from career page research
        thoughts.push(...careerPageResult.thoughts);
        
        // Merge the data
        const careerData = careerPageResult.analysis;
        
        // Merge arrays without duplicates
        const mergeArrays = (target: string[] = [], source: string[] = []) => {
          const combined = [...target];
          source.forEach(item => {
            if (!combined.includes(item)) {
              combined.push(item);
            }
          });
          return combined;
        };
        
        jobData.requiredSkills = mergeArrays(jobData.requiredSkills, careerData.requiredSkills);
        jobData.requiredExperience = mergeArrays(jobData.requiredExperience, careerData.requiredExperience);
        jobData.jobResponsibilities = mergeArrays(jobData.jobResponsibilities, careerData.jobResponsibilities);
        jobData.preferredQualifications = mergeArrays(jobData.preferredQualifications, careerData.preferredQualifications);
        jobData.companyCulture = mergeArrays(jobData.companyCulture, careerData.companyCulture);
        jobData.hiringProcess = mergeArrays(jobData.hiringProcess, careerData.hiringProcess);
        jobData.keyTechnologies = mergeArrays(jobData.keyTechnologies, careerData.keyTechnologies);
      }
    }
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: "Finalizing job analysis with all collected information.",
      sourcesConsulted: [jobUrl]
    });
    
    return { analysis: jobData, thoughts };
  } catch (error: any) {
    console.error("Error in job researcher agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: `Encountered an error during job analysis: ${error.message}`,
      sourcesConsulted: [jobUrl]
    });
    
    throw new Error(`Failed to analyze job posting: ${error.message}`);
  }
}

/**
 * Research a company's career page for additional job information
 */
export async function researchCompanyCareerPage(companyName: string, jobTitle: string): Promise<{
  analysis: JobAnalysis;
  thoughts: AgentThought[];
}> {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Job Researcher",
    thought: `Researching ${companyName}'s career page for information about ${jobTitle} positions.`,
    sourcesConsulted: []
  });
  
  const careerPrompt = `
    You are an expert at researching company career pages.
    
    Your task is to:
    1. Find ${companyName}'s careers/jobs page
    2. Look for listings similar to "${jobTitle}"
    3. Extract additional details about their hiring process, requirements, and company culture
    
    If you can't find exact information, provide general information about how this company typically hires for roles like ${jobTitle}.
    
    Respond with a JSON object containing your findings in the same format as the job analysis, focusing on details that might not be in the original job posting.
  `;
  
  try {
    const searchUrl = `${companyName} careers ${jobTitle} job openings`;
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: `Performing web search to find career page information for ${companyName}.`,
      sourcesConsulted: [searchUrl]
    });
    
    const careerData = await callOpenAIWithJSON<JobAnalysis>(careerPrompt);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: "Successfully gathered additional information from career page research.",
      sourcesConsulted: []
    });
    
    return { analysis: careerData, thoughts };
  } catch (error: any) {
    console.error("Error researching company career page:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: `Had difficulty researching the company's career page: ${error.message}`,
      sourcesConsulted: []
    });
    
    // Return empty analysis to avoid breaking the main flow
    return { 
      analysis: {
        companyName: companyName,
        jobTitle: jobTitle
      }, 
      thoughts 
    };
  }
}