import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BsLinkedin } from "react-icons/bs";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const Login = () => {
  const { login, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect to home if user is already logged in
  useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  const handleLinkedInLogin = async () => {
    await login();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <a className="inline-block">
              <div className="flex flex-col items-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  PrepTalk
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Your Interview Coach</p>
              </div>
            </a>
          </Link>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Welcome to PrepTalk</CardTitle>
            <CardDescription className="text-muted-foreground">
              Turn your experiences into clear, confident answers.
              <br />
              No shortcuts, just real preparation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center px-6 py-4">
              <p className="mb-6 text-muted-foreground">
                Sign in with LinkedIn to access your personalized interview preparation experience.
              </p>
              <Button 
                className="w-full flex items-center justify-center gap-2 py-6"
                onClick={handleLinkedInLogin}
                disabled={isLoading}
              >
                <BsLinkedin className="h-5 w-5" />
                <span>{isLoading ? "Connecting to LinkedIn..." : "Sign in with LinkedIn"}</span>
              </Button>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/30 p-4">
            <p className="text-xs text-center text-muted-foreground w-full">
              By signing in, you agree to our Terms of Service and Privacy Policy. 
              We use LinkedIn to customize your interview preparation experience.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;