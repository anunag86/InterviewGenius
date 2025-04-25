import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TabsNav, TabsList, TabButton, TabPanel } from "@/components/ui/tabs-2";
import { InterviewPrep, QuestionType } from "@/types";

interface ResultsSectionProps {
  data: InterviewPrep;
}

const ResultsSection = ({ data }: ResultsSectionProps) => {
  const [activeTab, setActiveTab] = useState<QuestionType>(QuestionType.BEHAVIORAL);

  return (
    <section>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-12">
        {/* Job Information Summary */}
        <div className="bg-indigo-50 p-6 border-b border-indigo-100">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Interview Preparation</h2>
            <p className="text-gray-600">
              Here are your tailored interview questions and talking points based on the job requirements and your experience.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Job Details</h3>
              <div className="space-y-2">
                <div className="flex items-start">
                  <span className="h-5 w-5 flex-shrink-0 text-indigo-500 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </span>
                  <span>{data.jobDetails.company}</span>
                </div>
                <div className="flex items-start">
                  <span className="h-5 w-5 flex-shrink-0 text-indigo-500 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <span>{data.jobDetails.title}</span>
                </div>
                <div className="flex items-start">
                  <span className="h-5 w-5 flex-shrink-0 text-indigo-500 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <span>{data.jobDetails.location}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Key Skills Required</h3>
              <div className="flex flex-wrap gap-2">
                {data.jobDetails.skills.map((skill, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Questions and Talking Points */}
        <div className="p-6">
          {/* Question Categories Navigation */}
          <TabsNav>
            <TabsList id="question-tabs">
              <TabButton
                id="tab-behavioral"
                active={activeTab === QuestionType.BEHAVIORAL}
                onClick={() => setActiveTab(QuestionType.BEHAVIORAL)}
              >
                Behavioral Questions
              </TabButton>
              <TabButton
                id="tab-technical"
                active={activeTab === QuestionType.TECHNICAL}
                onClick={() => setActiveTab(QuestionType.TECHNICAL)}
              >
                Technical Questions
              </TabButton>
              <TabButton
                id="tab-role-specific"
                active={activeTab === QuestionType.ROLE_SPECIFIC}
                onClick={() => setActiveTab(QuestionType.ROLE_SPECIFIC)}
              >
                Role-Specific Questions
              </TabButton>
            </TabsList>
          </TabsNav>

          {/* Behavioral Questions Tab Panel */}
          <TabPanel
            id="panel-behavioral"
            hidden={activeTab !== QuestionType.BEHAVIORAL}
          >
            <div className="space-y-8">
              {data.behavioralQuestions.map((question) => (
                <div key={question.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">{question.question}</h3>
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Talking Points</h4>
                    <ul className="space-y-3 text-gray-700">
                      {question.talkingPoints.map((point) => (
                        <li key={point.id} className="flex items-start">
                          <span className="h-5 w-5 text-indigo-500 mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                          <span>{point.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </TabPanel>

          {/* Technical Questions Tab Panel */}
          <TabPanel
            id="panel-technical"
            hidden={activeTab !== QuestionType.TECHNICAL}
          >
            <div className="space-y-8">
              {data.technicalQuestions.map((question) => (
                <div key={question.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">{question.question}</h3>
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Talking Points</h4>
                    <ul className="space-y-3 text-gray-700">
                      {question.talkingPoints.map((point) => (
                        <li key={point.id} className="flex items-start">
                          <span className="h-5 w-5 text-indigo-500 mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                          <span>{point.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </TabPanel>

          {/* Role-Specific Questions Tab Panel */}
          <TabPanel
            id="panel-role-specific"
            hidden={activeTab !== QuestionType.ROLE_SPECIFIC}
          >
            <div className="space-y-8">
              {data.roleSpecificQuestions.map((question) => (
                <div key={question.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">{question.question}</h3>
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Talking Points</h4>
                    <ul className="space-y-3 text-gray-700">
                      {question.talkingPoints.map((point) => (
                        <li key={point.id} className="flex items-start">
                          <span className="h-5 w-5 text-indigo-500 mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </span>
                          <span>{point.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </TabPanel>
        </div>
      </div>
    </section>
  );
};

export default ResultsSection;
