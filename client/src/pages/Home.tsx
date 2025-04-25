import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InterviewForm from "@/components/InterviewForm";
import LoadingState from "@/components/LoadingState";
import ResultsSection from "@/components/ResultsSection";
import { generateInterviewPrep, checkInterviewPrepStatus } from "@/lib/openai";
import { InterviewPrep, AgentStep } from "@/types";
import { Button } from "@/components/ui/button";

const Home = () => {
  const { toast } = useToast();
  const [showHero, setShowHero] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<AgentStep>(AgentStep.JOB_RESEARCH);
  const [prepId, setPrepId] = useState<string | null>(null);
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrep | null>(null);

  useEffect(() => {
    // If we have a prep ID, poll for updates
    if (prepId && isLoading) {
      const pollInterval = setInterval(async () => {
        try {
          const result = await checkInterviewPrepStatus(prepId);
          setCurrentStep(result.progress as AgentStep);
          
          if (result.status === "completed" && result.result) {
            setInterviewPrep(result.result);
            setIsLoading(false);
            clearInterval(pollInterval);
          } else if (result.status === "failed") {
            toast({
              title: "Generation Failed",
              description: "There was an error generating your interview prep. Please try again.",
              variant: "destructive",
            });
            setIsLoading(false);
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.error("Error polling for updates:", error);
          setIsLoading(false);
          clearInterval(pollInterval);
          toast({
            title: "Error",
            description: "Failed to check interview preparation status.",
            variant: "destructive",
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
    
    try {
      const response = await generateInterviewPrep(formData);
      setPrepId(response.id);
      // The rest will be handled by the polling effect
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to generate interview preparation. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleGetStarted = () => {
    setShowHero(false);
    // Scroll to the form section
    document.getElementById("input-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        {showHero && (
          <section className="mb-12" id="hero-section">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-xl shadow-lg p-8 text-white">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">Prepare for Your Interview with AI-Powered Insights</h1>
                <p className="text-lg mb-6 opacity-90">Our intelligent agents analyze job postings and your experience to generate tailored interview questions and talking points.</p>
                <div className="flex justify-center">
                  <Button
                    id="get-started-btn"
                    onClick={handleGetStarted}
                    className="bg-white text-indigo-700 hover:bg-gray-100 px-6 py-6 h-auto rounded-lg font-medium transition"
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Input Form */}
        {!isLoading && !interviewPrep && (
          <InterviewForm onSubmit={handleFormSubmit} isSubmitting={isLoading} />
        )}

        {/* Loading State */}
        {isLoading && (
          <LoadingState currentStep={currentStep} />
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
