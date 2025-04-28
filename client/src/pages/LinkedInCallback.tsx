import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/**
 * LinkedIn OAuth callback handler page
 * This component handles the OAuth callback from LinkedIn
 * It parses the query parameters and redirects to the appropriate page
 */
const LinkedInCallback = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState("Processing your login...");
  
  useEffect(() => {
    // If the user is already authenticated, redirect to home
    if (user) {
      setStatus('success');
      setMessage("Login successful! Redirecting to home page...");
      setTimeout(() => {
        setLocation('/');
      }, 1500);
      return;
    }
    
    // Set a timeout to check if login fails
    const timeoutId = setTimeout(() => {
      if (!user) {
        setStatus('error');
        setMessage("Login timed out. Please try again.");
      }
    }, 10000);
    
    return () => clearTimeout(timeoutId);
  }, [user, setLocation]);
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-primary mb-2">PrepTalk</h1>
            <p className="text-muted-foreground">LinkedIn Authentication</p>
          </div>
          
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-center text-muted-foreground">{message}</p>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
              </div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-4 text-center py-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="font-medium text-lg">{message}</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-4 text-center py-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-red-100 p-3">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <p className="font-medium text-lg">{message}</p>
              <button 
                className="text-primary hover:text-primary/80 transition-colors"
                onClick={() => setLocation('/login')}
              >
                Return to login
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LinkedInCallback;