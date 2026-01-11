import React from 'react';
import { AnalyzedPost, SaveStatus } from '../types';
import { Edit2, ExternalLink, Hash, MessageSquare, Monitor, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ResultCardProps {
  data: AnalyzedPost;
  onUpdate: (data: AnalyzedPost) => void;
  onSave: () => void;
  onDiscard: () => void;
  saveStatus: SaveStatus;
}

export const ResultCard: React.FC<ResultCardProps> = ({ data, onUpdate, onSave, onDiscard, saveStatus }) => {
  
  const handleKeywordChange = (index: number, value: string) => {
    const newKeywords = [...data.keywords];
    newKeywords[index] = value;
    onUpdate({ ...data, keywords: newKeywords });
  };

  const addKeyword = () => {
    onUpdate({ ...data, keywords: [...data.keywords, "new-tag"] });
  };

  const removeKeyword = (index: number) => {
    const newKeywords = data.keywords.filter((_, i) => i !== index);
    onUpdate({ ...data, keywords: newKeywords });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-fade-in-up">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 px-6 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <Monitor size={18} className="text-blue-200" />
          <span className="font-semibold tracking-wide uppercase text-sm">Analyzed Result</span>
        </div>
        <a 
          href={data.originalLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-100 hover:text-white transition-colors flex items-center gap-1 text-xs"
        >
          Open Link <ExternalLink size={12} />
        </a>
      </div>

      <div className="p-6 space-y-6">
        {/* Platform Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Monitor size={14} /> Platform
          </label>
          <input
            type="text"
            value={data.platform}
            onChange={(e) => onUpdate({ ...data, platform: e.target.value })}
            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800 font-medium focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Content Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare size={14} /> Content / Summary
          </label>
          <textarea
            value={data.content}
            onChange={(e) => onUpdate({ ...data, content: e.target.value })}
            rows={4}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-700 leading-relaxed focus:outline-none focus:border-blue-500 transition-colors resize-y"
          />
        </div>

        {/* Keywords Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Hash size={14} /> Keywords
          </label>
          <div className="flex flex-wrap gap-2">
            {data.keywords.map((keyword, index) => (
              <div key={index} className="group relative flex items-center">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => handleKeywordChange(index, e.target.value)}
                  className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-32 transition-all"
                />
                <button
                  onClick={() => removeKeyword(index)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Remove"
                >
                  <ExternalLink size={10} className="rotate-45" /> {/* Using as X icon */}
                </button>
              </div>
            ))}
            <button
              onClick={addKeyword}
              className="px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-gray-300 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center gap-1"
            >
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-gray-50 p-4 px-6 flex justify-between items-center border-t border-gray-100">
        <button
          onClick={onDiscard}
          className="text-gray-500 hover:text-gray-700 font-medium text-sm px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          disabled={saveStatus === SaveStatus.SAVING}
        >
          Discard
        </button>
        
        <button
          onClick={onSave}
          disabled={saveStatus === SaveStatus.SAVING || saveStatus === SaveStatus.SUCCESS}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none ${
            saveStatus === SaveStatus.SUCCESS ? 'bg-green-500' : 
            saveStatus === SaveStatus.ERROR ? 'bg-red-500' :
            'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {saveStatus === SaveStatus.SAVING && <Loader2 size={18} className="animate-spin" />}
          {saveStatus === SaveStatus.SUCCESS && <CheckCircle size={18} />}
          {saveStatus === SaveStatus.ERROR && <AlertCircle size={18} />}
          
          {saveStatus === SaveStatus.IDLE && "Save to Sheet"}
          {saveStatus === SaveStatus.SAVING && "Saving..."}
          {saveStatus === SaveStatus.SUCCESS && "Saved!"}
          {saveStatus === SaveStatus.ERROR && "Retry Save"}
        </button>
      </div>
      
      {saveStatus === SaveStatus.ERROR && (
        <div className="bg-red-50 text-red-600 text-xs text-center p-2">
           Failed to save. Check your Script URL configuration.
        </div>
      )}
    </div>
  );
};
