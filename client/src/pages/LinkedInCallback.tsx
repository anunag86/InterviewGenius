import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const LinkedInCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [location, setLocation] = useLocation();
  const { fetchCurrentUser } = useAuth();

  // Parse URL search params for errors
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');
    
    if (errorParam) {
      console.error(`LinkedIn OAuth error: ${errorParam}`, errorDesc);
      setError(`LinkedIn authentication error: ${errorParam}`);
      setErrorDetails(errorDesc || 'No additional details provided');
    }
  }, []);

  useEffect(() => {
    const handleCallback = async () => {
      if (error) {
        // Skip auth if we already detected an error from URL params
        return;
      }
      
      try {
        // Attempt to fetch the user's profile
        const success = await fetchCurrentUser();
        
        if (success) {
          // Redirect to home page after successful authentication
          setLocation("/");
        } else {
          setError("Authentication failed. Please try again.");
          setErrorDetails("Could not retrieve user profile after LinkedIn authentication.");
        }
      } catch (err) {
        console.error("LinkedIn callback error:", err);
        setError("An error occurred during authentication.");
        setErrorDetails("There was a technical issue with the LinkedIn authentication process.");
      }
    };

    handleCallback();
  }, [fetchCurrentUser, setLocation, error]);

  return (
    <div className="container max-w-lg mx-auto p-4 mt-20">
      <Card>
        <CardContent className="p-6">
          {error ? (
            <>
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
                <Alert variant="destructive" className="mb-6">
                  <AlertTitle>{error}</AlertTitle>
                  {errorDetails && (
                    <AlertDescription>{errorDetails}</AlertDescription>
                  )}
                </Alert>
              </div>
              
              <div className="mt-6 bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-800 mb-2">Troubleshooting</h3>
                <ul className="list-disc pl-6 text-sm text-gray-700 space-y-2">
                  <li>Check that the LinkedIn API credentials are correctly configured in the Replit secrets.</li>
                  <li>Verify that the callback URL in your LinkedIn Developer Console exactly matches: <code className="font-mono text-xs bg-white px-1 py-0.5 rounded border">{window.location.origin}/api/auth/linkedin/callback</code></li>
                  <li>Make sure your LinkedIn app is approved and has the necessary permissions.</li>
                </ul>
              </div>
              
              <div className="text-center">
                <Button onClick={() => setLocation("/login")}>
                  Back to Login
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent">
                Completing Authentication
              </h2>
              <div className="flex justify-center my-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
              <p className="text-gray-700">
                Please wait while we complete your authentication...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LinkedInCallback;