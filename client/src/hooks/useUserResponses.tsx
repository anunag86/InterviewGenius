import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { UserResponse } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface UseUserResponsesProps {
  interviewPrepId: string;
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
        const response = await apiRequest<{ responses: UserResponse[] }>({
          url: `/api/interview/${interviewPrepId}/responses`,
          method: "GET"
        });
        return response;
      } catch (error) {
        console.error("Error fetching user responses:", error);
        return { responses: [] };
      }
    },
    enabled: !!interviewPrepId
  });

  // Mutation to add or update a user response
  const { mutate: saveResponse, isPending: isSaving } = useMutation({
    mutationFn: async (responseData: Omit<UserResponse, "id" | "userId" | "interviewPrepId" | "createdAt" | "updatedAt">) => {
      return apiRequest<UserResponse>({
        url: `/api/interview/${interviewPrepId}/responses`,
        method: "POST",
        data: {
          ...responseData,
          interviewPrepId
        }
      });
    },
    onSuccess: (newResponse) => {
      // Update local state
      setUserResponses(prev => {
        const existingIndex = prev.findIndex(r => 
          r.questionId === newResponse.questionId && r.roundId === newResponse.roundId);
        
        if (existingIndex >= 0) {
          // Update existing response
          const updated = [...prev];
          updated[existingIndex] = newResponse;
          return updated;
        } else {
          // Add new response
          return [...prev, newResponse];
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