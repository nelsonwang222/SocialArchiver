export interface AnalyzedPost {
  platform: string;
  content: string;
  keywords: string[];
  originalLink: string;
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
