import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserResponse, GradingResult } from "@/types";
import { gradeResponse } from "@/lib/openai";
import { CheckCircle, Edit, ChevronDown, ChevronUp, AlertCircle, Award, InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuestionResponseFormProps {
  interviewPrepId: string;
  questionId: string;
  roundId: string;
  question: string;
  existingResponse?: UserResponse;
  onSaveSuccess?: (response: UserResponse) => void;
  onSave: (responseData: {
    questionId: string;
    roundId: string;
    situation: string;
    action: string;
    result: string;
  }) => void;
  isSaving: boolean;
}

// Component to display grading results
const GradingResultDisplay = ({ result }: { result: GradingResult }) => {
  return (
    <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-primary/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award className="text-primary" size={18} />
          <h4 className="font-medium">Response Grade</h4>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary">
          Score: {result.score}/10
        </Badge>
      </div>
      
      <p className="text-sm mb-3">{result.feedback}</p>
      
      <div className="space-y-3">
        <div>
          <h5 className="text-xs uppercase font-semibold text-muted-foreground mb-1">Strengths</h5>
          <ul className="text-sm space-y-1">
            {result.strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={14} />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h5 className="text-xs uppercase font-semibold text-muted-foreground mb-1">Areas for Improvement</h5>
          <ul className="text-sm space-y-1">
            {result.improvements.map((improvement, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={14} />
                <span>{improvement}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {(result.suggestedPoints.situation.length > 0 || 
          result.suggestedPoints.action.length > 0 || 
          result.suggestedPoints.result.length > 0) && (
          <div>
            <h5 className="text-xs uppercase font-semibold text-muted-foreground mb-1 flex items-center gap-1">
              Suggested Points from Your Resume
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon size={12} className="text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>These points from your resume could strengthen your answer</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h5>
            {result.suggestedPoints.situation.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-medium text-primary">For Situation:</span>
                <ul className="text-sm space-y-1 ml-2 mt-1">
                  {result.suggestedPoints.situation.map((point, idx) => (
                    <li key={idx} className="text-xs">• {point}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.suggestedPoints.action.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-medium text-primary">For Action:</span>
                <ul className="text-sm space-y-1 ml-2 mt-1">
                  {result.suggestedPoints.action.map((point, idx) => (
                    <li key={idx} className="text-xs">• {point}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.suggestedPoints.result.length > 0 && (
              <div>
                <span className="text-xs font-medium text-primary">For Result:</span>
                <ul className="text-sm space-y-1 ml-2 mt-1">
                  {result.suggestedPoints.result.map((point, idx) => (
                    <li key={idx} className="text-xs">• {point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const QuestionResponseForm = ({
  interviewPrepId,
  questionId,
  roundId,
  question,
  existingResponse,
  onSaveSuccess,
  onSave,
  isSaving
}: QuestionResponseFormProps) => {
  const { toast } = useToast();
  const [responseText, setResponseText] = useState("");
  const [isExpanded, setIsExpanded] = useState(!!existingResponse);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);

  // Combine existing response if available
  useEffect(() => {
    if (existingResponse) {
      const combinedText = [
        `Situation: ${existingResponse.situation || ""}`,
        `Action: ${existingResponse.action || ""}`,
        `Result: ${existingResponse.result || ""}`
      ].join("\n\n");
      
      setResponseText(combinedText);
      setIsExpanded(true);
    }
  }, [existingResponse]);

  // Extract SAR components from the combined text
  const extractSARComponents = (text: string) => {
    // Default empty values
    let situation = "";
    let action = "";
    let result = "";
    
    // Try to extract each component based on labels or sections
    const situationRegex = /situation:?\s*([\s\S]*?)(?=action:|result:|$)/i;
    const actionRegex = /action:?\s*([\s\S]*?)(?=situation:|result:|$)/i;
    const resultRegex = /result:?\s*([\s\S]*?)(?=situation:|action:|$)/i;
    
    const situationMatch = text.match(situationRegex);
    const actionMatch = text.match(actionRegex);
    const resultMatch = text.match(resultRegex);
    
    // Clean up the extracted text
    if (situationMatch && situationMatch[1]) {
      situation = situationMatch[1].trim();
    }
    
    if (actionMatch && actionMatch[1]) {
      action = actionMatch[1].trim();
    }
    
    if (resultMatch && resultMatch[1]) {
      result = resultMatch[1].trim();
    }
    
    // If no explicit labels were found, try to divide the text into three parts
    if (!situation && !action && !result) {
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      if (paragraphs.length >= 3) {
        // If we have at least 3 paragraphs, assume they are S, A, R in order
        situation = paragraphs[0];
        action = paragraphs[1];
        result = paragraphs[2];
      } else if (paragraphs.length === 2) {
        // If only 2 paragraphs, assume first is S, second is split between A and R
        situation = paragraphs[0];
        const secondHalf = paragraphs[1];
        const middlePoint = Math.floor(secondHalf.length / 2);
        action = secondHalf.substring(0, middlePoint).trim();
        result = secondHalf.substring(middlePoint).trim();
      } else if (paragraphs.length === 1) {
        // If only 1 paragraph, split it into three parts
        const fullText = paragraphs[0];
        const thirdLength = Math.floor(fullText.length / 3);
        situation = fullText.substring(0, thirdLength).trim();
        action = fullText.substring(thirdLength, thirdLength * 2).trim();
        result = fullText.substring(thirdLength * 2).trim();
      }
    }
    
    return { situation, action, result };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!responseText.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide your response in the Situation-Action-Result format.",
        variant: "destructive"
      });
      return;
    }

    // Extract the SAR components from the text
    const { situation, action, result } = extractSARComponents(responseText);
    
    try {
      // Save the response using the provided onSave function
      onSave({
        questionId,
        roundId,
        situation,
        action,
        result
      });
      
      // Update the UI to show the response has been saved
      if (existingResponse) {
        toast({
          title: "Response Updated",
          description: "Your answer has been updated successfully.",
        });
      }
      
      // Since saving is handled by the mutation in parent component,
      // we can immediately trigger grading
      setTimeout(() => {
        handleGradeResponse();
      }, 100); // Add a small delay to ensure saving is processed first
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      // Error will be handled by the parent component's onError handler
    }
  };
  
  // Function to grade the response
  const handleGradeResponse = async () => {
    if (!responseText.trim() || isGrading) {
      return;
    }
    
    // Reset any previous grading result
    setGradingResult(null);
    setIsGrading(true);
    
    try {
      // Add a short delay to prevent race conditions with saving
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await gradeResponse(
        interviewPrepId,
        questionId,
        roundId,
        question,
        responseText
      );
      
      if (result) {
        setGradingResult(result);
      } else {
        throw new Error("Empty grading result");
      }
    } catch (error) {
      console.error("Error grading response:", error);
      // Don't show toast unless this was explicitly initiated by user (not auto-grading on save)
      if (!existingResponse) {
        toast({
          title: "Grading Note", 
          description: "Your response was saved, but we couldn't grade it at this time. You can try grading again later.",
          variant: "default"
        });
      }
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <Card className="mb-6 border border-border shadow-sm hover:shadow transition-all duration-200">
      <CardHeader className="bg-muted/50 border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">
          {question}
        </CardTitle>
        {existingResponse && (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 flex items-center gap-1">
            <CheckCircle size={14} />
            <span>Response Saved</span>
          </Badge>
        )}
      </CardHeader>
      
      {!isExpanded ? (
        <CardFooter className="pt-4 pb-4 flex justify-center">
          <Button 
            variant="outline"
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20"
          >
            {existingResponse ? (
              <>
                <Edit size={16} />
                <span>Edit your response</span>
                <ChevronDown size={16} className="ml-1" />
              </>
            ) : (
              <>
                <span>Add your response</span>
                <ChevronDown size={16} className="ml-1" />
              </>
            )}
          </Button>
        </CardFooter>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="p-4 space-y-4">
            <div className="text-sm text-muted-foreground mb-2">
              <div className="mb-2">
                For effective interview responses, use the <strong>Situation-Action-Result (SAR)</strong> format:
              </div>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong>Situation:</strong> Describe the context and challenge you faced</li>
                <li><strong>Action:</strong> Explain the specific steps you took</li>
                <li><strong>Result:</strong> Share the outcomes and value you delivered</li>
              </ul>
              <div className="mt-2 text-xs">
                Include specific data points and metrics whenever possible to make your answer more impactful.
              </div>
            </div>
            
            <Textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Write your response using Situation, Action, and Result format..."
              className="min-h-[250px] border-primary/20 focus-visible:ring-primary/30"
            />
            
            <div className="flex justify-between items-center">
              <Button 
                variant="ghost"
                type="button"
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-1 text-muted-foreground"
              >
                <ChevronUp size={16} />
                <span>{existingResponse ? "Cancel" : "Hide"}</span>
              </Button>
              
              <div className="flex gap-2">
                {!isGrading && !gradingResult && responseText.trim().length > 50 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGradeResponse}
                    className="flex items-center gap-2"
                  >
                    <Award size={16} />
                    <span>Grade Response</span>
                  </Button>
                )}
                
                <Button 
                  type="submit"
                  disabled={isSaving || isGrading}
                  className="flex items-center gap-2 shadow-sm"
                >
                  {isSaving ? (
                    <>Saving...</>
                  ) : isGrading ? (
                    <>Grading...</>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      <span>Save Response</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {gradingResult && <GradingResultDisplay result={gradingResult} />}
          </CardContent>
        </form>
      )}
    </Card>
  );
};

export default QuestionResponseForm;