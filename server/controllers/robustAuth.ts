import { Request, Response, NextFunction } from "express";
import { LinkedInProvider, LinkedInOAuthError, LinkedInProfile } from "../auth/linkedinProvider";
import { storage } from "../storage";
import { detectDomain, logDomainInfo } from "../utils/domainDetector";

// Custom error handler for LinkedIn OAuth
function linkedInErrorHandler(error: LinkedInOAuthError, req: Request, res: Response): void {
  console.error('LinkedIn OAuth Error:', error);
  
  // Log detailed diagnostic information for debugging
  const diagnostics = {
    error,
    session: req.session ? {
      hasSession: true,
      hasLinkedInState: !!req.session.linkedinOAuth,
      cookieMaxAge: req.session.cookie?.maxAge
    } : {
      hasSession: false
    },
    headers: {
      host: req.headers.host,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']
    },
    connection: {
      remoteAddress: req.connection.remoteAddress,
      secure: req.secure
    },
    domain: detectDomain(req)
  };
  
  console.log('OAuth Diagnostics:', JSON.stringify(diagnostics, null, 2));
  
  // Redirect to error page with descriptive information
  res.redirect(`/auth-error.html?error=${encodeURIComponent(error.message)}&stage=${error.stage}`);
}

// Initialize LinkedIn Provider
const linkedInProvider = new LinkedInProvider({
  clientId: process.env.LINKEDIN_CLIENT_ID || '',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
  callbackPath: '/api/auth/linkedin/robust-callback',
  scope: 'r_liteprofile r_emailaddress',
  handleError: linkedInErrorHandler
});

/**
 * User profile handler - creates or retrieves user account
 */
async function handleUserProfile(profile: LinkedInProfile, req: Request, res: Response, next: NextFunction) {
  try {
    // Check if user already exists
    let user = await storage.getUserByLinkedInId(profile.id);
    
    if (!user) {
      // Create new user if not exists
      user = await storage.createUserFromLinkedIn({
        linkedinId: profile.id,
        username: `${profile.firstName.toLowerCase()}.${profile.lastName.toLowerCase()}`,
        email: profile.email || `${profile.id}@linkedin.user`,
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
      
      console.log('Created new user from LinkedIn profile:', {
        id: user.id,
        username: user.username,
        linkedinId: profile.id
      });
    } else {
      console.log('Found existing user:', {
        id: user.id,
        username: user.username,
        linkedinId: profile.id
      });
    }
    
    // Login user (set in session)
    req.session.userId = user.id;
    
    // Redirect to home page or a success page
    res.redirect('/');
  } catch (error) {
    console.error('Error processing LinkedIn user profile:', error);
    next(error);
  }
}

/**
 * Get LinkedIn authorization URL
 */
export const getLinkedInRobustAuthUrl = (req: Request, res: Response) => {
  try {
    // Log domain information for debugging
    logDomainInfo(req, '/api/auth/linkedin/robust-callback');
    
    // Generate LinkedIn authorization URL
    const authUrl = linkedInProvider.generateAuthUrl(req);
    res.json({ url: authUrl });
  } catch (error) {
    console.error('Error generating LinkedIn auth URL:', error);
    res.status(500).json({ error: 'Failed to generate LinkedIn authorization URL' });
  }
};

/**
 * Handle LinkedIn OAuth callback
 */
export const handleLinkedInRobustCallback = linkedInProvider.handleCallback(handleUserProfile);

/**
 * Custom login page renderer
 */
export const renderAuthPage = (req: Request, res: Response) => {
  // Check if we have an error
  const error = req.query.error;
  const errorStage = req.query.stage;
  
  // If user is already logged in, redirect to home
  if (req.session.userId) {
    return res.redirect('/');
  }
  
  // Send the auth page HTML
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign In - PrepTalk</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          margin: 0;
          padding: 0;
          background: #f7f9fc;
          color: #333;
          line-height: 1.6;
        }
        
        .container {
          min-height: 100vh;
          display: flex;
        }
        
        .left-panel {
          background: white;
          width: 50%;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .right-panel {
          background: linear-gradient(135deg, #0077B5, #6e5dc6);
          width: 50%;
          padding: 40px;
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        h1 {
          font-size: 32px;
          margin-bottom: 20px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .linkedin-button {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0077B5;
          color: white;
          border: none;
          padding: 15px 25px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s ease;
          text-decoration: none;
          margin-bottom: 20px;
        }
        
        .linkedin-button:hover {
          background: #005e93;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 119, 181, 0.2);
        }
        
        .linkedin-icon {
          margin-right: 10px;
          font-size: 20px;
        }
        
        .error-message {
          background: #ffefef;
          color: #e74c3c;
          padding: 10px 15px;
          border-radius: 4px;
          margin-bottom: 20px;
          display: ${error ? 'block' : 'none'};
        }
        
        .alternative {
          margin-top: 20px;
          text-align: center;
          color: #777;
          font-size: 14px;
        }
        
        .divider {
          display: flex;
          align-items: center;
          margin: 30px 0;
          color: #777;
        }
        
        .divider:before, .divider:after {
          content: "";
          flex: 1;
          border-bottom: 1px solid #ddd;
        }
        
        .divider:before {
          margin-right: 10px;
        }
        
        .divider:after {
          margin-left: 10px;
        }
        
        .manual-button {
          display: block;
          text-align: center;
          padding: 15px 25px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          color: #555;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        
        .manual-button:hover {
          background: #f5f5f5;
          border-color: #aaa;
        }
        
        .features {
          margin-top: 40px;
        }
        
        .feature {
          display: flex;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .feature-icon {
          margin-right: 15px;
          font-size: 24px;
          color: rgba(255, 255, 255, 0.9);
        }
        
        @media (max-width: 768px) {
          .container {
            flex-direction: column;
          }
          
          .left-panel, .right-panel {
            width: 100%;
            padding: 30px 20px;
          }
          
          .right-panel {
            order: -1;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="left-panel">
          <h1>Sign in to PrepTalk</h1>
          <p>Prepare for your next interview with AI-powered coaching</p>
          
          <div class="error-message" id="error-message">
            ${error ? `Error: ${error}` : ''}
          </div>
          
          <div class="form-group">
            <a href="#" id="linkedin-login" class="linkedin-button">
              <span class="linkedin-icon">in</span>
              Continue with LinkedIn
            </a>
          </div>
          
          <div class="divider">or</div>
          
          <div class="form-group">
            <a href="/auth?method=manual" class="manual-button">
              Continue without LinkedIn
            </a>
          </div>
          
          <div class="alternative">
            <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </div>
        
        <div class="right-panel">
          <h1>Ace Your Next Interview</h1>
          <p>PrepTalk provides personalized interview preparation using AI to analyze job postings and your experience.</p>
          
          <div class="features">
            <div class="feature">
              <div class="feature-icon">✓</div>
              <div>
                <h3>Smart Analysis</h3>
                <p>We analyze job postings to understand what employers are looking for.</p>
              </div>
            </div>
            
            <div class="feature">
              <div class="feature-icon">✓</div>
              <div>
                <h3>Personalized Questions</h3>
                <p>Get custom interview questions tailored to your experience and the role.</p>
              </div>
            </div>
            
            <div class="feature">
              <div class="feature-icon">✓</div>
              <div>
                <h3>Perfect Your Responses</h3>
                <p>Practice and get feedback on your answers to improve your interview skills.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        // Handle LinkedIn login
        document.getElementById('linkedin-login').addEventListener('click', async (e) => {
          e.preventDefault();
          
          try {
            // Show loading state
            const button = document.getElementById('linkedin-login');
            button.textContent = 'Connecting to LinkedIn...';
            button.style.opacity = '0.7';
            button.style.pointerEvents = 'none';
            
            // Get LinkedIn authorization URL
            const response = await fetch('/api/auth/linkedin/robust-url');
            const data = await response.json();
            
            if (data.url) {
              // Redirect to LinkedIn authorization
              window.location.href = data.url;
            } else {
              throw new Error('Failed to get LinkedIn authorization URL');
            }
          } catch (error) {
            console.error('LinkedIn login error:', error);
            
            // Show error message
            const errorMessage = document.getElementById('error-message');
            errorMessage.textContent = 'Error connecting to LinkedIn. Please try again.';
            errorMessage.style.display = 'block';
            
            // Reset button
            const button = document.getElementById('linkedin-login');
            button.innerHTML = '<span class="linkedin-icon">in</span> Continue with LinkedIn';
            button.style.opacity = '1';
            button.style.pointerEvents = 'auto';
          }
        });
        
        // Show error message if present in URL
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        
        if (error) {
          const errorMessage = document.getElementById('error-message');
          errorMessage.textContent = 'Error: ' + error;
          errorMessage.style.display = 'block';
        }
      </script>
    </body>
    </html>
  `);
};

/**
 * Logout user
 */
export const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    
    res.redirect('/auth');
  });
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const user = await storage.getUser(req.session.userId);
    
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Don't send sensitive information to the client
    const { password, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};