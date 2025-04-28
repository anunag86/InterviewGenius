import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InterviewForm from "@/components/InterviewForm";
import LoadingState from "@/components/LoadingState";
import ResultsSection from "@/components/ResultsSection";
import ErrorState from "@/components/ErrorState";
import { generateInterviewPrep, checkInterviewPrepStatus, getInterviewHistory, InterviewHistoryItem } from "@/lib/openai";
import { InterviewPrep, AgentStep, AgentThought } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightIcon, CalendarIcon, BuildingIcon, BriefcaseIcon, ClockIcon } from "lucide-react";

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

  // Define state for history
  const [, setLocation] = useLocation();
  const [historyItems, setHistoryItems] = useState<InterviewHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Fetch interview history
  useEffect(() => {
    const fetchHistory = async () => {
      setIsHistoryLoading(true);
      try {
        const history = await getInterviewHistory();
        setHistoryItems(history);
      } catch (error) {
        console.error("Error fetching history:", error);
        toast({
          title: "Error",
          description: "Failed to load interview history",
          variant: "destructive",
        });
      } finally {
        setIsHistoryLoading(false);
      }
    };
    
    fetchHistory();
  }, [toast]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }).format(date);
  };

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="mb-12" id="hero-section">
          <div className="max-w-4xl mx-auto py-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4 gradient-heading">Welcome to PrepTalk - Your Interview Coach</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
                PrepTalk helps you turn your experiences into clear, confident answers - no shortcuts, just real preparation
              </p>
            </div>
          </div>
        </section>

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
        
        {/* Card Grid Layout */}
        {!isLoading && !interviewPrep && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            {/* New Preparation Card */}
            <Card className="lg:col-span-5 hover-card border-primary/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl gradient-heading">New Interview Preparation</CardTitle>
                <CardDescription>
                  Create a new preparation for your upcoming interview
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewForm onSubmit={handleFormSubmit} isSubmitting={isLoading} />
              </CardContent>
            </Card>

            {/* History Cards Section */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Recent Preparations</h2>
              </div>
              
              {isHistoryLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i} className="animate-pulse bg-muted/50">
                      <CardHeader className="pb-2">
                        <div className="h-7 bg-muted rounded w-3/4"></div>
                        <div className="h-5 bg-muted rounded w-1/2 mt-2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-5 bg-muted rounded w-full mt-2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : historyItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {historyItems.slice(0, 4).map((item) => (
                    <Card 
                      key={item.id} 
                      className="hover-card cursor-pointer"
                      onClick={() => setLocation(`/interview/${item.id}`)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium">{item.jobTitle}</CardTitle>
                        <CardDescription className="flex items-center">
                          <BuildingIcon size={14} className="mr-1" />
                          {item.company}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <CalendarIcon size={14} className="mr-1" />
                          <span>Created: {formatDate(item.createdAt)}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-between hover:bg-primary/5"
                        >
                          <span>View Details</span>
                          <ArrowRightIcon size={14} />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-muted/30">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No interview preparations yet. Create your first one!</p>
                  </CardContent>
                </Card>
              )}
              
              {historyItems.length > 4 && (
                <div className="text-center mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation('/history')}
                  >
                    View All Preparations
                  </Button>
                </div>
              )}
            </div>
          </div>
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
        
        {/* Mission Statement */}
        {!isLoading && !interviewPrep && !error && (
          <div className="max-w-3xl mx-auto mt-16 mb-8 text-center">
            <p className="text-muted-foreground text-sm italic px-4">
              "Our mission is to help you crystallize your personal experiences into strong, authentic answers 
              - not to hand you shortcuts or generic response guides."
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default Home;
