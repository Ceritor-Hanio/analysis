'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, ArrowRight, CheckCircle, Image as ImageIcon, Video, X, Plus, Trash2, Sparkles, Wand2, Copy, Workflow, Lightbulb, Clapperboard, RefreshCw, Send, Settings } from 'lucide-react';
import { fileToBase64, callAliAPI } from '../app/aliApi';

function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    const trimmed = str.trim();
    const firstBrace = trimmed.indexOf('{');
    if (firstBrace === -1) {
      return fallback;
    }
    
    let braceCount = 0;
    let lastBrace = -1;
    for (let i = firstBrace; i < trimmed.length; i++) {
      if (trimmed[i] === '{') braceCount++;
      if (trimmed[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastBrace = i;
          break;
        }
      }
    }
    
    if (lastBrace > firstBrace) {
      const jsonStr = trimmed.substring(firstBrace, lastBrace + 1);
      return JSON.parse(jsonStr);
    }
    
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn('JSON parse failed:', e);
    console.warn('Original string:', str.substring(0, 500));
  }
  return fallback;
}

interface ScriptCase {
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

interface TrendAnalysis {
  commonHookStrategies: string[];
  visualPatterns: string[];
  contentThemes: string[];
  audienceAppealPoints: string[];
}

interface ApiResponse {
  title?: string;
  productCategory?: string;
  hookPrinciple?: string;
  hook?: string;
  Hook?: string;
  openingCopy?: string;
  开头?: string;
  successFactor?: string;
  成功因素?: string;
  success_factor?: string;
  contentStructure?: string;
  内容结构?: string;
  content_structure?: string;
  visualElements?: string[];
  视觉元素?: string[];
  tags?: string[];
  标签?: string[];
  speechContent?: string;
  语音内容?: string;
  speech?: string;
  aiReproduction?: {
    visualPrompt?: string;
    audioPrompt?: string;
    visual_prompt?: string;
    audio_prompt?: string;
    视觉提示词?: string;
    音频提示词?: string;
  };
  标题?: string;
  产品类目?: string;
  开头策略?: string[];
  视觉模式?: string[];
  内容主题?: string[];
  吸引力点?: string[];
  commonHookStrategies?: string[];
  visualPatterns?: string[];
  contentThemes?: string[];
  audienceAppealPoints?: string[];
}

interface AnalyzerProps {
  onSave: (newCase: ScriptCase) => void;
}

const PRESET_CATEGORIES = [
  "美妆个护", "游戏娱乐", "电商百货", "金融理财", 
  "教育培训", "工具应用", "食品饮料", "服饰鞋包", "其他"
];

const generateSystemPrompt = (category?: string) => {
  const categoryContext = category
    ? `用户已指定该素材属于【${category}】类目，请务必基于此行业背景进行分析。`
    : '';

  return `你是一位精通"跑量短视频"拆解的专家。请分析素材并返回纯JSON格式。

重要要求：
1. 直接输出JSON，不要有任何前缀文字（如"以下是分析结果"、"Thinking Process"等）
2. 不要输出任何推理过程、思考步骤或分析说明
3. 不要使用markdown代码块包裹JSON
4. JSON必须是最外层为{}的完整对象
5. 不要有多余的换行或空白字符

JSON结构如下：
{
  "title": "简洁有力的标题",
  "productCategory": "产品类目",
  "hookPrinciple": "开头原理（前3秒心理学技巧）",
  "successFactor": "成功因素",
  "contentStructure": "内容结构",
  "visualElements": ["元素1", "元素2", "元素3"],
  "speechContent": "语音内容",
  "aiReproduction": {
    "visualPrompt": "适合AI生成的视觉提示词",
    "audioPrompt": "音频提示词"
  }
}

${categoryContext}

请直接返回纯JSON，不要任何其他内容。`;
};

const generateTrendSystemPrompt = () => {
  return `分析短视频脚本，找出共性。返回纯JSON格式（不要用markdown代码块包裹）：
{
  "commonHookStrategies": ["开头策略1", "开头策略2"],
  "visualPatterns": ["视觉模式1", "视觉模式2"],
  "contentThemes": ["内容主题1", "内容主题2"],
  "audienceAppealPoints": ["吸引力点1", "吸引力点2"]
}`;
};

export default function Analyzer({ onSave }: AnalyzerProps) {
  const [textInput, setTextInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{url: string, type: string, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<Omit<ScriptCase, 'id' | 'timestamp'>[]>([]);
  const [progress, setProgress] = useState<{current: number, total: number} | null>(null);
  
  const [refiningIndex, setRefiningIndex] = useState<number | null>(null);
  const [refinementInstructions, setRefinementInstructions] = useState<Record<number, string>>({});
  const [refinementImages, setRefinementImages] = useState<Record<number, File>>({});
  const [refinedPrompts, setRefinedPrompts] = useState<{[key: number]: string}>({});

  
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [batchInsight, setBatchInsight] = useState<TrendAnalysis | null>(null);
  const [showRawResponseIndex, setShowRawResponseIndex] = useState<number | null>(null);
  const [rawJsonResponse, setRawJsonResponse] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel, setSelectedModel] = useState('qwen3.5-plus');
  const [showSettings, setShowSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragFiles = (files: File[]) => {
     const newFiles: File[] = [];
     const newPreviews: {url: string, type: string, name: string}[] = [];

     const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
     const MAX_VIDEO_SIZE = 5 * 1024 * 1024;

     for (const file of files) {
       const maxSize = file.type.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
       const sizeLimit = file.type.startsWith('video/') ? '5MB' : '10MB';
       
       if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
         if (file.size > maxSize) {
           alert(`文件 ${file.name} 超过 ${sizeLimit} 限制（视频建议压缩至 5MB 以内），已跳过。`);
           continue;
         }
         if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
           continue;
         }
         newFiles.push(file);
         newPreviews.push({
           url: URL.createObjectURL(file),
           type: file.type,
           name: file.name
         });
       }
     }

     if (newFiles.length > 0) {
       setSelectedFiles(prev => [...prev, ...newFiles]);
       setPreviews(prev => [...prev, ...newPreviews]);
     }
   };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: File[] = Array.from(e.target.files);
      const validFiles: File[] = [];
      const newPreviews: {url: string, type: string, name: string}[] = [];
      
      const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
      const MAX_VIDEO_SIZE = 5 * 1024 * 1024;

      for (const file of newFiles) {
        const maxSize = file.type.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        const sizeLimit = file.type.startsWith('video/') ? '5MB' : '10MB';
        
        if (file.size > maxSize) {
          alert(`文件 ${file.name} 超过 ${sizeLimit} 限制（视频建议压缩至 5MB 以内），已跳过。`);
          continue;
        }
        if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            continue;
        }

        validFiles.push(file);
        newPreviews.push({
          url: URL.createObjectURL(file),
          type: file.type,
          name: file.name
        });
      }

      setSelectedFiles(prev => [...prev, ...validFiles]);
      setPreviews(prev => [...prev, ...newPreviews]);
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index].url);
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
      previews.forEach(p => URL.revokeObjectURL(p.url));
      setPreviews([]);
      setSelectedFiles([]);
  };

  const parseAnalysisResult = (responseText: string, fileName: string): Omit<ScriptCase, 'id' | 'timestamp'> => {
    const data = safeJsonParse<ApiResponse | undefined>(responseText, undefined);
    
    if (data) {
      const getValue = (keys: string[], fallback: string | string[]): string | string[] => {
        for (const key of keys) {
          if (key in data && data[key as keyof ApiResponse] !== undefined) {
            const value = data[key as keyof ApiResponse];
            if (Array.isArray(value)) return value;
            if (typeof value === 'string' && value) return value;
          }
        }
        return fallback;
      };

      return {
        title: getValue(['title', '标题'], fileName) as string,
        productCategory: getValue(['productCategory', '产品类目'], selectedCategory || '其他') as string,
        hookPrinciple: getValue(['hookPrinciple', 'hook', 'Hook', 'openingCopy', '开头'], '未能解析') as string,
        successFactor: getValue(['successFactor', '成功因素', 'success_factor'], '未能完整解析') as string,
        contentStructure: getValue(['contentStructure', '内容结构', 'content_structure'], '未能完整解析') as string,
        visualElements: getValue(['visualElements', '视觉元素', 'tags', '标签'], []) as string[],
        speechContent: getValue(['speechContent', '语音内容', 'speech'], '未能完整解析') as string,
        aiReproduction: {
          visualPrompt: data.aiReproduction?.visualPrompt || data.aiReproduction?.visual_prompt || (data as any)['视觉提示词'] || '',
          audioPrompt: data.aiReproduction?.audioPrompt || data.aiReproduction?.audio_prompt || (data as any)['音频提示词'] || ''
        },
        rawApiResponse: responseText
      };
    }
    
    return {
      title: fileName,
      productCategory: selectedCategory || '其他',
      hookPrinciple: responseText.slice(0, 200),
      successFactor: '未能完整解析',
      contentStructure: '未能完整解析',
      visualElements: [],
      speechContent: '未能完整解析',
      aiReproduction: {
        visualPrompt: '',
        audioPrompt: ''
      },
      rawApiResponse: responseText
    };
  };

  const handleAnalyze = async () => {
    if (!textInput && selectedFiles.length === 0) return;

    setIsAnalyzing(true);
    setResults([]);
    setBatchInsight(null);
    setRefinedPrompts({}); 
    setRefinementInstructions({});
    setRefinementImages({});
    
    const total = selectedFiles.length > 0 ? selectedFiles.length : 1;
    setProgress({ current: 0, total });

    try {
      const newResults: Omit<ScriptCase, 'id' | 'timestamp'>[] = [];

      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          setProgress({ current: i + 1, total });
          
          try {
            const base64 = await fileToBase64(file);
            console.log(`[分析 ${file.name}] 原始大小: ${(file.size / 1024 / 1024).toFixed(2)} MB, Base64 长度: ${base64.length} 字符`);
            
            const isVideo = file.type.startsWith('video');
            const mediaType = isVideo ? '视频' : '图片';
            const systemPrompt = generateSystemPrompt(selectedCategory || undefined);
            
            const userContent = isVideo
              ? {
                  type: 'video_url',
                  video_url: { url: `data:${file.type};base64,${base64}` },
                  fps: 2
                }
              : {
                  type: 'image_url',
                  image_url: { url: `data:${file.type};base64,${base64}` }
                };

            const messages = [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: [
                userContent,
                { type: 'text', text: `分析这个${mediaType}素材，返回纯JSON格式（不要markdown代码块）` }
              ]}
            ];

            const responseText = await callAliAPI(messages, '', selectedModel);
            const analysis = parseAnalysisResult(responseText, file.name);
            
            const analysisWithMedia: Omit<ScriptCase, 'id' | 'timestamp'> = {
              ...analysis,
              originalMedia: {
                type: isVideo ? 'video' : 'image',
                data: base64,
                mimeType: file.type
              }
            };
            
            newResults.push(analysisWithMedia);
          } catch (err: any) {
            console.error(`Error analyzing ${file.name}:`, err);
            const errorMsg = err?.message || err || '未知错误';
            alert(`分析失败 [${file.name}]: ${errorMsg}`);
          }
        }
      } else {
        try {
          const systemPrompt = generateSystemPrompt(selectedCategory || undefined);
          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `分析以下素材：${textInput}` }
          ];
          const responseText = await callAliAPI(messages, '', selectedModel);
          const analysis = parseAnalysisResult(responseText, '文本分析');
          newResults.push(analysis);
        } catch (err: any) {
          console.error('Error analyzing text:', err);
          const errorMsg = err?.message || err || '未知错误';
          alert(`分析失败: ${errorMsg}`);
        }
      }

      if (newResults.length === 0 && selectedFiles.length > 0) {
          alert("所有文件分析均失败，请检查文件大小或API配置。");
      }

      setResults(newResults);
    } catch (error: any) {
      alert("分析过程发生未知错误: " + (error?.message || error));
      console.error(error);
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
    }
  };

  const handleRefineSubmit = async (index: number) => {
      const instruction = refinementInstructions[index];
      const image = refinementImages[index];

      if (!instruction && !image) {
          alert("请输入修改指令或上传参考图片");
          return;
      }
      if (!results[index].aiReproduction) return;

      setRefiningIndex(index);
      try {
          let imageBase64 = undefined;
          if (image) {
              imageBase64 = await fileToBase64(image);
          }
          const currentPrompt = results[index].aiReproduction!.visualPrompt;
          
          const systemPrompt = '你是提示词优化助手。只输出优化后的完整中文提示词，不要解释。';
          const taskDescription = `原提示词：\n"${currentPrompt}"\n\n用户的具体修改指令：${instruction}`;
          
          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: taskDescription }
          ];
          
          const newPrompt = await callAliAPI(messages, '', selectedModel);
          
          setRefinedPrompts(prev => ({
              ...prev,
              [index]: newPrompt.trim() || currentPrompt
          }));
          
      } catch (error) {
          console.error(error);
          alert("提示词迭代失败，请重试");
      } finally {
          setRefiningIndex(null);
      }
  };

  const handleBatchInsight = async () => {
    if (results.length < 2) {
      alert("请至少有2个分析结果才能提取共性。");
      return;
    }
    setIsBatchAnalyzing(true);
    try {
      const casesText = results.map((c, i) =>
        `案例 ${i+1}: ${c.title} - ${c.hookPrinciple}`
      ).join('\n');

      const systemPrompt = generateTrendSystemPrompt();
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `分析以下 ${results.length} 个案例：\n${casesText}` }
      ];

      const responseText = await callAliAPI(messages, '', selectedModel);
      
      const data = safeJsonParse<ApiResponse | undefined>(responseText, undefined);
      if (data) {
        setBatchInsight({
          commonHookStrategies: data.commonHookStrategies || (data as any)['开头策略'] || [],
          visualPatterns: data.visualPatterns || (data as any)['视觉模式'] || [],
          contentThemes: data.contentThemes || (data as any)['内容主题'] || [],
          audienceAppealPoints: data.audienceAppealPoints || (data as any)['吸引力点'] || []
        });
      } else {
        setBatchInsight({
          commonHookStrategies: [],
          visualPatterns: [],
          contentThemes: [],
          audienceAppealPoints: []
        });
      }
    } catch (error) {
      console.error(error);
      alert("共性提取失败，请重试。");
    } finally {
      setIsBatchAnalyzing(false);
    }
  };

  const handleSaveAll = () => {
    if (results.length === 0) return;
    
    results.forEach((result, index) => {
      let caseToSave = { ...result };
      if (refinedPrompts[index]) {
          caseToSave = {
              ...caseToSave,
              aiReproduction: {
                  ...caseToSave.aiReproduction!,
                  visualPrompt: refinedPrompts[index]
              }
          };
      }

      const newCase: ScriptCase = {
        ...caseToSave,
        id: Math.random().toString(36).substring(2, 10),
        timestamp: Date.now(),
      };
      onSave(newCase);
    });
    
    setTextInput('');
    clearAllFiles();
    setSelectedCategory('');
    setResults([]);
    setBatchInsight(null);
    setRefinedPrompts({});
    setRefinementInstructions({});
    setRefinementImages({});
    alert(`已成功保存 ${results.length} 个案例至库中！`);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-extrabold text-slate-900">素材拆解引擎</h2>
        <p className="mt-2 text-slate-600">批量投喂跑量视频，AI 自动提炼开头爆款逻辑（阿里云版）</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
            
            <div className="mb-5">
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 1. 选择类目 (建议)
               </label>
               <select
                 value={selectedCategory}
                 onChange={(e) => setSelectedCategory(e.target.value)}
                 className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-xl border"
               >
                 <option value="">自动识别类目</option>
                 {PRESET_CATEGORIES.map(cat => (
                   <option key={cat} value={cat}>{cat}</option>
                 ))}
               </select>
            </div>

            <label className="block text-sm font-medium text-slate-700 mb-2 flex justify-between">
              <span>2. 上传素材 (支持批量)</span>
              <span className="text-xs text-slate-400 font-normal">单个 &lt;100MB</span>
            </label>
            
            <div className="space-y-4">
                {previews.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {previews.map((preview, idx) => (
                            <div key={idx} className="relative group aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                {preview.type.startsWith('video/') ? (
                                    <video src={preview.url} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={preview.url} alt={preview.name} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                        onClick={() => removeFile(idx)}
                                        className="p-1.5 bg-white rounded-full text-red-600 hover:text-red-700"
                                        title="删除"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
                                    <p className="text-[10px] text-white truncate px-1">{preview.name}</p>
                                </div>
                            </div>
                        ))}
                        <label className="flex flex-col items-center justify-center aspect-video bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                            <Plus className="w-6 h-6 text-slate-400" />
                            <span className="text-xs text-slate-500 mt-1">添加更多</span>
                             <input 
                                ref={fileInputRef}
                                type="file" 
                                multiple
                                accept="image/*,video/*" 
                                className="sr-only" 
                                onChange={handleFileChange} 
                            />
                        </label>
                    </div>
                ) : (
                    <div
                      className={`mt-1 flex justify-center px-6 pt-10 pb-10 border-2 border-dashed rounded-xl transition-colors ${
                        isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:bg-slate-50'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length > 0) {
                          handleDragFiles(files);
                        }
                      }}
                    >
                        <div className="space-y-2 text-center">
                            <div className="flex justify-center space-x-2">
                                <ImageIcon className={`h-8 w-8 ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
                                <Video className={`h-8 w-8 ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
                            </div>
                            <div className="text-sm text-slate-600">
                                <label className="relative cursor-pointer bg-transparent rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                    <span>点击上传</span>
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        multiple
                                        accept="image/*,video/*" 
                                        className="sr-only" 
                                        onChange={handleFileChange} 
                                    />
                                </label>
                                <span className="pl-1">或拖拽文件至此</span>
                            </div>
                            <p className="text-xs text-slate-500">图片最大 10MB，视频建议压缩至 5MB 以内</p>
                        </div>
                    </div>
                )}
                
                {previews.length > 0 && (
                    <div className="flex justify-end">
                        <button onClick={clearAllFiles} className="text-xs text-slate-500 hover:text-red-500">清空列表</button>
                    </div>
                )}
            </div>

            <div className="mt-4 mb-4">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center text-sm text-slate-600 hover:text-indigo-600 transition-colors"
              >
                <Settings className="h-4 w-4 mr-1" />
                {showSettings ? '收起设置' : '展开 API 设置'}
              </button>
              
              {showSettings && (
                <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      模型名称
                    </label>
                    <input
                      type="text"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      placeholder="qwen3.5-plus"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                3. 补充描述/脚本 (适用于所有素材)
              </label>
              <textarea
                rows={4}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-xl p-3 border"
                placeholder="可选：粘贴通用脚本，或者简要描述这批素材的背景..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
            </div>

            <div className="mt-6">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || (!textInput && selectedFiles.length === 0)}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    {progress ? `正在分析 ${progress.current}/${progress.total}...` : '分析中...'}
                  </>
                ) : (
                  <>
                    开始批量分析
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {results.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  分析结果 ({results.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleBatchInsight}
                    disabled={isBatchAnalyzing || results.length < 2}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    {isBatchAnalyzing ? '分析中...' : '提取共性'}
                  </button>
                  <button
                    onClick={handleSaveAll}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    全部存入库
                  </button>
                  <button
                    onClick={() => {
                      if (results.length === 1) {
                        setRawJsonResponse(results[0].rawApiResponse || '');
                        setShowRawResponseIndex(0);
                      }
                    }}
                    disabled={results.length !== 1}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    原始JSON
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {results.map((result, index) => (
                  <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                    {result.originalMedia && (
                      <div className="aspect-video bg-slate-100">
                        {result.originalMedia.type === 'video' ? (
                          <video 
                            src={`data:${result.originalMedia.mimeType};base64,${result.originalMedia.data}`} 
                            className="w-full h-full object-contain"
                            controls
                          />
                        ) : (
                          <img 
                            src={`data:${result.originalMedia.mimeType};base64,${result.originalMedia.data}`} 
                            alt={result.title}
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                    )}
                    
                    <div className="p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900">{result.title}</h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-1">
                            {result.productCategory}
                          </span>
                        </div>
                      </div>

                      <div className="bg-amber-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-amber-800">Hook原理</p>
                        <p className="text-sm text-slate-900 mt-1">{result.hookPrinciple}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs font-medium text-slate-700">成功因素</p>
                          <p className="text-xs text-slate-600 mt-1">{result.successFactor}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs font-medium text-slate-700">内容结构</p>
                          <p className="text-xs text-slate-600 mt-1">{result.contentStructure}</p>
                        </div>
                      </div>

                      {result.visualElements && result.visualElements.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-700 mb-2">视觉元素</p>
                          <div className="flex flex-wrap gap-1">
                            {result.visualElements.map((element, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700">
                                {element}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-700">语音内容</p>
                        <p className="text-xs text-slate-600 mt-1">{result.speechContent}</p>
                      </div>

                      {result.aiReproduction && (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                          <p className="text-xs font-medium text-indigo-900 mb-2">AI复现提示词</p>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-indigo-700 mb-1">视觉</p>
                              <div className="relative">
                                <p className="text-xs text-slate-600 bg-white p-2 rounded border border-indigo-200">
                                  {refinedPrompts[index] || result.aiReproduction.visualPrompt}
                                </p>
                                <button
                                  onClick={() => navigator.clipboard.writeText(refinedPrompts[index] || result.aiReproduction.visualPrompt)}
                                  className="absolute top-2 right-2 p-1 hover:bg-indigo-100 rounded"
                                >
                                  <Copy className="w-3 h-3 text-indigo-500" />
                                </button>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-indigo-700 mb-1">音频</p>
                              <p className="text-xs text-slate-600 bg-white p-2 rounded border border-indigo-200">
                                {result.aiReproduction.audioPrompt}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-indigo-200">
                            <p className="text-xs font-medium text-indigo-900 mb-2">迭代优化</p>
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="输入修改指令..."
                                value={refinementInstructions[index] || ''}
                                onChange={(e) => setRefinementInstructions(prev => ({ ...prev, [index]: e.target.value }))}
                                className="w-full px-3 py-1.5 text-xs border border-indigo-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                              />
                              <div className="flex gap-2">
                                <label className="flex-1 flex items-center px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 rounded-lg cursor-pointer hover:bg-indigo-100">
                                  <ImageIcon className="w-3 h-3 mr-1" />
                                  {refinementImages[index]?.name || '上传参考图'}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        setRefinementImages(prev => ({ ...prev, [index]: e.target.files![0] }));
                                      }
                                    }}
                                  />
                                </label>
                                <button
                                  onClick={() => handleRefineSubmit(index)}
                                  disabled={refiningIndex === index}
                                  className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  {refiningIndex === index ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                                  优化
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {batchInsight && (
            <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-white" />
                    <h3 className="text-lg font-bold text-white">批量素材共性洞察</h3>
                  </div>
                  <p className="text-sm text-indigo-100 mt-1">基于 {results.length} 个分析结果提取</p>
                </div>
                <button
                  onClick={() => setBatchInsight(null)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-purple-50 rounded-xl p-4">
                    <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      开头策略
                    </h4>
                    <ul className="space-y-2">
                      {batchInsight.commonHookStrategies.map((item, i) => (
                        <li key={i} className="text-sm text-purple-800 flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      视觉模式
                    </h4>
                    <ul className="space-y-2">
                      {batchInsight.visualPatterns.map((item, i) => (
                        <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-green-50 rounded-xl p-4">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      内容主题
                    </h4>
                    <ul className="space-y-2">
                      {batchInsight.contentThemes.map((item, i) => (
                        <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-4">
                    <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      吸引力点
                    </h4>
                    <ul className="space-y-2">
                      {batchInsight.audienceAppealPoints.map((item, i) => (
                        <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                          <span className="text-amber-400 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showRawResponseIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">原始JSON响应</h3>
              <button
                onClick={() => {
                  setShowRawResponseIndex(null);
                  setRawJsonResponse('');
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-auto">
              <pre className="text-xs text-slate-700 bg-slate-50 p-4 rounded-lg overflow-auto max-h-[60vh]">
                {rawJsonResponse}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { ScriptCase, TrendAnalysis, ApiResponse, AnalyzerProps };
