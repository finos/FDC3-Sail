/**
 * Node ESM loader so `import("http://…")` / `import("https://…")` works the
 * same as in the browser (Vite-served extension cores). Registered from main.ts.
 */

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//.test(value)
}

function isViteInternal(url) {
  return url.includes("/@vite/client") || url.includes("/@react-refresh")
}

export async function resolve(specifier, context, nextResolve) {
  if (isHttpUrl(specifier)) {
    return { shortCircuit: true, url: specifier }
  }

  const parent = context.parentURL
  if (parent && isHttpUrl(parent)) {
    if (specifier.startsWith("node:") || specifier.startsWith("nodejs:")) {
      return nextResolve(specifier, context)
    }
    if (specifier.startsWith("/")) {
      const origin = new URL(parent).origin
      return { shortCircuit: true, url: `${origin}${specifier}` }
    }
    try {
      return { shortCircuit: true, url: new URL(specifier, parent).href }
    } catch {
      return nextResolve(specifier, context)
    }
  }

  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (!isHttpUrl(url)) {
    return nextLoad(url, context)
  }

  if (isViteInternal(url)) {
    return {
      format: "module",
      shortCircuit: true,
      source: "export {}",
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: "text/javascript, application/javascript, */*",
    },
  })
  if (!response.ok) {
    throw new Error(`http-esm-extension-loader: GET ${url} failed (${response.status})`)
  }

  const source = await response.text()
  return {
    format: "module",
    shortCircuit: true,
    source,
  }
}
