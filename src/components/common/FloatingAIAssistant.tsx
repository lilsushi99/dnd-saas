import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIMessage } from '../../types';

interface FloatingAIAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  userName?: string;
  onSelectNav?: (navId: string) => void;
}

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({
  isOpen,
  onToggle,
  userName = 'Dominion',
  onSelectNav,
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechTranscriptRef = useRef<string>('');

  const quickPrompts = [
    'Summarize daily sales',
    'Check low stock items',
    'Show active bookings',
    'Analyze expenses',
  ];

  // Load chat history from MySQL on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/ai/history');
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setMessages(
          json.data.map((m: any) => ({
            id: String(m.id),
            sender: m.sender as 'user' | 'assistant',
            text: m.text,
            timestamp: m.timestamp || 'Just now',
          }))
        );
      } else {
        // Initial greeting
        setMessages([
          {
            id: 'init-1',
            sender: 'assistant',
            text: `Hello ${userName}, I am Tosin, your Executive AI Assistant. How can I assist you with enterprise revenue, bookings, or operational expenses today?`,
            timestamp: 'Just now',
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load AI chat history:', err);
      setMessages([
        {
          id: 'init-1',
          sender: 'assistant',
          text: `Hello ${userName}, I am Tosin, your Executive AI Assistant. How can I assist you with enterprise metrics today?`,
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Clear chat history in MySQL
  const handleClearHistory = async () => {
    stopSpeaking();
    try {
      await fetch('/api/ai/history', { method: 'DELETE' });
      setMessages([
        {
          id: `init-${Date.now()}`,
          sender: 'assistant',
          text: `Chat history cleared. How can I help you, Director ${userName}?`,
          timestamp: 'Just now',
        },
      ]);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Text-to-Speech (Browser SpeechSynthesis)
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop any active speech

    // Clean markdown text for speech output
    const cleanText = text
      .replace(/[*#_`~>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Send message to backend Gemini API
  const handleSend = async (textToSend?: string) => {
    const prompt = textToSend || inputValue;
    if (!prompt.trim() || isThinking) return;

    stopSpeaking();
    const userMsgText = prompt.trim();

    // Create temporary user message
    const tempUserMsg: AIMessage = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputValue('');
    speechTranscriptRef.current = '';
    setIsThinking(true);

    try {
      const historyPayload = messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsgText,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      const replyText =
        data.text ||
        'I analyzed the enterprise records, but received an empty response. Please try asking again.';

      const assistantMsg: AIMessage = {
        id: data.id || `msg-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Read aloud if voice mode is enabled
      if (isVoiceMode) {
        speakText(replyText);
      }
    } catch (err) {
      console.error('Error sending query to Gemini API:', err);
      const errorMsg: AIMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Sorry, I encountered a temporary connection issue communicating with Gemini. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  // Push-to-Talk Web Speech API Recognition
  const toggleListening = () => {
    setMicError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicError('Speech Recognition is not supported by your browser. Please type your message.');
      return;
    }

    // If currently listening, manual stop (Push-to-Talk completes and submits)
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Error stopping recognition:', e);
        }
      }
      setIsListening(false);
      return;
    }

    // Start push-to-talk listening
    try {
      speechTranscriptRef.current = '';
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setMicError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          speechTranscriptRef.current = currentTranscript;
          setInputValue(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicError('Microphone permission denied. Please allow microphone access in your browser or iframe settings to talk to Tosin AI, or type your message.');
        } else if (event.error === 'no-speech') {
          setMicError('No speech was detected. Please try speaking again.');
        } else if (event.error === 'audio-capture') {
          setMicError('No microphone hardware detected. Please connect a microphone.');
        } else if (event.error !== 'aborted') {
          setMicError(`Speech input note: ${event.error || 'Unable to capture audio'}. You can type your message.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Only submit if user captured speech and stopped listening
        const finalTranscript = speechTranscriptRef.current || inputValue;
        if (finalTranscript && finalTranscript.trim()) {
          handleSend(finalTranscript.trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.warn('Error starting speech recognition:', e);
      setIsListening(false);
      setMicError('Microphone initialization failed. Please allow microphone access or type your message.');
    }
  };

  // Determine appropriate interactive action button based on message content
  const renderActionButtons = (text: string) => {
    const lower = text.toLowerCase();
    const buttons = [];

    if (lower.includes('booking') || lower.includes('sale') || lower.includes('occupancy')) {
      buttons.push({
        label: 'View Daily Bookings',
        icon: 'fa-calendar-check',
        nav: 'daily_logger',
      });
    }
    if (lower.includes('expense') || lower.includes('stock') || lower.includes('cost')) {
      buttons.push({
        label: 'Manage Expenses',
        icon: 'fa-receipt',
        nav: 'expenses',
      });
    }
    if (lower.includes('revenue') || lower.includes('profit') || lower.includes('financial') || lower.includes('report')) {
      buttons.push({
        label: 'Open Financial Reports',
        icon: 'fa-chart-pie',
        nav: 'reports',
      });
    }
    if (lower.includes('facility') || lower.includes('room') || lower.includes('office')) {
      buttons.push({
        label: 'Facility Yield Sheet',
        icon: 'fa-building',
        nav: 'facility_records',
      });
    }

    if (buttons.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
        {buttons.map((btn, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (onSelectNav) onSelectNav(btn.nav);
              onToggle();
            }}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[10px] rounded-lg border border-blue-200/80 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <i className={`fa-solid ${btn.icon} text-[9px]`}></i>
            <span>{btn.label}</span>
          </button>
        ))}
      </div>
    );
  };

  // Reusable Bee Icon Component
  const BeeIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3c-1.1 0-2 .9-2 2 0 .34.09.66.24.95A6 6 0 0 0 6 11v1a6 6 0 0 0 12 0v-1a6 6 0 0 0-4.24-5.05A2 2 0 0 0 12 3zm-3 8a3 3 0 0 1 6 0v-1a3 3 0 0 1-6 0v1zm-2 5h10v1.5H7V16zm1 3h8v1.5H8V19zM3.5 10a2.5 2.5 0 0 1 2.5-2.5h1v2H6a.5.5 0 0 0-.5.5v1.5a.5.5 0 0 0 .5.5h1v2H6A2.5 2.5 0 0 1 3.5 13v-3zm17 0v3a2.5 2.5 0 0 1-2.5 2.5h-1v-2h1a.5.5 0 0 0 .5-.5V11a.5.5 0 0 0-.5-.5h-1v-2h1A2.5 2.5 0 0 1 20.5 10z" />
    </svg>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Pill-shaped Launcher ("Ask Tosin") */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="group relative px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 rounded-full border border-blue-500/80 flex items-center gap-3 hover:scale-105 transition-all duration-300 cursor-pointer"
          title="Ask Tosin AI Executive Assistant"
        >
          {/* LEFT: Circular white badge with clean Bee Icon */}
          <div className="w-7 h-7 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-xs group-hover:rotate-12 transition-transform shrink-0">
            <BeeIcon className="w-4 h-4 text-blue-600" />
          </div>

          {/* RIGHT: Text "Ask Tosin" */}
          <span className="text-xs font-bold tracking-wide text-white pr-1">
            Ask Tosin
          </span>
        </button>
      )}

      {/* Expanded Chat Panel - Reduced width (sm:w-[360px]) */}
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-[360px] bg-white/95 backdrop-blur-xl border border-gray-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[540px] max-h-[85vh] animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header - Primary Blue Background */}
          <div className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between border-b border-blue-700 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-md shrink-0">
                <BeeIcon className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-heading text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                  Ask Tosin
                  <span className="px-1.5 py-0.2 rounded bg-white/20 text-white text-[9px] font-mono border border-white/30">
                    Gemini AI
                  </span>
                </h3>
                <p className="text-[10px] text-blue-100 flex items-center gap-1 mt-0.5">
                  Executive Assistant for {userName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Toggle Voice Mode */}
              <button
                onClick={() => {
                  const nextState = !isVoiceMode;
                  setIsVoiceMode(nextState);
                  if (!nextState) stopSpeaking();
                }}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isVoiceMode
                    ? 'bg-white text-blue-600 font-bold'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle Voice Mode ('Talk to Tosin')"
              >
                <i className="fa-solid fa-microphone-lines"></i>
              </button>

              {/* Stop Speaking if active */}
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="p-1.5 text-amber-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-xs"
                  title="Stop Speech Output"
                >
                  <i className="fa-solid fa-volume-xmark"></i>
                </button>
              )}

              {/* Clear Chat History */}
              <button
                onClick={handleClearHistory}
                className="p-1.5 text-blue-100 hover:text-red-200 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-xs"
                title="Clear Chat History"
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>

              {/* Close Panel Button */}
              <button
                onClick={() => {
                  stopSpeaking();
                  onToggle();
                }}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-xs"
                title="Close Assistant"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
          </div>

          {/* Voice Mode Banner */}
          {isVoiceMode && (
            <div className="bg-blue-900 p-2.5 text-white border-b border-blue-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                    isListening
                      ? 'bg-red-500 animate-pulse'
                      : isSpeaking
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-blue-600'
                  }`}
                >
                  <i
                    className={`fa-solid ${
                      isListening ? 'fa-microphone' : isSpeaking ? 'fa-volume-high' : 'fa-brain'
                    }`}
                  ></i>
                </div>
                <div>
                  <div className="text-[11px] font-bold font-heading">
                    {isListening ? 'Push-to-Talk Recording...' : isSpeaking ? 'Tosin Speaking...' : 'Voice Mode Enabled'}
                  </div>
                  <div className="text-[9px] text-blue-200">
                    {isListening ? 'Click mic again when finished speaking' : 'Press mic button to start push-to-talk'}
                  </div>
                </div>
              </div>

              {/* Speech Waveform Simulation */}
              <div className="flex items-center gap-0.5 h-3.5">
                <span className={`w-1 bg-blue-300 rounded-full h-2 ${isListening || isSpeaking ? 'animate-[bounce_0.8s_infinite_100ms]' : ''}`}></span>
                <span className={`w-1 bg-blue-400 rounded-full h-3.5 ${isListening || isSpeaking ? 'animate-[bounce_0.8s_infinite_200ms]' : ''}`}></span>
                <span className={`w-1 bg-blue-200 rounded-full h-2.5 ${isListening || isSpeaking ? 'animate-[bounce_0.8s_infinite_300ms]' : ''}`}></span>
                <span className={`w-1 bg-blue-500 rounded-full h-1.5 ${isListening || isSpeaking ? 'animate-[bounce_0.8s_infinite_400ms]' : ''}`}></span>
              </div>
            </div>
          )}

          {/* Microphone Permission / Status Alert Banner */}
          {micError && (
            <div className="bg-amber-50 border-b border-amber-200 p-2.5 px-3 flex items-start justify-between gap-2 text-amber-900 text-xs animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xs mt-0.5 shrink-0"></i>
                <span className="text-[11px] leading-tight font-medium">{micError}</span>
              </div>
              <button
                onClick={() => setMicError(null)}
                className="text-amber-700 hover:text-amber-950 p-0.5 text-xs shrink-0 cursor-pointer"
                title="Dismiss warning"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#F8F9FB]">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-400 gap-2">
                <i className="fa-solid fa-spinner fa-spin text-blue-600"></i>
                <span>Loading chat history...</span>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[92%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-xs font-medium'
                        : 'bg-white text-gray-800 rounded-bl-xs border border-gray-200/90 font-normal'
                    }`}
                  >
                    {msg.sender === 'assistant' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          h1: ({ children }) => <h1 className="font-bold text-sm text-gray-900 my-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="font-bold text-xs text-gray-900 my-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="font-bold text-xs text-gray-900 my-1">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 my-1.5">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 my-1.5">{children}</ol>,
                          li: ({ children }) => <li className="leading-snug">{children}</li>,
                          code: ({ children }) => <code className="bg-slate-100 text-blue-700 px-1 py-0.5 rounded font-mono text-[10px]">{children}</code>,
                          pre: ({ children }) => <pre className="bg-slate-900 text-slate-100 p-2 rounded-lg my-1.5 overflow-x-auto text-[10px] font-mono">{children}</pre>,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-500 pl-2 text-gray-600 italic my-1">{children}</blockquote>,
                          table: ({ children }) => <div className="overflow-x-auto my-2"><table className="w-full text-left border-collapse text-[10px]">{children}</table></div>,
                          th: ({ children }) => <th className="bg-gray-100 p-1 font-bold border border-gray-200">{children}</th>,
                          td: ({ children }) => <td className="p-1 border border-gray-200">{children}</td>,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    )}
                    {msg.sender === 'assistant' && renderActionButtons(msg.text)}
                  </div>

                  <div className="flex items-center gap-2 mt-1 px-1">
                    <span className="text-[9px] text-gray-400 font-mono">
                      {msg.timestamp}
                    </span>
                    {msg.sender === 'assistant' && (
                      <button
                        onClick={() => speakText(msg.text)}
                        className="text-[10px] text-gray-400 hover:text-blue-600 cursor-pointer"
                        title="Read Aloud ('Talk to Tosin')"
                      >
                        <i className="fa-solid fa-volume-low"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-gray-500 p-2.5 bg-white rounded-xl w-fit border border-gray-200 shadow-2xs">
                <i className="fa-solid fa-circle-notch fa-spin text-blue-600 text-xs"></i>
                <span className="font-medium text-xs">Tosin analyzing enterprise database...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="p-2 bg-white border-t border-gray-100 flex gap-1.5 overflow-x-auto scrollbar-none">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-[10px] font-medium text-gray-600 border border-gray-200 transition-all whitespace-nowrap cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 text-xs ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
              title={isListening ? 'Click to stop push-to-talk recording and submit' : 'Start Push-to-Talk Recording'}
            >
              <i className="fa-solid fa-microphone"></i>
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isListening ? 'Recording speech... Click mic to stop' : 'Ask Tosin about revenue, bookings...'
              }
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-all"
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isThinking}
              className="p-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white rounded-xl transition-all shrink-0 text-xs shadow-2xs cursor-pointer"
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
