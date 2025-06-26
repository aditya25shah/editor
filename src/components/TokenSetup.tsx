import React, { useState } from 'react';
import { Github, Key, Bot, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TokenSetupProps {
  onTokensSubmit: (githubToken: string, geminiToken: string) => void;
}

export const TokenSetup: React.FC<TokenSetupProps> = ({ onTokensSubmit }) => {
  const [githubToken, setGithubToken] = useState('');
  const [geminiToken, setGeminiToken] = useState('');
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [showGeminiToken, setShowGeminiToken] = useState(false);
  const [githubVerifying, setGithubVerifying] = useState(false);
  const [geminiVerifying, setGeminiVerifying] = useState(false);
  const [githubValid, setGithubValid] = useState<boolean | null>(null);
  const [geminiValid, setGeminiValid] = useState<boolean | null>(null);
  const [step, setStep] = useState(1);

  const verifyGithubToken = async (token: string) => {
    if (!token.trim()) return;
    
    setGithubVerifying(true);
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      setGithubValid(response.ok);
    } catch (error) {
      setGithubValid(false);
    } finally {
      setGithubVerifying(false);
    }
  };

  const verifyGeminiToken = async (token: string) => {
    if (!token.trim()) return;
    
    setGeminiVerifying(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${token}`);
      setGeminiValid(response.ok);
    } catch (error) {
      setGeminiValid(false);
    } finally {
      setGeminiVerifying(false);
    }
  };

  const handleGithubTokenChange = (value: string) => {
    setGithubToken(value);
    setGithubValid(null);
    if (value.trim() && (value.startsWith('ghp_') || value.startsWith('github_pat_'))) {
      const timeoutId = setTimeout(() => verifyGithubToken(value), 1000);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleGeminiTokenChange = (value: string) => {
    setGeminiToken(value);
    setGeminiValid(null);
    if (value.trim() && value.length > 20) {
      const timeoutId = setTimeout(() => verifyGeminiToken(value), 1000);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleSubmit = () => {
    if (githubValid && geminiValid && githubToken.trim() && geminiToken.trim()) {
      onTokensSubmit(githubToken.trim(), geminiToken.trim());
    }
  };

  const getTokenStatus = (isValid: boolean | null, isVerifying: boolean) => {
    if (isVerifying) return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (isValid === true) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (isValid === false) return <AlertCircle className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-8 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-600/20 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
                <span className="text-3xl font-bold">CE</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">Code Editor Pro</h1>
              <p className="text-indigo-100">Professional web-based code editor with AI assistance</p>
            </div>
          </div>

          <div className="p-8">
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  step >= 1 ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }`}>
                  <Github className="w-4 h-4" />
                  <span className="text-sm font-medium">GitHub</span>
                </div>
                <div className="w-8 h-px bg-gray-300 dark:bg-gray-600"></div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  step >= 2 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }`}>
                  <Bot className="w-4 h-4" />
                  <span className="text-sm font-medium">AI Assistant</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* GitHub Token */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-900 dark:bg-gray-100 rounded-xl flex items-center justify-center shadow-lg">
                    <Github className="w-6 h-6 text-white dark:text-gray-900" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">GitHub Personal Access Token</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Required for repository access and file management</p>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showGithubToken ? 'text' : 'password'}
                    value={githubToken}
                    onChange={(e) => handleGithubTokenChange(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 pr-24 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all shadow-sm"
                    onFocus={() => setStep(1)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {getTokenStatus(githubValid, githubVerifying)}
                    <button
                      type="button"
                      onClick={() => setShowGithubToken(!showGithubToken)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    >
                      {showGithubToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-2">How to get your GitHub token:</h4>
                  <ol className="text-sm text-indigo-800 dark:text-indigo-200 space-y-1 list-decimal list-inside">
                    <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
                    <li>Click "Generate new token (classic)"</li>
                    <li>Select scopes: <code className="bg-indigo-100 dark:bg-indigo-800 px-1 rounded">repo</code>, <code className="bg-indigo-100 dark:bg-indigo-800 px-1 rounded">user</code></li>
                    <li>Copy the generated token</li>
                  </ol>
                </div>
              </div>

              {/* Gemini Token */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gemini API Key</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Required for AI-powered code assistance</p>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showGeminiToken ? 'text' : 'password'}
                    value={geminiToken}
                    onChange={(e) => handleGeminiTokenChange(e.target.value)}
                    placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 pr-24 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent transition-all shadow-sm"
                    onFocus={() => setStep(2)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {getTokenStatus(geminiValid, geminiVerifying)}
                    <button
                      type="button"
                      onClick={() => setShowGeminiToken(!showGeminiToken)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    >
                      {showGeminiToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">How to get your Gemini API key:</h4>
                  <ol className="text-sm text-purple-800 dark:text-purple-200 space-y-1 list-decimal list-inside">
                    <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Google AI Studio</a></li>
                    <li>Sign in with your Google account</li>
                    <li>Click "Create API Key"</li>
                    <li>Copy the generated API key</li>
                  </ol>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!githubValid || !geminiValid}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {githubValid && geminiValid ? 'Start Coding with AI' : 'Verify Tokens to Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};