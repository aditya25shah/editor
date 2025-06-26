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
      // Enhanced context with better prompt engineering
      let contextInfo = `You are a friendly, helpful AI coding assistant. Your role is to have natural conversations about code and provide practical help.

IMPORTANT GUIDELINES:
- Always respond in natural, conversational language
- Be friendly, encouraging, and supportive
- Explain things clearly without being overly technical unless asked
- When suggesting code changes, explain WHY you're making them
- Use "I", "you", "we" naturally in conversation
- Ask follow-up questions when helpful
- Provide context and reasoning for your suggestions
- Be concise but thorough in explanations

CURRENT CONTEXT:
File: ${fileName || 'untitled file'}
Content:
\`\`\`
${currentCode}
\`\`\`

Project Structure:
${folderStructure || 'No structure available'}

`;

      // Add other files context if available
      if (allFiles.size > 0) {
        contextInfo += '\nOther project files:\n';
        Array.from(allFiles.entries()).slice(0, 5).forEach(([path, content]) => {
          if (path !== fileName && content.length < 1500) {
            contextInfo += `\n${path}:\n\`\`\`\n${content.substring(0, 800)}${content.length > 800 ? '...\n[truncated]' : ''}\n\`\`\`\n`;
          }
        });
      }

      contextInfo += `\nUser Question: "${userMessage}"

Please respond naturally and conversationally. If you're suggesting code changes:
1. Explain what you're doing and why
2. Highlight the key improvements
3. Use markdown code blocks for any code snippets
4. Keep the tone friendly and encouraging

Remember: You're having a conversation, not writing documentation. Be helpful, natural, and engaging!`;

      const requestBody = {
        contents: [{
          parts: [{
            text: contextInfo
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
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
          errorMessage = 'Invalid API request. Please check your Gemini API key format.';
        } else if (response.status === 401) {
          errorMessage = 'Authentication failed. Your Gemini API key might be invalid or expired.';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. Please verify your API key has the necessary permissions.';
        } else if (response.status === 429) {
          errorMessage = 'Too many requests! Let me catch my breath for a moment, then try again.';
        } else if (response.status >= 500) {
          errorMessage = 'The AI service is having issues right now. Please try again in a moment.';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        throw new Error('I received an unexpected response format. Please try asking your question again.');
      }
      
      return data.candidates[0].content.parts[0].text || 'I apologize, but I couldn\'t generate a helpful response. Could you try rephrasing your question?';
    } catch (error) {
      console.error('AI API Error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('I\'m having trouble connecting right now. Please check your internet connection and try again.');
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
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const aiResponse = await generateResponse(currentInput);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Enhanced code extraction with better detection
      const codeBlockRegex = /```(?:javascript|typescript|jsx|tsx|html|css|js|ts)?\s*\n([\s\S]*?)```/g;
      const codeBlocks = [];
      let match;

      while ((match = codeBlockRegex.exec(aiResponse)) !== null) {
        codeBlocks.push(match[1].trim());
      }

      // Look for the largest code block that seems like a complete replacement
      const substantialCode = codeBlocks.find(code => 
        code.length > 100 && 
        (code.includes('function') || code.includes('const') || code.includes('import') || code.includes('export'))
      );

      if (substantialCode) {
        // Ask user if they want to apply the code changes
        const confirmMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'ai',
          content: '💡 I found some code changes in my response. Would you like me to apply them to your file?',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, confirmMessage]);
        
        // Auto-apply after a short delay (or you could add buttons for user confirmation)
        setTimeout(() => {
          onCodeChange(substantialCode);
        }, 2000);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: error instanceof Error ? error.message : 'Oops! Something went wrong on my end. Please give it another try.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { 
      label: 'Optimize Code', 
      icon: Zap, 
      prompt: 'Can you help me optimize this code? I\'d like to improve its performance and make it more readable.' 
    },
    { 
      label: 'Add Comments', 
      icon: MessageSquare, 
      prompt: 'Could you add helpful comments to this code? I want to make sure it\'s well-documented for other developers.' 
    },
    { 
      label: 'Debug Issues', 
      icon: Code, 
      prompt: 'I think there might be some bugs or issues in this code. Can you take a look and help me fix them?' 
    },
    { 
      label: 'Improve UI', 
      icon: FileText, 
      prompt: 'How can I make the user interface better? I\'m looking for suggestions on styling and user experience improvements.' 
    },
    { 
      label: 'Explain Code', 
      icon: Folder, 
      prompt: 'Can you walk me through what this code does? I\'d like to understand how it works step by step.' 
    },
    { 
      label: 'Add Features', 
      icon: Sparkles, 
      prompt: 'What new features could I add to make this project better? I\'m open to creative suggestions!' 
    },
  ];

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center group z-50 hover:scale-110"
      >
        <Bot className="w-7 h-7 group-hover:scale-110 transition-transform" />
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-400 rounded-full animate-pulse border-2 border-white"></div>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-24 right-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-t-3xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">AI Coding Buddy</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Here to help you code!</p>
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
                <p className="text-lg font-medium mb-2">Hey there! 👋</p>
                <p className="text-sm leading-relaxed">I'm your AI coding buddy! I can help you write better code, fix bugs, explain complex concepts, and brainstorm new features. Just ask me anything about your project - I'm here to make coding easier and more fun!</p>
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
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content.split('```').map((part, index) => {
                        if (index % 2 === 1) {
                          // This is a code block
                          return (
                            <pre key={index} className={`mt-2 mb-2 p-3 rounded-lg overflow-x-auto text-xs ${
                              message.type === 'user' 
                                ? 'bg-black/20 text-indigo-100' 
                                : 'bg-gray-800 dark:bg-gray-900 text-green-400'
                            }`}>
                              <code>{part}</code>
                            </pre>
                          );
                        }
                        return <span key={index}>{part}</span>;
                      })}
                    </div>
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
                    <span className="text-sm text-gray-600 dark:text-gray-400">Let me think about that...</span>
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
