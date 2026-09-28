import type { DirectoryApp } from "../../app-directory/types"

export function findBestAppMatchByIdentityUrl(
  identityUrl: string,
  apps: DirectoryApp[],
): DirectoryApp | undefined {
  const parsedIdentityUrl = new URL(identityUrl)
  let bestMatch: { score: number; app: DirectoryApp } | undefined

  for (const app of apps) {
    const appUrl = getAppDirectoryUrl(app)

    if (typeof appUrl !== "string") {
      continue
    }

    const matchScore = scoreUrlMatch(parsedIdentityUrl, appUrl)
    if (matchScore <= 0) {
      continue
    }

    if (!bestMatch || matchScore > bestMatch.score) {
      bestMatch = { score: matchScore, app }
    }
  }

  return bestMatch?.app
}

function scoreUrlMatch(identityUrl: URL, appDirectoryUrl: string): number {
  let parsedAppDUrl: URL
  try {
    parsedAppDUrl = new URL(appDirectoryUrl)
  } catch {
    return 0
  }

  if (parsedAppDUrl.origin !== identityUrl.origin) {
    return 0
  }

  let score = 1

  const appDPath = normalizePath(parsedAppDUrl.pathname)
  if (appDPath) {
    if (normalizePath(identityUrl.pathname) !== appDPath) {
      return 0
    }
    score++
  }

  if (parsedAppDUrl.hash) {
    if (identityUrl.hash !== parsedAppDUrl.hash) {
      return 0
    }
    score++
  }

  for (const [key, value] of parsedAppDUrl.searchParams.entries()) {
    if (identityUrl.searchParams.get(key) !== value) {
      return 0
    }
    score++
  }

  return score
}

function normalizePath(pathname: string): string | null {
  if (pathname === "/") {
    return null
  }
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
}

function getAppDirectoryUrl(app: DirectoryApp): string | undefined {
  return "url" in app.details && typeof app.details.url === "string" ? app.details.url : undefined
}
