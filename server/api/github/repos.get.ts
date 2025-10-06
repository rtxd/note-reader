import { defineEventHandler, createError } from 'h3'
import { listRepos } from '../../utils/github'

/**
 * GET /api/github/repos
 * Returns all repositories accessible to the authenticated user.
 */
export default defineEventHandler(async (event) => {
  try {
    const repos = await listRepos()
    
    // Cache for 5 minutes
    event.node.res.setHeader('Cache-Control', 'public, max-age=300')
    
    return {
      repositories: repos,
      count: repos.length
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch repositories',
      data: { message }
    })
  }
})