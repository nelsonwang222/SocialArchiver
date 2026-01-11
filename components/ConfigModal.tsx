import React, { useState, useEffect } from 'react';
import { X, Save, HelpCircle, Copy } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedUrl: string;
  onSave: (url: string) => void;
}

const GAS_CODE = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  
  // Format: Date, Platform, Content, Link, Keywords
  sheet.appendRow([
    new Date(), 
    data.platform, 
    data.content, 
    data.originalLink, 
    data.keywords.join(", ")
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({"result":"success"}))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, savedUrl, onSave }) => {
  const [url, setUrl] = useState(savedUrl);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    setUrl(savedUrl);
  }, [savedUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
              <Save size={18} />
            </span>
            Google Sheet Configuration
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Google Apps Script Web App URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
            />
            <p className="text-xs text-gray-500 mt-2">
              This URL allows the app to write to your Google Sheet securely.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-2 text-blue-700 font-medium text-sm hover:underline"
            >
              <HelpCircle size={16} />
              {showGuide ? "Hide Setup Guide" : "How do I get this URL?"}
            </button>
            
            {showGuide && (
              <div className="mt-4 text-sm text-gray-700 space-y-3">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Open your Google Sheet.</li>
                  <li>Go to <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Delete any code there and paste the code below.</li>
                  <li>Click <strong>Deploy &gt; New deployment</strong>.</li>
                  <li>Select type: <strong>Web app</strong>.</li>
                  <li>Set <em>Execute as</em> to <strong>Me</strong>.</li>
                  <li>Set <em>Who has access</em> to <strong>Anyone</strong> (Important!).</li>
                  <li>Click <strong>Deploy</strong> and copy the <strong>Web App URL</strong>.</li>
                  <li>Paste that URL into the field above.</li>
                </ol>
                
                <div className="relative mt-2">
                  <pre className="bg-gray-800 text-gray-100 p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                    {GAS_CODE}
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(GAS_CODE)}
                    className="absolute top-2 right-2 p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-white transition-all"
                    title="Copy code"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onSave(url);
              onClose();
            }}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
