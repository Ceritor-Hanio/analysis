'use client';

import { useState, useEffect } from 'react';
import Analyzer from '@/components/Analyzer';
import { Library } from 'lucide-react';

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

const STORAGE_KEY = '素材拆解引擎_案例库';

export default function Home() {
  const [cases, setCases] = useState<ScriptCase[]>([]);
  const [activeTab, setActiveTab] = useState<'analyzer' | 'library'>('analyzer');

  useEffect(() => {
    const savedCases = localStorage.getItem(STORAGE_KEY);
    if (savedCases) {
      try {
        setCases(JSON.parse(savedCases));
      } catch (e) {
        console.error('读取案例库失败:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  }, [cases]);

  const handleSaveToLibrary = (newCase: ScriptCase) => {
    setCases(prev => [newCase, ...prev]);
  };

  const handleDeleteCase = (id: string) => {
    if (confirm('确定删除这个案例？')) {
      setCases(prev => prev.filter(c => c.id !== id));
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Library className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">素材拆解引擎</h1>
                <p className="text-xs text-slate-500">Powered by 阿里云通义千问</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('analyzer')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'analyzer'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Library className="w-4 h-4 inline-block mr-2" />
                分析器
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'library'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Library className="w-4 h-4 inline-block mr-2" />
                案例库 ({cases.length})
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4">
        {activeTab === 'analyzer' ? (
          <Analyzer onSave={handleSaveToLibrary} />
        ) : (
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">我的案例库</h2>
              <p className="text-slate-600">已保存 {cases.length} 个分析案例</p>
            </div>

            {cases.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <Library className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">案例库为空，请先进行分析</p>
                <button
                  onClick={() => setActiveTab('analyzer')}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  去分析
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cases.map((caseItem) => (
                  <div key={caseItem.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {caseItem.originalMedia?.data && (
                      <div className="aspect-video bg-slate-100">
                        {caseItem.originalMedia.type === 'video' ? (
                          <video 
                            src={`data:${caseItem.originalMedia.mimeType};base64,${caseItem.originalMedia.data}`} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img 
                            src={`data:${caseItem.originalMedia.mimeType};base64,${caseItem.originalMedia.data}`} 
                            alt={caseItem.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-slate-900 truncate flex-1">{caseItem.title}</h3>
                        <button
                          onClick={() => handleDeleteCase(caseItem.id)}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{caseItem.productCategory}</p>
                      <p className="text-xs text-slate-500 mb-2">{caseItem.hookPrinciple}</p>
                      <p className="text-xs text-slate-400">{formatDate(caseItem.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
