import { analyzeDocument, fetchWebContent, callOpenAIWithJSON } from "../utils/openai";
import { AgentThought } from "../../client/src/types";

// Profiling agent that analyzes resumes and LinkedIn profiles
export async function analyzeResume(resumeText: string, linkedinUrl: string | null) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Profile Analyzer",
    thought: "Starting analysis of the candidate's resume to understand their skills, experiences, and achievements.",
    sourcesConsulted: ["Resume document"]
  });
  
  const systemPrompt = `
    You are an expert Profiling agent. Your task is to carefully analyze a candidate's resume and LinkedIn profile
    to understand their skills, experiences, achievements, and overall professional profile.
    
    Think like a recruiter, hiring manager, and career coach all at once.
    
    Analyze the following aspects:
    1. Professional experience and job history
    2. Technical skills and proficiency levels
    3. Notable achievements and impact delivered (with quantitative measures when available)
    4. Education and certifications
    5. Soft skills and leadership capabilities
    6. Career progression and growth pattern
    7. Areas of expertise and specialization
    8. Any potential gaps or areas for improvement in their profile
    
    IMPORTANT: Extract SPECIFIC and DETAILED content from the resume. Focus on capturing:
    - Quantitative metrics (percentages, numbers, dollar amounts, team sizes)
    - Specific project names and methodologies used
    - Direct quotes of technical terms, tools, and technologies
    - Exact timeframes and company names
    - Verbatim achievements exactly as written on the resume
    
    If a LinkedIn URL is provided, mention that it was considered in your analysis.
    
    Respond with a JSON object containing these details organized in a structured format.
    
    JSON Format:
    {
      "professionalExperience": [
        {
          "company": "Company Name",
          "title": "Job Title",
          "period": "Start date - End date",
          "description": "Detailed description exactly as written in resume",
          "verbatimResponsibilities": ["Direct quote 1", "Direct quote 2", ...],
          "verbatimAchievements": ["Direct metric 1", "Direct metric 2", ...]
        },
        ...
      ],
      "technicalSkills": ["skill1 (proficiency)", "skill2 (proficiency)", ...],
      "quantifiableAchievements": [
        {
          "company": "Company Name",
          "achievement": "Direct quote of achievement with metrics",
          "metrics": ["metric1", "metric2", ...]
        },
        ...
      ],
      "education": ["edu1", "edu2", ...],
      "certifications": ["cert1", "cert2", ...],
      "softSkills": ["skill1", "skill2", ...],
      "careerProgression": "string description",
      "areasOfExpertise": ["area1", "area2", ...],
      "potentialGaps": ["gap1", "gap2", ...],
      "overallAssessment": "string with brief assessment",
      "rawHighlights": [
        "Direct quote 1 with context (company, role, etc.)",
        "Direct quote 2 with context",
        ...
      ]
    }
  `;

  try {
    let resumeAnalysis;
    let linkedinAnalysis = null;
    
    // Analyze resume
    thoughts.push({
      timestamp: Date.now(),
      agent: "Profile Analyzer",
      thought: "Performing semantic analysis of resume content, looking for key skills, experiences, and achievements.",
      sourcesConsulted: ["Resume document"]
    });
    
    resumeAnalysis = await analyzeDocument(resumeText, systemPrompt);
    
    // If LinkedIn URL is provided, analyze that as well
    if (linkedinUrl) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Profile Analyzer",
        thought: "LinkedIn profile URL was provided. I'll extract additional information to enrich my understanding of the candidate's background.",
        sourcesConsulted: [linkedinUrl]
      });
      
      const linkedinPrompt = `
        You are an expert LinkedIn Profile Analyzer. Extract detailed information from this LinkedIn profile
        with a focus on aspects that might not be fully covered in a traditional resume:
        
        1. Professional network size and connections
        2. Endorsements and recommendations
        3. Activity and engagement (posts, articles, comments)
        4. Groups and communities they're part of
        5. Volunteering and causes they care about
        6. Projects they've highlighted
        7. Additional skills or interests
        
        Respond with a JSON object containing these details, focusing on information that would
        complement a traditional resume.
        
        JSON Format:
        {
          "networkInfo": "string with size and quality assessment",
          "endorsements": ["endorsement1", "endorsement2", ...],
          "recommendations": ["rec1", "rec2", ...],
          "activity": "string describing profile activity",
          "groupsAndCommunities": ["group1", "group2", ...],
          "volunteering": ["activity1", "activity2", ...],
          "projects": ["project1", "project2", ...],
          "additionalSkills": ["skill1", "skill2", ...],
          "interests": ["interest1", "interest2", ...]
        }
      `;
      
      try {
        linkedinAnalysis = await fetchWebContent(linkedinUrl, linkedinPrompt);
        
        thoughts.push({
          timestamp: Date.now(),
          agent: "Profile Analyzer",
          thought: "Successfully extracted additional professional information from LinkedIn profile.",
          sourcesConsulted: [linkedinUrl]
        });
        
        // Combine the analyses
        const combinedAnalysis = await callOpenAIWithJSON(`
          You are an expert Resume and LinkedIn Profile Analyzer.
          I have two separate analyses - one from a resume and one from a LinkedIn profile for the same person.
          Combine these into a comprehensive analysis, ensuring there's no duplication and the information is organized cohesively.
          
          Resume Analysis:
          ${JSON.stringify(resumeAnalysis)}
          
          LinkedIn Analysis:
          ${JSON.stringify(linkedinAnalysis)}
          
          Create a new combined JSON using the same structure as the Resume Analysis but enhanced with the LinkedIn data.
        `);
        
        thoughts.push({
          timestamp: Date.now(),
          agent: "Profile Analyzer",
          thought: "Successfully combined resume and LinkedIn profile analyses for a comprehensive understanding of the candidate.",
          sourcesConsulted: ["Resume document", linkedinUrl]
        });
        
        return { analysis: combinedAnalysis, thoughts };
      } catch (error: any) {
        thoughts.push({
          timestamp: Date.now(),
          agent: "Profile Analyzer",
          thought: "Encountered an issue analyzing the LinkedIn profile. Continuing with just the resume analysis.",
          sourcesConsulted: [linkedinUrl]
        });
        
        console.warn("Error analyzing LinkedIn profile:", error.message);
        return { analysis: resumeAnalysis, thoughts };
      }
    }
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Profile Analyzer",
      thought: "Successfully completed analysis of the candidate's resume.",
      sourcesConsulted: ["Resume document"]
    });
    
    return { analysis: resumeAnalysis, thoughts };
  } catch (error: any) {
    console.error("Error in profiler agent:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Profile Analyzer",
      thought: `Error analyzing resume: ${error.message}`,
      sourcesConsulted: ["Resume document"]
    });
    
    throw new Error("Failed to analyze resume: " + error.message);
  }
}

// Function to perform semantic search for specific skills or experiences
export async function findSpecificSkills(resumeText: string, skillsToFind: string[]) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Profile Analyzer",
    thought: `Performing semantic search for specific skills: ${skillsToFind.join(", ")}`,
    sourcesConsulted: ["Resume document"]
  });
  
  const systemPrompt = `
    You are an expert at semantic search in resumes. For each of the following skills or experiences,
    find relevant evidence in the resume that demonstrates the candidate's proficiency or experience.
    
    Skills to search for: ${skillsToFind.join(", ")}
    
    For each skill:
    1. Determine if there's direct evidence in the resume
    2. Look for indirect evidence or transferable skills
    3. Estimate the proficiency level based on the evidence
    
    Respond with a JSON object with the skills as keys and the assessment as values.
    
    JSON Format:
    {
      "skill1": {
        "found": boolean,
        "directEvidence": "string or null",
        "indirectEvidence": "string or null",
        "estimatedProficiency": "Beginner|Intermediate|Advanced|Expert|Not Found"
      },
      // repeat for each skill
    }
  `;
  
  try {
    const skillsAnalysis = await analyzeDocument(resumeText, systemPrompt);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Profile Analyzer",
      thought: "Completed semantic search for specified skills in the resume.",
      sourcesConsulted: ["Resume document"]
    });
    
    return { analysis: skillsAnalysis, thoughts };
  } catch (error) {
    console.error("Error in skills search:", error);
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Profile Analyzer",
      thought: `Error searching for specific skills: ${error.message}`,
      sourcesConsulted: ["Resume document"]
    });
    
    throw new Error("Failed to search for specific skills: " + error.message);
  }
}
