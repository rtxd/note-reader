import { Octokit } from '@octokit/rest'

/**
 * Centralized GitHub API helper using Personal Access Token (PAT).
 * Provides:
 *  - Singleton Octokit instance
 *  - Convenience methods for common operations
 */

/**
 * Partial shape of a git tree entry we care about.
 */
interface GitTreeEntry {
  path?: string
  type?: string
  sha?: string
  size?: number
  url?: string
}

export interface MarkdownFileMeta {
  path: string
  sha: string
  size: number
  url?: string
}

function required(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return v
}

let _octokit: Octokit | null = null

/**
 * Get or create a singleton Octokit instance authenticated with PAT.
 */
export function getOctokit(): Octokit {
  if (_octokit) return _octokit
  
  const pat = required('GITHUB_PAT')
  
  _octokit = new Octokit({
    auth: pat
  })
  
  return _octokit
}

/**
 * List repositories accessible to the authenticated user.
 */
export async function listRepos() {
  const octokit = getOctokit()
  const repos: Array<{ id: number; name: string; full_name: string; private: boolean }> = []
  
  let page = 1
  while (true) {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      page,
      sort: 'updated',
      direction: 'desc'
    })
    
    for (const r of data) {
      repos.push({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        private: r.private
      })
    }
    
    if (data.length < 100) break
    page++
  }
  
  return repos
}

/**
 * List markdown files (.md, .mdx) in a repo via git tree API (recursive).
 * For large monorepos consider switching to code search API (future).
 */
export async function listMarkdownFiles(owner: string, repo: string) {
  const octokit = getOctokit()
  
  // Get repo metadata (default branch)
  const { data: repoData } = await octokit.repos.get({
    owner,
    repo
  })
  const defaultBranch = repoData.default_branch

  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`
  })
  const commitSha = refData.object.sha

  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: commitSha,
    recursive: 'true'
  })

  return (treeData.tree as GitTreeEntry[])
    .filter(node => node.type === 'blob' && !!node.path && /\.(md|MD|mdx|MDX)$/.test(node.path!))
    .map((node): MarkdownFileMeta => ({
      path: node.path!,
      sha: node.sha!,
      size: node.size || 0,
      url: node.url
    }))
}

/**
 * Fetch raw markdown file content by path.
 */
export async function getMarkdownFile(owner: string, repo: string, path: string) {
  const octokit = getOctokit()
  
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path
  })
  
  if ('content' in data && !Array.isArray(data) && data.type === 'file' && data.content) {
    const buff = Buffer.from(data.content, data.encoding as BufferEncoding)
    return {
      path,
      sha: data.sha,
      size: data.size,
      raw: buff.toString('utf8')
    }
  }
  
  throw new Error('Not a file or unsupported content response')
}

/**
 * Get directory contents (files and subdirectories).
 */
export async function getDirectoryContents(owner: string, repo: string, path: string = '') {
  const octokit = getOctokit()
  
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path
  })
  
  if (Array.isArray(data)) {
    return data.map(item => ({
      name: item.name,
      path: item.path,
      type: item.type,
      sha: item.sha,
      size: item.size,
      url: item.url
    }))
  }
  
  throw new Error('Path is not a directory')
}

/**
 * Simple in-memory TTL cache (optional future use).
 */
const simpleCache = new Map<string, { expires: number; value: unknown }>()

export function cacheGet<T>(key: string): T | undefined {
  const e = simpleCache.get(key)
  if (!e) return
  if (e.expires < Date.now()) {
    simpleCache.delete(key)
    return
  }
  return e.value as T
}

export function cacheSet(key: string, value: unknown, ttlMs: number) {
  simpleCache.set(key, { value, expires: Date.now() + ttlMs })
}