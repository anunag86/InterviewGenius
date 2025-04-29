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
  const [error, setError] = useState<{title: string; message: string} | null>(null);
  
  const interviewId = params.id;
  
  useEffect(() => {
    const fetchInterviewDetails = async () => {
      if (!interviewId) {
        setError({
          title: "Invalid Request",
          message: "No interview ID was provided"
        });
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const result = await checkInterviewPrepStatus(interviewId);
        
        if (result.status === "completed" && result.result) {
          setInterviewPrep(result.result);
        } else {
          setError({
            title: "Interview Not Available",
            message: "This interview preparation is not available or is still being processed"
          });
        }
      } catch (error) {
        console.error("Error fetching interview details:", error);
        setError({
          title: "Failed to Load",
          message: "We couldn't load this interview preparation. It may have expired or been deleted."
        });
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
  
  const handleBackToHome = () => {
    setLocation("/");
  };
  
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="flex items-center text-muted-foreground hover:text-foreground"
            onClick={handleBackToHome}
          >
            <ChevronLeftIcon className="mr-1" size={16} />
            Back to Home
          </Button>
        </div>
        
        {isLoading ? (
          <div className="space-y-8">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="max-w-3xl mx-auto mb-12">
            <ErrorState
              title={error.title}
              message={error.message}
              onRetry={handleBackToHome}
            />
          </div>
        ) : interviewPrep ? (
          <ResultsSection data={interviewPrep} />
        ) : (
          <div className="max-w-3xl mx-auto mb-12">
            <ErrorState
              title="No Data Available"
              message="This interview preparation could not be found. It may have expired or been deleted."
              onRetry={handleBackToHome}
            />
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default InterviewDetail;