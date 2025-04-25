import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY environment variable not set. Set this variable for full functionality.");
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export async function callOpenAIWithJSON<T>(
  prompt: string,
  systemPrompt: string
): Promise<T> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content) as T;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(`Failed to get response from OpenAI: ${error.message}`);
  }
}

export async function analyzeDocument(
  text: string,
  systemPrompt: string
): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI API error during document analysis:", error);
    throw new Error(`Failed to analyze document with OpenAI: ${error.message}`);
  }
}

export async function fetchWebContent(
  url: string,
  systemPrompt: string
): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Analyze the content at this URL: ${url}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI API error during web content analysis:", error);
    throw new Error(`Failed to analyze web content with OpenAI: ${error.message}`);
  }
}

export async function combineResults(
  jobAnalysis: any,
  resumeAnalysis: any,
  systemPrompt: string
): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Job Analysis: ${JSON.stringify(jobAnalysis)}\n\nResume Analysis: ${JSON.stringify(resumeAnalysis)}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI API error during result combination:", error);
    throw new Error(`Failed to combine results with OpenAI: ${error.message}`);
  }
}

export default openai;
