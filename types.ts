export interface AnalyzedPost {
  platform: string;
  content: string;
  keywords: string[];
  originalLink: string;
  foundStatusId?: string; // ID found by the AI in the source
}

export interface SheetConfig {
  scriptUrl: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum SaveStatus {
  IDLE = 'IDLE',
  SAVING = 'SAVING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
