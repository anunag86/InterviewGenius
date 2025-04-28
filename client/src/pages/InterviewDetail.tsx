import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ResultsSection from "@/components/ResultsSection";
import ErrorState from "@/components/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { InterviewPrep } from "@/types";
import { checkInterviewPrepStatus } from "@/lib/openai";
import { ChevronLeftIcon } from "lucide-react";

const InterviewDetail = () => {
  const { toast } = useToast();
  const params = useParams();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrep | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const interviewId = params.id;
  
  useEffect(() => {
    const fetchInterviewDetails = async () => {
      if (!interviewId) {
        setError("Invalid interview ID");
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const result = await checkInterviewPrepStatus(interviewId);
        
        if (result.status === "completed" && result.result) {
          setInterviewPrep(result.result);
        } else {
          setError("Interview preparation data is not available or is still processing");
        }
      } catch (error) {
        console.error("Error fetching interview details:", error);
        setError("Failed to load interview preparation details");
        toast({
          title: "Error",
          description: "Failed to load interview details.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInterviewDetails();
  }, [interviewId, toast]);
  
  const handleBackToHistory = () => {
    setLocation("/history");
  };
  
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="flex items-center text-muted-foreground hover:text-foreground"
            onClick={handleBackToHistory}
          >
            <ChevronLeftIcon className="mr-1" size={16} />
            Back to History
          </Button>
        </div>
        
        {isLoading ? (
          <div className="space-y-8">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-4 text-destructive">{error}</h2>
            <p className="mb-6 text-muted-foreground">
              This interview preparation may have expired or been deleted.
            </p>
            <Button onClick={handleBackToHistory}>
              Return to History
            </Button>
          </div>
        ) : interviewPrep ? (
          <ResultsSection data={interviewPrep} />
        ) : (
          <div className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-4">No Data Available</h2>
            <p className="mb-6 text-muted-foreground">
              This interview preparation could not be found.
            </p>
            <Button onClick={handleBackToHistory}>
              Return to History
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default InterviewDetail;