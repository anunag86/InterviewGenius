import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FaLinkedin } from "react-icons/fa";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, AlertCircle } from "lucide-react";

const Login = () => {
  const { isAuthenticated, isLoading, login, loginError } = useAuth();
  const [, setLocation] = useLocation();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [redirectUri, setRedirectUri] = useState<string | null>(null);

  // Get redirect URI for diagnostics
  useEffect(() => {
    // Only fetch the URL if there was an error
    if (loginError) {
      fetch("/api/auth/linkedin/url")
        .then(res => res.json())
        .then(data => {
          try {
            // Extract the redirect_uri from the auth URL
            const url = new URL(data.url);
            const redirectUri = url.searchParams.get("redirect_uri");
            setRedirectUri(decodeURIComponent(redirectUri || ""));
          } catch (e) {
            console.error("Error parsing LinkedIn auth URL:", e);
          }
        })
        .catch(err => {
          console.error("Error fetching LinkedIn auth URL:", err);
        });
    }
  }, [loginError]);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent">
            PrepTalk
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Your AI-powered interview coach
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Welcome to PrepTalk</CardTitle>
            <CardDescription className="text-center">
              Sign in with your LinkedIn account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              {loginError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>LinkedIn Authentication Error</AlertTitle>
                  <AlertDescription>
                    {loginError}
                    <Collapsible 
                      open={showDiagnostics} 
                      onOpenChange={setShowDiagnostics}
                      className="mt-2"
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center">
                          <span>Show Diagnostics</span>
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 text-xs bg-gray-100 p-2 rounded">
                        <p><strong>Problem:</strong> LinkedIn is refusing the connection. This usually means there's a mismatch between the redirect URI in our app and what's registered in LinkedIn.</p>
                        <p className="mt-1"><strong>App Redirect URI:</strong></p>
                        <p className="font-mono overflow-x-scroll mt-1">{redirectUri || "Loading..."}</p>
                        <p className="mt-2">Please verify this URI exactly matches what's registered in your LinkedIn Developer Console.</p>
                      </CollapsibleContent>
                    </Collapsible>
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={login} 
                className="flex items-center justify-center bg-[#0077B5] hover:bg-[#005e8d]"
                disabled={isLoading}
              >
                <FaLinkedin className="mr-2 h-5 w-5" />
                Connect with LinkedIn
              </Button>
              
              <p className="text-center text-sm text-gray-500 mt-2">
                Having trouble? Try our <a href="/linkedin" className="text-blue-600 hover:underline">alternative connection method</a>
              </p>

              <div className="text-center text-sm text-gray-500 mt-2">
                <p>
                  By signing in, you agree to our{" "}
                  <a href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            PrepTalk helps you prepare for job interviews by analyzing job postings and your LinkedIn profile.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;