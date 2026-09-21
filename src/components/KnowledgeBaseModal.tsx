import React, { useState, useEffect, useRef } from 'react';
import { KnowledgeDocument, KnowledgeUrl, RetrievedSource } from '../types';
import { KnowledgeBaseService } from '../services/knowledgeBaseService';
import { 
  BookOpen, Globe, Plus, Trash2, X, Search, Check, FileText, 
  ExternalLink, Upload, Sparkles, Filter, Database, ArrowRight, Eye, RefreshCw
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSampleQuery?: (query: string) => void;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
  onSelectSampleQuery
}) => {
  const { isDarkMode, getAccentClass } = useTheme();

  const [activeTab, setActiveTab] = useState<'documents' | 'urls' | 'sandbox'>('documents');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [urls, setUrls] = useState<KnowledgeUrl[]>([]);
  
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Document form state
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<'documentation' | 'faq' | 'guide' | 'policy' | 'custom'>('documentation');
  const [docTags, setDocTags] = useState('');
  const [docContent, setDocContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL form state
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [urlAddress, setUrlAddress] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [urlSummary, setUrlSummary] = useState('');

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);

  // Sandbox state
  const [sandboxQuery, setSandboxQuery] = useState('What is the return window and warranty policy?');
  const [sandboxResults, setSandboxResults] = useState<RetrievedSource[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = () => {
    const docs = KnowledgeBaseService.getDocuments();
    const loadedUrls = KnowledgeBaseService.getUrls();
    setDocuments(docs);
    setUrls(loadedUrls);
    if (sandboxQuery) {
      setSandboxResults(KnowledgeBaseService.search(sandboxQuery, 4));
    }
  };

  const handleToggleDoc = (id: string) => {
    KnowledgeBaseService.toggleDocumentActive(id);
    loadData();
  };

  const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this document from the knowledge base?')) {
      KnowledgeBaseService.deleteDocument(id);
      loadData();
    }
  };

  const handleToggleUrl = (id: string) => {
    KnowledgeBaseService.toggleUrlActive(id);
    loadData();
  };

  const handleDeleteUrl = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this URL from the knowledge base?')) {
      KnowledgeBaseService.deleteUrl(id);
      loadData();
    }
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) return;

    const tags = docTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    KnowledgeBaseService.addDocument({
      title: docTitle.trim(),
      category: docCategory,
      tags,
      content: docContent.trim(),
      isActive: true
    });

    setDocTitle('');
    setDocTags('');
    setDocContent('');
    setIsAddingDoc(false);
    loadData();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setDocContent(content);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsText(file);
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlAddress.trim()) return;

    KnowledgeBaseService.addUrl({
      url: urlAddress.trim(),
      title: urlTitle.trim() || urlAddress.trim(),
      summary: urlSummary.trim() || `User-indexed reference for ${urlAddress}`,
      content: urlSummary.trim(),
      isActive: true
    });

    setUrlAddress('');
    setUrlTitle('');
    setUrlSummary('');
    setIsAddingUrl(false);
    loadData();
  };

  const handleSandboxSearch = (query: string) => {
    setSandboxQuery(query);
    setSandboxResults(KnowledgeBaseService.search(query, 4));
  };

  if (!isOpen) return null;

  const activeDocsCount = documents.filter(d => d.isActive).length;
  const activeUrlsCount = urls.filter(u => u.isActive).length;

  const filteredDocs = documents.filter(d => {
    const matchesSearch = !searchFilter || 
      d.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      d.tags.some(t => t.toLowerCase().includes(searchFilter.toLowerCase())) ||
      d.content.toLowerCase().includes(searchFilter.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50/90'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-600'}`}>
              <Database size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">AI Chatbot Knowledge Base</h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${isDarkMode ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                  {activeDocsCount} Docs • {activeUrlsCount} URLs Active
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Documents and URLs accessed by the chatbot to ground answers with verifiable citations.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`px-5 pt-3 border-b flex gap-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50/60'}`}>
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'documents'
                ? (isDarkMode ? 'border-blue-400 text-blue-400' : 'border-blue-600 text-blue-600')
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <BookOpen size={16} />
            Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('urls')}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'urls'
                ? (isDarkMode ? 'border-blue-400 text-blue-400' : 'border-blue-600 text-blue-600')
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Globe size={16} />
            URLs & Web Resources ({urls.length})
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'sandbox'
                ? (isDarkMode ? 'border-blue-400 text-blue-400' : 'border-blue-600 text-blue-600')
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Sparkles size={16} />
            Retrieval Sandbox & Grounding Preview
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* TAB 1: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex-1 flex items-center gap-2">
                  <div className={`relative flex-1 rounded-xl border flex items-center px-3 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <Search size={16} className="text-slate-400 shrink-0 mr-2" />
                    <input 
                      type="text"
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                      placeholder="Search knowledge documents by keyword or tag..."
                      className="w-full py-2 text-xs sm:text-sm bg-transparent outline-none"
                    />
                    {searchFilter && (
                      <button onClick={() => setSearchFilter('')} className="text-slate-400 hover:text-white">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-xs border outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="all">All Categories</option>
                    <option value="policy">Policies</option>
                    <option value="documentation">Documentation</option>
                    <option value="guide">Guides</option>
                    <option value="faq">FAQ</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <button
                  onClick={() => setIsAddingDoc(!isAddingDoc)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm shrink-0"
                >
                  <Plus size={16} />
                  {isAddingDoc ? 'Cancel' : 'Add Document'}
                </button>
              </div>

              {/* Add Document Form */}
              {isAddingDoc && (
                <form onSubmit={handleAddDocument} className={`p-4 rounded-xl border animate-in slide-in-from-top-2 duration-150 space-y-3 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">Add New Document to Knowledge Base</h3>
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".txt,.md,.json" 
                        className="hidden" 
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors ${
                          isDarkMode ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Upload size={12} /> Upload .txt / .md
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1">Document Title</label>
                      <input 
                        type="text"
                        value={docTitle}
                        onChange={e => setDocTitle(e.target.value)}
                        placeholder="e.g., OmniCorp Return Policy & Warranty"
                        required
                        className={`w-full p-2 text-xs sm:text-sm rounded-lg border outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Category</label>
                      <select
                        value={docCategory}
                        onChange={e => setDocCategory(e.target.value as any)}
                        className={`w-full p-2 text-xs sm:text-sm rounded-lg border outline-none ${
                          isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                        }`}
                      >
                        <option value="documentation">Documentation</option>
                        <option value="policy">Policy</option>
                        <option value="guide">Guide</option>
                        <option value="faq">FAQ</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Tags (comma-separated)</label>
                    <input 
                      type="text"
                      value={docTags}
                      onChange={e => setDocTags(e.target.value)}
                      placeholder="e.g., returns, warranty, refund, electronics"
                      className={`w-full p-2 text-xs rounded-lg border outline-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Document Content</label>
                    <textarea 
                      value={docContent}
                      onChange={e => setDocContent(e.target.value)}
                      rows={6}
                      placeholder="Paste document text, FAQ items, specifications, or product rules..."
                      required
                      className={`w-full p-2.5 text-xs sm:text-sm font-mono rounded-lg border outline-none resize-y ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingDoc(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm"
                    >
                      Save Document
                    </button>
                  </div>
                </form>
              )}

              {/* Document Cards */}
              <div className="grid grid-cols-1 gap-3">
                {filteredDocs.map(doc => (
                  <div 
                    key={doc.id}
                    className={`p-4 rounded-xl border transition-all ${
                      doc.isActive
                        ? (isDarkMode ? 'bg-slate-800/40 border-slate-700/80 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm')
                        : (isDarkMode ? 'bg-slate-900/40 border-slate-800/60 opacity-60' : 'bg-slate-100/60 border-slate-200 opacity-60')
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider ${
                            doc.category === 'policy' 
                              ? (isDarkMode ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60' : 'bg-amber-50 text-amber-700 border border-amber-200')
                              : doc.category === 'documentation'
                              ? (isDarkMode ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60' : 'bg-blue-50 text-blue-700 border border-blue-200')
                              : (isDarkMode ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                          }`}>
                            {doc.category}
                          </span>
                          <h4 className="font-semibold text-sm">{doc.title}</h4>
                        </div>

                        <p className={`text-xs line-clamp-2 mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {doc.content}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                          <span>{doc.charCount.toLocaleString()} chars</span>
                          <span>•</span>
                          <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                          {doc.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex gap-1 flex-wrap">
                                {doc.tags.map((t, idx) => (
                                  <span key={idx} className={`px-1.5 py-0.2 rounded text-[10px] ${isDarkMode ? 'bg-slate-700/60 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                            isDarkMode ? 'bg-slate-700/60 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="Read full document content"
                        >
                          <Eye size={14} />
                          <span className="hidden sm:inline">View</span>
                        </button>

                        <button
                          onClick={() => handleToggleDoc(doc.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            doc.isActive 
                              ? (isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-600 text-white hover:bg-blue-700')
                              : (isDarkMode ? 'bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300')
                          }`}
                          title={doc.isActive ? 'Active in knowledge base' : 'Inactive (click to enable)'}
                        >
                          <Check size={12} className={doc.isActive ? 'opacity-100' : 'opacity-0'} />
                          {doc.isActive ? 'Active' : 'Disabled'}
                        </button>

                        <button
                          onClick={(e) => handleDeleteDoc(doc.id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                          title="Delete document"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredDocs.length === 0 && (
                  <div className={`text-center py-10 rounded-xl border border-dashed ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                    No documents matched your criteria. Add one above!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: URLS */}
          {activeTab === 'urls' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Indexed Web Context & Documentation URLs</h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Provide specific target URLs for APIs, guides, or external documentation to inform answers.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingUrl(!isAddingUrl)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus size={16} />
                  {isAddingUrl ? 'Cancel' : 'Add URL'}
                </button>
              </div>

              {isAddingUrl && (
                <form onSubmit={handleAddUrl} className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">Add Target Documentation URL</h4>
                  <div>
                    <label className="block text-xs font-medium mb-1">Target URL</label>
                    <input 
                      type="url"
                      value={urlAddress}
                      onChange={e => setUrlAddress(e.target.value)}
                      placeholder="https://docs.example.com/api/v1"
                      required
                      className={`w-full p-2 text-xs sm:text-sm rounded-lg border outline-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Display Title</label>
                    <input 
                      type="text"
                      value={urlTitle}
                      onChange={e => setUrlTitle(e.target.value)}
                      placeholder="e.g., Example API v1 Documentation"
                      className={`w-full p-2 text-xs sm:text-sm rounded-lg border outline-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Summary / Key Context Excerpt</label>
                    <textarea 
                      value={urlSummary}
                      onChange={e => setUrlSummary(e.target.value)}
                      rows={3}
                      placeholder="Summarize key endpoints, rate limits, or documentation notes..."
                      className={`w-full p-2 text-xs sm:text-sm rounded-lg border outline-none resize-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setIsAddingUrl(false)} className="px-3 py-1.5 text-xs text-slate-400">Cancel</button>
                    <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold">Save URL</button>
                  </div>
                </form>
              )}

              <div className="space-y-2.5">
                {urls.map(item => (
                  <div 
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      item.isActive 
                        ? (isDarkMode ? 'bg-slate-800/40 border-slate-700/80' : 'bg-white border-slate-200 shadow-sm')
                        : (isDarkMode ? 'bg-slate-900/30 border-slate-800/50 opacity-60' : 'bg-slate-100/50 border-slate-200 opacity-60')
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Globe size={16} className="text-blue-400 shrink-0" />
                        <h4 className="font-semibold text-sm truncate">{item.title}</h4>
                      </div>
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1 my-0.5"
                      >
                        <span className="truncate">{item.url}</span>
                        <ExternalLink size={10} className="shrink-0" />
                      </a>
                      {item.summary && (
                        <p className={`text-xs line-clamp-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {item.summary}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleUrl(item.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                          item.isActive 
                            ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white')
                            : (isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600')
                        }`}
                      >
                        <Check size={12} className={item.isActive ? 'opacity-100' : 'opacity-0'} />
                        {item.isActive ? 'Active' : 'Disabled'}
                      </button>
                      <button 
                        onClick={(e) => handleDeleteUrl(item.id, e)}
                        className="p-1.5 text-slate-400 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RETRIEVAL SANDBOX */}
          {activeTab === 'sandbox' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm">Semantic Retrieval Sandbox</h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Test queries against your active documents and URLs to preview exact snippets and relevance scores passed to Gemini.
                </p>
              </div>

              {/* Sample queries chips */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-slate-400">Quick Test Queries:</span>
                {[
                  "What is the return window and warranty policy?",
                  "How does quantum superposition differ from classical bits?",
                  "What is the emulsification ratio for Mediterranean vinaigrette?",
                  "What are the rate limits for the OmniChat API?",
                ].map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => handleSandboxSearch(sq)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                      sandboxQuery === sq
                        ? (isDarkMode ? 'bg-blue-600 text-white border-blue-500' : 'bg-blue-600 text-white border-blue-600')
                        : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200')
                    }`}
                  >
                    {sq}
                  </button>
                ))}
              </div>

              {/* Query input */}
              <div className={`p-2 rounded-xl border flex items-center gap-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                <Search size={16} className="text-blue-400 shrink-0 ml-1" />
                <input 
                  type="text"
                  value={sandboxQuery}
                  onChange={e => handleSandboxSearch(e.target.value)}
                  placeholder="Enter a test question to evaluate knowledge base retrieval..."
                  className="flex-1 text-xs sm:text-sm bg-transparent outline-none"
                />
                {onSelectSampleQuery && (
                  <button
                    onClick={() => {
                      onSelectSampleQuery(sandboxQuery);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Ask in Chat</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>

              {/* Results display */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span>Retrieved Knowledge Chunks ({sandboxResults.length} matches)</span>
                  <span>Scored against {activeDocsCount} docs & {activeUrlsCount} URLs</span>
                </div>

                {sandboxResults.map((res, i) => (
                  <div 
                    key={i}
                    className={`p-3.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {res.type === 'doc' ? <FileText size={14} className="text-blue-400" /> : <Globe size={14} className="text-emerald-400" />}
                        <span className="font-semibold text-xs sm:text-sm">{res.title}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isDarkMode ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60' : 'bg-blue-100 text-blue-800'
                      }`}>
                        Match Score: {res.score}
                      </span>
                    </div>
                    <p className={`text-xs font-mono p-2 rounded-lg ${isDarkMode ? 'bg-slate-900/80 text-slate-300' : 'bg-white text-slate-700 border border-slate-200'}`}>
                      {res.snippet}
                    </p>
                  </div>
                ))}

                {sandboxResults.length === 0 && (
                  <div className={`p-6 text-center text-xs rounded-xl border border-dashed ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                    No relevant chunks retrieved for "{sandboxQuery}". Check that matching documents are toggled active.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-slate-50/90'}`}>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Check size={14} className="text-emerald-500" />
            <span>Automatic Grounding Enabled</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Document View Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h3 className="font-bold text-sm sm:text-base">{previewDoc.title}</h3>
                <span className="text-xs text-slate-400 uppercase tracking-wider">{previewDoc.category} • {previewDoc.charCount} characters</span>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="p-1.5 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
              {previewDoc.content}
            </div>
            <div className={`p-3 border-t flex justify-end ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <button onClick={() => setPreviewDoc(null)} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
