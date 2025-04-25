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

export interface InterviewPrep {
  id?: string;
  jobDetails: JobDetails;
  behavioralQuestions: InterviewQuestion[];
  technicalQuestions: InterviewQuestion[];
  roleSpecificQuestions: InterviewQuestion[];
}

export enum QuestionType {
  BEHAVIORAL = 'behavioral',
  TECHNICAL = 'technical',
  ROLE_SPECIFIC = 'role-specific'
}

export enum AgentStep {
  JOB_RESEARCH = 0,
  PROFILE_ANALYSIS = 1,
  QUESTION_GENERATION = 2,
  QUALITY_CHECK = 3,
  COMPLETED = 4
}
