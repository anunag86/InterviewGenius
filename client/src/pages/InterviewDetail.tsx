import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import type { InterviewPrep } from "../../shared/schema";

interface InterviewDetailProps {
  id: string;
}

enum LoadingState {
  LOADING,
  ERROR,
  COMPLETE,
  NOT_FOUND,
}

const InterviewDetail = ({ id }: InterviewDetailProps) => {
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrep | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.LOADING);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const fetchInterviewPrep = async () => {
      try {
        // First check the status to see if it's ready
        const statusResponse = await fetch(`/api/interview/status/${id}`);
        
        if (!statusResponse.ok) {
          if (statusResponse.status === 404) {
            setLoadingState(LoadingState.NOT_FOUND);
          } else {
            setLoadingState(LoadingState.ERROR);
          }
          return;
        }
        
        const statusData = await statusResponse.json();
        
        if (statusData.status === "complete") {
          // Interview prep is ready, fetch the complete data
          setInterviewPrep(statusData.data);
          setLoadingState(LoadingState.COMPLETE);
        } else if (statusData.status === "processing") {
          // Interview is still being generated, show loading state with progress
          setLoadingState(LoadingState.LOADING);
          
          // Poll again in a few seconds
          setTimeout(() => {
            fetchInterviewPrep();
          }, 3000);
        } else {
          // Error state
          setLoadingState(LoadingState.ERROR);
        }
      } catch (error) {
        console.error("Error fetching interview prep:", error);
        setLoadingState(LoadingState.ERROR);
      }
    };

    fetchInterviewPrep();
  }, [id]);

  const renderContent = () => {
    switch (loadingState) {
      case LoadingState.LOADING:
        return (
          <Card className="w-full max-w-3xl mx-auto">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Generating Your Interview Preparation</h3>
                <p className="text-gray-600 text-center max-w-md">
                  Our AI is analyzing the job posting and your profile to create personalized interview materials.
                  This may take a few minutes.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      
      case LoadingState.ERROR:
        return (
          <Card className="w-full max-w-3xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <h3 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h3>
                <p className="text-gray-600 mb-6">
                  We couldn't generate your interview preparation. Please try again.
                </p>
                <Button onClick={() => setLocation("/")}>
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      
      case LoadingState.NOT_FOUND:
        return (
          <Card className="w-full max-w-3xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <h3 className="text-xl font-semibold mb-2">Interview Preparation Not Found</h3>
                <p className="text-gray-600 mb-6">
                  The interview preparation you're looking for doesn't exist or has expired.
                </p>
                <Button onClick={() => setLocation("/")}>
                  Create New Preparation
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      
      case LoadingState.COMPLETE:
        if (!interviewPrep) return null;
        
        return (
          <div className="space-y-8 w-full max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">
                  {interviewPrep.jobTitle} at {interviewPrep.company}
                </CardTitle>
                <CardDescription>
                  Personalized interview preparation based on the job posting and your profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Job Overview</h3>
                    <p className="text-gray-700">
                      {interviewPrep.data?.jobDetails?.title} at {interviewPrep.data?.jobDetails?.company}
                      {interviewPrep.data?.jobDetails?.location ? ` - ${interviewPrep.data.jobDetails.location}` : ''}
                    </p>
                    
                    {interviewPrep.data?.jobDetails?.skills && (
                      <div className="mt-2">
                        <h4 className="text-sm font-medium mb-1">Key Skills Required:</h4>
                        <div className="flex flex-wrap gap-2">
                          {interviewPrep.data.jobDetails.skills.map((skill, index) => (
                            <span 
                              key={index}
                              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Tabs defaultValue="rounds" className="w-full">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="rounds">Interview Rounds</TabsTrigger>
                <TabsTrigger value="company">Company Info</TabsTrigger>
                <TabsTrigger value="highlights">Your Highlights</TabsTrigger>
                <TabsTrigger value="responses">Your Responses</TabsTrigger>
              </TabsList>
              
              <TabsContent value="rounds" className="space-y-4">
                {interviewPrep.data?.interviewRounds?.map((round) => (
                  <Card key={round.id}>
                    <CardHeader>
                      <CardTitle>{round.name}</CardTitle>
                      <CardDescription>{round.focus}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {round.questions.map((question) => (
                        <div key={question.id} className="border rounded-lg p-4">
                          <h4 className="text-lg font-semibold mb-2">{question.question}</h4>
                          
                          <h5 className="text-sm font-medium text-blue-700 mb-1 mt-3">Talking Points:</h5>
                          <ul className="list-disc pl-5 space-y-1">
                            {question.talkingPoints.map((point) => (
                              <li key={point.id} className="text-gray-700">{point.text}</li>
                            ))}
                          </ul>
                          
                          <div className="mt-4">
                            <Button
                              onClick={() => setLocation(`/interview/${id}/question/${question.id}`)}
                              variant="outline"
                              size="sm"
                            >
                              Practice This Question
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="company">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                    <CardDescription>
                      Key details about {interviewPrep.company} that will help you during the interview
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Company Description</h3>
                      <p className="text-gray-700">{interviewPrep.data?.companyInfo?.description}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Company Culture</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {interviewPrep.data?.companyInfo?.culture?.map((item, index) => (
                          <li key={index} className="text-gray-700">{item}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Business Focus</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {interviewPrep.data?.companyInfo?.businessFocus?.map((item, index) => (
                          <li key={index} className="text-gray-700">{item}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Team Information</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {interviewPrep.data?.companyInfo?.teamInfo?.map((item, index) => (
                          <li key={index} className="text-gray-700">{item}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Role Details</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {interviewPrep.data?.companyInfo?.roleDetails?.map((item, index) => (
                          <li key={index} className="text-gray-700">{item}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="highlights">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Profile Highlights</CardTitle>
                    <CardDescription>
                      Key strengths and areas for improvement based on your resume and LinkedIn profile
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-green-700">Relevant Experience Points</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {interviewPrep.data?.candidateHighlights?.relevantPoints?.map((point, index) => (
                          <li key={index} className="text-gray-700">{point}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2 text-amber-700">Areas to Address</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {interviewPrep.data?.candidateHighlights?.gapAreas?.map((area, index) => (
                          <li key={index} className="text-gray-700">{area}</li>
                        ))}
                      </ul>
                    </div>
                    
                    {interviewPrep.data?.candidateHighlights?.directExperienceQuotes && (
                      <>
                        <Separator />
                        
                        <div>
                          <h3 className="text-lg font-semibold mb-2 text-blue-700">Key Experience Quotes</h3>
                          
                          {interviewPrep.data.candidateHighlights.directExperienceQuotes.map((quote, index) => (
                            <div key={index} className="mb-4 bg-blue-50 p-3 rounded-lg">
                              <h4 className="font-medium text-blue-800">{quote.skill}</h4>
                              <blockquote className="text-gray-700 border-l-2 border-blue-300 pl-3 mt-1 italic">
                                "{quote.quote}"
                              </blockquote>
                              <p className="text-sm text-gray-600 mt-1">{quote.context}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    
                    {interviewPrep.data?.candidateHighlights?.suggestedTalkingPoints && (
                      <>
                        <Separator />
                        
                        <div>
                          <h3 className="text-lg font-semibold mb-2 text-purple-700">Suggested Talking Points</h3>
                          
                          {interviewPrep.data.candidateHighlights.suggestedTalkingPoints.map((category, index) => (
                            <div key={index} className="mb-4">
                              <h4 className="font-medium text-purple-800">{category.category}</h4>
                              <ul className="list-disc pl-5 space-y-1 mt-1">
                                {category.points.map((point, pointIndex) => (
                                  <li key={pointIndex} className="text-gray-700">{point}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="responses">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Saved Responses</CardTitle>
                    <CardDescription>
                      Responses you've saved for interview questions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <h3 className="text-lg font-semibold mb-2">No Responses Yet</h3>
                      <p className="text-gray-600 mb-6">
                        Practice answering interview questions to save and review your responses.
                      </p>
                      <Button
                        onClick={() => setLocation(`/interview/${id}`)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        Start Practicing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {renderContent()}
      </main>
      
      <Footer />
    </div>
  );
};

export default InterviewDetail;