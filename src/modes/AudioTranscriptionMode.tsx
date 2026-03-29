import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, FileAudio } from 'lucide-react';
import { transcribeAudio } from '../services/gemini';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

export const AudioTranscriptionMode: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscription('');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please ensure permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          const base64Audio = base64data.split(',')[1];
          
          const response = await transcribeAudio(base64Audio, 'audio/webm');
          setTranscription(response.text || 'Could not transcribe audio.');
        } catch (innerError: any) {
          console.error('Transcription error:', innerError);
          setTranscription(`**Error:** ${innerError?.message || 'An error occurred during transcription. Please try again.'}`);
        } finally {
          setIsTranscribing(false);
        }
      };
    } catch (error: any) {
      console.error('File reading error:', error);
      setTranscription(`**Error:** ${error?.message || 'An error occurred while reading the audio file.'}`);
      setIsTranscribing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mb-6">
          <FileAudio size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Audio Transcription</h2>
        <p className="text-slate-500 text-center mb-8">
          Record your voice and the AI will transcribe it accurately using gemini-3-flash-preview.
        </p>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isTranscribing}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 animate-pulse' 
              : 'bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/30'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRecording ? <Square size={32} className="text-white fill-current" /> : <Mic size={32} className="text-white" />}
        </button>

        <div className="mt-4 h-8 flex items-center justify-center">
          {isRecording && <span className="text-red-500 font-medium">Recording...</span>}
          {isTranscribing && (
            <div className="flex items-center text-indigo-500 font-medium">
              <Loader2 size={16} className="animate-spin mr-2" />
              Transcribing...
            </div>
          )}
        </div>

        {transcription && (
          <div className="mt-8 w-full bg-slate-50 rounded-xl p-6 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Transcription Result</h3>
            <div className="text-slate-800">
              <MarkdownRenderer content={transcription} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
