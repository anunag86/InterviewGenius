import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const LinkedInCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { fetchCurrentUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Attempt to fetch the user's profile
        const success = await fetchCurrentUser();
        
        if (success) {
          // Redirect to home page after successful authentication
          setLocation("/");
        } else {
          setError("Authentication failed. Please try again.");
        }
      } catch (err) {
        console.error("LinkedIn callback error:", err);
        setError("An error occurred during authentication. Please try again.");
      }
    };

    handleCallback();
  }, [fetchCurrentUser, setLocation]);

  return (
    <div className="container max-w-lg mx-auto p-4 mt-20">
      <Card>
        <CardContent className="p-6 text-center">
          {error ? (
            <>
              <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
              <p className="mb-6 text-gray-700">{error}</p>
              <Button onClick={() => setLocation("/login")}>
                Back to Login
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent">
                Completing Authentication
              </h2>
              <div className="flex justify-center my-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
              <p className="text-gray-700">
                Please wait while we complete your authentication...
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LinkedInCallback;