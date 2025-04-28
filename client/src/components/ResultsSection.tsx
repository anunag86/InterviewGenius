import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TabsNav, TabsList, TabButton, TabPanel } from "@/components/ui/tabs-2";
import { InterviewPrep, InterviewRound, UserResponse } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import QuestionResponseForm from "./QuestionResponseForm";
import { useUserResponses } from "@/hooks/useUserResponses";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ResultsSectionProps {
  data: InterviewPrep;
}

const ResultsSection = ({ data }: ResultsSectionProps) => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const { toast } = useToast();
  
  // Check if data structure follows the new format with interviewRounds
  const hasRoundFormat = data.interviewRounds && data.interviewRounds.length > 0;
  
  // This tracks all the rounds available for navigation tabs
  const allTabs = ["overview"];
  
  // Add round-based tabs if available
  if (hasRoundFormat) {
    data.interviewRounds.forEach(round => {
      allTabs.push(round.id);
    });
  } else {
    // Legacy format tabs
    if (data.behavioralQuestions && data.behavioralQuestions.length > 0) {
      allTabs.push("behavioral");
    }
    if (data.technicalQuestions && data.technicalQuestions.length > 0) {
      allTabs.push("technical");
    }
    if (data.roleSpecificQuestions && data.roleSpecificQuestions.length > 0) {
      allTabs.push("role-specific");
    }
  }

  // User response tracking
  const { saveResponse, isSaving, userResponses } = useUserResponses({
    interviewPrepId: data.id || ""
  });
  
  // A helper function to get the response for a specific question
  const getResponseForQuestion = (questionId: string, roundId: string): UserResponse | undefined => {
    if (!userResponses) return undefined;
    return userResponses.find((r: UserResponse) => r.questionId === questionId && r.roundId === roundId);
  };

  return (
    <section className="w-full max-w-5xl mx-auto py-8 px-4">
      <div className="mb-12">
        <Card>
          <CardContent className="p-6">
            <TabsNav defaultValue="overview">
              <TabsList className="mb-6 overflow-x-auto flex-wrap justify-start">
                {allTabs.map(tabId => {
                  let tabLabel = tabId;

                  // Special case for overview tab
                  if (tabId === "overview") {
                    tabLabel = "Overview";
                  } 
                  // For round-based tabs
                  else if (hasRoundFormat) {
                    const round = data.interviewRounds.find(r => r.id === tabId);
                    if (round) {
                      tabLabel = round.name;
                    }
                  } 
                  // Legacy format tabs
                  else {
                    if (tabId === "behavioral") tabLabel = "Behavioral";
                    if (tabId === "technical") tabLabel = "Technical";
                    if (tabId === "role-specific") tabLabel = "Role-Specific";
                  }

                  return (
                    <TabButton
                      key={tabId}
                      id={`tab-${tabId}`}
                      className={`py-2 px-4 whitespace-nowrap ${activeTab === tabId ? "bg-primary text-primary-foreground" : ""}`}
                      onClick={() => setActiveTab(tabId)}
                    >
                      {tabLabel}
                    </TabButton>
                  );
                })}
              </TabsList>

              {/* Overview Tab Panel */}
              <TabPanel
                id="panel-overview"
                hidden={activeTab !== "overview"}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Job Details</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Company</h4>
                        <p className="text-foreground">{data.jobDetails?.company}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Position</h4>
                        <p className="text-foreground">{data.jobDetails?.title}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
                        <p className="text-foreground">{data.jobDetails?.location}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Key Skills</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {data.jobDetails?.skills.map((skill, index) => (
                            <Badge key={index} variant="outline" className="bg-primary/10">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Preparation Notes</h3>
                    
                    {/* Candidate Highlights */}
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="candidate-highlights">
                        <AccordionTrigger className="text-base font-medium">
                          Your Highlight Points
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 text-sm">
                            <h4 className="font-medium text-primary">Strengths to Emphasize</h4>
                            <ul className="space-y-1 list-disc pl-5">
                              {data.candidateHighlights?.relevantPoints.map((point, index) => (
                                <li key={index}>{point}</li>
                              ))}
                            </ul>

                            {data.candidateHighlights?.keyMetrics && data.candidateHighlights.keyMetrics.length > 0 && (
                              <>
                                <h4 className="font-medium text-primary">Key Metrics & Achievements</h4>
                                <ul className="space-y-1 list-disc pl-5">
                                  {data.candidateHighlights.keyMetrics.map((metric, index) => (
                                    <li key={index}>{metric}</li>
                                  ))}
                                </ul>
                              </>
                            )}

                            {data.candidateHighlights?.directExperienceQuotes && data.candidateHighlights.directExperienceQuotes.length > 0 && (
                              <>
                                <h4 className="font-medium text-primary">Direct Experience Quotes</h4>
                                <ul className="space-y-2 list-disc pl-5">
                                  {data.candidateHighlights.directExperienceQuotes.map((item, index) => (
                                    <li key={index}>
                                      <span className="font-medium">{item.skill}:</span> {item.quote}
                                      <span className="block text-xs text-muted-foreground mt-1">{item.context}</span>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}

                            {data.candidateHighlights?.suggestedTalkingPoints && data.candidateHighlights.suggestedTalkingPoints.length > 0 && (
                              <>
                                <h4 className="font-medium text-primary">Suggested Talking Points</h4>
                                {data.candidateHighlights.suggestedTalkingPoints.map((category, categoryIndex) => (
                                  <div key={categoryIndex} className="mb-2">
                                    <h5 className="text-sm font-medium mt-2">{category.category}</h5>
                                    <ul className="space-y-1 list-disc pl-5">
                                      {category.points.map((point, pointIndex) => (
                                        <li key={pointIndex}>{point}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </>
                            )}

                            <h4 className="font-medium text-primary">Areas to Address</h4>
                            <ul className="space-y-1 list-disc pl-5">
                              {data.candidateHighlights?.gapAreas.map((gap, index) => (
                                <li key={index}>{gap}</li>
                              ))}
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Company Information */}
                      <AccordionItem value="company-info">
                        <AccordionTrigger className="text-base font-medium">
                          About {data.jobDetails?.company}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 text-sm">
                            <p>{data.companyInfo?.description}</p>

                            <h4 className="font-medium text-primary">Company Culture</h4>
                            <ul className="space-y-1 list-disc pl-5">
                              {data.companyInfo?.culture.map((item, index) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>

                            <h4 className="font-medium text-primary">Business Focus</h4>
                            <ul className="space-y-1 list-disc pl-5">
                              {data.companyInfo?.businessFocus.map((item, index) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>

                            <h4 className="font-medium text-primary">Team Information</h4>
                            <ul className="space-y-1 list-disc pl-5">
                              {data.companyInfo?.teamInfo.map((item, index) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>

                            <h4 className="font-medium text-primary">Role Details</h4>
                            <ul className="space-y-1 list-disc pl-5">
                              {data.companyInfo?.roleDetails.map((item, index) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>

                            {data.companyInfo?.usefulUrls && data.companyInfo.usefulUrls.length > 0 && (
                              <>
                                <h4 className="font-medium text-primary">Useful Links</h4>
                                <ul className="space-y-1 list-disc pl-5">
                                  {data.companyInfo.usefulUrls.map((url, index) => (
                                    <li key={index}>
                                      <a 
                                        href={url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                      >
                                        {url}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              </TabPanel>

              {/* New Format - Interview Rounds Tab Panels */}
              {hasRoundFormat && data.interviewRounds.map(round => (
                <TabPanel
                  key={round.id}
                  id={`panel-${round.id}`}
                  hidden={activeTab !== round.id}
                >
                  <div className="space-y-8">
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold text-foreground">{round.name}</h3>
                      <p className="text-muted-foreground">{round.focus}</p>
                    </div>

                    {round.questions.map(question => (
                      <div key={question.id}>
                        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm hover:shadow transition-shadow duration-200 mb-4">
                          <div className="p-4 bg-muted/50 border-b border-border">
                            <h3 className="text-lg font-medium text-foreground">{question.question}</h3>
                          </div>
                          <div className="p-4">
                            <h4 className="text-sm font-medium text-primary/80 uppercase tracking-wider mb-3">Talking Points</h4>
                            <ul className="space-y-2 text-foreground">
                              {question.talkingPoints.map((point) => (
                                <li key={point.id} className="talking-point-bullet">
                                  {point.text}
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
                              <ul className="space-y-2 text-foreground">
                                {question.talkingPoints.map((point) => (
                                  <li key={point.id} className="talking-point-bullet">
                                    {point.text}
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
                              <ul className="space-y-2 text-foreground">
                                {question.talkingPoints.map((point) => (
                                  <li key={point.id} className="talking-point-bullet">
                                    {point.text}
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
                              <ul className="space-y-2 text-foreground">
                                {question.talkingPoints.map((point) => (
                                  <li key={point.id} className="talking-point-bullet">
                                    {point.text}
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
            </TabsNav>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ResultsSection;