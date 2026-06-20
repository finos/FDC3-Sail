async function loadConfig() {
  const res = await fetch("/api/wscp-config")
  const data = await res.json()
  const urlEl = document.getElementById("ws-url")
  const secretEl = document.getElementById("shared-secret")
  const statusEl = document.getElementById("status")
  if (urlEl) urlEl.textContent = data.webSocketUrl
  if (secretEl) secretEl.textContent = data.sharedSecret
  if (statusEl) statusEl.textContent = `Status: ${data.status}`
}

loadConfig()
setInterval(loadConfig, 2000)
