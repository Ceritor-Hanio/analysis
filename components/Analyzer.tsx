'use client';

import { useState, useCallback } from 'react';
import { Upload, Image, Video, Loader2, Sparkles, FileText, BarChart3, Copy, Check } from 'lucide-react';
import { ScriptCase, TrendAnalysis, AnalysisResult, MediaFile } from '../app/types';
import { fileToBase64, callAliAPI } from '../app/aliApi';

interface AnalyzerProps {
  apiKey: string;
  onAnalysisComplete: (result: AnalysisResult) => void;
}

const MODEL_ID = 'qwen3.5-plus';

const ANALYSIS_PROMPT = `请分析以下素材，提取关键信息并以JSON格式返回：

{
  "scriptCases": [
    {
      "title": "素材标题",
      "productCategory": "产品类目",
      "hookPrinciple": "开头钩子/悬念",
      "successFactor": "成功因素",
      "contentStructure": "内容结构",
      "visualElements": ["视觉元素1", "视觉元素2"],
      "speechContent": "口播文案内容",
      "aiReproduction": {
        "visualPrompt": "AI生成画面的提示词",
        "audioPrompt": "AI生成配音的提示词"
      }
    }
  ],
  "trendAnalysis": {
    "commonHookStrategies": ["常见钩子策略1", "常见钩子策略2"],
    "visualPatterns": ["视觉模式1", "视觉模式2"],
    "contentThemes": ["内容主题1", "内容主题2"],
    "audienceAppealPoints": ["观众吸引点1", "观众吸引点2"]
  }
}

请分析以下{mediaType}素材并返回JSON：`;

export default function Analyzer({ apiKey, onAnalysisComplete }: AnalyzerProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingFile, setAnalyzingFile] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newMediaFiles: MediaFile[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image'
    }));
    setMediaFiles(prev => [...prev, ...newMediaFiles]);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    const newMediaFiles: MediaFile[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image'
    }));
    setMediaFiles(prev => [...prev, ...newMediaFiles]);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const removeMedia = useCallback((index: number) => {
    setMediaFiles(prev => {
      const newPrev = [...prev];
      URL.revokeObjectURL(newPrev[index].preview);
      newPrev.splice(index, 1);
      return newPrev;
    });
  }, []);

  const analyzeMedia = async () => {
    if (mediaFiles.length === 0) {
      alert('请先上传素材');
      return;
    }

    if (!apiKey) {
      alert('请先配置阿里云 API Key');
      return;
    }

    setIsAnalyzing(true);
    const scriptCases: ScriptCase[] = [];
    const trendAnalysis: TrendAnalysis = {
      commonHookStrategies: [],
      visualPatterns: [],
      contentThemes: [],
      audienceAppealPoints: []
    };

    for (let i = 0; i < mediaFiles.length; i++) {
      const media = mediaFiles[i];
      setAnalyzingFile(media.file.name);
      console.log(`[Analyzer] 分析素材 ${i + 1}/${mediaFiles.length}:`, media.file.name);

      try {
        const base64Data = await fileToBase64(media.file);
        const isVideo = media.type === 'video';
        const mediaType = isVideo ? '视频' : '图片';
        const mediaContent = isVideo
          ? `[${mediaType}数据: base64视频数据, 大小: ${media.file.size} bytes]`
          : `[${mediaType}数据: ${base64Data.substring(0, 100)}...]`;

        const prompt = ANALYSIS_PROMPT.replace('{mediaType}', mediaType) + '\n\n' + mediaContent;

        const messages = [
          { role: 'system', content: '你是一个专业的短视频分析专家。请分析素材并以JSON格式返回结果。' },
          { role: 'user', content: prompt }
        ];

        const responseText = await callAliAPI(messages, apiKey, MODEL_ID);
        console.log(`[Analyzer] AI响应长度:`, responseText.length);

        let parsedResult;
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResult = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('未找到JSON格式');
          }
        } catch (parseError) {
          console.error(`[Analyzer] JSON解析失败:`, parseError);
          console.error(`[Analyzer] 原始响应:`, responseText);
          parsedResult = {
            title: media.file.name,
            productCategory: '解析失败',
            hookPrinciple: '解析失败',
            successFactor: '解析失败',
            contentStructure: '解析失败',
            visualElements: [],
            speechContent: responseText.substring(0, 500),
            aiReproduction: { visualPrompt: '', audioPrompt: '' }
          };
        }

        const scriptCase: ScriptCase = {
          id: Math.random().toString(36).substring(2, 10),
          timestamp: Date.now(),
          title: parsedResult.title || media.file.name,
          productCategory: parsedResult.productCategory || '未知',
          hookPrinciple: parsedResult.hookPrinciple || '未知',
          successFactor: parsedResult.successFactor || '未知',
          contentStructure: parsedResult.contentStructure || '未知',
          visualElements: parsedResult.visualElements || [],
          speechContent: parsedResult.speechContent || '',
          aiReproduction: parsedResult.aiReproduction || { visualPrompt: '', audioPrompt: '' },
          originalMedia: {
            type: media.type,
            data: media.preview,
            mimeType: media.file.type
          },
          rawApiResponse: responseText.substring(0, 2000)
        };
        scriptCases.push(scriptCase);

        if (parsedResult.trendAnalysis) {
          trendAnalysis.commonHookStrategies.push(...(parsedResult.trendAnalysis.commonHookStrategies || []));
          trendAnalysis.visualPatterns.push(...(parsedResult.trendAnalysis.visualPatterns || []));
          trendAnalysis.contentThemes.push(...(parsedResult.trendAnalysis.contentThemes || []));
          trendAnalysis.audienceAppealPoints.push(...(parsedResult.trendAnalysis.audienceAppealPoints || []));
        }

      } catch (error: any) {
        console.error(`[Analyzer] 分析失败:`, media.file.name, error);
        alert(`分析失败 ${media.file.name}: ${error.message}`);
      }
    }

    const uniqueHookStrategies = [...new Set(trendAnalysis.commonHookStrategies)];
    const uniqueVisualPatterns = [...new Set(trendAnalysis.visualPatterns)];
    const uniqueContentThemes = [...new Set(trendAnalysis.contentThemes)];
    const uniqueAudienceAppealPoints = [...new Set(trendAnalysis.audienceAppealPoints)];

    const result: AnalysisResult = {
      scriptCases,
      trendAnalysis: {
        commonHookStrategies: uniqueHookStrategies,
        visualPatterns: uniqueVisualPatterns,
        contentThemes: uniqueContentThemes,
        audienceAppealPoints: uniqueAudienceAppealPoints
      },
      timestamp: Date.now()
    };

    onAnalysisComplete(result);
    setIsAnalyzing(false);
    setAnalyzingFile(null);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600">点击或拖拽上传素材</p>
          <p className="text-sm text-gray-400">支持图片和视频格式</p>
        </label>
      </div>

      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {mediaFiles.map((media, index) => (
            <div key={index} className="relative group">
              {media.type === 'video' ? (
                <video src={media.preview} className="w-full h-32 object-cover rounded-lg" />
              ) : (
                <img src={media.preview} alt={`素材 ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
              )}
              <button
                onClick={() => removeMedia(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {media.type === 'video' ? <Video className="w-3 h-3 inline mr-1" /> : <Image className="w-3 h-3 inline mr-1" />}
                {media.file.name.substring(0, 15)}...
              </div>
            </div>
          ))}
        </div>
      )}

      {isAnalyzing ? (
        <div className="bg-blue-50 rounded-xl p-6">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="text-blue-700">正在分析 {analyzingFile}...</span>
          </div>
          <p className="text-center text-sm text-blue-500 mt-2">请稍候，这可能需要几分钟时间</p>
        </div>
      ) : (
        <button
          onClick={analyzeMedia}
          disabled={mediaFiles.length === 0}
          className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Sparkles className="w-5 h-5" />
          <span>开始分析</span>
        </button>
      )}
    </div>
  );
}
