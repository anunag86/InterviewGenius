import { callOpenAIWithJSON } from "../utils/openai";
import { v4 as uuidv4 } from "uuid";

// Quality agent that ensures the final output meets the criteria
export async function validateInterviewPrep(interviewPrep: any, jobUrl: string) {
  const systemPrompt = `
    You are an expert Quality Assurance agent specializing in interview preparation. Your task is to validate
    and improve an interview preparation package to ensure it meets high-quality standards.
    
    Specifically, verify that:
    1. All questions are relevant to the job mentioned in the URL: ${jobUrl}
    2. There are at least 5 behavioral questions
    3. There are at least 5 technical questions
    4. There are at least 5 role-specific questions
    5. All questions have relevant and helpful talking points
    6. The talking points reference the candidate's specific experience when possible
    7. The overall quality is high and would genuinely help a candidate prepare
    
    If any issues are found, fix them directly. Add more questions or talking points if needed.
    
    Return the complete, validated, and possibly enhanced interview preparation package in the same JSON format.
    Keep all IDs intact for existing questions and talking points, but add new IDs for any added content.
  `;

  try {
    const validatedPrep = await callOpenAIWithJSON(JSON.stringify(interviewPrep), systemPrompt);
    
    // Ensure all questions and talking points have valid IDs
    function ensureIds(questionsArray) {
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
    
    return {
      ...validatedPrep,
      behavioralQuestions: ensureIds(validatedPrep.behavioralQuestions),
      technicalQuestions: ensureIds(validatedPrep.technicalQuestions),
      roleSpecificQuestions: ensureIds(validatedPrep.roleSpecificQuestions)
    };
  } catch (error) {
    console.error("Error in quality agent:", error);
    throw new Error("Failed to validate interview preparation: " + error.message);
  }
}
