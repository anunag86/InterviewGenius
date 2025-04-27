import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as mammoth from "mammoth";
import { analyzeJobPosting, researchCompanyCareerPage } from "../agents/jobResearcher";
import { analyzeResume, findSpecificSkills } from "../agents/profiler";
import { highlightResumePoints } from "../agents/highlighter";
import { researchCompanyAndRole } from "../agents/companyResearcher";
import { researchInterviewPatterns } from "../agents/interviewPatternResearcher";
import { generateInterviewQuestions } from "../agents/interviewPreparer";
import { validateInterviewPrep } from "../agents/qualityAgent";
import { storage } from "../storage";
import { AgentStep, AgentThought } from "../../client/src/types";

// Extend Request type to include file property from multer
declare global {
  namespace Express {
    interface Request {
      file?: any;
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
    
    if (!interviewPreps.has(id)) {
      return res.status(404).json({ error: "Interview preparation request not found" });
    }
    
    const prepData = interviewPreps.get(id);
    
    // Include agent thoughts for showing the thinking process
    return res.status(200).json({
      status: prepData.status,
      progress: prepData.progress,
      result: prepData.result,
      error: prepData.error,
      agentThoughts: prepData.agentThoughts
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
    
    // Step 1: Analyze the job posting
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.JOB_RESEARCH
    });
    
    // Get job analysis with agents' thoughts
    const jobResearchResult = await analyzeJobPosting(jobUrl, linkedinUrl);
    const jobAnalysis = jobResearchResult.analysis;
    allThoughts = [...allThoughts, ...jobResearchResult.thoughts];
    
    // Update in-memory storage with agent thoughts
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      agentThoughts: allThoughts
    });
    
    // Step 2: Analyze the resume
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.PROFILE_ANALYSIS
    });
    
    // Convert the Word document to plain text
    const extractedText = await mammoth.extractRawText({ buffer: resumeFile.buffer });
    const resumeText = extractedText.value;
    
    // Get profile analysis with agents' thoughts
    const profileResult = await analyzeResume(resumeText, linkedinUrl);
    const profileAnalysis = profileResult.analysis;
    allThoughts = [...allThoughts, ...profileResult.thoughts];
    
    // Update in-memory storage with agent thoughts
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      agentThoughts: allThoughts
    });
    
    // Step 3: Research company career page to get additional information
    const careerPageResult = await researchCompanyCareerPage(
      jobAnalysis.companyName || "Company", 
      jobAnalysis.jobTitle || "Job Title"
    );
    allThoughts = [...allThoughts, ...careerPageResult.thoughts];
    
    // Use the job analysis to extract specific skills for targeted search
    const requiredSkills = jobAnalysis.requiredSkills || [];
    const skillsResult = await findSpecificSkills(resumeText, requiredSkills);
    allThoughts = [...allThoughts, ...skillsResult.thoughts];
    
    // Step 4: Generate candidate highlights
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
    
    // Step 5: Research company and role
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
    
    // Step 6: Research interview patterns
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
    
    // Step 7: Generate interview questions based on all previous research
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.QUESTION_GENERATION
    });
    
    const interviewQuestionsResult = await generateInterviewQuestions(
      jobAnalysis, 
      profileAnalysis, 
      companyInfo, 
      interviewPatterns
    );
    const interviewQuestions = interviewQuestionsResult.result;
    allThoughts = [...allThoughts, ...interviewQuestionsResult.thoughts];
    
    // Update in-memory storage with agent thoughts
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      agentThoughts: allThoughts
    });
    
    // Step 8: Quality check all results
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.QUALITY_CHECK
    });
    
    // Extract basic job details for the quality check
    const jobDetails = {
      company: jobAnalysis.companyName || "",
      title: jobAnalysis.jobTitle || "",
      location: jobAnalysis.location || "",
      skills: jobAnalysis.requiredSkills || []
    };
    
    const qualityCheckResult = await validateInterviewPrep(
      jobUrl,
      jobDetails,
      companyInfo.companyInfo,
      candidateHighlights,
      interviewQuestions.interviewRounds,
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
