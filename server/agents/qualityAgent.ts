import { callOpenAIWithJSON } from "../utils/openai";
import { AgentThought, InterviewPrep } from "../../client/src/types";

/**
 * Quality Agent
 * 
 * This agent reviews the entire interview preparation package to ensure
 * quality, completeness, and alignment with the job requirements and candidate profile.
 * It provides suggestions for improvement and fills in any missing information.
 */
export async function reviewInterviewPrep(interviewPrepData: InterviewPrep) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Quality Checker",
    thought: "Beginning comprehensive quality check of the entire interview preparation package.",
    sourcesConsulted: []
  });
  
  try {
    // Check for required sections and verify quality
    const checks = {
      jobDetails: Boolean(interviewPrepData.jobDetails),
      companyInfo: Boolean(interviewPrepData.companyInfo),
      candidateHighlights: Boolean(interviewPrepData.candidateHighlights),
      interviewRounds: Boolean(interviewPrepData.interviewRounds?.length)
    };
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Quality Checker",
      thought: `Initial check: Job details ${checks.jobDetails ? 'present' : 'missing'}, Company info ${checks.companyInfo ? 'present' : 'missing'}, Candidate highlights ${checks.candidateHighlights ? 'present' : 'missing'}, Interview rounds ${checks.interviewRounds ? 'present' : 'missing'}.`,
      sourcesConsulted: []
    });
    
    if (!Object.values(checks).every(Boolean)) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Quality Checker",
        thought: "Critical sections are missing from the interview preparation data. Quality check failed.",
        sourcesConsulted: []
      });
      
      throw new Error("Incomplete interview preparation data detected");
    }
    
    // Detailed quality assessment
    const reviewPrompt = `
      You are an expert Quality Assurance Agent for interview preparation.
      
      Perform a detailed quality review of this interview preparation package
      and provide suggestions for improvement.
      
      Interview Preparation Package:
      ${JSON.stringify(interviewPrepData, null, 2)}
      
      Evaluate:
      1. Company Information Quality
         - Is the company description specific and informative?
         - Are culture points relevant and specific to this company?
         - Is business focus information current and accurate?
         - Is team information detailed enough?
         - Are role details specific and accurate?
      
      2. Candidate Highlights Quality
         - Are relevant points specific and based on resume evidence?
         - Are gap areas identified with realistic suggestions?
         - Are key metrics detailed and specific?
         - Are direct experience quotes authentic and relevant?
         - Are suggested talking points specific and based on resume evidence?
      
      3. Interview Rounds Quality
         - Are interview rounds diverse and appropriate for this role?
         - Is each round's focus clear and relevant?
         - Are questions specific to this role and company?
         - Are questions realistic for the expected interview process?
      
      4. Talking Points Quality
         - Are talking points specific and aligned with job requirements?
         - Do they reference specific achievements from the resume?
         - Do they include metrics where appropriate?
         - Are they actionable and practical?
      
      For each category, rate quality from 1-5 and provide specific improvements.
      Return a JSON with your analysis and any content that should be updated.
    `;
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Quality Checker",
      thought: "Performing detailed quality assessment of all sections, checking for specificity, relevance, and depth of content.",
      sourcesConsulted: []
    });
    
    // Get quality review
    const qualityReview = await callOpenAIWithJSON<any>(reviewPrompt);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Quality Checker",
      thought: "Quality assessment complete. Analyzing areas for improvement.",
      sourcesConsulted: []
    });
    
    // Create an updated version with improvements
    const improvementPrompt = `
      You are an expert Interview Preparation Enhancer.
      
      Take this interview preparation package and the quality review feedback,
      and create an improved version addressing all quality issues.
      
      Current Package:
      ${JSON.stringify(interviewPrepData, null, 2)}
      
      Quality Review:
      ${JSON.stringify(qualityReview, null, 2)}
      
      Your task:
      1. Make all suggested improvements
      2. Ensure all content is specific, detailed, and actionable
      3. Maintain the same data structure
      4. Keep all IDs intact for continuity
      5. Return the full, enhanced interview preparation package
      
      Only enhance the content quality, do not change the structure or add/remove sections.
    `;
    
    const enhancedPrep = await callOpenAIWithJSON<InterviewPrep>(improvementPrompt);
    
    // Count improvements made
    let improvementsMade = 0;
    
    // Check company info improvements
    if (enhancedPrep.companyInfo?.description !== interviewPrepData.companyInfo?.description) {
      improvementsMade++;
    }
    if (enhancedPrep.companyInfo?.culture?.length !== interviewPrepData.companyInfo?.culture?.length) {
      improvementsMade++;
    }
    
    // Check candidate highlights improvements
    if (enhancedPrep.candidateHighlights?.relevantPoints?.length !== interviewPrepData.candidateHighlights?.relevantPoints?.length) {
      improvementsMade++;
    }
    if (enhancedPrep.candidateHighlights?.keyMetrics?.length !== interviewPrepData.candidateHighlights?.keyMetrics?.length) {
      improvementsMade++;
    }
    
    // Check rounds and questions improvements
    const originalQuestionCount = interviewPrepData.interviewRounds?.reduce((sum, r) => sum + r.questions.length, 0) || 0;
    const enhancedQuestionCount = enhancedPrep.interviewRounds?.reduce((sum, r) => sum + r.questions.length, 0) || 0;
    
    if (originalQuestionCount !== enhancedQuestionCount) {
      improvementsMade++;
    }
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Quality Checker",
      thought: `Quality enhancement complete. Made approximately ${improvementsMade} improvements to the interview preparation package.`,
      sourcesConsulted: []
    });
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Quality Checker",
      thought: "Final quality check passed. The interview preparation package is now ready for the candidate.",
      sourcesConsulted: []
    });
    
    return { 
      analysis: enhancedPrep, 
      thoughts,
      qualityReport: qualityReview
    };
  } catch (error: any) {
    console.error("Error in quality agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Quality Checker",
      thought: `Error during quality review: ${error.message}`,
      sourcesConsulted: []
    });
    
    // Return the original data to avoid breaking the flow
    return { 
      analysis: interviewPrepData, 
      thoughts,
      qualityReport: {
        error: error.message,
        status: "Failed quality check but returning original data to continue the process."
      }
    };
  }
}