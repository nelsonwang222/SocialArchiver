import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, Link as LinkIcon, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { analyzeLink } from './services/geminiService';
import { saveToSheet } from './services/sheetService';
import { ConfigModal } from './components/ConfigModal';
import { ResultCard } from './components/ResultCard';
import { AnalyzedPost, AnalysisStatus, SaveStatus } from './types';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(SaveStatus.IDLE);
  const [result, setResult] = useState<AnalyzedPost | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Load script URL from local storage on mount
  useEffect(() => {
    const storedUrl = localStorage.getItem('googleScriptUrl');
    if (storedUrl) {
      setScriptUrl(storedUrl);
    } else {
      // Open config automatically if no URL is set
      // Delay slightly for better UX
      setTimeout(() => setIsConfigOpen(true), 1000);
    }
  }, []);

  const handleConfigSave = (newUrl: string) => {
    setScriptUrl(newUrl);
    localStorage.setItem('googleScriptUrl', newUrl);
  };

  const handleAnalyze = async () => {
    if (!url) return;
    
    setAnalysisStatus(AnalysisStatus.ANALYZING);
    setResult(null);
    setErrorMsg('');
    setSaveStatus(SaveStatus.IDLE);

    try {
      const data = await analyzeLink(url);
      setResult(data);
      setAnalysisStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      setAnalysisStatus(AnalysisStatus.ERROR);
      setErrorMsg(err.message || "Something went wrong.");
    }
  };

  const handleSaveToSheet = async () => {
    if (!result) return;
    if (!scriptUrl) {
      setIsConfigOpen(true);
      return;
    }

    setSaveStatus(SaveStatus.SAVING);
    try {
      await saveToSheet(result, scriptUrl);
      setSaveStatus(SaveStatus.SUCCESS);
      // Optional: Reset after success
      setTimeout(() => {
        setUrl('');
        setResult(null);
        setAnalysisStatus(AnalysisStatus.IDLE);
        setSaveStatus(SaveStatus.IDLE);
      }, 2000);
    } catch (err) {
      setSaveStatus(SaveStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center text-white shadow-sm">
              <LinkIcon size={18} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
              Social<span className="font-light text-gray-600">Archiver</span>
            </h1>
          </div>
          
          <button 
            onClick={() => setIsConfigOpen(true)}
            className={`p-2 rounded-full transition-all ${!scriptUrl ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="Configuration"
          >
            <Settings size={20} />
            {!scriptUrl && <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        
        {/* Intro / Hero */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Save social posts to Sheets. <br/>
            <span className="text-blue-600">Powered by Gemini.</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            Paste a link, let AI extract the details, and archive it directly to your Google Sheet.
          </p>
        </div>

        {/* Input Section */}
        <div className="relative bg-white p-2 rounded-2xl shadow-lg border border-gray-100 flex items-center focus-within:ring-4 focus-within:ring-blue-50 transition-shadow">
          <div className="pl-4 text-gray-400">
            <LinkIcon size={20} />
          </div>
          <input 
            type="url" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="Paste social media link here..."
            className="flex-1 px-4 py-4 text-lg bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 w-full"
            autoFocus
          />
          <button 
            onClick={handleAnalyze}
            disabled={!url || analysisStatus === AnalysisStatus.ANALYZING}
            className="m-1 px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {analysisStatus === AnalysisStatus.ANALYZING ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Analyze <Sparkles size={16} />
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {analysisStatus === AnalysisStatus.ERROR && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
            <AlertTriangle size={20} />
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Configuration Warning */}
        {!scriptUrl && (
          <div 
            onClick={() => setIsConfigOpen(true)}
            className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-yellow-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 text-yellow-600 p-2 rounded-lg">
                <Settings size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-yellow-800">Setup Required</h3>
                <p className="text-xs text-yellow-700">Connect your Google Sheet to start saving.</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-yellow-400 group-hover:text-yellow-600 transition-colors" />
          </div>
        )}

        {/* Result Section */}
        {result && (
          <ResultCard 
            data={result} 
            onUpdate={setResult}
            onSave={handleSaveToSheet}
            onDiscard={() => {
              setResult(null);
              setUrl('');
              setAnalysisStatus(AnalysisStatus.IDLE);
            }}
            saveStatus={saveStatus}
          />
        )}
      </main>

      {/* Modals */}
      <ConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        savedUrl={scriptUrl}
        onSave={handleConfigSave}
      />
    </div>
  );
};

export default App;
