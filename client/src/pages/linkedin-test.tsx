import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TestResult {
  name: string;
  status: "pending" | "success" | "error" | "warning";
  message: string;
  details?: any;
}

export default function LinkedInTest() {
  const [results, setResults] = useState<TestResult[]>([
    { name: "Environment Variables", status: "pending", message: "Checking environment variables..." },
    { name: "LinkedIn API Connection", status: "pending", message: "Testing connection to LinkedIn API..." },
    { name: "Credentials Validation", status: "pending", message: "Validating LinkedIn credentials..." },
    { name: "Redirect URIs", status: "pending", message: "Checking redirect URI configuration..." },
    { name: "Session Configuration", status: "pending", message: "Verifying session persistence..." },
    { name: "Authorization URL", status: "pending", message: "Testing authorization URL generation..." },
  ]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState("");

  const runTests = async () => {
    setRunning(true);
    setSummary("");
    
    try {
      // Reset all tests to pending
      setResults(results.map(r => ({ ...r, status: "pending" })));
      
      // Run tests sequentially with delay to avoid rate limiting
      await testEnvironment();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testConnection();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testCredentials();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testRedirectURIs();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testSession();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testAuthURL();
      
      // Generate summary
      generateSummary();
    } catch (error) {
      console.error("Error running tests:", error);
    } finally {
      setRunning(false);
    }
  };
  
  const updateResult = (index: number, status: "success" | "error" | "warning", message: string, details?: any) => {
    setResults(prev => {
      const newResults = [...prev];
      newResults[index] = { ...newResults[index], status, message, details };
      return newResults;
    });
  };
  
  const testEnvironment = async () => {
    try {
      const response = await fetch("/api/debug/linkedin/environment");
      const data = await response.json();
      
      if (data.clientIdConfigured && data.clientSecretConfigured) {
        updateResult(0, "success", "LinkedIn OAuth environment variables are properly configured.", data);
      } else {
        let message = "LinkedIn OAuth environment variables are not properly configured:";
        if (!data.clientIdConfigured) message += " Missing Client ID.";
        if (!data.clientSecretConfigured) message += " Missing Client Secret.";
        
        updateResult(0, "error", message, data);
      }
    } catch (error) {
      updateResult(0, "error", `Error checking environment: ${error.message}`);
    }
  };
  
  const testConnection = async () => {
    try {
      const response = await fetch("/api/debug/linkedin/connection");
      const data = await response.json();
      
      if (data.connectionSuccessful) {
        updateResult(1, "success", "Successfully connected to LinkedIn API.", data);
      } else {
        updateResult(1, "warning", `Could not connect to LinkedIn API: ${data.error || "Unknown error"}`, data);
      }
    } catch (error) {
      updateResult(1, "error", `Error testing connection: ${error.message}`);
    }
  };
  
  const testCredentials = async () => {
    try {
      const response = await fetch("/api/debug/linkedin/credentials");
      const data = await response.json();
      
      if (data.valid) {
        updateResult(2, "success", "LinkedIn credentials appear to be valid.", data);
      } else if (data.error === "missing_credentials") {
        updateResult(2, "error", "Cannot validate credentials because they are not configured.", data);
      } else {
        updateResult(2, "error", `LinkedIn credentials validation failed: ${data.message || "Invalid credentials"}`, data);
      }
    } catch (error) {
      updateResult(2, "error", `Error validating credentials: ${error.message}`);
    }
  };
  
  const testRedirectURIs = async () => {
    try {
      const response = await fetch("/api/debug/linkedin/redirect-uris");
      const data = await response.json();
      
      if (data.redirectUris && data.redirectUris.length > 0) {
        updateResult(3, "success", `Generated ${data.redirectUris.length} possible redirect URIs.`, data);
        
        // Also test a redirect URI
        try {
          const testResponse = await fetch("/api/debug/linkedin/redirect-test");
          const testData = await testResponse.json();
          
          if (testData.success) {
            updateResult(3, "success", "At least one redirect URI is properly configured in your LinkedIn app.", testData);
          } else {
            updateResult(3, "error", "None of the tested redirect URIs are configured in your LinkedIn app.", testData);
          }
        } catch (error) {
          updateResult(3, "warning", `Error testing redirect URI: ${error.message}`);
        }
      } else {
        updateResult(3, "warning", "Could not generate any redirect URIs.", data);
      }
    } catch (error) {
      updateResult(3, "error", `Error checking redirect URIs: ${error.message}`);
    }
  };
  
  const testSession = async () => {
    try {
      // We'll check if the session is working by setting and retrieving a value
      const testValue = `test_${Date.now()}`;
      
      const setResponse = await fetch(`/api/debug/session/set?key=diagnostic_test&value=${testValue}`);
      const setData = await setResponse.json();
      
      if (setData.success) {
        const getResponse = await fetch("/api/debug/session/get?key=diagnostic_test");
        const getData = await getResponse.json();
        
        if (getData.value === testValue) {
          updateResult(4, "success", "Session configuration is working correctly.", {
            session_configured: true,
            test_value: testValue,
            retrieved_value: getData.value,
            session_id: getData.sessionId
          });
        } else {
          updateResult(4, "error", "Session data is not persisting correctly.", {
            session_configured: true,
            test_value: testValue,
            retrieved_value: getData.value,
            session_id: getData.sessionId
          });
        }
      } else {
        updateResult(4, "error", "Failed to set session data.", setData);
      }
    } catch (error) {
      // If the test endpoints aren't available, we'll check if the session exists
      try {
        const response = await fetch("/api/debug/request-headers");
        const data = await response.json();
        
        if (data.cookies && data.cookies.includes("connect.sid")) {
          updateResult(4, "success", "Session appears to be configured (connect.sid cookie found).", {
            cookies: data.cookies,
            headers: data.headers
          });
        } else {
          updateResult(4, "warning", "Session cookie not found. OAuth state validation might not work.", {
            cookies: data.cookies,
            headers: data.headers
          });
        }
      } catch (error) {
        updateResult(4, "warning", `Could not verify session configuration: ${error.message}`);
      }
    }
  };
  
  const testAuthURL = async () => {
    try {
      const response = await fetch("/api/auth/linkedin/minimal-url");
      const data = await response.json();
      
      if (data.url) {
        updateResult(5, "success", "Successfully generated LinkedIn authorization URL.", {
          redirect_uri: data.redirectUri,
          auth_url_prefix: data.url.substring(0, 60) + "...",
          state: data.state
        });
      } else {
        updateResult(5, "error", `Failed to generate authorization URL: ${data.error || "Unknown error"}`, data);
      }
    } catch (error) {
      updateResult(5, "error", `Error generating authorization URL: ${error.message}`);
    }
  };
  
  const generateSummary = () => {
    const passedCount = results.filter(r => r.status === "success").length;
    const failedCount = results.filter(r => r.status === "error").length;
    const warningCount = results.filter(r => r.status === "warning").length;
    
    let summary = "";
    
    if (passedCount === results.length) {
      summary = "✅ All tests passed! Your LinkedIn OAuth configuration appears to be correct.";
    } else if (failedCount > 0) {
      summary = `❌ ${failedCount} of ${results.length} tests failed. Your LinkedIn OAuth configuration has issues that need to be fixed.`;
    } else if (warningCount > 0) {
      summary = `⚠️ All tests passed with ${warningCount} warnings. Your LinkedIn OAuth might work but there could be issues.`;
    }
    
    // Add recommendations
    if (failedCount > 0 || warningCount > 0) {
      summary += "\n\nRecommendations:";
      
      // Environment variables
      if (results[0].status === "error") {
        summary += "\n- Set the LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables.";
      }
      
      // Credentials
      if (results[2].status === "error") {
        summary += "\n- Verify your LinkedIn API credentials in your LinkedIn Developer application.";
      }
      
      // Redirect URIs
      if (results[3].status === "error" || results[3].status === "warning") {
        summary += "\n- Add the redirect URIs from the test to your LinkedIn application settings.";
      }
      
      // Session
      if (results[4].status === "error" || results[4].status === "warning") {
        summary += "\n- Check your Express session configuration for issues with persistence.";
      }
      
      // Auth URL
      if (results[5].status === "error") {
        summary += "\n- Fix the issues with authorization URL generation (check credentials and redirect URIs).";
      }
    }
    
    setSummary(summary);
  };
  
  useEffect(() => {
    // Run tests automatically on first load
    runTests();
  }, []);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold tracking-tight mb-4">LinkedIn OAuth Diagnostic Tool</h1>
      <p className="text-muted-foreground mb-8">
        This tool will diagnose issues with your LinkedIn OAuth integration by testing each component of the OAuth flow.
      </p>
      
      <div className="mb-6">
        <Button onClick={runTests} disabled={running}>
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests
            </>
          ) : (
            "Run Diagnostic Tests"
          )}
        </Button>
      </div>
      
      <div className="grid gap-6 mb-8">
        {results.map((result, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{result.name}</CardTitle>
              {getStatusIcon(result.status)}
            </CardHeader>
            <CardContent>
              <CardDescription>{result.message}</CardDescription>
              {result.details && (
                <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono overflow-auto max-h-32">
                  <pre>{JSON.stringify(result.details, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {summary && (
        <Alert className="mb-8">
          <AlertDescription className="whitespace-pre-line">
            {summary}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="bg-muted p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Next Steps</h2>
        <p className="mb-4">Once you've fixed any issues identified above, try testing the LinkedIn authentication:</p>
        <div className="space-x-4">
          <Button variant="outline" onClick={() => window.location.href = "/linkedin-auth"}>
            Try Direct LinkedIn Auth
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/linkedin/minimal-test"}>
            Try Minimal Test
          </Button>
        </div>
      </div>
    </div>
  );
}