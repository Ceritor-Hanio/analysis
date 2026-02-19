export interface ScriptCase {
  id: string;
  timestamp: number;
  title: string;
  productCategory: string;
  hookPrinciple: string;
  successFactor: string;
  contentStructure: string;
  visualElements: string[];
  speechContent: string;
  aiReproduction: {
    visualPrompt: string;
    audioPrompt: string;
  };
  originalMedia?: {
    type: string;
    data: string;
    mimeType: string;
  };
  rawApiResponse?: string;
}

export interface TrendAnalysis {
  commonHookStrategies: string[];
  visualPatterns: string[];
  contentThemes: string[];
  audienceAppealPoints: string[];
}

export interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export interface AnalysisResult {
  scriptCases: ScriptCase[];
  trendAnalysis: TrendAnalysis;
  timestamp: number;
}
