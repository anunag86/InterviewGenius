import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserResponse } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface UseUserResponsesProps {
  interviewPrepId: string;
}

interface ResponsesApiResponse {
  responses: UserResponse[];
}

export function useUserResponses({ interviewPrepId }: UseUserResponsesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userResponses, setUserResponses] = useState<UserResponse[]>([]);

  // Query to fetch user responses
  const { data, isLoading, isError } = useQuery({
    queryKey: [`/api/interview/${interviewPrepId}/responses`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/interview/${interviewPrepId}/responses`);
        if (!response.ok) {
          throw new Error("Failed to fetch responses");
        }
        const data = await response.json();
        return data as ResponsesApiResponse;
      } catch (error) {
        console.error("Error fetching user responses:", error);
        return { responses: [] as UserResponse[] };
      }
    },
    enabled: !!interviewPrepId
  });

  // Mutation to add or update a user response
  const { mutate: saveResponse, isPending: isSaving } = useMutation({
    mutationFn: async (responseData: {
      questionId: string;
      roundId: string;
      situation: string;
      action: string;
      result: string;
    }) => {
      const response = await fetch(`/api/interview/${interviewPrepId}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(responseData)
      });
      
      if (!response.ok) {
        throw new Error("Failed to save response");
      }
      
      const data = await response.json();
      return data.thoughts ? data : responseData as UserResponse;
    },
    onSuccess: (savedResponse: any) => {
      // Create a properly formatted user response object
      const userResponse: UserResponse = {
        questionId: savedResponse.questionId,
        roundId: savedResponse.roundId,
        situation: savedResponse.situation,
        action: savedResponse.action,
        result: savedResponse.result,
        updatedAt: new Date().toISOString()
      };
      
      // Update local state
      setUserResponses(prev => {
        const existingIndex = prev.findIndex(r => 
          r.questionId === userResponse.questionId && r.roundId === userResponse.roundId);
        
        if (existingIndex >= 0) {
          // Update existing response
          const updated = [...prev];
          updated[existingIndex] = userResponse;
          return updated;
        } else {
          // Add new response
          return [...prev, userResponse];
        }
      });
      
      // Invalidate queries to refetch the data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/interview/${interviewPrepId}/responses`]
      });
      
      // Also invalidate the interview status to include updated responses
      queryClient.invalidateQueries({ 
        queryKey: [`/api/interview/status/${interviewPrepId}`]
      });
      
      toast({
        title: "Response saved",
        description: "Your answer has been saved successfully.",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error("Error saving response:", error);
      toast({
        title: "Error",
        description: "Failed to save your response. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update local state when data changes
  useEffect(() => {
    if (data?.responses) {
      setUserResponses(data.responses);
    }
  }, [data]);

  // Helper to find a response for a specific question
  const getResponseForQuestion = (questionId: string, roundId: string): UserResponse | undefined => {
    return userResponses.find(r => r.questionId === questionId && r.roundId === roundId);
  };

  return {
    userResponses,
    isLoading,
    isError,
    isSaving,
    saveResponse,
    getResponseForQuestion
  };
}