import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define the types for our diagnostics check results
interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

// Define the response from our diagnostics API
interface DiagnosticsResponse {
  callbackUrl: string;
  linkedinClientConfigured: boolean;
  sessionConfigured: boolean;
  passportInitialized: boolean;
  authEndpoints: {
    login: string;
    callback: string;
  };
  serverDetails: {
    host: string;
    protocol: string;
    nodeEnv: string;
  };
}

export default function LinkedInDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<DiagnosticsResponse | null>(null);
  const { toast } = useToast();

  // Run the diagnostics when requested
  const runDiagnostics = async () => {
    setLoading(true);
    setResults([
      {
        name: 'Starting diagnostics...',
        status: 'info',
        message: 'Checking LinkedIn authentication configuration'
      }
    ]);

    try {
      // Fetch diagnostics from the server
      const response = await fetch('/api/auth/linkedin/diagnostics');
      
      if (!response.ok) {
        throw new Error(`Failed to run diagnostics: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as DiagnosticsResponse;
      setConnectionInfo(data);
      
      // Process the results
      const diagnosticResults: DiagnosticResult[] = [];
      
      // Check callback URL
      diagnosticResults.push({
        name: 'Callback URL',
        status: data.callbackUrl ? 'success' : 'error',
        message: data.callbackUrl ? `Callback URL is set to: ${data.callbackUrl}` : 'Callback URL is not set',
        details: 'The callback URL must match exactly what is configured in the LinkedIn Developer Console'
      });
      
      // Check LinkedIn client credentials
      diagnosticResults.push({
        name: 'LinkedIn Credentials',
        status: data.linkedinClientConfigured ? 'success' : 'error',
        message: data.linkedinClientConfigured ? 
          'LinkedIn client ID and secret are configured' : 
          'LinkedIn client ID and/or secret are missing',
        details: 'These must be set in environment variables LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET'
      });
      
      // Check session configuration
      diagnosticResults.push({
        name: 'Session Configuration',
        status: data.sessionConfigured ? 'success' : 'error',
        message: data.sessionConfigured ? 
          'Session middleware is properly configured' : 
          'Session middleware is not configured correctly',
        details: 'Sessions are required for authentication state management'
      });
      
      // Check passport initialization
      diagnosticResults.push({
        name: 'Passport Initialization',
        status: data.passportInitialized ? 'success' : 'error',
        message: data.passportInitialized ? 
          'Passport is properly initialized' : 
          'Passport is not initialized correctly',
      });
      
      // Check authentication endpoints
      diagnosticResults.push({
        name: 'Auth Endpoints',
        status: 'info',
        message: `Login: ${data.authEndpoints.login}, Callback: ${data.authEndpoints.callback}`,
        details: 'These endpoints should be registered and accessible'
      });
      
      // Add server details
      diagnosticResults.push({
        name: 'Server Details',
        status: 'info',
        message: `Host: ${data.serverDetails.host}, Protocol: ${data.serverDetails.protocol}`,
        details: `Environment: ${data.serverDetails.nodeEnv}`
      });
      
      setResults(diagnosticResults);
      
      toast({
        title: "Diagnostics Complete",
        description: "LinkedIn authentication configuration check is complete."
      });
    } catch (error) {
      console.error('Diagnostics error:', error);
      setResults([
        {
          name: 'Diagnostics Error',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error running diagnostics',
        }
      ]);
      
      toast({
        title: "Diagnostics Failed",
        description: "There was an error running the LinkedIn diagnostics.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      
      toast({
        title: data.isAuthenticated ? "Authenticated" : "Not Authenticated",
        description: data.isAuthenticated 
          ? `Logged in as: ${data.user?.displayName}` 
          : "You are not currently logged in with LinkedIn",
        variant: data.isAuthenticated ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check authentication status",
        variant: "destructive"
      });
    }
  };

  // Attempt to trigger the LinkedIn login flow
  const triggerLinkedInLogin = () => {
    window.location.href = '/auth/linkedin';
  };

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-8">LinkedIn Authentication Diagnostics</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Tools</CardTitle>
            <CardDescription>
              Use these tools to troubleshoot LinkedIn authentication issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <Button 
                onClick={runDiagnostics} 
                disabled={loading}
                className="flex-1">
                {loading ? "Running Diagnostics..." : "Run Connection Diagnostics"}
              </Button>
              
              <Button 
                onClick={checkAuthStatus} 
                variant="outline"
                className="flex-1">
                Check Current Auth Status
              </Button>
              
              <Button 
                onClick={triggerLinkedInLogin} 
                variant="secondary"
                className="flex-1">
                Test LinkedIn Login
              </Button>
            </div>
            
            {connectionInfo && (
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md text-sm mt-4">
                <h3 className="font-medium mb-2">Connection Details:</h3>
                <pre className="whitespace-pre-wrap overflow-auto max-h-60">
                  {JSON.stringify(connectionInfo, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
        
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Diagnostic Results</CardTitle>
              <CardDescription>
                Results of LinkedIn authentication configuration check
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <Alert key={index} variant={result.status === 'error' ? 'destructive' : 'default'}>
                    <div className="flex items-start">
                      {result.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 mr-2 mt-1" />
                      ) : result.status === 'error' ? (
                        <AlertCircle className="h-4 w-4 mr-2 mt-1" />
                      ) : (
                        <Info className="h-4 w-4 mr-2 mt-1" />
                      )}
                      <div>
                        <AlertTitle>{result.name}</AlertTitle>
                        <AlertDescription className="mt-1">
                          {result.message}
                          {result.details && (
                            <p className="text-sm opacity-80 mt-1">{result.details}</p>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between text-sm text-muted-foreground">
              <p>Diagnostics completed at: {new Date().toLocaleTimeString()}</p>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}