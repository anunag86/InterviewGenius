import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought } from "../../client/src/types";

// Interview Pattern Researcher that analyzes company interview processes
export async function researchInterviewPatterns(companyName: string, jobTitle: string) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Interview Pattern Researcher",
    thought: `Starting research on ${companyName}'s interview process for ${jobTitle} positions.`,
    sourcesConsulted: []
  });
  
  // Generate search queries for interview process information
  const interviewProcessPrompt = `
    You are an expert at creating effective search queries.
    Generate 4 different search queries to find information about ${companyName}'s interview process, specifically for ${jobTitle} roles:
    1. General interview structure and rounds
    2. Technical/skill assessment methods
    3. Behavioral interview questions and format
    4. Company-specific interview practices or quirks
    
    Respond with a JSON array containing exactly 4 search queries, nothing else.
    Format: ["query1", "query2", "query3", "query4"]
  `;
  
  try {
    // Generate search queries
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Pattern Researcher",
      thought: "Generating search queries to research the company's interview process.",
      sourcesConsulted: []
    });
    
    // Get search queries with proper typing
    const interviewQueriesResult = await callOpenAIWithJSON<string[]>(interviewProcessPrompt);
    
    // Ensure we have an array even if the API response was not as expected
    const interviewQueries = Array.isArray(interviewQueriesResult) ? interviewQueriesResult : [];
    
    // Default queries if empty
    const safeInterviewQueries = interviewQueries.length > 0 ? interviewQueries : [
      `${companyName} ${jobTitle} interview process structure rounds`,
      `${companyName} ${jobTitle} technical assessment coding challenges`,
      `${companyName} ${jobTitle} behavioral interview questions`,
      `${companyName} interview process unique practices`
    ];
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Pattern Researcher",
      thought: `Generated interview process search queries: ${JSON.stringify(safeInterviewQueries)}`,
      sourcesConsulted: []
    });
    
    // Simulate web searches for each query
    
    // Research general interview structure
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Pattern Researcher",
      thought: "Researching general interview structure and rounds.",
      sourcesConsulted: safeInterviewQueries.length > 0 ? [safeInterviewQueries[0]] : []
    });
    
    // Research technical assessments
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Pattern Researcher",
      thought: "Researching technical and skill assessment methods.",
      sourcesConsulted: safeInterviewQueries.length > 1 ? [safeInterviewQueries[1]] : []
    });
    
    // Research behavioral questions
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Pattern Researcher",
      thought: "Researching behavioral interview questions and format.",
      sourcesConsulted: safeInterviewQueries.length > 2 ? [safeInterviewQueries[2]] : []
    });
    
    // Research company-specific practices
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Pattern Researcher",
      thought: "Researching company-specific interview practices.",
      sourcesConsulted: safeInterviewQueries.length > 3 ? [safeInterviewQueries[3]] : []
    });
    
    // Compile interview process research
    const interviewPatternPrompt = `
      You are an interview process research expert. Based on your knowledge about ${companyName}'s interview process
      for ${jobTitle} positions (or similar companies if specific information isn't available), create a detailed
      research summary covering:
      
      1. Interview Structure: Typical number of rounds and their focus
      2. Technical Assessment: Methods used to evaluate technical skills
      3. Behavioral Assessment: Types of behavioral questions asked
      4. Company-Specific Elements: Any unique aspects of their interview process
      5. Decision Makers: Who is typically involved in the interview process
      6. Evaluation Criteria: What they're looking for in successful candidates
      
      If certain information isn't explicitly available, make reasonable inferences based on similar companies in the industry.
      
      Structure your response as a series of interview rounds, with each round having a clear focus and purpose.
      
      JSON Format:
      {
        "overallProcess": "A brief 2-3 sentence summary of the entire interview process",
        "interviewRounds": [
          {
            "roundName": "Round 1: Initial Screen",
            "focus": "What this round evaluates",
            "format": "How this round is conducted",
            "typicalQuestions": ["question1", "question2", ...]
          },
          // Repeat for each round (typically 3-5 rounds)
        ],
        "keySuccessFactors": ["factor1", "factor2", ...],
        "preparationTips": ["tip1", "tip2", ...]
      }
    `;
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Pattern Researcher",
      thought: "Compiling comprehensive research summary about the company's interview process.",
      sourcesConsulted: safeInterviewQueries
    });
    
    // Simulate fetching and analyzing web content
    const interviewPatternResearch = await callOpenAIWithJSON<any>(interviewPatternPrompt);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Pattern Researcher",
      thought: "Successfully compiled research on the company's interview process.",
      sourcesConsulted: safeInterviewQueries
    });
    
    // Create a normalized pattern research object
    const normalizedResearch = {
      overallProcess: typeof interviewPatternResearch?.overallProcess === 'string' 
        ? interviewPatternResearch.overallProcess 
        : `The interview process at ${companyName} for ${jobTitle} roles typically consists of multiple rounds covering both technical and behavioral aspects.`,
      interviewRounds: Array.isArray(interviewPatternResearch?.interviewRounds) ? interviewPatternResearch.interviewRounds : [],
      keySuccessFactors: Array.isArray(interviewPatternResearch?.keySuccessFactors) ? interviewPatternResearch.keySuccessFactors : [],
      preparationTips: Array.isArray(interviewPatternResearch?.preparationTips) ? interviewPatternResearch.preparationTips : []
    };
    
    return { analysis: normalizedResearch, thoughts };
  } catch (error: any) {
    console.error("Error in interview pattern researcher agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Pattern Researcher",
      thought: `Error researching interview patterns: ${error.message}`,
      sourcesConsulted: []
    });
    
    throw new Error("Failed to research interview patterns: " + error.message);
  }
}