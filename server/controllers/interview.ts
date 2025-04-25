import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as mammoth from "mammoth";
import { analyzeJobPosting } from "../agents/jobResearcher";
import { analyzeResume } from "../agents/profiler";
import { generateInterviewQuestions } from "../agents/interviewPreparer";
import { validateInterviewPrep } from "../agents/qualityAgent";
import { storage } from "../storage";
import { AgentStep } from "@/types";

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
      error: null
    });
    
    // Start the processing in the background
    processInterviewPrep(prepId, req.file, jobUrl, linkedinUrl).catch(error => {
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
    
    return res.status(200).json({
      status: prepData.status,
      progress: prepData.progress,
      result: prepData.result,
      error: prepData.error
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

async function processInterviewPrep(prepId: string, resumeFile: Express.Multer.File, jobUrl: string, linkedinUrl: string) {
  try {
    // Step 1: Analyze the job posting
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.JOB_RESEARCH
    });
    
    const jobAnalysis = await analyzeJobPosting(jobUrl);
    
    // Step 2: Analyze the resume
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.PROFILE_ANALYSIS
    });
    
    // Convert the Word document to plain text
    const extractedText = await mammoth.extractRawText({ buffer: resumeFile.buffer });
    const resumeText = extractedText.value;
    
    const resumeAnalysis = await analyzeResume(resumeText, linkedinUrl);
    
    // Step 3: Generate interview questions
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.QUESTION_GENERATION
    });
    
    const interviewQuestions = await generateInterviewQuestions(jobAnalysis, resumeAnalysis);
    
    // Step 4: Quality check the results
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      progress: AgentStep.QUALITY_CHECK
    });
    
    const validatedPrep = await validateInterviewPrep(interviewQuestions, jobUrl);
    
    // Store the completed interview prep
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      status: "completed",
      progress: AgentStep.COMPLETED,
      result: validatedPrep
    });
    
    // Persist the interview prep in the database with all metadata
    await storage.saveInterviewPrep(
      prepId, 
      validatedPrep, 
      jobUrl, 
      resumeText, 
      linkedinUrl
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
