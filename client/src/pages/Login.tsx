import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { FaLinkedin } from "react-icons/fa";
import Header from "../components/Header";
import Footer from "../components/Footer";

interface LinkedInDiagnosticData {
  clientIdStatus: string;
  clientIdLength: number;
  clientIdPartial: string;
  clientSecretStatus: string;
  clientSecretLength: number;
  strategyConfigured: boolean;
  callbackConfigured: boolean;
  callbackURL: string;
  expectedCallbackURL: string;
  detectedHost: string;
  linkedInTest?: {
    urlTested: string;
    credentialsValid: boolean;
    statusCode: number;
    authUrlFormat: string;
  };
}

const Login = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<LinkedInDiagnosticData | null>(null);
  const [isDiagnosticLoading, setIsDiagnosticLoading] = useState(false);
  
  // Parse URL parameters to check for error messages
  const getErrorMessage = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const messageParam = urlParams.get('message');
    const descriptionParam = urlParams.get('description');
    
    if (errorParam === 'missing_credentials') {
      return 'LinkedIn API credentials are missing. Please contact support.';
    } else if (errorParam === 'auth_error') {
      return `Authentication error: ${messageParam || 'Unknown error. Please try again.'}`;
    } else if (errorParam === 'auth_failed') {
      return `LinkedIn authentication failed: ${messageParam || 'Please try again.'}`;
    } else if (errorParam === 'login_error') {
      return `Error during login process: ${messageParam || 'Please try again.'}`;
    } else if (errorParam === 'linkedin_error') {
      // Check for scope errors specifically
      if (descriptionParam && descriptionParam.includes('r_emailaddress') && descriptionParam.includes('not authorized')) {
        return `LinkedIn scope error: The "r_emailaddress" scope is not authorized for this application. We've updated our system to only use the "r_liteprofile" scope. Please try signing in again.`;
      }
      // Default message for other LinkedIn errors
      return `LinkedIn rejected the request: ${descriptionParam || 'Please ensure the callback URL is registered in LinkedIn.'}`;
    } else if (errorParam === 'missing_code') {
      return 'LinkedIn did not provide an authorization code. Please try again.';
    }
    
    return null;
  };

  // Check authentication status when component mounts
  useEffect(() => {
    // Check URL params for potential error messages from LinkedIn auth
    const urlErrorMessage = getErrorMessage();
    if (urlErrorMessage) {
      setError(urlErrorMessage);
    }
    
    // Fetch both authentication status and callback URL in parallel
    const fetchData = async () => {
      try {
        // Fetch authentication status
        const authPromise = fetch('/api/me');
        
        // Fetch the callback URL from the server
        const callbackPromise = fetch('/api/linkedin-callback-url');
        
        // Wait for both to complete
        const [authResponse, callbackResponse] = await Promise.all([authPromise, callbackPromise]);
        
        // Handle auth check
        if (authResponse.ok) {
          const authData = await authResponse.json();
          console.log('Authentication check result:', authData);
          
          if (authData.isAuthenticated) {
            console.log('User is authenticated, redirecting to home...');
            window.location.href = '/';
            return; // Exit early
          }
        } else {
          console.error(`Auth API returned ${authResponse.status}: ${authResponse.statusText}`);
        }
        
        // Handle callback URL
        if (callbackResponse.ok) {
          const callbackData = await callbackResponse.json();
          console.log('Callback URL retrieved:', callbackData.callbackURL);
          setCallbackUrl(callbackData.callbackURL);
        } else {
          console.error(`Callback API returned ${callbackResponse.status}: ${callbackResponse.statusText}`);
        }
      } catch (err) {
        console.error('Data fetching error:', err);
        if (!urlErrorMessage) {
          setError('Failed to initialize application. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLinkedInLogin = () => {
    window.location.href = '/auth/linkedin';
  };
  
  const runLinkedInDiagnostic = async () => {
    setIsDiagnosticLoading(true);
    try {
      const response = await fetch('/api/linkedin-diagnostic');
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.data) {
          setDiagnosticData(result.data);
        } else {
          console.error('LinkedIn diagnostic returned error:', result);
          setError('Failed to run LinkedIn diagnostic. Please try again.');
        }
      } else {
        console.error(`Diagnostic API returned ${response.status}: ${response.statusText}`);
        setError('Failed to access LinkedIn diagnostic endpoint. Please try again.');
      }
    } catch (err) {
      console.error('LinkedIn diagnostic error:', err);
      setError('Error connecting to diagnostic service. Please try again.');
    } finally {
      setIsDiagnosticLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md text-center p-8">
            <p className="text-primary">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
              PrepTalk
            </h1>
            <p className="text-xl text-muted-foreground">Your AI Interview Coach</p>
          </div>

          <Card className="shadow-lg border-primary/20">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Welcome</CardTitle>
              <CardDescription className="text-center">
                Sign in to prepare for your next interview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Our mission is to help you crystallize your personal experiences into strong, authentic answers — not to hand you shortcuts or generic response guides.
                </p>
              </div>
              
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}
              
              <div className="p-3 rounded-md bg-amber-100 border border-amber-200 text-amber-700 text-sm">
                <p className="font-medium">Important LinkedIn Developer Configuration:</p>
                <ul className="mt-2 space-y-2">
                  <li>
                    <p className="font-medium">1. Make sure the following callback URL is registered in your LinkedIn Developer Portal:</p>
                    <code className="mt-1 block p-2 bg-amber-50 rounded border border-amber-200 text-xs overflow-auto">
                      {callbackUrl || `${window.location.protocol}//${window.location.host}/auth/linkedin/callback`}
                    </code>
                    
                    {callbackUrl && (
                      <div className="mt-1 flex items-center">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 20 20" 
                          fill="currentColor" 
                          className="w-4 h-4 mr-1 text-amber-600"
                        >
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs">This is the exact URL detected by our server.</span>
                      </div>
                    )}
                  </li>
                  
                  <li>
                    <p className="font-medium">2. Configure the correct OAuth 2.0 scopes:</p>
                    <p className="mt-1">Our application now only requires the <code className="bg-amber-50 px-1 rounded">r_liteprofile</code> scope.</p>
                    <p className="text-xs mt-1">The <code className="bg-amber-50 px-1 rounded">r_emailaddress</code> scope is not required and will cause authentication errors if enabled without special LinkedIn verification.</p>
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-[#0077B5] hover:bg-[#0077B5]/90"
                onClick={handleLinkedInLogin}
              >
                <FaLinkedin className="mr-2 h-5 w-5" />
                Sign in with LinkedIn
              </Button>
            </CardFooter>
          </Card>

          <div className="mt-8 space-y-6">
            <div className="space-y-4">
              <div className="bg-white/10 border border-primary/10 rounded-lg p-6 shadow-sm">
                <h3 className="font-medium text-lg mb-2">Why PrepTalk?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>Personalized interview preparation based on your resume and the job you're applying for</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>AI-generated questions specific to the role and company</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>Real-time feedback on your answers using the Situation-Action-Result format</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>Highlights relevant experience from your profile to strengthen your answers</span>
                  </li>
                </ul>
              </div>
              
              {/* LinkedIn Diagnostic Tool */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="linkedin-diagnostics">
                  <AccordionTrigger className="text-sm font-medium">
                    <div className="flex items-center">
                      <span>LinkedIn Authentication Diagnostics</span>
                      {isDiagnosticLoading && (
                        <div className="ml-2 h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 text-sm">
                      <p>Use this tool to diagnose LinkedIn authentication issues.</p>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={runLinkedInDiagnostic}
                        disabled={isDiagnosticLoading}
                      >
                        {isDiagnosticLoading ? 'Running Diagnostic...' : 'Run Diagnostic'}
                      </Button>
                      
                      {/* Diagnostic Results */}
                      {diagnosticData && (
                        <div className="mt-4 space-y-3 border border-border rounded-md p-3 text-xs">
                          <div>
                            <h4 className="font-medium mb-1">Credentials</h4>
                            <div className="grid grid-cols-2 gap-1">
                              <div>Client ID:</div>
                              <div>
                                <Badge variant={diagnosticData.clientIdStatus === 'present' ? 'default' : 'destructive'}>
                                  {diagnosticData.clientIdStatus === 'present' ? 'Present' : 'Missing'}
                                </Badge>
                                {diagnosticData.clientIdStatus === 'present' && (
                                  <span className="ml-2 text-muted-foreground">
                                    Length: {diagnosticData.clientIdLength}
                                  </span>
                                )}
                              </div>
                              
                              <div>Client Secret:</div>
                              <div>
                                <Badge variant={diagnosticData.clientSecretStatus === 'present' ? 'default' : 'destructive'}>
                                  {diagnosticData.clientSecretStatus === 'present' ? 'Present' : 'Missing'}
                                </Badge>
                                {diagnosticData.clientSecretStatus === 'present' && (
                                  <span className="ml-2 text-muted-foreground">
                                    Length: {diagnosticData.clientSecretLength}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-1">Callback URL</h4>
                            <div className="grid grid-cols-1 gap-1">
                              <div>
                                <span className="font-medium">Expected: </span>
                                <code className="bg-muted p-1 rounded text-[10px] break-all">{diagnosticData.expectedCallbackURL}</code>
                              </div>
                              <div>
                                <span className="font-medium">Configured: </span>
                                <code className="bg-muted p-1 rounded text-[10px] break-all">{diagnosticData.callbackURL}</code>
                              </div>
                              <div>
                                <span className="font-medium">Detected Host: </span>
                                <code className="bg-muted p-1 rounded text-[10px]">{diagnosticData.detectedHost}</code>
                              </div>
                            </div>
                          </div>
                          
                          {diagnosticData.linkedInTest && (
                            <div>
                              <h4 className="font-medium mb-1">LinkedIn API Test</h4>
                              <div className="grid grid-cols-2 gap-1">
                                <div>Credentials Valid:</div>
                                <div>
                                  <Badge variant={diagnosticData.linkedInTest.credentialsValid ? 'default' : 'destructive'}>
                                    {diagnosticData.linkedInTest.credentialsValid ? 'Yes' : 'No'}
                                  </Badge>
                                </div>
                                
                                <div>Status Code:</div>
                                <div>{diagnosticData.linkedInTest.statusCode}</div>
                                
                                <div>Auth URL:</div>
                                <div className="text-[10px] break-all">
                                  {diagnosticData.linkedInTest.authUrlFormat}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <Alert className="mt-2">
                            <AlertTitle>Potential Issues</AlertTitle>
                            <AlertDescription className="text-[10px] space-y-1">
                              {!diagnosticData.strategyConfigured && (
                                <p>- LinkedIn strategy not properly configured</p>
                              )}
                              {!diagnosticData.callbackConfigured && (
                                <p>- Callback URL not properly configured in Passport strategy</p>
                              )}
                              {diagnosticData.callbackURL !== diagnosticData.expectedCallbackURL && (
                                <p>- Callback URL mismatch. Make sure the URL is registered in LinkedIn Developer Console.</p>
                              )}
                              {diagnosticData.linkedInTest && !diagnosticData.linkedInTest.credentialsValid && (
                                <p>- LinkedIn API rejected the credentials. Please check your Client ID and Secret.</p>
                              )}
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;