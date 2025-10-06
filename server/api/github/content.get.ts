import { getQuery, defineEventHandler, createError } from 'h3'
import { getMarkdownFile } from '../../utils/github'

/**
 * GET /api/github/content?owner=username&repo=reponame&path=path/to/file.md
 * Returns the content of a specific file.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  
  const owner = q.owner
  const repo = q.repo
  const path = q.path
  
  if (!owner || Array.isArray(owner)) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: 'owner parameter required' 
    })
  }
  
  if (!repo || Array.isArray(repo)) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: 'repo parameter required' 
    })
  }
  
  if (!path || Array.isArray(path)) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: 'path parameter required' 
    })
  }

  try {
    const fileContent = await getMarkdownFile(String(owner), String(repo), String(path))
    
    // Cache for 5 minutes
    event.node.res.setHeader('Cache-Control', 'public, max-age=300')
    
    return {
      owner,
      repo,
      ...fileContent
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch file content',
      data: { message }
    })
  }
})