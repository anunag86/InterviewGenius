import { apiRequest } from "./queryClient";
import { InterviewFormData, InterviewPrep, AgentThought, GradingResult } from "@/types";

// Interface for history items
export interface InterviewHistoryItem {
  id: string;
  jobTitle: string;
  company: string;
  createdAt: string;
  expiresAt: string;
}

// Interface for feedback data
export interface FeedbackData {
  name?: string;
  email?: string;
  comment: string;
  npsScore: number;
}

// Interface for interview prep status response
export interface InterviewPrepStatusResponse {
  status: string;
  progress: number;
  result?: InterviewPrep;
  error?: string;
  agentThoughts?: AgentThought[];
}

export async function generateInterviewPrep(
  formData: FormData
): Promise<{ id?: string; message?: string }> {
  try {
    const response = await apiRequest("POST", "/api/interview/generate", formData);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error generating interview prep:", error);
    throw new Error("Failed to generate interview preparation content. Please try again.");
  }
}

export async function checkInterviewPrepStatus(
  id: string
): Promise<InterviewPrepStatusResponse> {
  try {
    const response = await fetch(`/api/interview/status/${id}`, {
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error checking interview prep status:", error);
    throw new Error("Failed to check interview preparation status. Please try again.");
  }
}

export async function getInterviewHistory(
  limit: number = 10
): Promise<InterviewHistoryItem[]> {
  try {
    const response = await fetch(`/api/interview/history?limit=${limit}`, {
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error(`History fetch failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error("Error fetching interview history:", error);
    throw new Error("Failed to fetch interview history. Please try again.");
  }
}

export async function submitFeedback(feedbackData: FeedbackData): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackData),
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to submit feedback');
    }
    
    return {
      success: true,
      message: data.message || 'Feedback submitted successfully'
    };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to submit feedback'
    };
  }
}

export async function gradeResponse(
  interviewPrepId: string,
  questionId: string,
  roundId: string,
  question: string,
  responseText: string
): Promise<GradingResult | null> {
  try {
    const response = await fetch('/api/interview/response/grade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interviewPrepId,
        questionId,
        roundId,
        question,
        responseText
      }),
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.warn('API Error in gradeResponse:', data.error || response.statusText);
      return null;
    }
    
    if (!data.success || !data.result) {
      console.warn('Invalid grading result format:', data);
      return null;
    }
    
    return data.result;
  } catch (error) {
    console.error('Error grading response:', error);
    // Return null instead of throwing, so calling code can handle gracefully
    return null;
  }
}
