import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { getSearchGroundedResponse, getMapsGroundedResponse } from '../services/gemini';
import { MapPin, Search } from 'lucide-react';

export const SearchMapsMode: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<'search' | 'maps'>('search');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const modelMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: modelMessageId, role: 'model', text: 'Searching...', isStreaming: true }]);

    try {
      let response;
      if (searchType === 'maps') {
        // Try to get user location
        let lat = 37.78193; // Default to SF
        let lng = -122.40476;
        
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } catch (e) {
          console.log("Could not get location, using default.");
        }
        
        response = await getMapsGroundedResponse(text, lat, lng);
      } else {
        response = await getSearchGroundedResponse(text);
      }
      
      const responseText = response.text;
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId ? { ...msg, text: responseText, groundingChunks: chunks } : msg
        )
      );
    } catch (error: any) {
      console.error('Search error:', error);
      const errorMessage = error?.message || 'Sorry, an error occurred while searching. Please try again.';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId ? { ...msg, text: `**Error:** ${errorMessage}` } : msg
        )
      );
    } finally {
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white border-b border-slate-200 flex justify-center gap-4">
        <button
          onClick={() => setSearchType('search')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            searchType === 'search' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Search size={16} />
          Web Search
        </button>
        <button
          onClick={() => setSearchType('maps')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            searchType === 'maps' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <MapPin size={16} />
          Google Maps
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${searchType === 'search' ? 'bg-blue-100 text-blue-500' : 'bg-emerald-100 text-emerald-500'}`}>
              {searchType === 'search' ? <Search size={32} /> : <MapPin size={32} />}
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              {searchType === 'search' ? 'Search Grounding' : 'Maps Grounding'}
            </h2>
            <p className="max-w-md">
              {searchType === 'search' 
                ? 'Ask questions about recent events or facts. The AI will search the web to provide accurate, up-to-date answers.'
                : 'Ask about places, restaurants, or directions. The AI will use Google Maps to find the best locations near you.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} placeholder={`Ask about ${searchType === 'search' ? 'recent news...' : 'places nearby...'}`} />
    </div>
  );
};
