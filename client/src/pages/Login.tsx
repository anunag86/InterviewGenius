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

  // Check authentication status when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/me');
        const data = await response.json();
        
        if (data.isAuthenticated) {
          // User is already authenticated, redirect to home
          window.location.href = '/';
        }
      } catch (err) {
        setError('Failed to check authentication status');
        console.error('Auth check error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLinkedInLogin = () => {
    window.location.href = '/auth/linkedin';
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
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;