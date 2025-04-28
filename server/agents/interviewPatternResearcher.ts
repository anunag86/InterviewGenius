import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought } from "../../client/src/types";

/**
 * Interview Pattern Researcher Agent
 * 
 * This agent researches typical interview structures, patterns, and expectations
 * for specific companies and roles. It identifies expected interview rounds and
 * their focus to help candidates prepare effectively.
 */
export async function researchInterviewPatterns(companyName: string, jobTitle: string) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Interview Pattern Researcher",
    thought: `Starting research on ${companyName}'s interview process for ${jobTitle} positions.`,
    sourcesConsulted: []
  });
  
  const systemPrompt = `
    You are an expert Interview Pattern Research Agent.
    
    Your task is to research and provide detailed information about the interview process at ${companyName} for ${jobTitle} positions.
    
    Research and provide insights about:
    
    1. Overall Interview Process:
       - Number of interview rounds typically conducted
       - Total duration of the interview process
       - Types of interviewers involved (HR, managers, peers, etc.)
       - Online, in-person, or hybrid format
    
    2. Specific Interview Rounds:
       - Names and focus of each interview round
       - Format of each round (behavioral, technical, case study, etc.)
       - Typical questions or assessments in each round
       - Skills evaluated in each round
    
    3. Company-Specific Practices:
       - Unique aspects of ${companyName}'s interview process
       - Company values assessed during interviews
       - Any known assessment frameworks used
       - Red flags or instant disqualifiers
    
    4. Preparation Recommendations:
       - Key areas to focus on for each round
       - Company-specific preparation tips
       - Resources to review before the interview
       - Common pitfalls to avoid
    
    If specific information about ${companyName}'s interview process isn't available, provide insights based on typical interview patterns for ${jobTitle} positions in similar companies in the same industry.
    
    Format your response as this JSON:
    {
      "overallProcess": "Detailed description of the typical interview process",
      "interviewRounds": [
        {
          "roundName": "Name of the interview round",
          "focus": "Primary focus of this round",
          "format": "Format and structure of this round",
          "typicalQuestions": ["Question type 1", "Question type 2", ...],
          "skillsEvaluated": ["Skill 1", "Skill 2", ...]
        },
        ...
      ],
      "companySpecificPractices": ["Practice 1", "Practice 2", ...],
      "preparationTips": ["Tip 1", "Tip 2", ...]
    }
    
    Ensure each round has a distinct focus area and provide specific, actionable insights.
  `;
  
  try {
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Pattern Researcher",
      thought: `Researching typical interview structure at ${companyName} for ${jobTitle} roles.`,
      sourcesConsulted: []
    });
    
    // Research interview patterns using OpenAI
    const patternsResult = await callOpenAIWithJSON<any>(systemPrompt);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Pattern Researcher",
      thought: `Identified overview of ${companyName}'s interview process for ${jobTitle} positions.`,
      sourcesConsulted: []
    });
    
    // Check if we have interview rounds
    if (patternsResult.interviewRounds && Array.isArray(patternsResult.interviewRounds)) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Interview Pattern Researcher",
        thought: `Successfully identified ${patternsResult.interviewRounds.length} distinct interview rounds in the process.`,
        sourcesConsulted: []
      });
      
      // Log each round
      patternsResult.interviewRounds.forEach((round: any, index: number) => {
        thoughts.push({
          timestamp: Date.now(),
          agent: "Interview Pattern Researcher",
          thought: `Round ${index + 1}: "${round.roundName}" focuses on ${round.focus} and typically evaluates ${round.skillsEvaluated?.join(", ") || "various skills"}.`,
          sourcesConsulted: []
        });
      });
    } else {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Interview Pattern Researcher",
        thought: `Could not identify specific interview rounds. Proceeding with general interview pattern information.`,
        sourcesConsulted: []
      });
      
      // Create default rounds if none were found
      patternsResult.interviewRounds = [
        {
          roundName: "Initial Screen",
          focus: "General fit and background verification",
          format: "Phone or video call with recruiter or hiring manager"
        },
        {
          roundName: "Technical Assessment",
          focus: "Technical skills relevant to the role",
          format: "Coding challenge, system design, or technical problem-solving"
        },
        {
          roundName: "Behavioral Interview",
          focus: "Past experiences and behavior patterns",
          format: "Structured behavioral questions with the team"
        },
        {
          roundName: "Culture Fit",
          focus: "Alignment with company values and culture",
          format: "Conversation with team members and potential peers"
        }
      ];
    }
    
    // Add IDs to each round if they don't exist
    patternsResult.interviewRounds = patternsResult.interviewRounds.map((round: any, index: number) => {
      return {
        id: round.id || `round-${Date.now()}-${index}`,
        ...round
      };
    });
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Pattern Researcher",
      thought: `Research complete. Compiled comprehensive overview of ${companyName}'s interview process for ${jobTitle} positions with ${patternsResult.interviewRounds.length} distinct rounds.`,
      sourcesConsulted: []
    });
    
    return { analysis: patternsResult, thoughts };
  } catch (error: any) {
    console.error("Error in interview pattern researcher agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Pattern Researcher",
      thought: `Error researching interview patterns: ${error.message}`,
      sourcesConsulted: []
    });
    
    // Return default interview patterns to avoid breaking the flow
    const defaultPatterns = {
      overallProcess: `The typical interview process for ${jobTitle} positions at companies like ${companyName} involves multiple rounds of assessment.`,
      interviewRounds: [
        {
          id: `round-${Date.now()}-0`,
          roundName: "Initial Screen",
          focus: "General fit and background verification",
          format: "Phone or video call with recruiter or hiring manager"
        },
        {
          id: `round-${Date.now()}-1`,
          roundName: "Technical Assessment",
          focus: "Technical skills relevant to the role",
          format: "Coding challenge, system design, or technical problem-solving"
        },
        {
          id: `round-${Date.now()}-2`,
          roundName: "Behavioral Interview",
          focus: "Past experiences and behavior patterns",
          format: "Structured behavioral questions with the team"
        },
        {
          id: `round-${Date.now()}-3`,
          roundName: "Culture Fit",
          focus: "Alignment with company values and culture",
          format: "Conversation with team members and potential peers"
        }
      ],
      companySpecificPractices: [
        `Companies in this industry typically evaluate candidates based on both technical skills and cultural alignment.`
      ],
      preparationTips: [
        `Research ${companyName}'s products, services, and recent news.`,
        `Prepare examples of past experiences that demonstrate relevant skills.`,
        `Practice both technical and behavioral questions.`
      ]
    };
    
    return { analysis: defaultPatterns, thoughts };
  }
}