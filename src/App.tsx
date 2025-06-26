import React, { useState, useEffect } from 'react';
import Split from 'react-split';
import { TokenSetup } from './components/TokenSetup';
import { GitHubAuth } from './components/GitHubAuth';
import { RepoSelector } from './components/RepoSelector';
import { FileTree } from './components/FileTree';
import { CodeEditor } from './components/CodeEditor';
import { Toolbar } from './components/Toolbar';
import { CommitHistory } from './components/CommitHistory';
import { AIAgent } from './components/AIAgent';
import { GitHubAPI } from './utils/github';
import { formatCode, getLanguageFromFilename } from './utils/formatter';
import { GitHubRepo, GitHubBranch, GitHubFile, GitHubCommit, GitHubUser } from './types/github';

const STORAGE_KEYS = {
  GITHUB_TOKEN: 'github_token',
  GEMINI_TOKEN: 'gemini_token',
  THEME: 'editor_theme',
  LAYOUT: 'editor_layout',
};

function App() {
  // Token setup state
  const [tokensConfigured, setTokensConfigured] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [githubAPI, setGithubAPI] = useState<GitHubAPI | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);

  // Repository state
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<GitHubBranch | null>(null);

  // File state
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GitHubFile | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [localFiles, setLocalFiles] = useState<Map<string, string>>(new Map());
  const [folderContents, setFolderContents] = useState<Map<string, GitHubFile[]>>(new Map());

  // UI state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState(false);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize theme and check for stored tokens
  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark';
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    }

    const storedGithubToken = localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN);
    const storedGeminiToken = localStorage.getItem(STORAGE_KEYS.GEMINI_TOKEN);
    
    if (storedGithubToken && storedGeminiToken) {
      setGeminiApiKey(storedGeminiToken);
      setTokensConfigured(true);
      handleAuth(storedGithubToken);
    }
  }, []);

  // Track changes
  useEffect(() => {
    setHasChanges(fileContent !== originalContent);
  }, [fileContent, originalContent]);

  const handleTokensSubmit = (githubToken: string, geminiToken: string) => {
    localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, githubToken);
    localStorage.setItem(STORAGE_KEYS.GEMINI_TOKEN, geminiToken);
    setGeminiApiKey(geminiToken);
    setTokensConfigured(true);
    handleAuth(githubToken);
  };

  const handleAuth = async (token: string) => {
    try {
      setLoading(true);
      const api = new GitHubAPI(token);
      const userData = await api.getUser();
      
      setGithubAPI(api);
      setUser(userData);
      setIsAuthenticated(true);
      
      // Load repositories
      const repoData = await api.getRepositories();
      setRepos(repoData);
    } catch (error) {
      console.error('Authentication failed:', error);
      alert('Authentication failed. Please check your token.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setGithubAPI(null);
    setUser(null);
    setRepos([]);
    setSelectedRepo(null);
    setBranches([]);
    setSelectedBranch(null);
    setFiles([]);
    setSelectedFile(null);
    setFileContent('');
    setOriginalContent('');
    setLocalFiles(new Map());
    setFolderContents(new Map());
    setTokensConfigured(false);
    localStorage.removeItem(STORAGE_KEYS.GITHUB_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.GEMINI_TOKEN);
  };

  const handleRepoSelect = async (repo: GitHubRepo) => {
    if (!githubAPI) return;
    
    try {
      setLoading(true);
      setSelectedRepo(repo);
      
      // Load branches
      const [owner, repoName] = repo.full_name.split('/');
      const branchData = await githubAPI.getBranches(owner, repoName);
      setBranches(branchData);
      
      // Select default branch
      const defaultBranch = branchData.find(b => b.name === repo.default_branch) || branchData[0];
      if (defaultBranch) {
        setSelectedBranch(defaultBranch);
        await loadRepoFiles(repo, defaultBranch);
      }
    } catch (error) {
      console.error('Failed to load repository:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchSelect = async (branch: GitHubBranch) => {
    if (!githubAPI || !selectedRepo) return;
    
    setSelectedBranch(branch);
    await loadRepoFiles(selectedRepo, branch);
  };

  const loadRepoFiles = async (repo: GitHubRepo, branch: GitHubBranch) => {
    if (!githubAPI) return;
    
    try {
      setLoading(true);
      const [owner, repoName] = repo.full_name.split('/');
      const fileData = await githubAPI.getRepoContents(owner, repoName, '', branch.name);
      setFiles(fileData);
      
      // Load commits
      const commitData = await githubAPI.getCommits(owner, repoName, branch.name);
      setCommits(commitData);
      
      // Auto-select index.html if it exists
      const indexFile = fileData.find(f => f.name === 'index.html' && f.type === 'file');
      if (indexFile) {
        await handleFileSelect(indexFile);
      }
    } catch (error) {
      console.error('Failed to load repository files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFolderContents = async (folder: GitHubFile) => {
    if (!githubAPI || !selectedRepo || !selectedBranch) return;
    
    try {
      setLoading(true);
      const [owner, repoName] = selectedRepo.full_name.split('/');
      const contents = await githubAPI.getRepoContents(owner, repoName, folder.path, selectedBranch.name);
      
      setFolderContents(prev => new Map(prev).set(folder.path, contents));
    } catch (error) {
      console.error('Failed to load folder contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file: GitHubFile) => {
    if (file.type !== 'file') return;
    
    // Check if it's a local file first
    if (localFiles.has(file.path)) {
      const content = localFiles.get(file.path) || '';
      setSelectedFile(file);
      setFileContent(content);
      setOriginalContent(content);
      return;
    }
    
    // Load from GitHub if it's a GitHub file
    if (!githubAPI || !selectedRepo || !selectedBranch) return;
    
    try {
      setLoading(true);
      const [owner, repoName] = selectedRepo.full_name.split('/');
      const content = await githubAPI.getFileContent(owner, repoName, file.path, selectedBranch.name);
      
      setSelectedFile(file);
      setFileContent(content);
      setOriginalContent(content);
    } catch (error) {
      console.error('Failed to load file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFile = (name: string, path: string) => {
    const newFile: GitHubFile = {
      name,
      path,
      type: 'file',
      size: 0,
    };
    
    // Add to files list
    setFiles(prev => [...prev, newFile]);
    
    // Create empty content for the file
    const defaultContent = getDefaultFileContent(name);
    setLocalFiles(prev => new Map(prev).set(path, defaultContent));
    
    // Select the new file
    setSelectedFile(newFile);
    setFileContent(defaultContent);
    setOriginalContent('');
  };

  const handleCreateFolder = (name: string, path: string) => {
    const newFolder: GitHubFile = {
      name,
      path,
      type: 'dir',
    };
    
    setFiles(prev => [...prev, newFolder]);
    setExpandedFolders(prev => new Set(prev).add(path));
  };

  const getDefaultFileContent = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'html':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 3rem;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
            width: 100%;
        }
        
        h1 {
            color: #333;
            margin-bottom: 1rem;
            font-size: 2.5rem;
            font-weight: 700;
        }
        
        p {
            color: #666;
            font-size: 1.1rem;
            margin-bottom: 2rem;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            transition: transform 0.3s ease;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome! 🚀</h1>
        <p>Your new HTML file is ready. Start building something amazing!</p>
        <a href="#" class="btn">Get Started</a>
    </div>
</body>
</html>`;
      
      case 'css':
        return `/* Modern CSS Reset */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    background: #f8fafc;
}

/* Container */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.2;
    margin-bottom: 1rem;
}

p {
    margin-bottom: 1rem;
}

/* Buttons */
.btn {
    display: inline-block;
    padding: 12px 24px;
    background: #3b82f6;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.3s ease;
    border: none;
    cursor: pointer;
}

.btn:hover {
    background: #2563eb;
    transform: translateY(-1px);
}

/* Utilities */
.text-center { text-align: center; }
.mt-4 { margin-top: 1rem; }
.mb-4 { margin-bottom: 1rem; }
.p-4 { padding: 1rem; }`;
      
      case 'js':
        return `// Modern JavaScript
console.log('Hello World! 🚀');

// Example function
function greet(name) {
    return \`Hello, \${name}! Welcome to JavaScript.\`;
}

// Example class
class App {
    constructor() {
        this.init();
    }
    
    init() {
        console.log('App initialized');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM loaded');
        });
    }
}

// Initialize app
const app = new App();

// Example usage
const message = greet('Developer');
console.log(message);`;
      
      case 'ts':
        return `// TypeScript
interface User {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
}

interface AppConfig {
    apiUrl: string;
    version: string;
    debug: boolean;
}

class UserManager {
    private users: User[] = [];
    private config: AppConfig;
    
    constructor(config: AppConfig) {
        this.config = config;
        this.init();
    }
    
    private init(): void {
        console.log(\`App v\${this.config.version} initialized\`);
    }
    
    addUser(user: Omit<User, 'id'>): User {
        const newUser: User = {
            id: this.users.length + 1,
            ...user
        };
        this.users.push(newUser);
        return newUser;
    }
    
    getUser(id: number): User | undefined {
        return this.users.find(user => user.id === id);
    }
    
    getActiveUsers(): User[] {
        return this.users.filter(user => user.isActive);
    }
}

// Example usage
const config: AppConfig = {
    apiUrl: 'https://api.example.com',
    version: '1.0.0',
    debug: true
};

const userManager = new UserManager(config);

const newUser = userManager.addUser({
    name: 'John Doe',
    email: 'john@example.com',
    isActive: true
});

console.log('New user created:', newUser);`;
      
      case 'jsx':
        return `import React, { useState, useEffect } from 'react';

const App = () => {
    const [count, setCount] = useState(0);
    const [message, setMessage] = useState('Hello React!');
    
    useEffect(() => {
        document.title = \`Count: \${count}\`;
    }, [count]);
    
    const handleIncrement = () => {
        setCount(prev => prev + 1);
    };
    
    const handleDecrement = () => {
        setCount(prev => prev - 1);
    };
    
    return (
        <div className="app">
            <header className="app-header">
                <h1>{message}</h1>
                <div className="counter">
                    <button onClick={handleDecrement}>-</button>
                    <span className="count">{count}</span>
                    <button onClick={handleIncrement}>+</button>
                </div>
            </header>
        </div>
    );
};

export default App;`;
      
      case 'tsx':
        return `import React, { useState, useEffect } from 'react';

interface CounterProps {
    initialValue?: number;
    step?: number;
}

interface User {
    id: number;
    name: string;
    email: string;
}

const Counter: React.FC<CounterProps> = ({ 
    initialValue = 0, 
    step = 1 
}) => {
    const [count, setCount] = useState<number>(initialValue);
    const [users, setUsers] = useState<User[]>([]);
    
    useEffect(() => {
        document.title = \`Count: \${count}\`;
    }, [count]);
    
    const handleIncrement = (): void => {
        setCount(prev => prev + step);
    };
    
    const handleDecrement = (): void => {
        setCount(prev => prev - step);
    };
    
    const handleReset = (): void => {
        setCount(initialValue);
    };
    
    return (
        <div className="counter-container">
            <h2>Counter Component</h2>
            <div className="counter-display">
                <button onClick={handleDecrement}>-</button>
                <span className="count-value">{count}</span>
                <button onClick={handleIncrement}>+</button>
            </div>
            <button onClick={handleReset} className="reset-btn">
                Reset
            </button>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <div className="app">
            <h1>TypeScript React App</h1>
            <Counter initialValue={0} step={1} />
        </div>
    );
};

export default App;`;
      
      case 'json':
        return `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A modern web project",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "build": "webpack --mode production",
    "test": "jest"
  },
  "keywords": [
    "javascript",
    "web",
    "modern"
  ],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {},
  "devDependencies": {}
}`;
      
      case 'md':
        return `# ${fileName.replace('.md', '')}

Welcome to your new markdown file! 📝

## Features

- ✅ Easy to write
- ✅ Easy to read  
- ✅ Supports rich formatting
- ✅ Great for documentation

## Getting Started

Start writing your content here...

### Code Example

\`\`\`javascript
function greet(name) {
    return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

### Lists

1. First item
2. Second item
3. Third item

- Bullet point
- Another point
- Last point

### Links and Images

[Visit GitHub](https://github.com)

![Placeholder](https://via.placeholder.com/400x200)

---

*Happy writing!* 🎉`;
      
      default:
        return `// ${fileName}
// Created on ${new Date().toLocaleDateString()}

console.log('Hello from ${fileName}!');
`;
    }
  };

  const handleToggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    
    // If it's a local file, just update the local storage
    if (localFiles.has(selectedFile.path)) {
      setLocalFiles(prev => new Map(prev).set(selectedFile.path, fileContent));
      setOriginalContent(fileContent);
      return;
    }
    
    // Save to GitHub
    if (!githubAPI || !selectedRepo || !selectedBranch) return;
    
    try {
      setLoading(true);
      const [owner, repoName] = selectedRepo.full_name.split('/');
      
      await githubAPI.updateFile(
        owner,
        repoName,
        selectedFile.path,
        fileContent,
        `Update ${selectedFile.name}`,
        selectedFile.sha,
        selectedBranch.name
      );
      
      setOriginalContent(fileContent);
      alert('File saved successfully!');
      
      // Reload commits
      const commitData = await githubAPI.getCommits(owner, repoName, selectedBranch.name);
      setCommits(commitData);
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    await handleSave();
  };

  const handleFormat = async () => {
    if (!selectedFile) return;
    
    const language = getLanguageFromFilename(selectedFile.name);
    const formatted = await formatCode(fileContent, language);
    setFileContent(formatted);
  };

  const handleToggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
  };

  const handleCreateBranch = async (branchName: string) => {
    if (!githubAPI || !selectedRepo || !selectedBranch) return;
    
    try {
      setLoading(true);
      const [owner, repoName] = selectedRepo.full_name.split('/');
      
      await githubAPI.createBranch(owner, repoName, branchName, selectedBranch.commit.sha);
      
      // Reload branches
      const branchData = await githubAPI.getBranches(owner, repoName);
      setBranches(branchData);
      
      // Select the new branch
      const newBranch = branchData.find(b => b.name === branchName);
      if (newBranch) {
        setSelectedBranch(newBranch);
      }
      
      alert(`Branch "${branchName}" created successfully!`);
    } catch (error) {
      console.error('Failed to create branch:', error);
      alert('Failed to create branch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunCode = () => {
    if (selectedFile?.name.endsWith('.js')) {
      try {
        // Create a new function and execute the code
        const func = new Function(fileContent);
        func();
      } catch (error) {
        console.error('Error running JavaScript:', error);
        alert(`Error running code: ${error}`);
      }
    }
  };

  const handleDownload = () => {
    if (!selectedFile || !fileContent) return;
    
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!selectedFile || !fileContent) return;
    
    try {
      await navigator.clipboard.writeText(fileContent);
      alert('Code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy code:', error);
      alert('Failed to copy code to clipboard.');
    }
  };

  // Generate folder structure for AI context
  const generateFolderStructure = (): string => {
    const structure: string[] = [];
    
    const addToStructure = (fileList: GitHubFile[], level: number = 0) => {
      fileList.forEach(file => {
        const indent = '  '.repeat(level);
        structure.push(`${indent}${file.type === 'dir' ? '📁' : '📄'} ${file.name}`);
        
        if (file.type === 'dir' && folderContents.has(file.path)) {
          addToStructure(folderContents.get(file.path) || [], level + 1);
        }
      });
    };
    
    addToStructure(files);
    return structure.join('\n');
  };

  // Show token setup if not configured
  if (!tokensConfigured) {
    return <TokenSetup onTokensSubmit={handleTokensSubmit} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/50">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl font-bold text-white">CE</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Code Editor Pro
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Professional web-based code editor with AI assistance
              </p>
            </div>
            
            <GitHubAuth
              onAuth={handleAuth}
              isAuthenticated={isAuthenticated}
              user={user || undefined}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>
    );
  }

  const getEditorLanguage = () => {
    if (!selectedFile) return 'html';
    return getLanguageFromFilename(selectedFile.name);
  };

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''} bg-gray-50 dark:bg-gray-900`}>
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-lg font-bold text-white">CE</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Code Editor Pro
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Professional Development Environment</p>
            </div>
          </div>
          <GitHubAuth
            onAuth={handleAuth}
            isAuthenticated={isAuthenticated}
            user={user || undefined}
            onLogout={handleLogout}
          />
        </div>
        
        <RepoSelector
          repos={repos}
          branches={branches}
          selectedRepo={selectedRepo || undefined}
          selectedBranch={selectedBranch || undefined}
          onRepoSelect={handleRepoSelect}
          onBranchSelect={handleBranchSelect}
          onCreateBranch={handleCreateBranch}
          loading={loading}
        />
        
        <Toolbar
          onSave={handleSave}
          onPush={handlePush}
          onFormat={handleFormat}
          onToggleTheme={handleToggleTheme}
          onShowHistory={() => setShowHistory(true)}
          onRunCode={handleRunCode}
          onDownload={handleDownload}
          onShare={handleShare}
          theme={theme}
          hasChanges={hasChanges}
          isLoading={loading}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        <Split
          className="flex h-full"
          sizes={[25, 75]}
          minSize={200}
          expandToMin={false}
          gutterSize={8}
          gutterAlign="center"
          snapOffset={30}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
          gutterStyle={() => ({
            backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
            borderRadius: '4px',
          })}
        >
          {/* File Tree */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 overflow-hidden shadow-sm">
            <div className="h-full flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-700/80 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Project Explorer</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {selectedRepo ? selectedRepo.name : 'No repository selected'}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <FileTree
                  files={files}
                  onFileSelect={handleFileSelect}
                  onCreateFile={handleCreateFile}
                  onCreateFolder={handleCreateFolder}
                  onLoadFolderContents={handleLoadFolderContents}
                  selectedFile={selectedFile || undefined}
                  expandedFolders={expandedFolders}
                  onToggleFolder={handleToggleFolder}
                  folderContents={folderContents}
                />
              </div>
            </div>
          </div>

          {/* Code Editor */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl flex flex-col shadow-sm">
            <div className="flex-1 overflow-hidden">
              {selectedFile ? (
                <CodeEditor
                  value={fileContent}
                  onChange={setFileContent}
                  language={getEditorLanguage()}
                  theme={theme}
                  onFormat={handleFormat}
                  fileName={selectedFile.name}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 bg-gradient-to-br from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <span className="text-3xl">📝</span>
                    </div>
                    <p className="text-xl font-medium mb-3">Ready to code?</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md">
                      Select a file from the explorer or create a new one to start coding. 
                      Your AI assistant is ready to help!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Split>
      </div>

      <CommitHistory
        commits={commits}
        onClose={() => setShowHistory(false)}
        isOpen={showHistory}
      />

      {/* AI Agent */}
      <AIAgent
        onCodeChange={setFileContent}
        currentCode={fileContent}
        fileName={selectedFile?.name}
        geminiApiKey={geminiApiKey}
        allFiles={localFiles}
        folderStructure={generateFolderStructure()}
      />
    </div>
  );
}

export default App;