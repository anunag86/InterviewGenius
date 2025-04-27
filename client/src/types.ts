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
}

export interface AgentThought {
  timestamp: number;
  agent: string;
  thought: string;
  sourcesConsulted?: string[];
}

export interface InterviewPrep {
  id?: string;
  jobDetails: JobDetails;
  companyInfo: CompanyInfo;
  candidateHighlights: CandidateHighlights;
  interviewRounds: InterviewRound[];
  agentThoughts?: AgentThought[];
}

export enum QuestionType {
  BEHAVIORAL = 'behavioral',
  TECHNICAL = 'technical',
  ROLE_SPECIFIC = 'role-specific'
}

// Updated to match the new agent architecture
export enum AgentStep {
  JOB_RESEARCH = 0,
  PROFILE_ANALYSIS = 1,
  HIGHLIGHT_GENERATION = 2,
  COMPANY_RESEARCH = 3,
  INTERVIEW_PATTERN_RESEARCH = 4,
  QUESTION_GENERATION = 5,
  QUALITY_CHECK = 6,
  COMPLETED = 7
}
