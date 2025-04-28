import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as mammoth from "mammoth";
import { analyzeJobPosting, researchCompanyCareerPage, JobAnalysis } from "../agents/jobResearcher";
import { analyzeResume, findSpecificSkills } from "../agents/profiler";
import { highlightResumePoints } from "../agents/highlighter";
import { researchCompanyAndRole } from "../agents/companyResearcher";
import { researchInterviewPatterns } from "../agents/interviewPatternResearcher";
import { generateInterviewQuestions } from "../agents/interviewerAgent";
// We no longer need candidate points and narrative agents in the new architecture
import { storeUserMemory, storeUserResponse, getUserResponses } from "../agents/memoryAgent";
import { validateInterviewPrep } from "../agents/qualityAgent";
import { storage } from "../storage";
import { AgentStep, AgentThought, InterviewRound, UserResponse, InterviewPrep } from "../../client/src/types";

// Extend Request type to include file property from multer
declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;
    }
    
    namespace Multer {
      interface File {
        buffer: Buffer;
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
      }
    }
  }
}

// In-memory storage for interview preparation requests (will be replaced with DB in production)
const interviewPreps = new Map();

export const generateInterview = async (req: Request, res: Response) => {
  try {
    // Extract the form data from the request
    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required" });
    }

    const { jobUrl, linkedinUrl } = req.body;
    
    if (!jobUrl) {
      return res.status(400).json({ error: "Job posting URL is required" });
    }

    // Generate a unique ID for this interview prep request
    const prepId = uuidv4();
    
    // Store the initial status
    interviewPreps.set(prepId, {
      status: "processing",
      progress: AgentStep.JOB_RESEARCH,
      startTime: new Date(),
      jobUrl,
      linkedinUrl,
      result: null,
      error: null,
      agentThoughts: []
    });
    
    // Start the processing in the background
    processInterviewPrep(prepId, req.file, jobUrl, linkedinUrl || null).catch(error => {
      console.error("Error processing interview prep:", error);
      interviewPreps.set(prepId, {
        ...interviewPreps.get(prepId),
        status: "failed",
        error: error.message
      });
    });
    
    // Immediately return the ID so the client can start polling
    return res.status(202).json({ 
      id: prepId,
      message: "Interview preparation in progress. Use the provided ID to check status."
    });
  } catch (error) {
    console.error("Error generating interview prep:", error);
    return res.status(500).json({ error: "Failed to process interview preparation request" });
  }
};

export const getInterviewStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // First check in memory cache
    if (interviewPreps.has(id)) {
      const prepData = interviewPreps.get(id);
      
      // Check if there are any stored user responses for this interview prep
      const userResponses = await getUserResponses(id);
      
      // If there are user responses, include them in the result
      const resultData = prepData.result && typeof prepData.result === 'object' ? prepData.result : {};
      const resultWithResponses = prepData.result ? {
        ...resultData,
        userResponses
      } : null;
      
      // Include agent thoughts for showing the thinking process
      return res.status(200).json({
        status: prepData.status,
        progress: prepData.progress,
        result: resultWithResponses,
        error: prepData.error,
        agentThoughts: prepData.agentThoughts
      });
    }
    
    // If not in memory, check the database
    const savedPrep = await storage.getInterviewPrep(id);
    
    // If not found in database either, return 404
    if (!savedPrep) {
      return res.status(404).json({ error: "Interview preparation request not found" });
    }
    
    // Get any stored user responses for this interview prep
    const userResponses = await getUserResponses(id);
    
    // Add user responses to the prep data (ensure data is an object)
    const prepData = typeof savedPrep.data === 'object' ? savedPrep.data : {};
    const resultWithResponses = {
      ...prepData,
      userResponses
    };
    
    // Return the saved data from the database
    return res.status(200).json({
      status: "completed", // If it's in the database, it's completed
      progress: AgentStep.COMPLETED,
      result: resultWithResponses,
      error: null,
      agentThoughts: [] // Thoughts might not be stored in DB
    });
  } catch (error) {
    console.error("Error getting interview status:", error);
    return res.status(500).json({ error: "Failed to get interview preparation status" });
  }
};

// Get recent interview preps (history)
export const getInterviewHistory = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    // Get recent interview preparations
    const history = await storage.getRecentInterviewPreps(limit);
    
    // Clean up expired interview preparations in the background
    storage.deleteExpiredInterviewPreps().catch(err => {
      console.error("Error cleaning up expired interview preps:", err);
    });
    
    return res.status(200).json({
      history
    });
  } catch (error) {
    console.error("Error getting interview history:", error);
    return res.status(500).json({ error: "Failed to get interview preparation history" });
  }
};

async function processInterviewPrep(prepId: string, resumeFile: Express.Multer.File, jobUrl: string, linkedinUrl: string | null) {
  try {
    // Keep track of all agent thoughts
    let allThoughts: AgentThought[] = [];
    
    // Step 1: Job Researcher Agent - Analyze the job posting, LinkedIn, and company career page
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.JOB_RESEARCH
    });
    
    // Get comprehensive job analysis with agents' thoughts
    const jobResearchResult = await analyzeJobPosting(jobUrl, linkedinUrl || undefined);
    const jobAnalysis = jobResearchResult.analysis as JobAnalysis;
    allThoughts = [...allThoughts, ...jobResearchResult.thoughts];
    
    // Update in-memory storage with agent thoughts
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      agentThoughts: allThoughts
    });
    
    // Research company career page to get additional information
    const careerPageResult = await researchCompanyCareerPage(
      jobAnalysis.companyName || "Company", 
      jobAnalysis.jobTitle || "Job Title"
    );
    allThoughts = [...allThoughts, ...careerPageResult.thoughts];
    
    // Extract basic job details for other agents
    const jobDetails = {
      company: jobAnalysis.companyName || "",
      title: jobAnalysis.jobTitle || "",
      location: jobAnalysis.location || "",
      skills: jobAnalysis.requiredSkills || []
    };
    
    // Step 2: Profiler Agent - Analyze the resume and LinkedIn profile
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.PROFILE_ANALYSIS
    });
    
    // Convert the Word document to plain text
    const extractedText = await mammoth.extractRawText({ buffer: resumeFile.buffer });
    const resumeText = extractedText.value;
    
    // Get comprehensive profile analysis
    const profileResult = await analyzeResume(resumeText, linkedinUrl);
    const profileAnalysis = profileResult.analysis;
    allThoughts = [...allThoughts, ...profileResult.thoughts];
    
    // Use the job analysis to extract specific skills for targeted search
    const requiredSkills = jobAnalysis.requiredSkills || [];
    const skillsResult = await findSpecificSkills(resumeText, requiredSkills);
    allThoughts = [...allThoughts, ...skillsResult.thoughts];
    
    // Update in-memory storage with agent thoughts
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      agentThoughts: allThoughts
    });
    
    // Step 3: Highlighter Agent - Generate relevant points and gap areas
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.HIGHLIGHT_GENERATION
    });
    
    const highlightsResult = await highlightResumePoints(resumeText, jobAnalysis, profileAnalysis);
    const candidateHighlights = highlightsResult.analysis;
    allThoughts = [...allThoughts, ...highlightsResult.thoughts];
    
    // Update in-memory storage with agent thoughts
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      agentThoughts: allThoughts
    });
    
    // Step 4: Interview Role Researcher Agent - Research company culture and business
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.COMPANY_RESEARCH
    });
    
    const companyResearchResult = await researchCompanyAndRole(
      jobAnalysis.companyName || "Company", 
      jobAnalysis.jobTitle || "Job Title"
    );
    const companyInfo = companyResearchResult.analysis;
    allThoughts = [...allThoughts, ...companyResearchResult.thoughts];
    
    // Update in-memory storage with agent thoughts
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      agentThoughts: allThoughts
    });
    
    // Step 5: Interview Pattern Researcher Agent - Research interview structure and patterns
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.INTERVIEW_PATTERN_RESEARCH
    });
    
    const interviewPatternsResult = await researchInterviewPatterns(
      jobAnalysis.companyName || "Company", 
      jobAnalysis.jobTitle || "Job Title"
    );
    const interviewPatterns = interviewPatternsResult.analysis;
    allThoughts = [...allThoughts, ...interviewPatternsResult.thoughts];
    
    // Update in-memory storage with agent thoughts
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      agentThoughts: allThoughts
    });
    
    // Step 6: Interviewer Preparer Agent - Generate interview questions and talking points
    // This is now an enhanced agent that consolidates multiple previous responsibilities:
    // - Creates customized interview questions based on company research and role requirements
    // - Generates specific, personalized talking points for each question based on candidate's profile
    // - Provides alternative points for areas where the candidate lacks experience
    // - Ensures alignment with company values and culture
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.INTERVIEWER_AGENT
    });
    
    // Generate questions and talking points through the enhanced interviewer agent
    const interviewerResult = await generateInterviewQuestions(
      jobDetails,
      companyInfo,
      interviewPatterns,
      profileAnalysis,
      candidateHighlights
    );
    
    const interviewRounds = interviewerResult.rounds;
    allThoughts = [...allThoughts, ...interviewerResult.thoughts];
    
    // Update in-memory storage with agent thoughts
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      agentThoughts: allThoughts
    });
    
    // The enhanced Interviewer Preparer Agent now consolidates functionality that was previously
    // spread across multiple agents (question generation, talking points, narrative guidance)
    // making the architecture more efficient and the results more coherent
    
    // Step 7: Store profile data with memory agent
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.MEMORY_AGENT
    });
    
    const memoryResult = await storeUserMemory(
      "anonymous", // No user authentication yet
      prepId,
      resumeText,
      linkedinUrl,
      profileAnalysis,
      candidateHighlights
    );
    
    allThoughts = [...allThoughts, ...memoryResult.thoughts];
    
    // Update in-memory storage with agent thoughts
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      agentThoughts: allThoughts
    });
    
    // Step 8: Quality Agent - Ensure all agent outputs meet quality standards
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.QUALITY_CHECK
    });
    
    // Prepare the complete interview prep data
    let interviewPrepData: InterviewPrep = {
      id: prepId,
      jobDetails,
      companyInfo: companyInfo.companyInfo,
      candidateHighlights,
      interviewRounds: interviewRounds,
      agentThoughts: allThoughts
    };
    
    // Store the updated interview prep with all data
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      result: interviewPrepData
    });
    
    // Validate the interview prep data with the quality agent
    const qualityCheckResult = await validateInterviewPrep(
      jobUrl,
      jobDetails,
      companyInfo.companyInfo,
      candidateHighlights,
      interviewRounds,
      allThoughts
    );
    
    const validatedPrep = qualityCheckResult.analysis;
    allThoughts = [...allThoughts, ...qualityCheckResult.thoughts];
    
    // Store the completed interview prep with all agent thoughts
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      status: "completed",
      progress: AgentStep.COMPLETED,
      result: validatedPrep,
      agentThoughts: allThoughts
    });
    
    // Persist the interview prep in the database with all metadata
    await storage.saveInterviewPrep(
      prepId, 
      validatedPrep, 
      jobUrl, 
      resumeText, 
      linkedinUrl || "" 
    );
    
    return validatedPrep;
  } catch (error: any) {
    // Update the status to failed if there was an error
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      status: "failed",
      error: error.message || "Unknown error occurred"
    });
    
    throw error;
  }
}

/**
 * Save a user's response to an interview question
 */
export const saveUserResponse = async (req: Request, res: Response) => {
  try {
    const { interviewPrepId, questionId, roundId, situation, action, resultText } = req.body;
    
    if (!interviewPrepId || !questionId || !roundId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Validate input data
    if (!situation || !action || !resultText) {
      return res.status(400).json({ 
        error: "Incomplete SAR response. Situation, Action, and Result are all required." 
      });
    }
    
    // Check if the interview prep exists
    const savedPrep = await storage.getInterviewPrep(interviewPrepId);
    if (!savedPrep) {
      return res.status(404).json({ error: "Interview preparation not found" });
    }
    
    // Store the user response using the memory agent
    const response = await storeUserResponse(
      "anonymous", // No user authentication yet
      interviewPrepId,
      questionId,
      roundId,
      { situation, action, result: resultText }
    );
    
    if (!response || !response.success) {
      return res.status(500).json({ error: "Failed to save user response" });
    }
    
    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: "User response saved successfully",
      thoughts: response.thoughts
    });
  } catch (error) {
    console.error("Error saving user response:", error);
    return res.status(500).json({ error: "Failed to save user response" });
  }
};

/**
 * Get all user responses for an interview prep
 */
export const getUserResponsesForInterview = async (req: Request, res: Response) => {
  try {
    const { interviewPrepId } = req.params;
    
    if (!interviewPrepId) {
      return res.status(400).json({ error: "Interview prep ID is required" });
    }
    
    // Check if the interview prep exists
    const savedPrep = await storage.getInterviewPrep(interviewPrepId);
    if (!savedPrep) {
      return res.status(404).json({ error: "Interview preparation not found" });
    }
    
    // Get user responses for this interview prep
    const responses = await getUserResponses(interviewPrepId);
    
    return res.status(200).json({ 
      success: true,
      responses
    });
  } catch (error) {
    console.error("Error getting user responses:", error);
    return res.status(500).json({ error: "Failed to retrieve user responses" });
  }
};
