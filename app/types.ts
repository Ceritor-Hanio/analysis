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
