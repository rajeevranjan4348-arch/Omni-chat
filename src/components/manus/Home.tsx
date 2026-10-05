import React, { useState, useRef } from 'react';
import { 
  Plus, 
  ArrowUp,
  FileText, 
  X
} from 'lucide-react';

interface HomeProps {
  onStartTask: (prompt: string, options: any) => void;
}

export function Home({ onStartTask }: HomeProps) {
  const [prompt, setPrompt] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setUploadedFile(file);
    setIsExtracting(true);
    
    try {
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.csv') || fileName.endsWith('.json') || fileName.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setFileData(text);
          if (!prompt.trim()) {
            setPrompt(`Analyze the contents of ${file.name} and summarize critical trends.`);
          }
          setIsExtracting(false);
        };
        reader.readAsText(file);
      } else {
        // Simple plain text reading fallback for PDF/Excel to mock the server extraction safely
        const reader = new FileReader();
        reader.onload = () => {
          setFileData(`[Simulated Raw Text Extract from ${file.name}]`);
          if (!prompt.trim()) {
            setPrompt(`Analyze the raw text structure of ${file.name} for key business metrics.`);
          }
          setIsExtracting(false);
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error('File extraction error:', error);
      setIsExtracting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStart = () => {
    if (!prompt.trim()) return;

    let detectedFormat = 'report';
    let chartType = 'auto';
    let websiteName = '';

    const lower = prompt.toLowerCase();
    if (lower.includes('website') || lower.includes('portfolio') || lower.includes('landing page') || lower.includes('app') || lower.includes('site') || lower.includes('mockup')) {
      detectedFormat = 'website';
      websiteName = prompt.slice(0, 30);
    } else if (lower.includes('chart') || lower.includes('graph') || lower.includes('data') || lower.includes('analyze') || lower.includes('plot') || lower.includes('stats') || lower.includes('visualiz')) {
      detectedFormat = 'graph';
      if (lower.includes('bar')) chartType = 'bar';
      else if (lower.includes('line')) chartType = 'line';
      else if (lower.includes('pie')) chartType = 'pie';
      else if (lower.includes('area')) chartType = 'area';
      else if (lower.includes('scatter')) chartType = 'scatter';
    }

    const options: any = { 
      format: detectedFormat, 
      chartType,
    };

    if (fileData) {
      options.fileData = fileData;
      options.fileName = uploadedFile?.name;
      if (detectedFormat !== 'website') {
        options.format = 'graph';
      }
    }

    if (websiteName) {
      options.websiteName = websiteName;
    }

    onStartTask(prompt, options);
  };

  return (
    <div className="flex-1 w-full h-full min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8 bg-stone-50 dark:bg-zinc-950 flex flex-col items-center justify-center scroll-smooth">
      <div className="w-full max-w-3xl space-y-8 my-auto py-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl sm:text-6xl font-serif font-bold tracking-tight text-stone-900 dark:text-zinc-100">
            What can I do for you?
          </h1>
          <p className="text-gray-500 text-base sm:text-lg">
            Assign a complex workspace task, and I'll build or analyze it.
          </p>
        </div>

        <div className="space-y-6">
          {uploadedFile && (
            <div className="flex gap-2 justify-center flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 rounded-full border border-blue-100 dark:border-gray-800 shadow-sm">
                <FileText size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{uploadedFile.name}</span>
                {isExtracting ? (
                  <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <button onClick={handleRemoveFile} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X size={14} className="text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col gap-3 rounded-[24px] transition-all relative py-4 max-h-[312px] w-full z-[2] shadow-xl border ${
              isDragging 
                ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 dark:bg-blue-950/20 dark:border-blue-400' 
                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800'
            }`}
          >
            {isDragging && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-blue-500/10 backdrop-blur-sm rounded-[24px] border-2 border-dashed border-blue-500 pointer-events-none animate-pulse">
                <Plus className="text-blue-500 mb-1" size={24} />
                <span className="text-sm font-semibold text-blue-500">Drop file here to analyze</span>
              </div>
            )}
            <div className="overflow-y-auto pl-5 pr-4">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleStart();
                  }
                }}
                className="flex border-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden bg-transparent px-0 w-full placeholder:text-gray-400 text-lg shadow-none resize-none leading-relaxed min-h-[52px] dark:text-zinc-100" 
                rows={2}
                placeholder="Assign a task or ask anything" 
              />
            </div>
            <div className="px-4 flex justify-between items-center border-t border-gray-100 dark:border-gray-800/80 pt-3">
              <div className="flex gap-2 items-center flex-shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf,.txt,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExtracting}
                  title="Upload dataset or document"
                  className="rounded-full border border-gray-200 dark:border-gray-800 inline-flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 w-9 h-9 p-0 shrink-0 relative transition-colors" 
                >
                  <Plus size={18} />
                  {uploadedFile && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-blue-600 rounded-full shadow-md" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleStart}
                  disabled={!prompt.trim()}
                  className={`inline-flex items-center justify-center font-medium transition-colors gap-1.5 text-sm rounded-full w-9 h-9 ${
                    prompt.trim() 
                      ? "bg-blue-600 text-white cursor-pointer hover:bg-blue-700 shadow-md" 
                      : "bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Home;
