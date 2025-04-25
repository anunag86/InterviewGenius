import { apiRequest } from "./queryClient";
import { InterviewFormData, InterviewPrep } from "@/types";

// Interface for history items
export interface InterviewHistoryItem {
  id: string;
  jobTitle: string;
  company: string;
  createdAt: string;
  expiresAt: string;
}

export async function generateInterviewPrep(
  formData: FormData
): Promise<InterviewPrep> {
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
): Promise<{ status: string; progress: number; result?: InterviewPrep }> {
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
