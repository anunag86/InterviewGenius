import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AgentStep, AgentThought } from "@/types";

interface ProgressItem {
  id: AgentStep;
  icon: string;
  text: string;
  description?: string;
}

interface LoadingStateProps {
  currentStep: AgentStep;
  agentThoughts?: AgentThought[];
}

const LoadingState = ({ currentStep, agentThoughts = [] }: LoadingStateProps) => {
  const [recentThoughts, setRecentThoughts] = useState<AgentThought[]>([]);
  
  // Process agent thoughts to display the most recent ones
  useEffect(() => {
    // Get the most recent 5 thoughts
    const latestThoughts = [...agentThoughts]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
    
    setRecentThoughts(latestThoughts);
  }, [agentThoughts]);

  const progressItems: ProgressItem[] = [
    { 
      id: AgentStep.JOB_RESEARCH, 
      icon: "briefcase-search", 
      text: "Job Researcher Agent",
      description: "Analyzing job listing, LinkedIn profile, and company careers page"
    },
    { 
      id: AgentStep.PROFILE_ANALYSIS, 
      icon: "user-gear", 
      text: "Profiler Agent",
      description: "Analyzing resume and LinkedIn profile for skills and achievements" 
    },
    {
      id: AgentStep.HIGHLIGHT_GENERATION,
      icon: "highlighter",
      text: "Highlighter Agent",
      description: "Identifying relevant strengths and potential gap areas"
    },
    {
      id: AgentStep.COMPANY_RESEARCH,
      icon: "building-2",
      text: "Interview Role Researcher",
      description: "Researching company culture, business focus, and team information"
    },
    {
      id: AgentStep.INTERVIEW_PATTERN_RESEARCH,
      icon: "hierarchy",
      text: "Interview Pattern Researcher",
      description: "Identifying interview structure, rounds, and common questions"
    },
    { 
      id: AgentStep.INTERVIEWER_AGENT, 
      icon: "clipboard-question", 
      text: "Interviewer Preparer Agent",
      description: "Generating tailored questions for each interview round with talking points"
    },
    { 
      id: AgentStep.CANDIDATE_NARRATIVE_AGENT, 
      icon: "book-text", 
      text: "Narrative Structure Agent",
      description: "Creating strategic guidance on how to structure your answers" 
    },
    { 
      id: AgentStep.CANDIDATE_POINTS_AGENT, 
      icon: "list-bullet", 
      text: "Concrete Examples Agent",
      description: "Extracting specific examples from your resume to support narratives"
    },
    {
      id: AgentStep.MEMORY_AGENT,
      icon: "database",
      text: "Memory Agent",
      description: "Storing your profile data for personalized interview preparation"
    },
    { 
      id: AgentStep.QUALITY_CHECK, 
      icon: "shield-check", 
      text: "Quality Agent",
      description: "Ensuring all outputs meet quality standards and coherence"
    },
  ];

  return (
    <section className="mb-12 bg-card rounded-xl shadow-sm p-6 lg:p-8 border border-border">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <div className="text-center lg:text-left mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto lg:mx-0 mb-4"></div>
            <h2 className="text-xl font-medium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              Preparing your interview
            </h2>
            <p className="text-muted-foreground text-sm">
              Our AI agents are analyzing data to create a comprehensive interview preparation package...
            </p>
          </div>
          
          <div className="bg-muted rounded-lg p-4 border border-border/50">
            <h3 className="text-sm font-medium mb-3 text-foreground">Progress</h3>
            <ul className="space-y-3" id="progress-list">
              {progressItems.map((item) => (
                <li 
                  key={item.id}
                  className={`flex items-center text-sm ${
                    item.id <= currentStep 
                      ? "text-primary" 
                      : "text-muted-foreground"
                  }`}
                >
                  <span 
                    className={`h-6 w-6 flex items-center justify-center rounded-full mr-3 ${
                      item.id <= currentStep 
                        ? "bg-primary/10 text-primary" 
                        : "bg-muted-foreground/10 text-muted-foreground"
                    }`}
                  >
                    {item.id < currentStep ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : item.id === AgentStep.JOB_RESEARCH ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    ) : item.id === AgentStep.PROFILE_ANALYSIS ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : item.id === AgentStep.HIGHLIGHT_GENERATION ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    ) : item.id === AgentStep.COMPANY_RESEARCH ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    ) : item.id === AgentStep.INTERVIEW_PATTERN_RESEARCH ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    ) : item.id === AgentStep.INTERVIEWER_AGENT ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    ) : item.id === AgentStep.CANDIDATE_POINTS_AGENT ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    ) : item.id === AgentStep.CANDIDATE_NARRATIVE_AGENT ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    ) : item.id === AgentStep.MEMORY_AGENT ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </span>
                  <div className="flex flex-col">
                    <span>{item.text}</span>
                    {item.description && <span className="text-xs text-muted-foreground hidden lg:inline">{item.description}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="lg:col-span-3">
          <div className="bg-background rounded-lg p-4 border border-border/50 h-full">
            <div className="flex items-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-sm font-medium text-foreground">AI Agent Thinking Process</h3>
            </div>
            
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
              {recentThoughts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p>Agents are starting to work...</p>
                </div>
              ) : (
                recentThoughts.map((thought, index) => (
                  <div key={index} className="border border-border/50 rounded-md p-3 bg-muted/30 text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-primary">{thought.agent}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(thought.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-foreground">{thought.thought}</p>
                    {thought.sourcesConsulted && thought.sourcesConsulted.length > 0 && (
                      <div className="mt-1 text-xs">
                        <span className="text-muted-foreground">Sources: </span>
                        <span className="text-muted-foreground/80">
                          {thought.sourcesConsulted.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-center text-muted-foreground text-sm">
        This process usually takes 2-3 minutes. Thank you for your patience.
      </div>
    </section>
  );
};

export default LoadingState;
