import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InterviewForm from "@/components/InterviewForm";
import LoadingState from "@/components/LoadingState";
import ResultsSection from "@/components/ResultsSection";
import ErrorState from "@/components/ErrorState";
import { generateInterviewPrep, checkInterviewPrepStatus } from "@/lib/openai";
import { InterviewPrep, AgentStep, AgentThought } from "@/types";
import { Button } from "@/components/ui/button";

const Home = () => {
  const { toast } = useToast();
  const [showHero, setShowHero] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<AgentStep>(AgentStep.JOB_RESEARCH);
  const [prepId, setPrepId] = useState<string | null>(null);
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrep | null>(null);
  const [agentThoughts, setAgentThoughts] = useState<AgentThought[]>([]);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    // If we have a prep ID, poll for updates
    if (prepId && isLoading) {
      const pollInterval = setInterval(async () => {
        try {
          const result = await checkInterviewPrepStatus(prepId);
          setCurrentStep(result.progress as AgentStep);
          
          // Update agent thoughts if available
          if (result.agentThoughts) {
            setAgentThoughts(result.agentThoughts);
          }
          
          if (result.status === "completed" && result.result) {
            setInterviewPrep(result.result);
            setIsLoading(false);
            clearInterval(pollInterval);
          } else if (result.status === "failed") {
            setError({
              title: "Generation Failed",
              message: "There was an error generating your interview prep. Please try again."
            });
            setIsLoading(false);
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.error("Error polling for updates:", error);
          setIsLoading(false);
          clearInterval(pollInterval);
          setError({
            title: "Error",
            message: "Failed to check interview preparation status. Please try again."
          });
        }
      }, 3000);

      return () => clearInterval(pollInterval);
    }
  }, [prepId, isLoading, toast]);

  const handleFormSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setCurrentStep(AgentStep.JOB_RESEARCH);
    setInterviewPrep(null);
    setAgentThoughts([]); // Reset agent thoughts
    
    try {
      const response = await generateInterviewPrep(formData);
      // Since id is optional, use type assertion to help TypeScript
      const prepId = response.id as string | undefined;
      if (prepId) {
        setPrepId(prepId);
      } else {
        console.error("No prep ID returned from API");
        toast({
          title: "Warning",
          description: "Could not track preparation progress. Please wait...",
          variant: "default",
        });
      }
      // The rest will be handled by the polling effect
    } catch (error) {
      console.error("Error submitting form:", error);
      setError({
        title: "Generation Failed",
        message: "There was an error generating your interview prep. Please check your inputs and try again."
      });
      setIsLoading(false);
    }
  };

  const handleGetStarted = () => {
    setShowHero(false);
    // Scroll to the form section
    document.getElementById("input-form")?.scrollIntoView({ behavior: "smooth" });
  };
  
  const handleRetry = () => {
    setError(null);
    setIsLoading(false);
    setPrepId(null);
  };

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        {showHero && (
          <section className="mb-12" id="hero-section">
            <div className="max-w-3xl mx-auto py-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AI-Powered Interview Prep</h1>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Get comprehensive interview preparation tailored to your specific job opportunity
                </p>
              </div>
              
              <div className="flex justify-center gap-4">
                <Button
                  id="new-prep-btn"
                  onClick={handleGetStarted}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md font-medium transition-all duration-200 shadow-sm"
                >
                  New Preparation
                </Button>
                
                <Button
                  id="view-history-btn"
                  onClick={() => window.location.href = '/history'}
                  className="bg-muted hover:bg-muted/80 text-foreground px-6 py-2 rounded-md font-medium transition-all duration-200"
                  variant="outline"
                >
                  View History
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Error State */}
        {error && !isLoading && !interviewPrep && (
          <div className="max-w-3xl mx-auto mb-12">
            <ErrorState
              title={error.title}
              message={error.message}
              onRetry={handleRetry}
            />
          </div>
        )}
        
        {/* Input Form */}
        {!isLoading && !interviewPrep && !error && (
          <InterviewForm onSubmit={handleFormSubmit} isSubmitting={isLoading} />
        )}

        {/* Loading State with Agent Thoughts */}
        {isLoading && (
          <LoadingState 
            currentStep={currentStep} 
            agentThoughts={agentThoughts} 
          />
        )}

        {/* Results Section */}
        {interviewPrep && (
          <ResultsSection data={interviewPrep} />
        )}
      </main>
      <Footer />
    </>
  );
};

export default Home;
