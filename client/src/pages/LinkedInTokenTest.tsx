import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function LinkedInTokenTest() {
  const [token, setToken] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  // Query for testing the token
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ['linkedinTokenTest', token],
    queryFn: async () => {
      if (!token) return null;
      const response = await fetch(`/api/auth/linkedin/test-token?token=${encodeURIComponent(token)}`);
      if (!response.ok) {
        throw new Error(`Error testing token: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: false, // Don't run the query automatically
  });

  const handleTestToken = () => {
    if (!token) return;
    setIsTesting(true);
    refetch().finally(() => setIsTesting(false));
  };

  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardTitle className="text-2xl font-bold">LinkedIn Token Tester</CardTitle>
          <CardDescription className="text-white/80">
            Test a LinkedIn access token with the userinfo endpoint
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="token">Access Token</Label>
            <div className="flex gap-2">
              <Input 
                id="token" 
                value={token} 
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the LinkedIn access token here"
                className="flex-1"
              />
              <Button 
                onClick={handleTestToken} 
                disabled={!token || isFetching}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isFetching ? 'Testing...' : 'Test Token'}
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              This will test your token against the LinkedIn OpenID Connect userinfo endpoint
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              <p className="font-bold">Error Testing Token</p>
              <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={data.success ? 'default' : 'destructive'}>
                  {data.success ? 'Success' : 'Failed'}
                </Badge>
                
                <span className="text-sm font-medium">
                  Status: {data.status} {data.statusText}
                </span>
              </div>

              {data.errorType && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="font-bold text-amber-800">{data.errorType}</p>
                  <p className="text-amber-700">{data.recommendation}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Token Information</Label>
                <div className="p-3 bg-gray-50 rounded-md text-sm">
                  <div className="grid grid-cols-2 gap-y-1">
                    <span className="font-medium">Length:</span>
                    <span>{data.tokenLength} characters</span>
                    <span className="font-medium">First 5 chars:</span>
                    <span>{data.tokenFirstChars}</span>
                    <span className="font-medium">Last 5 chars:</span>
                    <span>{data.tokenLastChars}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Response Data</Label>
                <Textarea 
                  value={typeof data.responseData === 'object' 
                    ? JSON.stringify(data.responseData, null, 2) 
                    : String(data.responseData)
                  }
                  readOnly
                  className="font-mono text-xs h-48"
                />
              </div>

              <div className="space-y-2">
                <Label>Response Headers</Label>
                <div className="p-3 bg-gray-50 rounded-md font-mono text-xs overflow-auto max-h-32">
                  {Object.entries(data.headers || {}).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-bold">{key}:</span> {String(value)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between bg-gray-50 border-t">
          <p className="text-sm text-gray-500">
            Use this tool to manually test LinkedIn tokens and diagnose issues
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}