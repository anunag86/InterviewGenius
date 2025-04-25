import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as mammoth from "mammoth";
import { analyzeJobPosting } from "../agents/jobResearcher";
import { analyzeResume } from "../agents/profiler";
import { generateInterviewQuestions } from "../agents/interviewPreparer";
import { validateInterviewPrep } from "../agents/qualityAgent";
import { storage } from "../storage";
import { AgentStep } from "@/types";

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
    
    // Persist the interview prep in the database
    await storage.saveInterviewPrep(prepId, validatedPrep);
    
    return validatedPrep;
  } catch (error) {
    // Update the status to failed if there was an error
    interviewPreps.set(prepId, {
      ...interviewPreps.get(prepId),
      status: "failed",
      error: error.message
    });
    
    throw error;
  }
}
