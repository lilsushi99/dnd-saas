import React, { useState } from 'react';
import { AIMessage } from '../../types';

interface AIAssistantCardProps {
  userName?: string;
}

export const AIAssistantCard: React.FC<AIAssistantCardProps> = ({
  userName = 'Dominion',
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: `Good morning, ${userName}. How can I assist with your enterprise metrics today?`,
      timestamp: '09:00 AM',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const quickPrompts = [
    'Summarize Q3 revenue',
    'Show top facility bookings',
    'Export ledger summary',
  ];

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim()) return;

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    // Send to live AI backend connected to MySQL
    fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: query,
        history: messages.map((m) => ({ sender: m.sender, text: m.text })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const replyText = data.text || 'I analyzed the system metrics, but no response was returned.';
        const assistantMsg: AIMessage = {
          id: data.id || (Date.now() + 1).toString(),
          sender: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      })
      .catch((err) => {
        console.error('Error contacting AI Assistant:', err);
        const errorMsg: AIMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'Unable to reach AI assistant service at this time. Please check your network connection.',
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      })
      .finally(() => {
        setIsThinking(false);
      });
  };

  const handleMicToggle = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setInputValue('Show revenue breakdown for London Main Branch');
        setIsRecording(false);
      }, 1500);
    }
  };

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-2xs font-sans flex flex-col justify-between h-full">
      {/* Assistant Card Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm shadow-sm shadow-blue-500/20 shrink-0">
            <i className="fa-solid fa-compass"></i>
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-gray-900 leading-none">
              Enterprise Assistant
            </h3>
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Real-time Intelligence
            </span>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: '1',
                sender: 'assistant',
                text: `Good morning, ${userName}. How can I assist with your enterprise metrics today?`,
                timestamp: '09:00 AM',
              },
            ])
          }
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer text-xs"
          title="Reset conversation"
        >
          <i className="fa-solid fa-arrows-rotate"></i>
        </button>
      </div>

      {/* Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto space-y-3.5 mb-4 max-h-56 sm:max-h-64 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-xs'
                  : 'bg-gray-100/80 text-gray-800 rounded-bl-xs border border-gray-200/60'
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[10px] text-gray-400 mt-1 px-1 font-mono">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-gray-500 p-2 bg-gray-50 rounded-xl w-fit border border-gray-100">
            <i className="fa-solid fa-circle-notch fa-spin text-blue-600"></i>
            <span>Querying enterprise index...</span>
          </div>
        )}
      </div>

      {/* Quick Prompt Suggestions */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-[11px] font-medium text-gray-600 border border-gray-200/70 transition-all cursor-pointer truncate max-w-full"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Bar Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:border-blue-600 transition-all"
      >
        {/* Microphone Button */}
        <button
          type="button"
          onClick={handleMicToggle}
          className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 text-xs ${
            isRecording
              ? 'bg-red-50 text-red-600 animate-pulse'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'
          }`}
          title={isRecording ? 'Listening...' : 'Voice input'}
        >
          <i className="fa-solid fa-microphone"></i>
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask anything about your business..."
          className="w-full bg-transparent text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none px-1"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="p-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-lg transition-all shrink-0 text-xs shadow-2xs cursor-pointer"
        >
          <i className="fa-solid fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
};
