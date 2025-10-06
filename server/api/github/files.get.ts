import { getQuery, defineEventHandler, createError } from 'h3'
import { listMarkdownFiles } from '../../utils/github'

/**
 * GET /api/github/files?owner=username&repo=reponame
 * Returns markdown files in the specified repository.
 */
export default defineEventHandler(async (event) => {
    console.log(event)
  const q = getQuery(event)
  
  const owner = q.owner
  const repo = q.repo
  
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

  try {
    const files = await listMarkdownFiles(String(owner), String(repo))
    
    // Cache for 5 minutes
    event.node.res.setHeader('Cache-Control', 'public, max-age=300')
    
    return {
      owner,
      repo,
      files,
      count: files.length
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch markdown files',
      data: { message }
    })
  }
})