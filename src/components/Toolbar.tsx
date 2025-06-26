import React from 'react';
import { 
  Save, 
  Upload, 
  Moon, 
  Sun, 
  Code, 
  History, 
  GitCommit,
  Play,
  Download,
  Share2,
  Zap
} from 'lucide-react';

interface ToolbarProps {
  onSave: () => void;
  onPush: () => void;
  onFormat: () => void;
  onToggleTheme: () => void;
  onShowHistory: () => void;
  onRunCode?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  theme: 'light' | 'dark';
  hasChanges: boolean;
  isLoading: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onSave,
  onPush,
  onFormat,
  onToggleTheme,
  onShowHistory,
  onRunCode,
  onDownload,
  onShare,
  theme,
  hasChanges,
  isLoading,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2">
        {/* Primary Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            disabled={!hasChanges || isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          
          <button
            onClick={onPush}
            disabled={!hasChanges || isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Upload className="w-4 h-4" />
            Push
          </button>

          {onRunCode && (
            <button
              onClick={onRunCode}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />

        {/* Secondary Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onFormat}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Code className="w-4 h-4" />
            Format
          </button>

          <button
            onClick={onShowHistory}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <History className="w-4 h-4" />
            History
          </button>

          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}

          {onShare && (
            <button
              onClick={onShare}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Status Indicators */}
        {hasChanges && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-sm shadow-sm">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <GitCommit className="w-3 h-3" />
            Unsaved changes
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
            <Zap className="w-3 h-3 animate-spin" />
            Processing...
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};