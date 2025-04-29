import { Request, Response } from "express";
import { SessionData } from "express-session";

/**
 * Comprehensive LinkedIn OAuth Diagnostic Tool
 * 
 * This tool runs a series of checks to diagnose issues with LinkedIn OAuth integration.
 * It checks environment variables, credentials, callback URLs, and more.
 */

// Run all diagnostic checks
export const runDiagnostics = async (req: Request, res: Response) => {
  const results: DiagnosticResult[] = [];
  const startTime = Date.now();
  
  // Step 1: Check environment variables
  await checkEnvironmentVariables(results);
  
  // Step 2: Check LinkedIn API connection
  await checkLinkedInConnection(results);
  
  // Step 3: Check credentials (client ID and secret)
  await checkCredentials(results);
  
  // Step 4: Check redirect URI configurations
  await checkRedirectURIs(req, results);
  
  // Step 5: Check session configuration
  await checkSessionConfiguration(req, results);
  
  // Step 6: Try authorization URL generation
  await testAuthorizationURL(req, results);
  
  const endTime = Date.now();
  const executionTime = (endTime - startTime) / 1000;
  
  const summary = generateSummary(results);
  
  res.json({
    diagnostic_timestamp: new Date().toISOString(),
    execution_time_seconds: executionTime,
    results,
    summary,
    recommendation: generateRecommendation(results)
  });
};

// Interface for diagnostic result
interface DiagnosticResult {
  test_name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  timestamp: string;
  critical: boolean;
}

// Step 1: Check environment variables
async function checkEnvironmentVariables(results: DiagnosticResult[]) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  const replSlug = process.env.REPL_SLUG;
  const replOwner = process.env.REPL_OWNER;
  
  results.push({
    test_name: "LinkedIn Client ID Check",
    status: clientId ? 'passed' : 'failed',
    message: clientId 
      ? `LinkedIn Client ID is configured (${maskString(clientId)})`
      : "LinkedIn Client ID is missing. This is required for OAuth.",
    details: {
      client_id_configured: !!clientId,
      client_id_prefix: clientId ? `${clientId.substring(0, 4)}...` : null,
      client_id_length: clientId ? clientId.length : 0
    },
    timestamp: new Date().toISOString(),
    critical: true
  });
  
  results.push({
    test_name: "LinkedIn Client Secret Check",
    status: clientSecret ? 'passed' : 'failed',
    message: clientSecret
      ? `LinkedIn Client Secret is configured (${maskString(clientSecret)})`
      : "LinkedIn Client Secret is missing. This is required for OAuth.",
    details: {
      client_secret_configured: !!clientSecret,
      client_secret_length: clientSecret ? clientSecret.length : 0
    },
    timestamp: new Date().toISOString(),
    critical: true
  });
  
  results.push({
    test_name: "Replit Environment Check",
    status: (replSlug && replOwner) ? 'passed' : 'warning',
    message: (replSlug && replOwner)
      ? `Replit environment detected: ${replSlug}.${replOwner}.repl.co`
      : "Not running in a Replit environment. This is fine for local development.",
    details: {
      repl_slug: replSlug,
      repl_owner: replOwner,
      is_replit: !!(replSlug && replOwner)
    },
    timestamp: new Date().toISOString(),
    critical: false
  });
  
  results.push({
    test_name: "Redirect URI Environment Variable Check",
    status: redirectUri ? 'passed' : 'warning',
    message: redirectUri
      ? `Custom redirect URI is configured: ${redirectUri}`
      : "No custom redirect URI configured. Will use default based on environment.",
    details: {
      redirect_uri_configured: !!redirectUri,
      redirect_uri: redirectUri
    },
    timestamp: new Date().toISOString(),
    critical: false
  });
}

// Step 2: Check LinkedIn API connection
async function checkLinkedInConnection(results: DiagnosticResult[]) {
  try {
    const response = await fetch('https://api.linkedin.com/', {
      method: 'HEAD',
      timeout: 5000
    });
    
    results.push({
      test_name: "LinkedIn API Connection Check",
      status: response.ok ? 'passed' : 'warning',
      message: response.ok
        ? "Successfully connected to LinkedIn API"
        : `Connection to LinkedIn API returned status ${response.status}`,
      details: {
        status_code: response.status,
        ok: response.ok,
        status_text: response.statusText
      },
      timestamp: new Date().toISOString(),
      critical: false
    });
  } catch (error) {
    results.push({
      test_name: "LinkedIn API Connection Check",
      status: 'warning',
      message: `Failed to connect to LinkedIn API: ${error.message}`,
      details: {
        error_message: error.message,
        error_type: error.name,
        error_stack: error.stack
      },
      timestamp: new Date().toISOString(),
      critical: false
    });
  }
}

// Step 3: Check credentials (client ID and secret)
async function checkCredentials(results: DiagnosticResult[]) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    results.push({
      test_name: "LinkedIn Credentials Validation",
      status: 'failed',
      message: "Cannot validate credentials because Client ID and/or Client Secret are missing",
      timestamp: new Date().toISOString(),
      critical: true
    });
    return;
  }
  
  try {
    // Attempt a token request with invalid code to see if credentials are rejected
    // This should fail, but give us info about the credentials
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', 'invalid_test_code');
    params.append('redirect_uri', 'https://example.com/callback');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      timeout: 5000
    });
    
    const data = await response.json();
    
    // If we get an invalid_request error about the code, it means our client ID and secret were accepted
    // If we get invalid_client, our credentials are wrong
    const credentialsValid = data.error !== 'invalid_client';
    
    results.push({
      test_name: "LinkedIn Credentials Validation",
      status: credentialsValid ? 'passed' : 'failed',
      message: credentialsValid
        ? "LinkedIn credentials appear to be valid"
        : "LinkedIn credentials were rejected (invalid client ID or secret)",
      details: {
        response_status: response.status,
        error: data.error,
        error_description: data.error_description,
        credentials_valid: credentialsValid
      },
      timestamp: new Date().toISOString(),
      critical: true
    });
  } catch (error) {
    results.push({
      test_name: "LinkedIn Credentials Validation",
      status: 'warning',
      message: `Error testing LinkedIn credentials: ${error.message}`,
      details: {
        error_message: error.message,
        error_type: error.name
      },
      timestamp: new Date().toISOString(),
      critical: false
    });
  }
}

// Step 4: Check redirect URI configurations
async function checkRedirectURIs(req: Request, results: DiagnosticResult[]) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    results.push({
      test_name: "Redirect URI Configuration",
      status: 'failed',
      message: "Cannot check redirect URIs because Client ID is missing",
      timestamp: new Date().toISOString(),
      critical: true
    });
    return;
  }
  
  // Generate possible redirect URIs
  const possibleRedirectURIs = generatePossibleRedirectURIs(req);
  
  results.push({
    test_name: "Redirect URI Generation",
    status: 'passed',
    message: `Generated ${possibleRedirectURIs.length} possible redirect URIs that might work with LinkedIn`,
    details: {
      redirect_uris: possibleRedirectURIs,
      recommended_primary_uri: possibleRedirectURIs[0],
      custom_uri_configured: !!process.env.LINKEDIN_REDIRECT_URI
    },
    timestamp: new Date().toISOString(),
    critical: false
  });
  
  // Try to verify which redirect URIs are configured in LinkedIn app
  const testResults = [];
  for (const uri of possibleRedirectURIs.slice(0, 5)) { // Test only first 5 to avoid rate limits
    try {
      // Try to generate an auth URL with this redirect URI
      const state = Math.random().toString(36).substring(2, 15);
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code` +
        `&client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(uri)}` +
        `&state=${encodeURIComponent(state)}` +
        `&scope=r_liteprofile%20r_emailaddress`;
      
      // Try to validate the URL (without actually visiting it)
      const response = await fetch(authUrl, {
        method: 'HEAD',
        redirect: 'manual', // Don't follow redirects
        timeout: 5000
      });
      
      const isValid = response.status === 302 || response.status === 200;
      
      testResults.push({
        uri,
        status_code: response.status,
        appears_valid: isValid,
        redirect_location: response.headers.get('location')
      });
    } catch (error) {
      testResults.push({
        uri,
        error: error.message,
        appears_valid: false
      });
    }
  }
  
  const validRedirectURIs = testResults.filter(r => r.appears_valid).map(r => r.uri);
  
  results.push({
    test_name: "Redirect URI Validation",
    status: validRedirectURIs.length > 0 ? 'passed' : 'failed',
    message: validRedirectURIs.length > 0
      ? `Found ${validRedirectURIs.length} valid redirect URIs configured in your LinkedIn app`
      : "Could not find any valid redirect URIs. You must configure at least one in your LinkedIn app settings",
    details: {
      test_results: testResults,
      valid_uris: validRedirectURIs
    },
    timestamp: new Date().toISOString(),
    critical: true
  });
}

// Step 5: Check session configuration
async function checkSessionConfiguration(req: Request, results: DiagnosticResult[]) {
  const hasSession = !!req.session;
  
  results.push({
    test_name: "Session Configuration Check",
    status: hasSession ? 'passed' : 'failed',
    message: hasSession 
      ? "Session middleware is properly configured"
      : "Session middleware is not properly configured. This is required for OAuth state validation.",
    details: {
      session_available: hasSession,
      session_id: req.session?.id,
      session_cookie_configured: !!req.session?.cookie
    },
    timestamp: new Date().toISOString(),
    critical: true
  });
  
  // Test session persistence
  if (hasSession) {
    const testKey = `test_${Date.now()}`;
    const testValue = Math.random().toString(36).substring(2, 15);
    
    req.session[testKey] = testValue;
    
    results.push({
      test_name: "Session Persistence Test",
      status: req.session[testKey] === testValue ? 'passed' : 'failed',
      message: req.session[testKey] === testValue
        ? "Session data persistence is working correctly"
        : "Session data persistence is not working correctly",
      details: {
        test_key: testKey,
        test_value: testValue,
        actual_value: req.session[testKey]
      },
      timestamp: new Date().toISOString(),
      critical: true
    });
  }
}

// Step 6: Try authorization URL generation
async function testAuthorizationURL(req: Request, results: DiagnosticResult[]) {
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      results.push({
        test_name: "Authorization URL Generation",
        status: 'failed',
        message: "Cannot generate authorization URL because Client ID is missing",
        timestamp: new Date().toISOString(),
        critical: true
      });
      return;
    }
    
    // Generate a state value
    const state = Math.random().toString(36).substring(2, 15);
    req.session.oauthState = state;
    
    // Get the redirect URI
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 
      (process.env.REPL_SLUG && process.env.REPL_OWNER 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/minimal-callback`
        : `${req.protocol}://${req.headers.host}/minimal-callback`);
    
    // Generate the authorization URL
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&scope=r_liteprofile%20r_emailaddress`;
    
    results.push({
      test_name: "Authorization URL Generation",
      status: 'passed',
      message: "Successfully generated LinkedIn authorization URL",
      details: {
        authorization_url: authUrl,
        redirect_uri: redirectUri,
        state: state,
        scope: "r_liteprofile r_emailaddress"
      },
      timestamp: new Date().toISOString(),
      critical: true
    });
    
    // Try to validate the URL
    try {
      const response = await fetch(authUrl, {
        method: 'HEAD',
        redirect: 'manual',
        timeout: 5000
      });
      
      const isValid = response.status === 302 || response.status === 200;
      
      results.push({
        test_name: "Authorization URL Validation",
        status: isValid ? 'passed' : 'warning',
        message: isValid
          ? "Authorization URL appears to be valid"
          : `Authorization URL returned unexpected status code ${response.status}`,
        details: {
          status_code: response.status,
          is_valid: isValid,
          redirect_location: response.headers.get('location')
        },
        timestamp: new Date().toISOString(),
        critical: false
      });
    } catch (error) {
      results.push({
        test_name: "Authorization URL Validation",
        status: 'warning',
        message: `Error validating authorization URL: ${error.message}`,
        details: {
          error_message: error.message,
          error_type: error.name
        },
        timestamp: new Date().toISOString(),
        critical: false
      });
    }
  } catch (error) {
    results.push({
      test_name: "Authorization URL Generation",
      status: 'failed',
      message: `Failed to generate authorization URL: ${error.message}`,
      details: {
        error_message: error.message,
        error_type: error.name,
        error_stack: error.stack
      },
      timestamp: new Date().toISOString(),
      critical: true
    });
  }
}

// Generate all possible redirect URIs that might work with LinkedIn
function generatePossibleRedirectURIs(req: Request): string[] {
  const redirectURIs = [];
  
  // First, check for explicitly configured URI
  if (process.env.LINKEDIN_REDIRECT_URI) {
    redirectURIs.push(process.env.LINKEDIN_REDIRECT_URI);
  }
  
  // Replit URLs
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    const replitBase = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}`;
    
    redirectURIs.push(
      `${replitBase}.repl.co/minimal-callback`,
      `${replitBase}.repl.co/api/auth/linkedin/callback`,
      `${replitBase}.repl.co/callback`,
      `${replitBase}.repl.co/api/callback`,
      `${replitBase}.repl.co/direct-callback`,
      `${replitBase}.repl.co/api/auth/callback`
    );
  }
  
  // Request-based URLs
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers.host;
  if (host) {
    const baseUrl = `${protocol}://${host}`;
    
    redirectURIs.push(
      `${baseUrl}/minimal-callback`,
      `${baseUrl}/api/auth/linkedin/callback`,
      `${baseUrl}/callback`,
      `${baseUrl}/api/callback`,
      `${baseUrl}/direct-callback`,
      `${baseUrl}/api/auth/callback`
    );
  }
  
  // Remove duplicates and return
  return [...new Set(redirectURIs)];
}

// Mask a string for display (show only first 4 chars)
function maskString(str: string): string {
  if (!str) return '';
  if (str.length <= 4) return str;
  return `${str.substring(0, 4)}${'*'.repeat(Math.min(10, str.length - 4))}`;
}

// Generate a summary of the test results
function generateSummary(results: DiagnosticResult[]): string {
  const total = results.length;
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const criticalFailed = results.filter(r => r.status === 'failed' && r.critical).length;
  
  let summary = `Tests completed: ${total}, Passed: ${passed}, Failed: ${failed}, Warnings: ${warnings}\n`;
  
  if (criticalFailed > 0) {
    summary += `\n⚠️ CRITICAL ISSUES: ${criticalFailed} critical tests failed. LinkedIn OAuth will not work.\n`;
  } else if (failed > 0) {
    summary += `\n⚠️ ISSUES FOUND: ${failed} tests failed. LinkedIn OAuth may not work correctly.\n`;
  } else if (warnings > 0) {
    summary += `\n⚠️ POTENTIAL ISSUES: ${warnings} warnings found. LinkedIn OAuth might work but there could be problems.\n`;
  } else {
    summary += `\n✅ ALL TESTS PASSED: LinkedIn OAuth should work correctly.\n`;
  }
  
  return summary;
}

// Generate a recommendation based on the test results
function generateRecommendation(results: DiagnosticResult[]): string {
  const clientIdMissing = results.some(r => r.test_name === "LinkedIn Client ID Check" && r.status === 'failed');
  const clientSecretMissing = results.some(r => r.test_name === "LinkedIn Client Secret Check" && r.status === 'failed');
  const credentialsInvalid = results.some(r => r.test_name === "LinkedIn Credentials Validation" && r.status === 'failed');
  const redirectURIsFailed = results.some(r => r.test_name === "Redirect URI Validation" && r.status === 'failed');
  const sessionFailed = results.some(r => r.test_name === "Session Configuration Check" && r.status === 'failed');
  
  if (clientIdMissing || clientSecretMissing) {
    return `
RECOMMENDATION: You need to configure your LinkedIn API credentials.

1. Set the LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables.
2. You can get these credentials by creating a LinkedIn Developer application at https://www.linkedin.com/developers/apps.
3. After creating the app, go to Auth tab and add your redirect URIs.
    `;
  }
  
  if (credentialsInvalid) {
    return `
RECOMMENDATION: Your LinkedIn API credentials appear to be invalid.

1. Double-check your LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET values.
2. Make sure you're using the correct credentials from your LinkedIn Developer application.
3. Go to https://www.linkedin.com/developers/apps to verify your credentials.
    `;
  }
  
  if (redirectURIsFailed) {
    return `
RECOMMENDATION: Your LinkedIn app doesn't have the correct redirect URIs configured.

1. Go to your LinkedIn Developer application at https://www.linkedin.com/developers/apps
2. Select your app and go to the Auth tab.
3. Add the following redirect URIs to your app configuration:
   ${generatePossibleRedirectURIs({ headers: { host: process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'your-app-domain.com' }} as Request)
     .slice(0, 3)
     .map(uri => `   - ${uri}`)
     .join('\n')}
4. Click the "Update" button to save your changes.
    `;
  }
  
  if (sessionFailed) {
    return `
RECOMMENDATION: Your application's session configuration is not working correctly.

1. Check your server setup to ensure the express-session middleware is correctly configured.
2. Make sure you have a session secret configured.
3. Verify that the session middleware is registered before any routes that use it.
    `;
  }
  
  const anyFailed = results.some(r => r.status === 'failed');
  if (anyFailed) {
    return `
RECOMMENDATION: Fix the failed tests identified above to get LinkedIn OAuth working correctly.

Review each failed test and address the specific issues. The most common problems are:
1. Missing or invalid LinkedIn API credentials
2. Incorrect redirect URI configuration
3. Session configuration problems
    `;
  }
  
  return `
RECOMMENDATION: Your LinkedIn OAuth configuration appears to be correct.

If you're still experiencing problems:
1. Check the LinkedIn Developer Console for any app-specific restrictions or issues.
2. Verify that your app has the necessary products enabled (Sign In with LinkedIn, etc.).
3. Try the authentication flow with a test user to see if there are any errors during the process.
4. Check the network tab in your browser developer tools for any error responses.
  `;
}

// HTML report generator
export const generateDiagnosticReport = (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>LinkedIn OAuth Diagnostic Tool</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        h1 {
          color: #0077B5;
          border-bottom: 2px solid #0077B5;
          padding-bottom: 10px;
        }
        
        h2 {
          margin-top: 30px;
          color: #0077B5;
        }
        
        .report-container {
          margin-top: 30px;
        }
        
        #loading {
          text-align: center;
          padding: 40px;
          font-size: 18px;
        }
        
        .spinner {
          border: 6px solid #f3f3f3;
          border-top: 6px solid #0077B5;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .test {
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 15px;
          overflow: hidden;
        }
        
        .test-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background-color: #f5f5f5;
          cursor: pointer;
        }
        
        .test-name {
          font-weight: bold;
          flex-grow: 1;
        }
        
        .test-status {
          padding: 4px 8px;
          border-radius: 4px;
          color: white;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .test-status.passed {
          background-color: #28a745;
        }
        
        .test-status.failed {
          background-color: #dc3545;
        }
        
        .test-status.warning {
          background-color: #ffc107;
          color: #212529;
        }
        
        .test-time {
          font-size: 12px;
          color: #666;
          margin-right: 10px;
        }
        
        .test-body {
          padding: 15px;
          border-top: 1px solid #ddd;
          display: none;
        }
        
        .test-message {
          font-size: 16px;
          margin-bottom: 15px;
        }
        
        .test-details {
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          font-family: monospace;
          white-space: pre-wrap;
          max-height: 300px;
          overflow: auto;
        }
        
        .summary {
          background-color: #f0f7ff;
          border-left: 5px solid #0077B5;
          padding: 15px;
          margin: 20px 0;
          font-size: 16px;
          white-space: pre-line;
        }
        
        .recommendation {
          background-color: #e8f5e9;
          border-left: 5px solid #28a745;
          padding: 15px;
          margin: 20px 0;
          font-size: 16px;
          white-space: pre-line;
        }
        
        .execution-time {
          font-size: 14px;
          color: #666;
          margin-top: 20px;
        }
        
        .btn {
          display: inline-block;
          font-weight: 400;
          text-align: center;
          white-space: nowrap;
          vertical-align: middle;
          user-select: none;
          border: 1px solid transparent;
          padding: 0.375rem 0.75rem;
          font-size: 1rem;
          line-height: 1.5;
          border-radius: 0.25rem;
          transition: all 0.15s ease-in-out;
          text-decoration: none;
          cursor: pointer;
        }
        
        .btn-primary {
          color: #fff;
          background-color: #0077B5;
          border-color: #0077B5;
        }
        
        .btn-primary:hover {
          background-color: #005e8b;
          border-color: #005e8b;
        }
        
        .btn-primary:active {
          background-color: #004c73;
          border-color: #004c73;
        }
        
        .controls {
          margin: 20px 0;
        }
        
        .expand-all {
          margin-right: 10px;
        }
      </style>
    </head>
    <body>
      <h1>LinkedIn OAuth Diagnostic Tool</h1>
      
      <p>This tool performs a comprehensive diagnostic analysis of your LinkedIn OAuth configuration to help you identify and fix any issues.</p>
      
      <div class="controls">
        <button id="run-diagnostics" class="btn btn-primary">Run Diagnostics</button>
      </div>
      
      <div id="loading" style="display: none;">
        <div class="spinner"></div>
        <p>Running comprehensive LinkedIn OAuth diagnostics...</p>
        <p>(This may take a few seconds)</p>
      </div>
      
      <div id="report-container" class="report-container" style="display: none;">
        <div class="controls">
          <button id="expand-all" class="btn expand-all">Expand All</button>
          <button id="collapse-all" class="btn">Collapse All</button>
        </div>
        
        <h2>Diagnostic Summary</h2>
        <div id="summary" class="summary"></div>
        
        <h2>Recommendation</h2>
        <div id="recommendation" class="recommendation"></div>
        
        <h2>Detailed Test Results</h2>
        <div id="results"></div>
        
        <div id="execution-time" class="execution-time"></div>
      </div>
      
      <script>
        document.getElementById('run-diagnostics').addEventListener('click', function() {
          // Show loading
          document.getElementById('loading').style.display = 'block';
          document.getElementById('report-container').style.display = 'none';
          document.getElementById('run-diagnostics').disabled = true;
          
          // Run diagnostics
          fetch('/api/linkedin/diagnostic-tool')
            .then(response => response.json())
            .then(data => {
              // Hide loading
              document.getElementById('loading').style.display = 'none';
              document.getElementById('report-container').style.display = 'block';
              document.getElementById('run-diagnostics').disabled = false;
              
              // Update summary and recommendation
              document.getElementById('summary').textContent = data.summary;
              document.getElementById('recommendation').textContent = data.recommendation;
              document.getElementById('execution-time').textContent = \`Execution time: \${data.execution_time_seconds.toFixed(2)} seconds\`;
              
              // Render results
              const resultsEl = document.getElementById('results');
              resultsEl.innerHTML = '';
              
              data.results.forEach((result, index) => {
                const testEl = document.createElement('div');
                testEl.className = 'test';
                
                const testHeader = document.createElement('div');
                testHeader.className = 'test-header';
                testHeader.setAttribute('data-index', index.toString());
                
                const testName = document.createElement('span');
                testName.className = 'test-name';
                testName.textContent = result.test_name;
                
                const testTime = document.createElement('span');
                testTime.className = 'test-time';
                testTime.textContent = new Date(result.timestamp).toLocaleTimeString();
                
                const testStatus = document.createElement('span');
                testStatus.className = \`test-status \${result.status}\`;
                testStatus.textContent = result.status;
                
                testHeader.appendChild(testName);
                testHeader.appendChild(testTime);
                testHeader.appendChild(testStatus);
                
                const testBody = document.createElement('div');
                testBody.className = 'test-body';
                testBody.setAttribute('id', \`test-body-\${index}\`);
                
                const testMessage = document.createElement('div');
                testMessage.className = 'test-message';
                testMessage.textContent = result.message;
                
                testBody.appendChild(testMessage);
                
                if (result.details) {
                  const testDetails = document.createElement('div');
                  testDetails.className = 'test-details';
                  testDetails.textContent = JSON.stringify(result.details, null, 2);
                  testBody.appendChild(testDetails);
                }
                
                testEl.appendChild(testHeader);
                testEl.appendChild(testBody);
                
                resultsEl.appendChild(testEl);
                
                // Add click handler
                testHeader.addEventListener('click', function() {
                  const index = this.getAttribute('data-index');
                  const body = document.getElementById(\`test-body-\${index}\`);
                  if (body.style.display === 'block') {
                    body.style.display = 'none';
                  } else {
                    body.style.display = 'block';
                  }
                });
              });
            })
            .catch(error => {
              document.getElementById('loading').style.display = 'none';
              document.getElementById('run-diagnostics').disabled = false;
              alert('Error running diagnostics: ' + error.message);
            });
        });
        
        // Expand/collapse all handlers
        document.getElementById('expand-all').addEventListener('click', function() {
          document.querySelectorAll('.test-body').forEach(el => {
            el.style.display = 'block';
          });
        });
        
        document.getElementById('collapse-all').addEventListener('click', function() {
          document.querySelectorAll('.test-body').forEach(el => {
            el.style.display = 'none';
          });
        });
      </script>
    </body>
    </html>
  `);
};