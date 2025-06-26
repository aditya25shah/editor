import React, { useState, useEffect } from 'react';
import { GitBranch, Folder, Calendar, ChevronDown, Plus } from 'lucide-react';
import { GitHubRepo, GitHubBranch } from '../types/github';

interface RepoSelectorProps {
  repos: GitHubRepo[];
  branches: GitHubBranch[];
  selectedRepo?: GitHubRepo;
  selectedBranch?: GitHubBranch;
  onRepoSelect: (repo: GitHubRepo) => void;
  onBranchSelect: (branch: GitHubBranch) => void;
  onCreateBranch: (branchName: string) => void;
  loading: boolean;
}

export const RepoSelector: React.FC<RepoSelectorProps> = ({
  repos,
  branches,
  selectedRepo,
  selectedBranch,
  onRepoSelect,
  onBranchSelect,
  onCreateBranch,
  loading,
}) => {
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [showCreateBranch, setShowCreateBranch] = useState(false);

  const handleCreateBranch = () => {
    if (newBranchName.trim()) {
      onCreateBranch(newBranchName.trim());
      setNewBranchName('');
      setShowCreateBranch(false);
      setShowBranchDropdown(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowRepoDropdown(false);
      setShowBranchDropdown(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      {/* Repository Selector */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowRepoDropdown(!showRepoDropdown);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          disabled={loading}
        >
          <Folder className="w-4 h-4" />
          <span className="max-w-48 truncate">
            {selectedRepo ? selectedRepo.name : 'Select Repository'}
          </span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {showRepoDropdown && (
          <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
            {repos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => {
                  onRepoSelect(repo);
                  setShowRepoDropdown(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{repo.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{repo.full_name}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(repo.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Branch Selector */}
      {selectedRepo && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowBranchDropdown(!showBranchDropdown);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            disabled={loading}
          >
            <GitBranch className="w-4 h-4" />
            <span className="max-w-32 truncate">
              {selectedBranch ? selectedBranch.name : 'main'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showBranchDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10">
              <div className="p-2 border-b border-gray-100 dark:border-gray-600">
                {!showCreateBranch ? (
                  <button
                    onClick={() => setShowCreateBranch(true)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 rounded"
                  >
                    <Plus className="w-4 h-4" />
                    Create new branch
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="Branch name"
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateBranch()}
                      autoFocus
                    />
                    <button
                      onClick={handleCreateBranch}
                      className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Create
                    </button>
                  </div>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto">
                {branches.map((branch) => (
                  <button
                    key={branch.name}
                    onClick={() => {
                      onBranchSelect(branch);
                      setShowBranchDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-sm ${
                      selectedBranch?.name === branch.name
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {branch.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};