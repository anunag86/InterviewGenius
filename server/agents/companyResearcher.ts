import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought, CompanyInfo } from "../../client/src/types";

/**
 * Interview Role Researcher Agent
 * 
 * This agent researches companies to understand their culture, business focus,
 * and current projects relevant to the specific job role. It produces concise,
 * actionable information to help candidates prepare for interviews.
 */
export async function researchCompanyAndRole(companyName: string, jobTitle: string) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Company Researcher",
    thought: `Starting comprehensive research on ${companyName} with focus on culture, business, and the ${jobTitle} role.`,
    sourcesConsulted: []
  });
  
  const systemPrompt = `
    You are an expert Company Research Agent for interview preparation.
    
    Your task is to research ${companyName} and provide comprehensive information about:
    
    1. Company Overview:
       - Business model and products/services
       - Industry position and market share
       - History and founding story
       - Recent news and developments
    
    2. Company Culture:
       - Core values and mission statement
       - Work environment and employee experience
       - Leadership principles and philosophy
       - Diversity and inclusion initiatives
    
    3. Business Focus:
       - Current business strategy and priorities
       - Growth areas and future directions
       - Competitive landscape and challenges
       - Recent product launches or initiatives
    
    4. Team Structure:
       - Organizational structure
       - Department the ${jobTitle} role sits within
       - Cross-functional collaborations
       - Reporting relationships
    
    5. Role-Specific Details:
       - Key responsibilities of the ${jobTitle} position
       - Skills and qualifications typically valued
       - Career path and growth opportunities
       - Challenges and projects associated with the role
    
    If information about ${companyName} is limited, provide insights based on similar companies in the same industry.
    
    Format your response as a structured JSON object:
    {
      "description": "Comprehensive company overview with important context",
      "culture": ["Culture point 1", "Culture point 2", ...],
      "businessFocus": ["Business focus 1", "Business focus 2", ...],
      "teamInfo": ["Team information 1", "Team information 2", ...],
      "roleDetails": ["Role detail 1", "Role detail 2", ...],
      "usefulUrls": ["URL 1", "URL 2", ...]
    }
    
    Keep each bullet point concise (1-2 sentences) and extremely specific to ${companyName} and the ${jobTitle} role.
    Include 4-6 bullet points per category.
    For URLs, include company careers page, LinkedIn, about us page, etc.
  `;
  
  try {
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: `Researching ${companyName}'s culture, business model, and team structure with specific focus on the ${jobTitle} position.`,
      sourcesConsulted: []
    });
    
    // Perform company research using OpenAI
    const companyResult = await callOpenAIWithJSON<any>(systemPrompt);
    
    // Validate the result structure
    if (!companyResult || typeof companyResult !== 'object') {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Company Researcher",
        thought: "Failed to retrieve proper company information. Response format was incorrect.",
        sourcesConsulted: []
      });
      
      throw new Error("Invalid response format from company research");
    }
    
    // Create a structured CompanyInfo object
    const companyInfo: CompanyInfo = {
      description: companyResult.description || `${companyName} is a company in the industry that employs professionals like ${jobTitle}.`,
      culture: companyResult.culture || [],
      businessFocus: companyResult.businessFocus || [],
      teamInfo: companyResult.teamInfo || [],
      roleDetails: companyResult.roleDetails || [],
      usefulUrls: companyResult.usefulUrls || []
    };
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: `Successfully gathered detailed information about ${companyName} with specific insights about the ${jobTitle} role.`,
      sourcesConsulted: companyResult.usefulUrls || []
    });
    
    // Log some stats about what we found
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: `Identified ${companyInfo.culture.length} culture points, ${companyInfo.businessFocus.length} business focus areas, ${companyInfo.teamInfo.length} team details, and ${companyInfo.roleDetails.length} role-specific insights.`,
      sourcesConsulted: []
    });
    
    return { analysis: { companyInfo }, thoughts };
  } catch (error: any) {
    console.error("Error in company researcher agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: `Error researching company and role: ${error.message}`,
      sourcesConsulted: []
    });
    
    // Return a minimal default response to avoid breaking the flow
    const defaultCompanyInfo: CompanyInfo = {
      description: `Information about ${companyName} could not be retrieved due to an error.`,
      culture: ["Company culture information unavailable."],
      businessFocus: ["Business focus information unavailable."],
      teamInfo: [`Information about teams at ${companyName} unavailable.`],
      roleDetails: [`Specific details about the ${jobTitle} role unavailable.`],
      usefulUrls: []
    };
    
    return { 
      analysis: { companyInfo: defaultCompanyInfo }, 
      thoughts 
    };
  }
}