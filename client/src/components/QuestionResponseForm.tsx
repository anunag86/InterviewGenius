import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserResponse } from "@/types";
import { CheckCircle, Edit, ChevronDown, ChevronUp } from "lucide-react";

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

    onSave({
      questionId,
      roundId,
      situation,
      action,
      result
    });
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
                <span>Add your response (S.A.R. format)</span>
                <ChevronDown size={16} className="ml-1" />
              </>
            )}
          </Button>
        </CardFooter>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="p-4 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center font-semibold">S</div>
                <h4 className="font-medium text-primary">Situation</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Describe the specific situation or challenge you faced</p>
              <Textarea
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="Describe the situation or context..."
                className="min-h-[100px] border-primary/20 focus-visible:ring-primary/30"
              />
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center font-semibold">A</div>
                <h4 className="font-medium text-primary">Action</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Explain the specific actions you took to address the situation</p>
              <Textarea
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="What actions did you take?"
                className="min-h-[100px] border-primary/20 focus-visible:ring-primary/30"
              />
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center font-semibold">R</div>
                <h4 className="font-medium text-primary">Result</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Share the outcomes of your actions and what you accomplished</p>
              <Textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="What was the outcome of your actions?"
                className="min-h-[100px] border-primary/20 focus-visible:ring-primary/30"
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between pb-4 pt-0 px-4">
            <Button 
              variant="ghost"
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1 text-muted-foreground"
            >
              <ChevronUp size={16} />
              <span>{existingResponse ? "Cancel" : "Hide"}</span>
            </Button>
            
            <Button 
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 shadow-sm"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Save Response</span>
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
};

export default QuestionResponseForm;