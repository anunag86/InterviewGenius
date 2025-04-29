import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

export default function LinkedInDiagnostics() {
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [callbackURL, setCallbackURL] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get callback URL on component mount
  useEffect(() => {
    fetchCallbackURL();
  }, []);
  
  // Function to fetch the callback URL
  const fetchCallbackURL = async () => {
    try {
      const response = await fetch('/api/linkedin-callback-url');
      const data = await response.json();
      setCallbackURL(data.callbackURL);
    } catch (err) {
      console.error('Error fetching callback URL:', err);
      setError('Failed to retrieve callback URL');
    }
  };
  
  // Function to run diagnostics
  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/linkedin-diagnostic');
      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.message);
      }
      
      setDiagnosticData(data.data);
    } catch (err) {
      console.error('Error running diagnostics:', err);
      setError('Failed to run diagnostics: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };
  
  // Function to get status badge
  const getStatusBadge = (status: boolean | string) => {
    if (status === true || status === 'present' || status === 'yes') {
      return <Badge className="bg-green-500"><CheckCircle2 className="mr-1 h-3 w-3" /> OK</Badge>;
    } else if (status === false || status === 'missing' || status === 'no') {
      return <Badge className="bg-red-500"><XCircle className="mr-1 h-3 w-3" /> Missing</Badge>;
    } else {
      return <Badge className="bg-yellow-500"><AlertCircle className="mr-1 h-3 w-3" /> Unknown</Badge>;
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">LinkedIn Authentication Diagnostics</CardTitle>
          <CardDescription>
            Troubleshoot LinkedIn authentication issues and verify configuration.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Callback URL Configuration</h3>
            <p className="mb-2 text-sm text-muted-foreground">
              This URL must be exactly registered in your LinkedIn Developer Portal.
            </p>
            
            <div className="bg-muted p-3 rounded-md flex justify-between items-center">
              <code className="text-sm">{callbackURL || 'Loading...'}</code>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (callbackURL) {
                    navigator.clipboard.writeText(callbackURL);
                  }
                }}
                disabled={!callbackURL}
              >
                Copy
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
            className="w-full mb-6"
          >
            {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
          </Button>
          
          {diagnosticData && (
            <Tabs defaultValue="credentials">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="credentials">Credentials</TabsTrigger>
                <TabsTrigger value="callback">Callback URL</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
              </TabsList>
              
              <TabsContent value="credentials" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Client ID</TableCell>
                      <TableCell>{getStatusBadge(diagnosticData.clientIdStatus)}</TableCell>
                      <TableCell>
                        Length: {diagnosticData.clientIdLength || 'N/A'}<br />
                        Format: {diagnosticData.clientIdPartial || 'N/A'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Client Secret</TableCell>
                      <TableCell>{getStatusBadge(diagnosticData.clientSecretStatus)}</TableCell>
                      <TableCell>
                        Length: {diagnosticData.clientSecretLength || 'N/A'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Strategy Config</TableCell>
                      <TableCell>{getStatusBadge(diagnosticData.strategyConfigured)}</TableCell>
                      <TableCell>
                        Passport strategy properly configured: {diagnosticData.strategyConfigured ? 'Yes' : 'No'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>
              
              <TabsContent value="callback" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Current Callback</TableCell>
                      <TableCell>{getStatusBadge(diagnosticData.callbackConfigured)}</TableCell>
                      <TableCell className="break-all">{diagnosticData.callbackURL}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Expected Callback</TableCell>
                      <TableCell>{getStatusBadge(true)}</TableCell>
                      <TableCell className="break-all">{diagnosticData.expectedCallbackURL}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Host Detection</TableCell>
                      <TableCell>{getStatusBadge(diagnosticData.detectedHost !== 'none')}</TableCell>
                      <TableCell>{diagnosticData.detectedHost}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Match</TableCell>
                      <TableCell>{getStatusBadge(diagnosticData.callbackURL === diagnosticData.expectedCallbackURL)}</TableCell>
                      <TableCell>
                        {diagnosticData.callbackURL === diagnosticData.expectedCallbackURL 
                          ? 'Callback URLs match exactly' 
                          : 'CRITICAL: Callback URLs do not match!'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>
              
              <TabsContent value="validation" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Credentials Valid</TableCell>
                      <TableCell>
                        {getStatusBadge(diagnosticData.linkedInTest.credentialsValid)}
                      </TableCell>
                      <TableCell>
                        Status Code: {diagnosticData.linkedInTest.statusCode}<br />
                        URL Tested: {diagnosticData.linkedInTest.urlTested}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Authorization URL</TableCell>
                      <TableCell>{getStatusBadge(diagnosticData.linkedInTest.authUrlFormat ? 'yes' : 'no')}</TableCell>
                      <TableCell className="break-all">
                        {diagnosticData.linkedInTest.authUrlFormat}...
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>State Handling</TableCell>
                      <TableCell>
                        {getStatusBadge(diagnosticData.stateHandling?.enabled ?? 'unknown')}
                      </TableCell>
                      <TableCell>
                        Session Support: {diagnosticData.stateHandling?.sessionSupport ? 'Yes' : 'No'}<br />
                        Storage Method: {diagnosticData.stateHandling?.storageMethod || 'Unknown'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
          <Button onClick={runDiagnostics} disabled={loading}>
            Refresh
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}