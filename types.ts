
export interface MindMapNode {
  name: string;
  details?: string;
  children?: MindMapNode[];
}

export interface StudyTopic {
  title: string;
  content: string;
  keyConcepts: string[];
  estimatedTime: string;
}

export interface StudyResponse {
  courseTitle: string;
  overview: string;
  recommendedBooks: string[];
  topics: StudyTopic[];
  mindMap: MindMapNode;
}

export interface SubjectStructure {
  name: string;
  topics: string[];
}

export interface SyllabusStructure {
  subjects: SubjectStructure[];
}

export interface SyllabusInput {
  text?: string;
  fileData?: {
    mimeType: string;
    data: string; // Base64 encoded string
  };
}

export type AppState = 'idle' | 'analyzing-syllabus' | 'selecting-subject' | 'generating-content' | 'success' | 'error';

export interface FormData {
  programName: string;
  syllabusText: string;
}
