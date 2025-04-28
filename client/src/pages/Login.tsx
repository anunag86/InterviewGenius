import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FaLinkedin } from "react-icons/fa";

const Login = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, setLocation] = useLocation();

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
              <Button 
                onClick={login} 
                className="flex items-center justify-center bg-[#0077B5] hover:bg-[#005e8d]"
                disabled={isLoading}
              >
                <FaLinkedin className="mr-2 h-5 w-5" />
                Connect with LinkedIn
              </Button>

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