import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  Sparkles,
  Code,
  FileText,
  Zap,
  MessageSquare,
  Loader2,
  Folder
} from 'lucide-react';

interface AIAgentProps {
  onCodeChange: (code: string) => void;
  currentCode: string;
  fileName?: string;
  geminiApiKey: string;
  allFiles?: Map<string, string>;
  folderStructure?: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export const AIAgent: React.FC<AIAgentProps> = ({
  onCodeChange,
  currentCode,
  fileName,
  geminiApiKey,
  allFiles = new Map(),
  folderStructure = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = async (userMessage: string): Promise<string> => {
    if (!geminiApiKey || geminiApiKey.trim() === '') {
      throw new Error('Gemini API key is not configured. Please check your token setup.');
    }

    try {
      // Prepare context with all files
      let contextInfo = `You are an AI coding assistant helping with a web development project.

Current file: ${fileName || 'untitled'}
Current file content:
\`\`\`
${currentCode}
\`\`\`

Project structure:
${folderStructure}

`;

      // Add other files context if available
      if (allFiles.size > 0) {
        contextInfo += '\nOther files in the project:\n';
        Array.from(allFiles.entries()).slice(0, 10).forEach(([path, content]) => {
          if (path !== fileName && content.length < 2000) {
            contextInfo += `\n${path}:\n\`\`\`\n${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}\n\`\`\`\n`;
          }
        });
      }

      contextInfo += `\nUser request: ${userMessage}

Please provide helpful, natural language responses. If suggesting code changes, explain what you're doing and why. Be conversational and helpful, not formal or JSON-like. Focus on being a helpful coding companion.`;

      const requestBody = {
        contents: [{
          parts: [{
            text: contextInfo
          }]
        }]
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to get AI response';
        
        if (response.status === 400) {
          errorMessage = 'Invalid API request. Please check your Gemini API key.';
        } else if (response.status === 401) {
          errorMessage = 'Invalid or expired Gemini API key. Please update your API key in settings.';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. Please check your Gemini API key permissions.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (response.status >= 500) {
          errorMessage = 'Gemini API server error. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        throw new Error('Invalid response format from Gemini API');
      }
      
      return data.candidates[0].content.parts[0].text || 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('AI API Error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Network error. Please check your internet connection and try again.');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const aiResponse = await generateResponse(inputValue);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Check if the AI response contains code that should replace the current code
      const codeBlockMatch = aiResponse.match(/```[\s\S]*?\n([\s\S]*?)```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        const extractedCode = codeBlockMatch[1].trim();
        if (extractedCode.length > 50) { // Only replace if it's substantial code
          onCodeChange(extractedCode);
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: 'Optimize Code', icon: Zap, prompt: 'Please optimize this code for better performance and readability.' },
    { label: 'Add Comments', icon: MessageSquare, prompt: 'Please add helpful comments to explain this code.' },
    { label: 'Fix Bugs', icon: Code, prompt: 'Please review this code and fix any potential bugs or issues.' },
    { label: 'Improve UI', icon: FileText, prompt: 'Please improve the user interface and styling of this code.' },
    { label: 'Explain Code', icon: Folder, prompt: 'Please explain what this code does and how it works.' },
    { label: 'Add Features', icon: Sparkles, prompt: 'Suggest and implement new features for this project.' },
  ];

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center group z-50 hover:scale-110"
      >
        <Bot className="w-7 h-7 group-hover:scale-110 transition-transform" />
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-400 rounded-full animate-pulse border-2 border-white"></div>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-t-3xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">AI Assistant</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Powered by Gemini</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Actions */}
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex items-center gap-2 p-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                >
                  <action.icon className="w-3 h-3" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-96">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Hi! I'm your AI coding assistant</p>
                <p className="text-sm">I can help you with your code, suggest improvements, fix bugs, and answer questions about your entire project!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white'
                        : 'bg-gray-100/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 backdrop-blur-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-2 opacity-70 ${
                      message.type === 'user' ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-3xl">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything about your code..."
                className="flex-1 px-4 py-3 border border-gray-300/50 dark:border-gray-600/50 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-sm transition-all"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="p-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};