import { callOpenAIWithJSON } from "../utils/openai";
import { v4 as uuidv4 } from "uuid";
import { AgentThought, InterviewRound, CompanyInfo, CandidateHighlights } from "../../client/src/types";

// Quality agent that ensures the final output meets the criteria
export async function validateInterviewPrep(
  jobUrl: string,
  jobDetails: any,
  companyInfo: CompanyInfo,
  candidateHighlights: CandidateHighlights,
  interviewRounds: InterviewRound[],
  allThoughts: AgentThought[]
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Quality Agent",
    thought: "Starting quality check of the interview preparation package to ensure it meets standards.",
    sourcesConsulted: ["All previous agent outputs"]
  });
  
  try {
    // Check company info
    thoughts.push({
      timestamp: Date.now(),
      agent: "Quality Agent",
      thought: "Validating company information section.",
      sourcesConsulted: ["Company research output"]
    });
    
    // Check if any company info fields are empty or minimal
    const companyInfoComplete = 
      companyInfo.culture.length > 0 && 
      companyInfo.businessFocus.length > 0 && 
      companyInfo.teamInfo.length > 0 && 
      companyInfo.roleDetails.length > 0;
    
    let validatedCompanyInfo = companyInfo;
    
    if (!companyInfoComplete) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Quality Agent",
        thought: "Company information is incomplete. Enhancing with more details.",
        sourcesConsulted: ["Company research output", "Job details"]
      });
      
      const companyInfoPrompt = `
        You are a quality assurance expert. The company information provided is incomplete or lacking detail.
        Please enhance it based on the job URL: ${jobUrl} and job title: ${jobDetails.title} at ${jobDetails.company}.
        
        Current company info: ${JSON.stringify(companyInfo)}
        
        Enhance and expand this information, ensuring each section has at least 3-5 relevant bullet points.
        Maintain the same JSON structure but add more content.
      `;
      
      validatedCompanyInfo = await callOpenAIWithJSON(companyInfoPrompt);
    }
    
    // Check candidate highlights
    thoughts.push({
      timestamp: Date.now(),
      agent: "Quality Agent",
      thought: "Validating candidate highlights section.",
      sourcesConsulted: ["Highlighter output"]
    });
    
    // Check if highlights are sufficient
    const highlightsComplete = 
      candidateHighlights.relevantPoints.length >= 3 && 
      candidateHighlights.gapAreas.length >= 2;
    
    let validatedHighlights = candidateHighlights;
    
    if (!highlightsComplete) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Quality Agent",
        thought: "Candidate highlights are incomplete. Enhancing with more insights.",
        sourcesConsulted: ["Highlighter output", "Job details", "Candidate profile"]
      });
      
      const highlightsPrompt = `
        You are a quality assurance expert. The candidate highlights provided are incomplete or lacking detail.
        Please enhance them based on the job at ${jobDetails.company} for ${jobDetails.title}.
        
        Current highlights: ${JSON.stringify(candidateHighlights)}
        
        Enhance and expand this information, ensuring:
        1. At least 4-6 relevant points highlighting candidate strengths for this role
        2. At least 2-3 gap areas that might be concerns during the interview
        
        Maintain the same JSON structure but add more content.
      `;
      
      validatedHighlights = await callOpenAIWithJSON(highlightsPrompt);
    }
    
    // Check interview rounds
    thoughts.push({
      timestamp: Date.now(),
      agent: "Quality Agent",
      thought: "Validating interview rounds and questions.",
      sourcesConsulted: ["Interview pattern research", "Question generation output"]
    });
    
    let validatedRounds = [...interviewRounds];
    
    // Check if each round has at least 5 questions
    const incompleteRounds = validatedRounds.filter(round => 
      !round.questions || round.questions.length < 5
    );
    
    // Fix incomplete rounds
    for (const round of incompleteRounds) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Quality Agent",
        thought: `Round "${round.name}" has fewer than 5 questions. Adding more relevant questions.`,
        sourcesConsulted: ["Job details", "Company research", "Interview patterns"]
      });
      
      const roundPrompt = `
        You are a quality assurance expert. This interview round does not have enough questions.
        Please add more questions to reach at least 5 total questions for the round.
        
        Job Title: ${jobDetails.title}
        Company: ${jobDetails.company}
        Round Name: ${round.name}
        Round Focus: ${round.focus}
        
        Current questions: ${JSON.stringify(round.questions || [])}
        
        Add more questions with talking points, keeping the same structure but with new content.
        Each question should have 3-5 talking points.
        
        Return the COMPLETE set of questions (existing plus new ones).
        
        JSON Format:
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
      
      const enhancedQuestions = await callOpenAIWithJSON(roundPrompt);
      
      // Add IDs to new questions and talking points
      const questionsWithIds = enhancedQuestions.questions.map(q => {
        // If question already has an ID, it's an existing question - keep it
        if (round.questions && round.questions.find(existing => existing.question === q.question)) {
          const existing = round.questions.find(ex => ex.question === q.question);
          return existing;
        }
        
        // Otherwise it's a new question - add IDs
        return {
          id: uuidv4(),
          question: q.question,
          talkingPoints: (q.talkingPoints || []).map(tp => ({
            id: uuidv4(),
            text: tp
          }))
        };
      });
      
      // Update the round
      const roundIndex = validatedRounds.findIndex(r => r.id === round.id);
      if (roundIndex >= 0) {
        validatedRounds[roundIndex] = {
          ...validatedRounds[roundIndex],
          questions: questionsWithIds
        };
      }
    }
    
    // Check each question for quality of talking points
    let improvedRounds = [...validatedRounds];
    
    for (let i = 0; i < improvedRounds.length; i++) {
      const round = improvedRounds[i];
      
      for (let j = 0; j < round.questions.length; j++) {
        const question = round.questions[j];
        
        // If question has fewer than 3 talking points, enhance it
        if (!question.talkingPoints || question.talkingPoints.length < 3) {
          thoughts.push({
            timestamp: Date.now(),
            agent: "Quality Agent",
            thought: `Question "${question.question}" has insufficient talking points. Enhancing with more detailed talking points.`,
            sourcesConsulted: ["Job details", "Company research"]
          });
          
          const talkingPointsPrompt = `
            You are a quality assurance expert. This interview question does not have enough talking points.
            Please enhance the talking points to include at least 3-5 substantial, specific points that would
            help a candidate answer the question effectively.
            
            Job Title: ${jobDetails.title}
            Company: ${jobDetails.company}
            Question: ${question.question}
            Current talking points: ${JSON.stringify(question.talkingPoints || [])}
            
            Return a list of at least 4 talking points that are:
            1. Specific and actionable
            2. Tailored to this specific job and company
            3. Detailed enough to genuinely help a candidate
            
            Return ONLY the list of talking points as strings in a JSON array.
          `;
          
          const enhancedTalkingPoints = await callOpenAIWithJSON(talkingPointsPrompt);
          
          // Create talking point objects with IDs
          const talkingPointsWithIds = enhancedTalkingPoints.map(tp => ({
            id: uuidv4(),
            text: tp
          }));
          
          // Update the question
          improvedRounds[i].questions[j] = {
            ...question,
            talkingPoints: talkingPointsWithIds
          };
        }
      }
    }
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Quality Agent",
      thought: "Completed quality check and enhancement of all sections of the interview preparation package.",
      sourcesConsulted: ["All previous agent outputs"]
    });
    
    // Construct final validated package
    const finalPrep = {
      jobDetails,
      companyInfo: validatedCompanyInfo,
      candidateHighlights: validatedHighlights,
      interviewRounds: improvedRounds,
      agentThoughts: [...allThoughts, ...thoughts]
    };
    
    return { analysis: finalPrep, thoughts };
  } catch (error) {
    console.error("Error in quality agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Quality Agent",
      thought: `Error during quality check: ${error.message}`,
      sourcesConsulted: ["All previous agent outputs"]
    });
    
    throw new Error("Failed to validate interview preparation: " + error.message);
  }
}
