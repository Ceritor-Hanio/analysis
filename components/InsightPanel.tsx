'use client';

import { useState } from 'react';
import { ScriptCase, TrendAnalysis } from '../app/types';
import { BarChart3, FileText, Sparkles, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface InsightPanelProps {
  result: { scriptCases: ScriptCase[]; trendAnalysis: TrendAnalysis } | null;
}

const formatTextWithNewlines = (text: string) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => (
    <span key={i}>
      {line}
      <br />
    </span>
  ));
};

export default function InsightPanel({ result }: InsightPanelProps) {
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!result) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-4 text-gray-500">上传素材并开始分析后，这里将显示洞察结果</p>
      </div>
    );
  }

  const { scriptCases, trendAnalysis } = result;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-800">常见钩子策略</h3>
          </div>
          <ul className="space-y-2">
            {trendAnalysis.commonHookStrategies.map((strategy, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="w-2 h-2 mt-2 bg-purple-400 rounded-full flex-shrink-0" />
                <span className="text-gray-700 text-sm">{strategy}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800">观众吸引点</h3>
          </div>
          <ul className="space-y-2">
            {trendAnalysis.audienceAppealPoints.map((point, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="w-2 h-2 mt-2 bg-green-400 rounded-full flex-shrink-0" />
                <span className="text-gray-700 text-sm">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-800">视觉模式</h3>
          </div>
          <ul className="space-y-2">
            {trendAnalysis.visualPatterns.map((pattern, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="w-2 h-2 mt-2 bg-orange-400 rounded-full flex-shrink-0" />
                <span className="text-gray-700 text-sm">{pattern}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <FileText className="w-5 h-5 text-cyan-600" />
            </div>
            <h3 className="font-semibold text-gray-800">内容主题</h3>
          </div>
          <ul className="space-y-2">
            {trendAnalysis.contentThemes.map((theme, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="w-2 h-2 mt-2 bg-cyan-400 rounded-full flex-shrink-0" />
                <span className="text-gray-700 text-sm">{theme}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">素材分析详情</h3>
        {scriptCases.map((scriptCase, index) => (
          <div key={scriptCase.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center space-x-4">
                {scriptCase.originalMedia?.type === 'video' ? (
                  <video src={scriptCase.originalMedia.data} className="w-16 h-16 object-cover rounded-lg" />
                ) : (
                  <img src={scriptCase.originalMedia?.data} alt={scriptCase.title} className="w-16 h-16 object-cover rounded-lg" />
                )}
                <div>
                  <h4 className="font-medium text-gray-800">{scriptCase.title || `素材 ${index + 1}`}</h4>
                  <p className="text-sm text-gray-500">{scriptCase.productCategory}</p>
                </div>
              </div>
              <button
                onClick={() => setExpandedScript(expandedScript === scriptCase.id ? null : scriptCase.id)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {expandedScript === scriptCase.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {expandedScript === scriptCase.id && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">钩子原理</p>
                    <p className="text-gray-800">{scriptCase.hookPrinciple}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">成功因素</p>
                    <p className="text-gray-800">{scriptCase.successFactor}</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">内容结构</p>
                    <p className="text-gray-800">{scriptCase.contentStructure}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">视觉元素</p>
                    <div className="flex flex-wrap gap-2">
                      {scriptCase.visualElements.map((element, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          {element}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">口播内容</p>
                    <p className="text-gray-800">{scriptCase.speechContent}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-700">画面提示词</p>
                      <button
                        onClick={() => copyToClipboard(scriptCase.aiReproduction.visualPrompt, `visual-${scriptCase.id}`)}
                        className="p-1 hover:bg-indigo-100 rounded transition-colors"
                      >
                        {copiedId === `visual-${scriptCase.id}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-indigo-500" />}
                      </button>
                    </div>
                    <p className="text-gray-700 text-sm">{scriptCase.aiReproduction.visualPrompt}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-purple-700">配音提示词</p>
                      <button
                        onClick={() => copyToClipboard(scriptCase.aiReproduction.audioPrompt, `audio-${scriptCase.id}`)}
                        className="p-1 hover:bg-purple-100 rounded transition-colors"
                      >
                        {copiedId === `audio-${scriptCase.id}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-purple-500" />}
                      </button>
                    </div>
                    <p className="text-gray-700 text-sm">{scriptCase.aiReproduction.audioPrompt}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
