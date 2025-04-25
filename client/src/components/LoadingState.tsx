import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AgentStep } from "@/types";

interface ProgressItem {
  id: AgentStep;
  icon: string;
  text: string;
}

interface LoadingStateProps {
  currentStep: AgentStep;
}

const LoadingState = ({ currentStep }: LoadingStateProps) => {
  const progressItems: ProgressItem[] = [
    { 
      id: AgentStep.JOB_RESEARCH, 
      icon: "search", 
      text: "Researching job requirements..." 
    },
    { 
      id: AgentStep.PROFILE_ANALYSIS, 
      icon: "user", 
      text: "Analyzing your resume..." 
    },
    { 
      id: AgentStep.QUESTION_GENERATION, 
      icon: "clipboard-list", 
      text: "Creating personalized interview questions..." 
    },
    { 
      id: AgentStep.QUALITY_CHECK, 
      icon: "check-double", 
      text: "Quality checking results..." 
    },
  ];

  return (
    <section className="mb-12 bg-white rounded-xl shadow-sm p-8 text-center">
      <div className="max-w-md mx-auto">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-medium text-gray-900 mb-2">Preparing your interview questions</h2>
        <p className="text-gray-600">Our AI agents are analyzing the job posting and your qualifications...</p>
        
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <ul className="space-y-3" id="progress-list">
            {progressItems.map((item) => (
              <li 
                key={item.id}
                className={`flex items-center text-sm ${
                  item.id <= currentStep 
                    ? "text-indigo-600" 
                    : "text-gray-500"
                }`}
              >
                <span 
                  className={`h-6 w-6 flex items-center justify-center rounded-full mr-3 ${
                    item.id <= currentStep 
                      ? "bg-indigo-100 text-indigo-800" 
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {item.id < currentStep ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : item.icon === "search" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  ) : item.icon === "user" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : item.icon === "clipboard-list" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default LoadingState;
