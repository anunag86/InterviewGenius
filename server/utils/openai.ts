import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

// Default system prompt for JSON responses
const DEFAULT_SYSTEM_PROMPT = `
You are an expert AI assistant. Analyze the input and respond with a JSON object.
Format your response as a valid JSON object. Be precise and factual.
`;

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY environment variable not set. Set this variable for full functionality.");
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

/**
 * Call OpenAI API with a prompt and expect a JSON response
 * 
 * @param prompt The user prompt to send to OpenAI
 * @param systemPrompt Optional system prompt (uses default if not provided)
 * @returns Parsed JSON response typed as T
 */
export async function callOpenAIWithJSON<T>(
  prompt: string,
  systemPrompt?: string
): Promise<T> {
  try {
    const finalSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: finalSystemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content) as T;
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    throw new Error(`Failed to get response from OpenAI: ${error.message}`);
  }
}

/**
 * Analyze a document with OpenAI and expect a JSON response
 * 
 * @param text The document text to analyze
 * @param systemPrompt Optional system prompt
 * @returns Parsed JSON response
 */
export async function analyzeDocument<T>(
  text: string,
  systemPrompt?: string
): Promise<T> {
  try {
    const finalSystemPrompt = systemPrompt || 
      `You are an expert document analyzer. Examine the document and extract key information as a JSON object.`;
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: finalSystemPrompt,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content) as T;
  } catch (error: any) {
    console.error("OpenAI API error during document analysis:", error);
    throw new Error(`Failed to analyze document with OpenAI: ${error.message}`);
  }
}

/**
 * Fetch and analyze web content with OpenAI
 * 
 * @param url URL to analyze
 * @param systemPrompt Optional system prompt
 * @returns Parsed JSON response
 */
export async function fetchWebContent<T>(
  url: string,
  systemPrompt?: string
): Promise<T> {
  try {
    const finalSystemPrompt = systemPrompt || 
      `You are an expert web content analyzer. Analyze the content at the given URL and extract key information as a JSON object.`;
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: finalSystemPrompt,
        },
        {
          role: "user",
          content: `Analyze the content at this URL: ${url}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content) as T;
  } catch (error: any) {
    console.error("OpenAI API error during web content analysis:", error);
    throw new Error(`Failed to analyze web content with OpenAI: ${error.message}`);
  }
}

/**
 * Combine job analysis and resume analysis with OpenAI
 * 
 * @param jobAnalysis Job analysis data
 * @param resumeAnalysis Resume analysis data
 * @param systemPrompt Optional system prompt
 * @returns Parsed JSON response
 */
export async function combineResults<T>(
  jobAnalysis: any,
  resumeAnalysis: any,
  systemPrompt?: string
): Promise<T> {
  try {
    const finalSystemPrompt = systemPrompt || 
      `You are an expert job and candidate matcher. Analyze the job and resume data to create a comprehensive match analysis.`;
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: finalSystemPrompt,
        },
        {
          role: "user",
          content: `Job Analysis: ${JSON.stringify(jobAnalysis)}\n\nResume Analysis: ${JSON.stringify(resumeAnalysis)}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content) as T;
  } catch (error: any) {
    console.error("OpenAI API error during result combination:", error);
    throw new Error(`Failed to combine results with OpenAI: ${error.message}`);
  }
}

export default openai;
