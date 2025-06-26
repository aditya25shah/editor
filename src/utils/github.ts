import { GitHubRepo, GitHubBranch, GitHubFile, GitHubCommit, GitHubUser } from '../types/github';

const GITHUB_API_BASE = 'https://api.github.com';

export class GitHubAPI {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getUser(): Promise<GitHubUser> {
    return this.request('/user');
  }

  async getRepositories(): Promise<GitHubRepo[]> {
    return this.request('/user/repos?sort=updated&per_page=100');
  }

  async getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    return this.request(`/repos/${owner}/${repo}/branches`);
  }

  async getRepoContents(owner: string, repo: string, path: string = '', branch: string = 'main'): Promise<GitHubFile[]> {
    return this.request(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
  }

  async getFileContent(owner: string, repo: string, path: string, branch: string = 'main'): Promise<string> {
    const response = await this.request(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
    return atob(response.content.replace(/\n/g, ''));
  }

  async getCommits(owner: string, repo: string, branch: string = 'main'): Promise<GitHubCommit[]> {
    return this.request(`/repos/${owner}/${repo}/commits?sha=${branch}&per_page=10`);
  }

  async updateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    sha?: string,
    branch: string = 'main'
  ): Promise<any> {
    const body = {
      message,
      content: btoa(content),
      branch,
      ...(sha && { sha }),
    };

    return this.request(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async createBranch(owner: string, repo: string, newBranch: string, fromSha: string): Promise<any> {
    return this.request(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha: fromSha,
      }),
    });
  }
}