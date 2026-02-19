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

export interface AnalysisResult {
  id: string;
  timestamp: number;
  title: string;
  productCategory: string;
  hookPrinciple: string;
  openingCopy?: string;
  successFactor: string;
  contentStructure: string;
  visualReference?: string;
}
