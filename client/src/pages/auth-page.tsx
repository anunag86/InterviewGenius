import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

export default function AuthPage() {
  const { user, isLoading, login, loginError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (loginError) {
      setError(loginError);
    }
  }, [loginError]);
  
  // Redirect to home if logged in
  if (user) {
    return <Redirect to="/" />;
  }
  
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tighter">Welcome to PrepTalk</h1>
            <p className="text-gray-500 dark:text-gray-400">Sign in to continue to your interview preparation dashboard</p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            variant="outline" 
            className="w-full bg-[#0A66C2] text-white hover:bg-[#004182]"
            onClick={login}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
              </svg>
            )}
            Continue with LinkedIn
          </Button>
          
          <p className="text-center text-sm text-gray-500 mt-4">
            PrepTalk uses LinkedIn to analyze your profile for better job matching.
            We never post on your behalf.
          </p>
        </div>
      </div>
      
      <div className="hidden md:block bg-gradient-to-r from-purple-600 to-indigo-700 p-10 text-white">
        <div className="h-full flex flex-col justify-center max-w-md mx-auto">
          <h1 className="text-4xl font-bold mb-6">Prepare for your dream job interview</h1>
          <p className="text-xl mb-8">PrepTalk helps you practice for job interviews with AI-powered mock interviews tailored to your target role and resume.</p>
          
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-white bg-opacity-20 rounded-full p-2 h-10 w-10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Job-specific questions</h3>
                <p className="text-white text-opacity-90">Get interview questions tailored to the exact job you're applying for</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-white bg-opacity-20 rounded-full p-2 h-10 w-10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Resume analysis</h3>
                <p className="text-white text-opacity-90">We analyze your resume to find key talking points and achievements</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-white bg-opacity-20 rounded-full p-2 h-10 w-10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Real-time feedback</h3>
                <p className="text-white text-opacity-90">Get instant feedback on your interview responses</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}