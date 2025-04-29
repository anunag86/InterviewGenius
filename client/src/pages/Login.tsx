import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FaLinkedin } from "react-icons/fa";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Login = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  
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
              
              {/* LinkedIn authentication debugging info removed - now working correctly */}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button 
                className="w-full bg-[#0077B5] hover:bg-[#0077B5]/90"
                onClick={handleLinkedInLogin}
              >
                <FaLinkedin className="mr-2 h-5 w-5" />
                Sign in with LinkedIn
              </Button>
              
              {/* Diagnostic tools removed as they are no longer needed */}
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
              
              {/* LinkedIn Diagnostic Tool removed since authentication is now working */}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;