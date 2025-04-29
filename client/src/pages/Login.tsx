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
                
                <div className="mt-3 mb-4">
                  <a 
                    href="/api/auth/linkedin/callback-url" 
                    target="_blank" 
                    className="block w-full text-center py-2 bg-[#0077B5] hover:bg-[#0077B5]/90 text-white rounded-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Get Current Callback URL & Instructions
                  </a>
                  <p className="text-xs mt-2 text-center">
                    ⭐ Use this tool to get the exact callback URL that must be registered in your LinkedIn Developer Portal
                  </p>
                </div>
                
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                  <div className="flex items-start">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor" 
                      className="w-4 h-4 mr-1 flex-shrink-0 text-red-600 mt-0.5"
                    >
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-bold">Common Authentication Issues:</p>
                      <ol className="list-decimal list-inside mt-1 space-y-1">
                        <li><strong>Callback URL mismatch</strong>: This must be an exact character-for-character match in LinkedIn</li>
                        <li><strong>Missing or incorrect scopes</strong>: We use OpenID Connect scopes (<code className="bg-red-50 px-1 border border-red-200">openid</code>, <code className="bg-red-50 px-1 border border-red-200">profile</code>, <code className="bg-red-50 px-1 border border-red-200">email</code>)</li>
                        <li><strong>Invalid credentials</strong>: Client ID or Secret might be incorrect</li>
                      </ol>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <p className="font-medium">LinkedIn OAuth 2.0 Configuration Requirements:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                    <li>We're using <strong>OpenID Connect scopes</strong>, not the older LinkedIn scopes:</li>
                    <div className="ml-5 mt-1 grid grid-cols-2 gap-1">
                      <div className="bg-amber-50 p-1 rounded border border-amber-200">
                        <span className="font-bold">✓ Use these scopes:</span>
                        <div className="mt-1">
                          <code className="block">openid</code>
                          <code className="block">profile</code>
                          <code className="block">email</code>
                        </div>
                      </div>
                      <div className="bg-red-50 p-1 rounded border border-red-200">
                        <span className="font-bold">✗ Don't use these:</span>
                        <div className="mt-1 line-through opacity-70">
                          <code className="block">r_liteprofile</code>
                          <code className="block">r_emailaddress</code>
                          <code className="block">w_member_social</code>
                        </div>
                      </div>
                    </div>
                    <li className="mt-2">Make sure your LinkedIn app has been upgraded to use OpenID Connect</li>
                    <li>Verify that your app has permissions for these scopes in the LinkedIn Developer Portal</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button 
                className="w-full bg-[#0077B5] hover:bg-[#0077B5]/90"
                onClick={handleLinkedInLogin}
              >
                <FaLinkedin className="mr-2 h-5 w-5" />
                Sign in with LinkedIn
              </Button>
              
              <Link href="/linkedin-diagnostics" className="w-full">
                <Button variant="outline" className="w-full text-sm" type="button">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  LinkedIn Authentication Diagnostics
                </Button>
              </Link>
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
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-700">
                        <p className="font-medium">Troubleshooting "redirect_uri" Errors</p>
                        <ol className="list-decimal list-inside mt-1 space-y-1 text-xs">
                          <li>Copy the exact callback URL shown above</li>
                          <li>Go to <a href="https://www.linkedin.com/developers/apps/" target="_blank" rel="noopener noreferrer" className="underline">LinkedIn Developer Portal</a></li>
                          <li>Select your application and click "Auth" tab</li>
                          <li>Add or edit the redirect URL to match exactly (character-for-character)</li>
                          <li>Click "Save" and try the login again</li>
                        </ol>
                      </div>
                    
                      <p className="mt-2">Use this tool to diagnose LinkedIn authentication issues:</p>
                      
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
                            <AlertDescription className="text-[10px] space-y-2">
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
                              
                              {/* Always show the redirect_uri explanation */}
                              <div className="pt-2 border-t border-muted">
                                <p className="font-medium text-destructive mb-1">Common "redirect_uri" error:</p>
                                <p>This error occurs when LinkedIn detects a mismatch between:</p>
                                <ul className="list-disc list-inside ml-2 mt-1">
                                  <li>The redirect URL registered in your LinkedIn Developer Console</li>
                                  <li>The redirect URL sent by our application during authentication</li>
                                </ul>
                                <p className="mt-1">Every character must match exactly, including "https://" vs "http://" or trailing slashes.</p>
                              </div>
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}

                      <div className="mt-4 text-center">
                        <Link 
                          to="/linkedin-diagnostics" 
                          className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Advanced Troubleshooting Tool
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </Link>
                      </div>
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