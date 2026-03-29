import React, { useState } from 'react';
import { Volume2, Play, Loader2, AlertCircle, Download } from 'lucide-react';
import { generateSpeech } from '../services/gemini';

export const TextToSpeechMode: React.FC = () => {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [voice, setVoice] = useState('Puck');
  const [error, setError] = useState<string | null>(null);

  const voices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setAudioUrl(null);
    setError(null);

    try {
      const response = await generateSpeech(text, voice);
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64Audio) {
        const url = `data:audio/mp3;base64,${base64Audio}`;
        setAudioUrl(url);
      } else {
        setError('Failed to generate audio. The model did not return audio data.');
      }
    } catch (err: any) {
      console.error('TTS error:', err);
      setError(err?.message || 'An error occurred while generating speech. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `speech-${voice}-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-fuchsia-100 text-fuchsia-500 rounded-full flex items-center justify-center mb-6">
          <Volume2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Text to Speech</h2>
        <p className="text-slate-500 text-center mb-8">
          Type text and the AI will generate speech using gemini-2.5-flash-preview-tts.
        </p>

        <div className="w-full space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Voice</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            >
              {voices.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to synthesize..."
              rows={4}
              className="w-full p-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 resize-none"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3 border border-red-100">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!text.trim() || isGenerating}
            className="w-full py-3 rounded-xl text-white font-medium bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
            {isGenerating ? 'Generating...' : 'Generate Speech'}
          </button>
        </div>

        {audioUrl && (
          <div className="mt-8 w-full bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Generated Audio</h3>
            <audio controls src={audioUrl} className="w-full mb-4" autoPlay />
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Download size={16} />
              Download Audio
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
