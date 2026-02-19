'use client';

import { useState } from 'react';
import { AnalysisResult } from './types';
import Analyzer from '@/components/Analyzer';
import InsightPanel from '@/components/InsightPanel';
import { Settings, BrainCircuit, BarChart3, Zap } from 'lucide-react';

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleApiKeySave = (key: string) => {
    setApiKey(key);
    localStorage.setItem('ali_api_key', key);
    setShowSettings(false);
  };

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">素材拆解引擎</h1>
                <p className="text-xs text-gray-500">Powered by 阿里云通义千问</p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {showSettings && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                阿里云 API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="请输入您的阿里云 API Key"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                API Key 仅保存在本地浏览器中，用于调用阿里云通义千问 API。
              </p>
              <button
                onClick={() => handleApiKeySave(apiKey)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-semibold text-gray-900">上传素材</h2>
              </div>
              <Analyzer apiKey={apiKey} onAnalysisComplete={handleAnalysisComplete} />
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="font-medium text-gray-900 mb-3">使用说明</h3>
              <ol className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                  <span>配置阿里云 API Key</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                  <span>上传图片或视频素材</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                  <span>点击「开始分析」</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</span>
                  <span>查看分析结果和洞察</span>
                </li>
              </ol>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-6">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-gray-900">分析洞察</h2>
              </div>
              <InsightPanel result={analysisResult} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
