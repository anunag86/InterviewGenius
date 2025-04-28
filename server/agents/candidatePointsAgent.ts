import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought, InterviewRound, InterviewQuestion, TalkingPoint } from "../../client/src/types";

/**
 * Interface for candidate talking points
 */
interface QuestionPoints {
  points: string[];
  relevance: string;
}

/**
 * Candidate Points Agent - Generates relevant talking points for interview questions
 * This agent uses candidate profile data from the profiler and highlighter agents
 * to identify relevant experiences and skills for each question
 */
export async function generateCandidatePoints(
  interviewRounds: InterviewRound[],
  candidateProfile: any,
  candidateHighlights: any,
  resumeText: string
) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Candidate Points Agent",
    thought: "Starting to generate relevant talking points based on candidate resume and strengths.",
    sourcesConsulted: []
  });
  
  try {
    const enhancedRounds: InterviewRound[] = [];
    
    // Process each round and generate points for each question
    for (const round of interviewRounds) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Candidate Points Agent",
        thought: `Identifying talking points for ${round.questions.length} questions in the ${round.name} round.`,
        sourcesConsulted: []
      });
      
      const enhancedQuestions: InterviewQuestion[] = [];
      
      for (const question of round.questions) {
        // Find relevant experience from candidate profile that relates to this question
        const relevantStrengths = candidateHighlights.relevantPoints || [];
        
        thoughts.push({
          timestamp: Date.now(),
          agent: "Candidate Points Agent",
          thought: `Analyzing question: "${question.question}" to identify relevant experiences from resume.`,
          sourcesConsulted: ["Resume", "Candidate Profile", "Candidate Highlights"]
        });
        
        // Generate talking points based on resume and highlights
        const pointsPrompt = `
          You are a resume analyst extracting SPECIFIC CONCRETE EXAMPLES from the candidate's resume that would be relevant for answering this interview question.
          
          INTERVIEW QUESTION: "${question.question}"
          
          RESUME TEXT:
          ${resumeText}
          
          YOUR TASK: Find 3-5 SPECIFIC EXAMPLES from the candidate's resume that provide CONCRETE EVIDENCE to answer this interview question effectively.
          
          You must provide specific evidence and examples from the resume that directly relate to the question.
          
          CRITICAL REQUIREMENTS:
          - Each talking point must be a SPECIFIC PROJECT or ACHIEVEMENT from the resume with precise details
          - Include exact metrics, dates, team sizes, and outcomes whenever available in the resume
          - Must directly relate to the interview question
          - Must come directly from the resume text - never fabricate or embellish
          - Must include company names and timeframes where available
          
          FORMAT EACH POINT AS A COMPREHENSIVE PARAGRAPH (not bullet points):
          
          EXAMPLES OF GOOD TALKING POINTS (but with MUCH more specific details from the candidate's experience):
          
          "During my tenure at Amazon (2019-2021) as a Senior Risk Manager, I was responsible for evaluating critical escalation processes across 5 international markets. I identified systemic bottlenecks that were causing delays in issue resolution and designed a comprehensive risk assessment framework involving 12 key metrics. By implementing this framework and training cross-functional teams of 20+ analysts, I reduced escalation resolution time by 89% and recovered $20M in operational costs within the first year. This initiative was recognized by senior leadership and adopted as the company standard for all risk mitigation procedures globally."
          
          "At Baxter Pharmaceuticals (2016-2018), I led a cross-functional team of 8 quality analysts responsible for regulatory compliance across 12 European markets. We identified critical gaps in documentation processes that were causing audit failures in 35% of cases. I developed and implemented a standardized documentation framework with real-time tracking of 230+ compliance metrics across 5 manufacturing sites. This initiative improved audit readiness by 65%, eliminated compliance penalties estimated at $1.2M annually, and became the gold standard for the company's global compliance program. My leadership in this project led to my promotion and being asked to train other regional teams on the new methodology."
          
          Format your response as a JSON object with this structure:
          {
            "points": [
              "During my tenure at [Company] ([Years]) as [Role], I was responsible for [specific responsibilities]. I identified [specific challenge or opportunity] and [actions taken with detailed methodologies]. By implementing this approach, I achieved [specific metrics and quantifiable outcomes]. This initiative [broader impact and recognition].",
              "While working at [Company] ([Years]) in the [Department/Team] department, I led a team of [team size] focused on [specific project]. We faced challenges including [specific challenges] that were causing [specific negative outcomes]. I developed and implemented [detailed solution approach] which resulted in [multiple specific metrics and outcomes]. This work was significant because [business impact and value].",
              "At [Company] ([Years]), I served as [Role] where I was tasked with [specific responsibility]. Using my expertise in [relevant skills], I [detailed actions taken with process information]. This resulted in [multiple detailed metrics showing improvement] and [business value]. Additionally, [recognition or additional impact of the work]."
            ],
            "relevance": "Detailed explanation of how these comprehensive examples directly address the interview question, highlighting the most relevant aspects of each experience"
          }
          
          IMPORTANT: If the resume lacks sufficient specific details, avoid making up information. Instead, provide as much specific detail as possible from what's available, and indicate what additional information would strengthen the examples.
        `;
        
        // Get talking points from OpenAI
        const pointsResponse = await callOpenAIWithJSON<QuestionPoints>(pointsPrompt);
        
        // Create talking points array
        const enhancedTalkingPoints: TalkingPoint[] = [];
        
        // Add bullet points for each talking point
        if (pointsResponse.points && pointsResponse.points.length > 0) {
          pointsResponse.points.forEach((point, index) => {
            enhancedTalkingPoints.push({
              id: `${question.id}-point-${index}`,
              text: point // Clean text without bullets - CSS will handle formatting
            });
          });
          
          // Add relevance explanation as the last point with a special format
          if (pointsResponse.relevance) {
            enhancedTalkingPoints.push({
              id: `${question.id}-relevance`,
              text: `💡 Strategy for answering: ${pointsResponse.relevance}`
            });
          }
        } else {
          // Fallback if no points were generated
          enhancedTalkingPoints.push({
            id: `${question.id}-no-points`,
            text: `You should provide specific examples from your experience for this question.`
          });
        }
        
        thoughts.push({
          timestamp: Date.now(),
          agent: "Candidate Points Agent",
          thought: `Generated ${enhancedTalkingPoints.length} relevant talking points based on resume and candidate profile.`,
          sourcesConsulted: []
        });
        
        // Add the enhanced question with talking points
        enhancedQuestions.push({
          ...question,
          talkingPoints: enhancedTalkingPoints
        });
      }
      
      // Add the enhanced round with all its questions
      enhancedRounds.push({
        ...round,
        questions: enhancedQuestions
      });
    }
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Candidate Points Agent",
      thought: `Successfully generated relevant talking points for all interview questions across ${enhancedRounds.length} rounds.`,
      sourcesConsulted: []
    });
    
    return { rounds: enhancedRounds, thoughts };
  } catch (error: any) {
    console.error("Error in candidate points agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Candidate Points Agent",
      thought: `Error generating talking points: ${error.message}`,
      sourcesConsulted: []
    });
    
    throw new Error("Failed to generate candidate talking points: " + error.message);
  }
}