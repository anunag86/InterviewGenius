import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TabsNav, TabsList, TabButton, TabPanel } from "@/components/ui/tabs-2";
import { InterviewPrep, InterviewRound, UserResponse } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import QuestionResponseForm from "./QuestionResponseForm";
import { useUserResponses } from "@/hooks/useUserResponses";
import { Badge } from "@/components/ui/badge";

interface ResultsSectionProps {
  data: InterviewPrep;
}

const ResultsSection = ({ data }: ResultsSectionProps) => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Check if data structure follows the new format with interviewRounds
  const hasRoundFormat = data.interviewRounds && data.interviewRounds.length > 0;
  
  // This tracks all the rounds available for navigation tabs
  const rounds = hasRoundFormat ? data.interviewRounds : [];
  
  // Get user responses from the hook
  const { 
    userResponses,
    getResponseForQuestion, 
    saveResponse,
    isLoading: isLoadingResponses,
    isSaving
  } = useUserResponses({ interviewPrepId: data.id || "" });

  return (
    <section>
      <div className="bg-card rounded-xl shadow-sm overflow-hidden mb-12 border border-border">
        {/* Job Information Summary */}
        <div className="bg-muted/50 p-6 border-b border-border">
          <div className="mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">Your Interview Preparation</h2>
            <p className="text-muted-foreground">
              Here's your comprehensive interview preparation with company insights, candidate highlights, and tailored questions.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg p-4 shadow-sm border border-border/50">
              <h3 className="text-lg font-medium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">Job Details</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="h-5 w-5 flex-shrink-0 text-primary mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </span>
                  <span className="text-foreground">{data.jobDetails.company}</span>
                </div>
                <div className="flex items-start">
                  <span className="h-5 w-5 flex-shrink-0 text-primary mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <span className="text-foreground">{data.jobDetails.title}</span>
                </div>
                <div className="flex items-start">
                  <span className="h-5 w-5 flex-shrink-0 text-primary mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <span className="text-foreground">{data.jobDetails.location}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-lg p-4 shadow-sm border border-border/50">
              <h3 className="text-lg font-medium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">Key Skills Required</h3>
              <div className="flex flex-wrap gap-2">
                {data.jobDetails.skills.map((skill, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary transition-colors duration-200 hover:bg-primary/20"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs and Panels */}
        <div className="p-6">
          {/* Tabs Navigation */}
          <TabsNav className="mb-6">
            <TabsList id="result-tabs" className="bg-muted p-1 rounded-lg flex flex-wrap justify-start gap-1">
              <TabButton
                id="tab-overview"
                active={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                  activeTab === "overview" 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "hover:bg-muted-foreground/10"
                }`}
              >
                Overview
              </TabButton>
              
              {/* Generate tabs for each interview round */}
              {hasRoundFormat && rounds.map((round) => (
                <TabButton
                  key={round.id}
                  id={`tab-${round.id}`}
                  active={activeTab === round.id}
                  onClick={() => setActiveTab(round.id)}
                  className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                    activeTab === round.id 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "hover:bg-muted-foreground/10"
                  }`}
                >
                  {round.name}
                </TabButton>
              ))}
              
              {/* Legacy tabs for old data format */}
              {!hasRoundFormat && (
                <>
                  <TabButton
                    id="tab-behavioral"
                    active={activeTab === "behavioral"}
                    onClick={() => setActiveTab("behavioral")}
                    className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                      activeTab === "behavioral" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-muted-foreground/10"
                    }`}
                  >
                    Behavioral
                  </TabButton>
                  <TabButton
                    id="tab-technical"
                    active={activeTab === "technical"}
                    onClick={() => setActiveTab("technical")}
                    className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                      activeTab === "technical" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-muted-foreground/10"
                    }`}
                  >
                    Technical
                  </TabButton>
                  <TabButton
                    id="tab-role-specific"
                    active={activeTab === "role-specific"}
                    onClick={() => setActiveTab("role-specific")}
                    className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                      activeTab === "role-specific" 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-muted-foreground/10"
                    }`}
                  >
                    Role-Specific
                  </TabButton>
                </>
              )}
            </TabsList>
          </TabsNav>

          {/* Overview Tab Panel */}
          <TabPanel
            id="panel-overview"
            hidden={activeTab !== "overview"}
          >
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Company Information */}
              <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
                <div className="p-4 bg-muted/50 border-b border-border">
                  <h3 className="text-lg font-medium text-foreground">Company Insights</h3>
                </div>
                <div className="p-4">
                  {data.companyInfo && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="description">
                        <AccordionTrigger className="text-md font-medium">About the Company</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground">{data.companyInfo.description}</p>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="culture">
                        <AccordionTrigger className="text-md font-medium">Company Culture</AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-2 list-disc pl-5">
                            {data.companyInfo.culture.map((item, i) => (
                              <li key={i} className="text-foreground">{item}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="business">
                        <AccordionTrigger className="text-md font-medium">Business Focus</AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-2 list-disc pl-5">
                            {data.companyInfo.businessFocus.map((item, i) => (
                              <li key={i} className="text-foreground">{item}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              </div>
              
              {/* Candidate Highlights */}
              <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
                <div className="p-4 bg-muted/50 border-b border-border">
                  <h3 className="text-lg font-medium text-foreground">Your Profile Highlights</h3>
                </div>
                <div className="p-4">
                  {data.candidateHighlights && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="strengths">
                        <AccordionTrigger className="text-md font-medium text-green-600">Relevant Strengths</AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-2 list-disc pl-5">
                            {data.candidateHighlights.relevantPoints.map((point, i) => (
                              <li key={i} className="text-foreground">{point}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="gaps">
                        <AccordionTrigger className="text-md font-medium text-amber-600">Areas to Address</AccordionTrigger>
                        <AccordionContent>
                          <ul className="space-y-2 list-disc pl-5">
                            {data.candidateHighlights.gapAreas.map((gap, i) => (
                              <li key={i} className="text-foreground">{gap}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              </div>
            </div>
            
            {/* Role Details */}
            <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm mb-6">
              <div className="p-4 bg-muted/50 border-b border-border">
                <h3 className="text-lg font-medium text-foreground">Role Details</h3>
              </div>
              <div className="p-4">
                {data.companyInfo && data.companyInfo.roleDetails && (
                  <ul className="space-y-2 list-disc pl-5">
                    {data.companyInfo.roleDetails.map((detail, i) => (
                      <li key={i} className="text-foreground">{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            
            {/* Team Information */}
            <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
              <div className="p-4 bg-muted/50 border-b border-border">
                <h3 className="text-lg font-medium text-foreground">Team Information</h3>
              </div>
              <div className="p-4">
                {data.companyInfo && data.companyInfo.teamInfo && (
                  <ul className="space-y-2 list-disc pl-5">
                    {data.companyInfo.teamInfo.map((info, i) => (
                      <li key={i} className="text-foreground">{info}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </TabPanel>

          {/* Interview Rounds Tab Panels - New Format */}
          {hasRoundFormat && rounds.map((round) => (
            <TabPanel
              key={round.id}
              id={`panel-${round.id}`}
              hidden={activeTab !== round.id}
            >
              <div className="bg-muted/30 rounded-lg p-4 mb-6 border border-border/30">
                <h3 className="text-lg font-medium text-foreground mb-2">{round.name}</h3>
                <p className="text-muted-foreground mb-1">Focus: {round.focus}</p>
              </div>
              
              <div className="space-y-8">
                {round.questions.map((question) => (
                  <div key={question.id}>
                    <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow transition-shadow duration-200 mb-4">
                      <div className="p-4 bg-muted/50 border-b border-border">
                        <h3 className="text-lg font-medium text-foreground">{question.question}</h3>
                      </div>
                      <div className="p-4">
                        <h4 className="text-sm font-medium text-primary/80 uppercase tracking-wider mb-3">Talking Points</h4>
                        <ul className="space-y-3 text-foreground">
                          {question.talkingPoints.map((point) => (
                            <li key={point.id} className="flex items-start">
                              <span className="h-5 w-5 text-primary mr-2 flex-shrink-0">
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
                    
                    {/* Response Form */}
                    {data.id && (
                      <div className="mb-8">
                        <h4 className="text-sm font-medium text-primary/80 uppercase tracking-wider mb-3 flex items-center">
                          <span>Your Response</span>
                          {getResponseForQuestion(question.id, round.id) && (
                            <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-200">
                              Saved
                            </Badge>
                          )}
                        </h4>
                        <QuestionResponseForm
                          interviewPrepId={data.id}
                          questionId={question.id}
                          roundId={round.id}
                          question={question.question}
                          existingResponse={getResponseForQuestion(question.id, round.id)}
                          onSave={saveResponse}
                          isSaving={isSaving}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabPanel>
          ))}

          {/* Legacy Tab Panels - Old Format */}
          {!hasRoundFormat && (
            <>
              {/* Behavioral Questions Tab Panel */}
              <TabPanel
                id="panel-behavioral"
                hidden={activeTab !== "behavioral"}
              >
                <div className="space-y-8">
                  {data.behavioralQuestions?.map((question) => (
                    <div key={question.id}>
                      <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow transition-shadow duration-200 mb-4">
                        <div className="p-4 bg-muted/50 border-b border-border">
                          <h3 className="text-lg font-medium text-foreground">{question.question}</h3>
                        </div>
                        <div className="p-4">
                          <h4 className="text-sm font-medium text-primary/80 uppercase tracking-wider mb-3">Talking Points</h4>
                          <ul className="space-y-3 text-foreground">
                            {question.talkingPoints.map((point) => (
                              <li key={point.id} className="flex items-start">
                                <span className="h-5 w-5 text-primary mr-2 flex-shrink-0">
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

                      {/* Response Form for behavioral questions */}
                      {data.id && (
                        <div className="mb-8">
                          <h4 className="text-sm font-medium text-primary/80 uppercase tracking-wider mb-3 flex items-center">
                            <span>Your Response</span>
                            {getResponseForQuestion(question.id, "behavioral") && (
                              <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-200">
                                Saved
                              </Badge>
                            )}
                          </h4>
                          <QuestionResponseForm
                            interviewPrepId={data.id}
                            questionId={question.id}
                            roundId="behavioral"
                            question={question.question}
                            existingResponse={getResponseForQuestion(question.id, "behavioral")}
                            onSave={saveResponse}
                            isSaving={isSaving}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabPanel>

              {/* Technical Questions Tab Panel */}
              <TabPanel
                id="panel-technical"
                hidden={activeTab !== "technical"}
              >
                <div className="space-y-8">
                  {data.technicalQuestions?.map((question) => (
                    <div key={question.id}>
                      <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow transition-shadow duration-200 mb-4">
                        <div className="p-4 bg-muted/50 border-b border-border">
                          <h3 className="text-lg font-medium text-foreground">{question.question}</h3>
                        </div>
                        <div className="p-4">
                          <h4 className="text-sm font-medium text-primary/80 uppercase tracking-wider mb-3">Talking Points</h4>
                          <ul className="space-y-3 text-foreground">
                            {question.talkingPoints.map((point) => (
                              <li key={point.id} className="flex items-start">
                                <span className="h-5 w-5 text-primary mr-2 flex-shrink-0">
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
                      
                      {/* Response Form for technical questions */}
                      {data.id && (
                        <div className="mb-8">
                          <h4 className="text-sm font-medium text-primary/80 uppercase tracking-wider mb-3 flex items-center">
                            <span>Your Response</span>
                            {getResponseForQuestion(question.id, "technical") && (
                              <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-200">
                                Saved
                              </Badge>
                            )}
                          </h4>
                          <QuestionResponseForm
                            interviewPrepId={data.id}
                            questionId={question.id}
                            roundId="technical"
                            question={question.question}
                            existingResponse={getResponseForQuestion(question.id, "technical")}
                            onSave={saveResponse}
                            isSaving={isSaving}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabPanel>

              {/* Role-Specific Questions Tab Panel */}
              <TabPanel
                id="panel-role-specific"
                hidden={activeTab !== "role-specific"}
              >
                <div className="space-y-8">
                  {data.roleSpecificQuestions?.map((question) => (
                    <div key={question.id}>
                      <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow transition-shadow duration-200 mb-4">
                        <div className="p-4 bg-muted/50 border-b border-border">
                          <h3 className="text-lg font-medium text-foreground">{question.question}</h3>
                        </div>
                        <div className="p-4">
                          <h4 className="text-sm font-medium text-primary/80 uppercase tracking-wider mb-3">Talking Points</h4>
                          <ul className="space-y-3 text-foreground">
                            {question.talkingPoints.map((point) => (
                              <li key={point.id} className="flex items-start">
                                <span className="h-5 w-5 text-primary mr-2 flex-shrink-0">
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
                      
                      {/* Response Form for role-specific questions */}
                      {data.id && (
                        <div className="mb-8">
                          <h4 className="text-sm font-medium text-primary/80 uppercase tracking-wider mb-3 flex items-center">
                            <span>Your Response</span>
                            {getResponseForQuestion(question.id, "role-specific") && (
                              <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-200">
                                Saved
                              </Badge>
                            )}
                          </h4>
                          <QuestionResponseForm
                            interviewPrepId={data.id}
                            questionId={question.id}
                            roundId="role-specific"
                            question={question.question}
                            existingResponse={getResponseForQuestion(question.id, "role-specific")}
                            onSave={saveResponse}
                            isSaving={isSaving}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabPanel>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default ResultsSection;
