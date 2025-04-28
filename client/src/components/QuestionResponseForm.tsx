import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { InterviewQuestion, UserResponse } from "@/types";
import { apiRequest } from "@/lib/queryClient";

interface QuestionResponseFormProps {
  interviewPrepId: string;
  questionId: string;
  roundId: string;
  question: string;
  existingResponse?: UserResponse;
  onSaveSuccess?: (response: UserResponse) => void;
}

const QuestionResponseForm = ({
  interviewPrepId,
  questionId,
  roundId,
  question,
  existingResponse,
  onSaveSuccess
}: QuestionResponseFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [situation, setSituation] = useState(existingResponse?.situation || "");
  const [action, setAction] = useState(existingResponse?.action || "");
  const [result, setResult] = useState(existingResponse?.result || "");
  const [isExpanded, setIsExpanded] = useState(!!existingResponse);

  // Update form when existing response changes
  useEffect(() => {
    if (existingResponse) {
      setSituation(existingResponse.situation || "");
      setAction(existingResponse.action || "");
      setResult(existingResponse.result || "");
      setIsExpanded(true);
    }
  }, [existingResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!situation.trim() || !action.trim() || !result.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill out all the fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest<UserResponse>({
        url: `/api/interview/${interviewPrepId}/responses`,
        method: "POST",
        data: {
          questionId,
          roundId,
          situation,
          action,
          result
        }
      });

      toast({
        title: "Response saved",
        description: "Your answer has been saved successfully.",
        variant: "default"
      });

      if (onSaveSuccess) {
        onSaveSuccess(response);
      }
    } catch (error) {
      console.error("Error saving response:", error);
      toast({
        title: "Error",
        description: "Failed to save your response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-6 border border-border">
      <CardHeader className="bg-muted/50 border-b border-border">
        <CardTitle className="text-lg font-medium">
          {question}
        </CardTitle>
      </CardHeader>
      
      {!isExpanded ? (
        <CardFooter className="pt-4 pb-4 flex justify-center">
          <Button 
            variant="outline"
            onClick={() => setIsExpanded(true)}
            className="w-full"
          >
            Add your response (S.A.R. format)
          </Button>
        </CardFooter>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="p-4 space-y-4">
            <div>
              <h4 className="font-medium text-primary mb-2">Situation</h4>
              <Textarea
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="Describe the situation or context..."
                className="min-h-[100px]"
              />
            </div>
            
            <div>
              <h4 className="font-medium text-primary mb-2">Action</h4>
              <Textarea
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="What actions did you take?"
                className="min-h-[100px]"
              />
            </div>
            
            <div>
              <h4 className="font-medium text-primary mb-2">Result</h4>
              <Textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="What was the outcome of your actions?"
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between pb-4 pt-0 px-4">
            {existingResponse ? (
              <Button 
                variant="outline"
                onClick={() => setIsExpanded(false)}
              >
                Cancel
              </Button>
            ) : (
              <Button 
                variant="outline"
                onClick={() => setIsExpanded(false)}
              >
                Hide
              </Button>
            )}
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Response"}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
};

export default QuestionResponseForm;