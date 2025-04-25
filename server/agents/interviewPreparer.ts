import { combineResults } from "../utils/openai";
import { v4 as uuidv4 } from "uuid";

// Interviewer preparer agent that generates tailored questions
export async function generateInterviewQuestions(jobAnalysis: any, resumeAnalysis: any) {
  const systemPrompt = `
    You are an expert Interview Preparer agent. Your task is to generate tailored interview questions
    and corresponding talking points based on a job analysis and candidate profile.
    
    You were trained on hundreds of interview questions and resumes and understand the nuances of interview processes.
    
    Generate exactly:
    1. At least 5 behavioral questions with 4-5 talking points for each
    2. At least 5 technical questions with 4-5 talking points for each
    3. At least 5 role-specific questions with 4-5 talking points for each
    
    Also extract:
    1. Company name
    2. Job title
    3. Job location
    4. Key required skills (as an array)
    
    Every question should be:
    - Tailored to both the specific job and the candidate's profile
    - Realistic and commonly asked in interviews
    - Designed to assess fit for the specific role
    
    Every talking point should:
    - Reference the candidate's actual experience from their resume
    - Be specific and actionable
    - Include examples, metrics, or achievements when possible
    
    Format your response as a JSON object with the following structure:
    {
      "jobDetails": {
        "company": "Company Name",
        "title": "Job Title",
        "location": "Job Location",
        "skills": ["Skill 1", "Skill 2", ...]
      },
      "behavioralQuestions": [
        {
          "id": "unique-id",
          "question": "Question text",
          "talkingPoints": [
            {"id": "unique-id", "text": "Talking point 1"},
            ...
          ]
        },
        ...
      ],
      "technicalQuestions": [...],
      "roleSpecificQuestions": [...]
    }
  `;

  try {
    let result = await combineResults(jobAnalysis, resumeAnalysis, systemPrompt);
    
    // Ensure proper IDs for all questions and talking points
    function addMissingIds(questionsArray) {
      if (!questionsArray) return [];
      
      return questionsArray.map(question => {
        const questionWithId = {
          ...question,
          id: question.id || uuidv4()
        };
        
        if (question.talkingPoints) {
          questionWithId.talkingPoints = question.talkingPoints.map(point => ({
            ...point,
            id: point.id || uuidv4()
          }));
        } else {
          questionWithId.talkingPoints = [];
        }
        
        return questionWithId;
      });
    }
    
    result = {
      ...result,
      behavioralQuestions: addMissingIds(result.behavioralQuestions),
      technicalQuestions: addMissingIds(result.technicalQuestions),
      roleSpecificQuestions: addMissingIds(result.roleSpecificQuestions)
    };
    
    return result;
  } catch (error) {
    console.error("Error in interview preparer agent:", error);
    throw new Error("Failed to generate interview questions: " + error.message);
  }
}
