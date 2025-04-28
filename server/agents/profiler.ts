import { analyzeDocument, fetchWebContent, callOpenAIWithJSON } from "../utils/openai";
import { AgentThought } from "../../client/src/types";

/**
 * Profiling agent that analyzes resumes and LinkedIn profiles
 * 
 * This agent performs semantic search over the user's resume to understand
 * their skills, job roles, and achievements. It extracts specific metrics,
 * responsibilities, and project details including exact quotes for talking points.
 */
export async function analyzeResume(resumeText: string, linkedinUrl: string | null) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Profile Analyzer",
    thought: "Starting comprehensive analysis of the candidate's resume to understand their skills, experiences, and achievements.",
    sourcesConsulted: ["Resume document"]
  });
  
  const systemPrompt = `
    You are an expert Resume Analyzer.
    
    Your task is to analyze this resume in extreme detail, thinking like a recruiter, hiring manager, and career coach.
    Extract every significant detail with precision and thoroughness.
    
    Pay special attention to and extract:
    1. EXACT QUOTES of achievements with metrics (numbers, percentages, dollar amounts, team sizes)
    2. Specific time periods at each company and for each project (MM/YYYY format)
    3. Exact role titles and responsibilities as written
    4. Technical tools, languages, frameworks, and methodologies mentioned
    5. Project names and deliverables with complete context
    6. Evidence of leadership, collaboration, or soft skills
    
    Format your response as a detailed JSON object with these sections:
    
    {
      "professionalExperience": [
        {
          "company": "EXACT Company Name",
          "title": "EXACT Job Title",
          "period": "MM/YYYY - MM/YYYY",
          "description": "Complete description as written in resume",
          "responsibilities": [
            "EXACT QUOTE of responsibility 1",
            "EXACT QUOTE of responsibility 2",
            ...
          ],
          "achievements": [
            {
              "text": "EXACT QUOTE of achievement",
              "metrics": ["metric 1", "metric 2", ...],
              "technologies": ["technology 1", "technology 2", ...]
            },
            ...
          ],
          "projects": [
            {
              "name": "Project name",
              "description": "EXACT QUOTE of project description",
              "technologies": ["tech 1", "tech 2", ...],
              "metrics": ["metric 1", "metric 2", ...]
            },
            ...
          ]
        },
        ...
      ],
      "education": [
        {
          "degree": "EXACT degree name",
          "institution": "Institution name",
          "period": "YYYY - YYYY",
          "achievements": ["achievement 1", "achievement 2", ...]
        },
        ...
      ],
      "skills": {
        "technical": ["skill 1", "skill 2", ...],
        "soft": ["skill 1", "skill 2", ...],
        "certifications": ["certification 1", "certification 2", ...]
      },
      "rawMetrics": [
        "EXACT QUOTE including metric 1",
        "EXACT QUOTE including metric 2",
        ...
      ],
      "keyAchievements": [
        "EXACT QUOTE of major achievement 1",
        "EXACT QUOTE of major achievement 2",
        ...
      ],
      "careerProgression": "Analysis of career progression and growth",
      "standoutQualities": ["quality 1", "quality 2", ...],
      "potentialGaps": ["gap 1", "gap 2", ...]
    }
    
    Do not paraphrase or summarize. For sections requiring exact quotes, use the EXACT text from the resume.
  `;
  
  try {
    let resumeAnalysis;
    let linkedinAnalysis = null;
    
    // Analyze resume
    thoughts.push({
      timestamp: Date.now(),
      agent: "Profile Analyzer",
      thought: "Performing semantic analysis of resume content, extracting specific achievements, metrics, and experience details.",
      sourcesConsulted: ["Resume document"]
    });
    
    resumeAnalysis = await analyzeDocument(resumeText, systemPrompt);
    
    // If LinkedIn URL is provided, analyze that as well
    if (linkedinUrl) {
      thoughts.push({
        timestamp: Date.now(),
        agent: "Profile Analyzer",
        thought: "LinkedIn profile URL provided. Extracting additional professional information to complement resume data.",
        sourcesConsulted: [linkedinUrl]
      });
      
      const linkedinPrompt = `
        You are an expert LinkedIn Profile Analyzer.
        
        Extract detailed information from this LinkedIn profile, focusing on:
        
        1. Professional network size and quality of connections
        2. Specific endorsements and recommendations with exact quotes
        3. Activity (posts, articles) with engagement metrics
        4. Groups and communities they're part of
        5. Volunteering and causes they support
        6. Projects not mentioned in traditional resumes
        7. Additional skills or endorsements
        8. Any metrics or achievements mentioned in the profile but not in a resume
        
        Format your response as a detailed JSON object:
        
        {
          "profileSummary": "Complete profile summary",
          "endorsements": ["skill 1 (count)", "skill 2 (count)", ...],
          "recommendations": [
            {
              "from": "Person name and title",
              "text": "EXACT quote of recommendation"
            },
            ...
          ],
          "activities": [
            {
              "type": "Post/Article/etc",
              "topic": "Topic description",
              "engagement": "Engagement metrics"
            },
            ...
          ],
          "groupsAndCommunities": ["group 1", "group 2", ...],
          "volunteering": ["activity 1", "activity 2", ...],
          "additionalProjects": [
            {
              "name": "Project name",
              "description": "Description",
              "technologies": ["tech 1", "tech 2", ...]
            },
            ...
          ],
          "additionalSkills": ["skill 1", "skill 2", ...],
          "additionalMetrics": [
            "EXACT QUOTE with metric 1",
            "EXACT QUOTE with metric 2",
            ...
          ]
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
          
          Create a combined JSON using the same structure as the Resume Analysis but enhanced with the LinkedIn data.
          Especially focus on additional metrics, achievements, and experiences from LinkedIn that weren't in the resume.
          
          Remember to keep EXACT QUOTES intact and preserve all specific metrics and timeframes.
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
      thought: "Successfully completed comprehensive analysis of the candidate's resume.",
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

/**
 * Perform semantic search for specific skills or experiences in the resume
 * 
 * This function takes a list of skills from the job requirements and searches
 * for evidence of these skills in the resume, including direct and indirect evidence.
 */
export async function findSpecificSkills(resumeText: string, skillsToFind: string[]) {
  const thoughts: AgentThought[] = [];
  
  thoughts.push({
    timestamp: Date.now(),
    agent: "Profile Analyzer",
    thought: `Performing targeted semantic search for ${skillsToFind.length} specific skills required for this position.`,
    sourcesConsulted: ["Resume document"]
  });
  
  const systemPrompt = `
    You are an expert at semantic search in resumes.
    
    For each of the following skills or experiences, find relevant evidence in the resume:
    ${skillsToFind.join(', ')}
    
    For each skill, you must:
    1. Search for DIRECT mentions of the exact skill
    2. Search for INDIRECT evidence of the skill (related technologies, projects, or experiences)
    3. Extract EXACT QUOTES from the resume that demonstrate this skill
    4. Rate the evidence strength (Strong, Moderate, Weak, Not Found)
    5. Estimate proficiency level based on context (Beginner, Intermediate, Advanced, Expert)
    
    Format your response as a JSON object:
    
    {
      "skill1": {
        "directEvidence": "EXACT QUOTE from resume or null",
        "indirectEvidence": ["EXACT QUOTE 1", "EXACT QUOTE 2", ...],
        "evidenceStrength": "Strong/Moderate/Weak/Not Found",
        "estimatedProficiency": "Beginner/Intermediate/Advanced/Expert/Not Found",
        "context": "Where/how the skill was used"
      },
      ...
    }
    
    Focus on finding concrete evidence and don't make assumptions. If there's no evidence for a skill, indicate "Not Found".
  `;
  
  try {
    const skillsAnalysis = await analyzeDocument(resumeText, systemPrompt);
    
    // Count how many skills were found
    let foundCount = 0;
    let notFoundCount = 0;
    
    const typedResults = skillsAnalysis as Record<string, { evidenceStrength: string }>;
    for (const skill in typedResults) {
      if (typedResults[skill].evidenceStrength !== "Not Found") {
        foundCount++;
      } else {
        notFoundCount++;
      }
    }
    
    thoughts.push({
      timestamp: Date.now(),
      agent: "Profile Analyzer",
      thought: `Completed semantic search for ${skillsToFind.length} required skills. Found evidence for ${foundCount} skills. ${notFoundCount} skills were not directly found in the resume.`,
      sourcesConsulted: ["Resume document"]
    });
    
    return { analysis: skillsAnalysis, thoughts };
  } catch (error: any) {
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