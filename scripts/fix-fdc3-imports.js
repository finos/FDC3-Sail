const fs = require("fs")
const path = require("path")

function fixDirectory(dir) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      fixDirectory(fullPath)
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      let content = fs.readFileSync(fullPath, "utf8")
      const fixed = content.replace(
        /(from|import|export\s+\*\s+from)\s+['"](\.\/|\.\.\/)[^'"]+['"]/g,
        (match) => {
          if (match.endsWith(".js'") || match.endsWith('.js"')) return match
          return match.slice(0, -1) + ".js" + match.slice(-1)
        },
      )
      if (fixed !== content) {
        fs.writeFileSync(fullPath, fixed, "utf8")
      }
    }
  }
}

const packages = ["standard", "context", "schema", "get-agent"]
packages.forEach((pkg) => {
  const baseDir = path.join(
    __dirname,
    "..",
    "node_modules",
    "@finos",
    `fdc3-${pkg}`,
  )
  const distDir = path.join(baseDir, "dist")
  fixDirectory(distDir)
  const pkgJson = path.join(baseDir, "package.json")
  if (fs.existsSync(pkgJson)) {
    const json = JSON.parse(fs.readFileSync(pkgJson, "utf8"))
    if (json.type !== "module") {
      json.type = "module"
      fs.writeFileSync(pkgJson, JSON.stringify(json, null, 2), "utf8")
    }
  }
})
