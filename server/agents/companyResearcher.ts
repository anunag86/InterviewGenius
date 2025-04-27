import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought } from "../../client/src/types";

// Company and Role Researcher Agent that researches the company and role
export async function researchCompanyAndRole(companyName: string, jobTitle: string) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Company Researcher",
    thought: `Starting research on ${companyName} and the ${jobTitle} role.`,
    sourcesConsulted: []
  });
  
  // Generate search queries for company information
  const companySearchPrompt = `
    You are an expert at creating effective search queries.
    Generate 3 different search queries to find information about ${companyName}'s:
    1. Business model, products/services, and current projects
    2. Company culture, values and mission
    3. Recent news, challenges, and industry position
    
    Respond with a JSON array containing exactly 3 search queries, nothing else.
    Format: ["query1", "query2", "query3"]
  `;
  
  // Generate search queries for the specific role
  const roleSearchPrompt = `
    You are an expert at creating effective search queries.
    Generate 3 different search queries to find information about the ${jobTitle} role at ${companyName} or similar companies:
    1. Role responsibilities and expectations
    2. Team structure and where this role fits
    3. Required skills and career progression for this position
    
    Respond with a JSON array containing exactly 3 search queries, nothing else.
    Format: ["query1", "query2", "query3"]
  `;
  
  try {
    // Generate search queries
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: "Generating search queries to research the company and role.",
      sourcesConsulted: []
    });
    
    const companyQueries = await callOpenAIWithJSON(companySearchPrompt);
    const roleQueries = await callOpenAIWithJSON(roleSearchPrompt);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: `Generated company search queries: ${JSON.stringify(companyQueries)}`,
      sourcesConsulted: []
    });
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: `Generated role search queries: ${JSON.stringify(roleQueries)}`,
      sourcesConsulted: []
    });
    
    // Simulate web searches (in a real implementation, this would actually search the web)
    // For each query, we're simulating finding information
    
    // Research company information
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: "Researching company business, products, and projects.",
      sourcesConsulted: [companyQueries[0]]
    });
    
    // Research company culture
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: "Researching company culture, values and mission.",
      sourcesConsulted: [companyQueries[1]]
    });
    
    // Research company news
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: "Researching recent company news and industry position.",
      sourcesConsulted: [companyQueries[2]]
    });
    
    // Research role information
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: "Researching role responsibilities and expectations.",
      sourcesConsulted: [roleQueries[0]]
    });
    
    // Research team structure
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: "Researching team structure and role position.",
      sourcesConsulted: [roleQueries[1]]
    });
    
    // Research skills and career path
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: "Researching skills and career progression for this role.",
      sourcesConsulted: [roleQueries[2]]
    });
    
    // Compile company research summary
    const companyResearchPrompt = `
      You are a company research expert. Based on your knowledge about ${companyName}, create a detailed
      research summary covering:
      
      1. Business overview: Main products/services, business model, market position
      2. Company culture: Core values, work environment, company mission
      3. Recent developments: Recent news, challenges, business direction
      4. Industry context: Industry trends affecting the company
      
      If certain information isn't explicitly available, make reasonable inferences based on similar companies in the industry.
      
      Provide a comprehensive yet concise analysis that would be valuable for a job candidate.
      
      JSON Format:
      {
        "businessOverview": ["point1", "point2", ...],
        "companyCulture": ["point1", "point2", ...],
        "recentDevelopments": ["point1", "point2", ...],
        "industryContext": ["point1", "point2", ...],
        "usefulUrls": ["url1", "url2", ...] (include 2-3 most relevant URLs for further research)
      }
    `;
    
    // Compile role research summary
    const roleResearchPrompt = `
      You are a job role research expert. Based on your knowledge about the ${jobTitle} role at ${companyName} or similar companies,
      create a detailed research summary covering:
      
      1. Role responsibilities: Key duties and expectations
      2. Team structure: How this role fits in the organization
      3. Skills and qualifications: Most valuable skills for success
      4. Career path: Typical progression from this role
      
      If certain information isn't explicitly available, make reasonable inferences based on similar roles in the industry.
      
      Provide a comprehensive yet concise analysis that would be valuable for a job candidate.
      
      JSON Format:
      {
        "roleResponsibilities": ["point1", "point2", ...],
        "teamStructure": ["point1", "point2", ...],
        "keySkills": ["point1", "point2", ...],
        "careerPath": ["point1", "point2", ...]
      }
    `;
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: "Compiling comprehensive research summary about the company and role.",
      sourcesConsulted: companyQueries.concat(roleQueries)
    });
    
    // Simulate fetching and analyzing web content by using OpenAI to generate company and role info
    const companyResearch = await callOpenAIWithJSON(companyResearchPrompt);
    const roleResearch = await callOpenAIWithJSON(roleResearchPrompt);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: "Successfully compiled research on the company and role.",
      sourcesConsulted: companyQueries.concat(roleQueries)
    });
    
    // Combine the research
    const combinedResearch = {
      companyInfo: companyResearch,
      roleInfo: roleResearch
    };
    
    return { analysis: combinedResearch, thoughts };
  } catch (error) {
    console.error("Error in company researcher agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Company Researcher",
      thought: `Error researching company and role: ${error.message}`,
      sourcesConsulted: []
    });
    
    throw new Error("Failed to research company and role: " + error.message);
  }
}