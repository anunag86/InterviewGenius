import { combineResults, callOpenAIWithJSON } from "../utils/openai";
import { v4 as uuidv4 } from "uuid";
import { AgentThought, InterviewRound } from "../../client/src/types";

// Interviewer preparer agent that generates tailored questions
export async function generateInterviewQuestions(
  jobAnalysis: any, 
  profileAnalysis: any, 
  companyResearch: any, 
  interviewPatterns: any
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Interview Preparer",
    thought: "Starting preparation of tailored interview questions based on job requirements, candidate profile, company research, and interview patterns.",
    sourcesConsulted: ["Job analysis", "Profile analysis", "Company research", "Interview patterns"]
  });
  
  try {
    // First, structure the interview rounds based on the interview patterns research
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Preparer",
      thought: "Identifying interview rounds structure based on research.",
      sourcesConsulted: ["Interview patterns"]
    });
    
    // Extract rounds information from the interview patterns
    const interviewRounds = interviewPatterns.interviewRounds || [];
    
    // If no rounds were found in the research, create default rounds
    let rounds = interviewRounds.length > 0 ? interviewRounds : [
      {
        roundName: "Initial Screen",
        focus: "Basic qualifications and fit",
        format: "Phone or video call with HR or recruiter"
      },
      {
        roundName: "Technical Assessment",
        focus: "Technical skills and knowledge",
        format: "Technical interview with team members"
      },
      {
        roundName: "Behavioral Interview",
        focus: "Soft skills and cultural fit",
        format: "In-person or video interview with hiring manager"
      }
    ];
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Preparer",
      thought: `Identified ${rounds.length} interview rounds: ${rounds.map(r => r.roundName).join(', ')}`,
      sourcesConsulted: ["Interview patterns"]
    });
    
    // For each round, generate appropriate questions
    const enhancedRounds: InterviewRound[] = [];
    
    for (const round of rounds) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Interview Preparer",
        thought: `Generating questions for ${round.roundName} which focuses on ${round.focus}`,
        sourcesConsulted: ["Job analysis", "Profile analysis", "Company research"]
      });
      
      const roundPrompt = `
        You are an expert Interview Question Generator. Your task is to generate tailored interview
        questions and corresponding talking points for a specific interview round.
        
        Interview Round: ${round.roundName}
        Focus: ${round.focus}
        Format: ${round.format}
        
        Job Analysis: ${JSON.stringify(jobAnalysis)}
        Candidate Profile: ${JSON.stringify(profileAnalysis)}
        Company Research: ${JSON.stringify(companyResearch)}
        
        Generate at least 5 highly relevant questions for this specific interview round with 3-5 talking points for each.
        
        Questions should:
        - Be directly relevant to the focus of this interview round
        - Be tailored to both the specific job and the candidate's profile
        - Incorporate company-specific elements when appropriate
        - Be realistic and commonly asked in this type of interview round
        
        Talking points should:
        - Reference the candidate's actual experience and skills
        - Be specific and actionable
        - Include examples, metrics, or achievements when possible
        - Help the candidate demonstrate their fit for this specific role at this company
        
        Format your response as a JSON object with the following structure:
        {
          "questions": [
            {
              "question": "Question text",
              "talkingPoints": ["Talking point 1", "Talking point 2", ...]
            },
            ...
          ]
        }
      `;
      
      const roundQuestions = await callOpenAIWithJSON(roundPrompt);
      
      // Ensure all questions have IDs
      const questionsWithIds = roundQuestions.questions.map(q => ({
        id: uuidv4(),
        question: q.question,
        talkingPoints: (q.talkingPoints || []).map(tp => ({
          id: uuidv4(),
          text: tp
        }))
      }));
      
      enhancedRounds.push({
        id: uuidv4(),
        name: round.roundName,
        focus: round.focus,
        questions: questionsWithIds
      });
      
      thoughts.push({
        timestamp: Date.now(),
        agent: "Interview Preparer",
        thought: `Generated ${questionsWithIds.length} questions for ${round.roundName} round.`,
        sourcesConsulted: ["Job analysis", "Profile analysis", "Company research"]
      });
    }
    
    // Extract basic job details
    const jobDetails = {
      company: jobAnalysis.companyName || "",
      title: jobAnalysis.jobTitle || "",
      location: jobAnalysis.location || "",
      skills: jobAnalysis.requiredSkills || []
    };
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Preparer",
      thought: "Successfully generated tailored questions for all interview rounds.",
      sourcesConsulted: ["Job analysis", "Profile analysis", "Company research", "Interview patterns"]
    });
    
    // Construct final result
    const result = {
      jobDetails,
      interviewRounds: enhancedRounds
    };
    
    return { result, thoughts };
  } catch (error) {
    console.error("Error in interview preparer agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Interview Preparer",
      thought: `Error generating interview questions: ${error.message}`,
      sourcesConsulted: ["Job analysis", "Profile analysis", "Company research", "Interview patterns"]
    });
    
    throw new Error("Failed to generate interview questions: " + error.message);
  }
}
