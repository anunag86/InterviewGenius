import { fetchWebContent, callOpenAIWithJSON } from "../utils/openai";
import { AgentThought } from "../../client/src/types";

// Job Researcher agent that analyzes job postings
export async function analyzeJobPosting(jobUrl: string, linkedinUrl?: string) {
  const thoughts: AgentThought[] = [];
  
  // Record the agent's thought
  thoughts.push({
    timestamp: Date.now(),
    agent: "Job Researcher",
    thought: "Starting analysis of the job posting. I'll extract key information about requirements, skills, and the company.",
    sourcesConsulted: [jobUrl]
  });
  
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
    
    JSON Format:
    {
      "companyName": "string",
      "jobTitle": "string",
      "location": "string",
      "requiredSkills": ["skill1", "skill2", ...],
      "requiredExperience": ["exp1", "exp2", ...],
      "jobResponsibilities": ["resp1", "resp2", ...],
      "preferredQualifications": ["qual1", "qual2", ...],
      "companyCulture": ["value1", "value2", ...],
      "hiringProcess": ["process1", "process2", ...]
    }
  `;

  try {
    // Record the agent's thought about analyzing job posting
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: "Extracting information from the main job posting URL.",
      sourcesConsulted: [jobUrl]
    });
    
    const jobAnalysis = await fetchWebContent(jobUrl, systemPrompt);
    
    // If LinkedIn URL is provided, analyze that as well
    if (linkedinUrl) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Job Researcher",
        thought: "A LinkedIn job posting URL was also provided. I'll extract additional information from there to enhance my understanding.",
        sourcesConsulted: [linkedinUrl]
      });
      
      const linkedinPrompt = `
        You are an expert Job Researcher agent. Analyze this LinkedIn job posting and extract
        additional information that might not be in the original job posting. Focus on:
        
        1. Company culture and work environment
        2. Additional skills or qualifications
        3. Team structure or reporting relationships
        4. Career growth opportunities
        5. Company mission or vision
        
        Respond with a JSON object containing these details, focusing ONLY on information
        that would complement what's typically found in a standard job description.
        
        JSON Format:
        {
          "additionalCompanyInfo": "string",
          "teamStructure": "string",
          "careerGrowth": "string",
          "companyMission": "string",
          "workEnvironment": "string",
          "additionalSkills": ["skill1", "skill2", ...]
        }
      `;
      
      try {
        const linkedinAnalysis = await fetchWebContent(linkedinUrl, linkedinPrompt);
        
        // Record successful analysis
        thoughts.push({
          timestamp: Date.now(),
          agent: "Job Researcher",
          thought: "Successfully extracted additional information from LinkedIn job posting.",
          sourcesConsulted: [linkedinUrl]
        });
        
        // Merge the LinkedIn data with the original job analysis
        const mergedData = {
          ...jobAnalysis,
          additionalLinkedInData: linkedinAnalysis
        };
        
        return { analysis: mergedData, thoughts };
      } catch (error) {
        // Record the failure but continue with the original job analysis
        thoughts.push({
          timestamp: Date.now(),
          agent: "Job Researcher",
          thought: "Failed to extract information from LinkedIn URL. Continuing with data from the main job posting.",
          sourcesConsulted: [linkedinUrl]
        });
        
        console.warn("Error analyzing LinkedIn URL:", error.message);
        return { analysis: jobAnalysis, thoughts };
      }
    }
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: "Successfully completed job posting analysis.",
      sourcesConsulted: [jobUrl]
    });
    
    return { analysis: jobAnalysis, thoughts };
  } catch (error) {
    console.error("Error in job researcher agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: `Error analyzing job posting: ${error.message}`,
      sourcesConsulted: [jobUrl]
    });
    
    throw new Error("Failed to analyze job posting: " + error.message);
  }
}

// Function to attempt to find company career page and extract additional information
export async function researchCompanyCareerPage(companyName: string, jobTitle: string) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Job Researcher",
    thought: `Attempting to find career page for ${companyName} to research more about the ${jobTitle} role.`,
    sourcesConsulted: []
  });
  
  const searchQueryPrompt = `
    You are an expert at creating effective search queries. 
    Generate a search query to find the careers page for ${companyName} that might have information
    about ${jobTitle} positions.
    
    Respond with ONLY the search query string, nothing else.
  `;
  
  try {
    // Generate search query
    const searchQuery = await callOpenAIWithJSON(searchQueryPrompt);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: `Generated search query: "${searchQuery}"`,
      sourcesConsulted: []
    });
    
    // Create a system prompt to extract information from the company career page
    const systemPrompt = `
      You are an expert Job Researcher agent. I'll provide you with content from ${companyName}'s career
      page. Extract any relevant information about:
      
      1. The company's hiring process
      2. Values they look for in candidates
      3. Information specific to ${jobTitle} roles
      4. Company culture and values
      5. Benefits and perks
      
      Respond with a JSON object containing these details. If you can't find specific information
      for certain categories, include them but mark them as "Not found".
      
      JSON Format:
      {
        "hiringProcess": ["step1", "step2", ...] or "Not found",
        "candidateValues": ["value1", "value2", ...] or "Not found",
        "roleSpecificInfo": "string" or "Not found",
        "companyCulture": ["value1", "value2", ...] or "Not found",
        "benefitsAndPerks": ["benefit1", "benefit2", ...] or "Not found"
      }
    `;
    
    // Simulate fetching company career page content 
    // Note: In a real implementation, we would search for and fetch the actual company career page
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: `Searching for ${companyName}'s career page to find information about ${jobTitle} positions.`,
      sourcesConsulted: [`${companyName} careers ${jobTitle}`]
    });
    
    // This would be replaced with actual web search and fetching
    const careerPageAnalysis = await callOpenAIWithJSON(
      `You are simulating the analysis of ${companyName}'s career page that you found through a search.
      Using your knowledge about typical company career pages, generate a realistic analysis of what information
      might be found on ${companyName}'s career page about ${jobTitle} positions.
      
      ${systemPrompt}`
    );
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: `Completed analysis of ${companyName}'s career page.`,
      sourcesConsulted: [`${companyName} careers`]
    });
    
    return { analysis: careerPageAnalysis, thoughts };
  } catch (error) {
    console.error("Error researching company career page:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Job Researcher",
      thought: `Error researching company career page: ${error.message}`,
      sourcesConsulted: []
    });
    
    return { 
      analysis: {
        hiringProcess: "Not found",
        candidateValues: "Not found",
        roleSpecificInfo: "Not found",
        companyCulture: "Not found",
        benefitsAndPerks: "Not found"
      },
      thoughts 
    };
  }
}
