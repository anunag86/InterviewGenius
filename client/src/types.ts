export interface InterviewFormData {
  jobUrl: string;
  linkedinUrl: string;
}

export interface JobDetails {
  company: string;
  title: string;
  location: string;
  skills: string[];
}

export interface TalkingPoint {
  id: string;
  text: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  talkingPoints: TalkingPoint[];
}

export interface InterviewRound {
  id: string;
  name: string;
  focus: string;
  questions: InterviewQuestion[];
}

export interface CompanyInfo {
  description: string;
  culture: string[];
  businessFocus: string[];
  teamInfo: string[];
  roleDetails: string[];
  usefulUrls?: string[];
}

export interface CandidateHighlights {
  relevantPoints: string[];
  gapAreas: string[];
  verbatimSkillsAndExperiences?: string[];
  specificMetrics?: string[];
  suggestedTalkingPoints?: Array<{
    skill: string;
    resumeEvidence: string;
    context: string;
  }>;
}

export interface AgentThought {
  timestamp: number;
  agent: string;
  thought: string;
  sourcesConsulted?: string[];
}

// User response for a specific question in SAR format
export interface UserResponse {
  questionId: string;
  roundId: string;
  situation: string;
  action: string;
  result: string;
  updatedAt: string;
}

// Legacy question arrays for backward compatibility
export interface LegacyInterviewQuestions {
  behavioralQuestions?: InterviewQuestion[];
  technicalQuestions?: InterviewQuestion[];
  roleSpecificQuestions?: InterviewQuestion[];
}

export interface InterviewPrep extends Partial<LegacyInterviewQuestions> {
  id?: string;
  jobDetails: JobDetails;
  companyInfo: CompanyInfo;
  candidateHighlights: CandidateHighlights;
  interviewRounds: InterviewRound[];
  agentThoughts?: AgentThought[];
  userResponses?: UserResponse[]; // Added user responses
}

export enum QuestionType {
  BEHAVIORAL = 'behavioral',
  TECHNICAL = 'technical',
  ROLE_SPECIFIC = 'role-specific'
}

// Updated to match the new simplified agentic architecture
export enum AgentStep {
  JOB_RESEARCH = 0,
  PROFILE_ANALYSIS = 1,
  HIGHLIGHT_GENERATION = 2,
  COMPANY_RESEARCH = 3,
  INTERVIEW_PATTERN_RESEARCH = 4,
  INTERVIEWER_AGENT = 5,
  QUALITY_CHECK = 6,
  COMPLETED = 7
}
