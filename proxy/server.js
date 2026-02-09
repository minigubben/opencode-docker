const http = require("node:http")
const crypto = require("node:crypto")
const { URL } = require("node:url")
const httpProxy = require("http-proxy")

const port = Number(process.env.PORT || 4096)
const upstreamUrl = process.env.UPSTREAM_URL || `http://opencode-web:${port}`
const cookieName = "opencode_session"
const sessionTtlHours = Number(process.env.AUTH_SESSION_TTL_HOURS || 24)
const authPassword = process.env.AUTH_PASSWORD || ""
const cookieSecret = process.env.AUTH_COOKIE_SECRET || ""
const secureCookie = String(process.env.AUTH_SECURE_COOKIE || "false").toLowerCase() === "true"

if (!authPassword) {
  throw new Error("Missing AUTH_PASSWORD. Set it in .env before starting auth-proxy.")
}

if (!cookieSecret) {
  throw new Error("Missing AUTH_COOKIE_SECRET. Set it in .env before starting auth-proxy.")
}

const proxy = httpProxy.createProxyServer({
  target: upstreamUrl,
  changeOrigin: true,
  ws: true,
})

proxy.on("error", (_err, req, res) => {
  if (!res || res.headersSent) {
    return
  }

  res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" })
  res.end(`Bad gateway: cannot reach ${upstreamUrl} for ${req.url || "request"}`)
})

const sameSite = "Lax"

function encodeBase64Url(input) {
  return Buffer.from(input).toString("base64url")
}

function decodeBase64Url(input) {
  return Buffer.from(input, "base64url").toString("utf8")
}

function sign(value) {
  return crypto.createHmac("sha256", cookieSecret).update(value).digest("base64url")
}

function parseCookies(req) {
  const source = req.headers.cookie || ""
  const cookies = {}

  for (const part of source.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=")
    if (!rawName || rawValue.length === 0) {
      continue
    }

    cookies[rawName] = decodeURIComponent(rawValue.join("="))
  }

  return cookies
}

function parseFormBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0

    req.on("data", (chunk) => {
      size += chunk.length
      if (size > 1024 * 32) {
        reject(new Error("Payload too large"))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8")
      const form = new URLSearchParams(raw)
      resolve(form)
    })

    req.on("error", reject)
  })
}

function compareSecrets(left, right) {
  const leftHash = crypto.createHash("sha256").update(left).digest()
  const rightHash = crypto.createHash("sha256").update(right).digest()
  return crypto.timingSafeEqual(leftHash, rightHash)
}

function createSessionToken() {
  const expiresAt = Date.now() + sessionTtlHours * 60 * 60 * 1000
  const payload = encodeBase64Url(JSON.stringify({ exp: expiresAt }))
  const signature = sign(payload)
  return `${payload}.${signature}`
}

function verifySessionToken(token) {
  if (!token || !token.includes(".")) {
    return false
  }

  const [payload, signature] = token.split(".")
  const expectedSignature = sign(payload)

  if (signature.length !== expectedSignature.length) {
    return false
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return false
  }

  let decoded
  try {
    decoded = JSON.parse(decodeBase64Url(payload))
  } catch {
    return false
  }

  return Number(decoded.exp) > Date.now()
}

function cookieHeader(name, value, maxAgeSeconds) {
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    `Max-Age=${maxAgeSeconds}`,
  ]

  if (secureCookie) {
    attrs.push("Secure")
  }

  return attrs.join("; ")
}

function redirect(res, location) {
  res.statusCode = 302
  res.setHeader("Location", location)
  res.end()
}

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function renderLogin(nextPath, csrfToken, errorCode = "") {
  const escapedNext = escapeHtmlAttr(nextPath)
  const errorMessage =
    errorCode === "wrong_password"
      ? "Wrong password. Please try again."
      : errorCode === "session_expired"
        ? "Your login session expired. Please try again."
        : ""
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sign in</title>
  <style>
    :root {
      --bg: #f2eee8;
      --panel: #fffdf9;
      --ink: #2a1f18;
      --accent: #8b4513;
      --accent-strong: #6f370f;
      --line: #d9c9b8;
      --muted: #705c4f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Georgia, "Times New Roman", serif;
      color: var(--ink);
      background: radial-gradient(circle at top left, #f8f3ec 0, var(--bg) 55%, #eadfce 100%);
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: min(420px, 100%);
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(79, 51, 31, 0.12);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 1.5rem;
      letter-spacing: 0.01em;
    }
    p {
      margin: 0 0 18px;
      color: var(--muted);
    }
    .error {
      margin: 0 0 14px;
      padding: 10px 12px;
      border: 1px solid #d59f9f;
      border-radius: 10px;
      background: #fff1f1;
      color: #7a1f1f;
      font-weight: 600;
    }
    label {
      display: block;
      margin: 0 0 8px;
      font-weight: 600;
    }
    input[type="password"] {
      width: 100%;
      padding: 11px 12px;
      border: 1px solid var(--line);
      border-radius: 10px;
      font-size: 1rem;
      background: #fff;
      color: var(--ink);
    }
    button {
      margin-top: 14px;
      width: 100%;
      padding: 11px 12px;
      border: 0;
      border-radius: 10px;
      background: var(--accent);
      color: #fff;
      font-weight: 700;
      cursor: pointer;
    }
    button:hover {
      background: var(--accent-strong);
    }
  </style>
</head>
<body>
  <form class="card" method="post" action="/login">
    <h1>Protected workspace</h1>
    <p>Enter your password to open the opencode web session.</p>
    ${errorMessage ? `<div class="error" role="alert">${errorMessage}</div>` : ""}
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required />
    <input type="hidden" name="next" value="${escapedNext}" />
    <input type="hidden" name="csrf" value="${csrfToken}" />
    <button type="submit">Sign in</button>
  </form>
</body>
</html>`
}

function makeCsrfToken() {
  return crypto.randomBytes(24).toString("base64url")
}

async function handleRequest(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`)
  const cookies = parseCookies(req)

  if (url.pathname === "/login" && req.method === "GET") {
    const nextPath = url.searchParams.get("next") || "/"
    const errorCode = url.searchParams.get("error") || ""
    const existingCsrf = cookies[`${cookieName}_csrf`] || ""
    const csrf = existingCsrf || makeCsrfToken()

    res.statusCode = 200
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.setHeader("Cache-Control", "no-store")
    res.setHeader("Set-Cookie", cookieHeader(`${cookieName}_csrf`, csrf, 10 * 60))
    res.end(renderLogin(nextPath, csrf, errorCode))
    return
  }

  if (url.pathname === "/login" && req.method === "POST") {
    try {
      const form = await parseFormBody(req)
      const password = form.get("password") || ""
      const nextPath = form.get("next") || "/"
      const safeNextPath = nextPath.startsWith("/") ? nextPath : "/"
      const csrfFromBody = form.get("csrf") || ""
      const csrfFromCookie = cookies[`${cookieName}_csrf`] || ""

      if (!csrfFromBody || !csrfFromCookie || !compareSecrets(csrfFromBody, csrfFromCookie)) {
        redirect(res, `/login?next=${encodeURIComponent(safeNextPath)}&error=session_expired`)
        return
      }

      if (!compareSecrets(password, authPassword)) {
        redirect(res, `/login?next=${encodeURIComponent(safeNextPath)}&error=wrong_password`)
        return
      }

      const token = createSessionToken()
      const maxAgeSeconds = Math.max(1, Math.floor(sessionTtlHours * 60 * 60))
      res.setHeader("Set-Cookie", [
        cookieHeader(cookieName, token, maxAgeSeconds),
        cookieHeader(`${cookieName}_csrf`, "", 0),
      ])
      redirect(res, safeNextPath)
      return
    } catch {
      res.statusCode = 400
      res.setHeader("Content-Type", "text/plain; charset=utf-8")
      res.end("Bad request")
      return
    }
  }

  if (url.pathname === "/logout" && req.method === "POST") {
    res.setHeader("Set-Cookie", cookieHeader(cookieName, "", 0))
    redirect(res, "/login")
    return
  }

  const sessionToken = cookies[cookieName]
  if (!verifySessionToken(sessionToken)) {
    const next = encodeURIComponent(url.pathname + url.search)
    redirect(res, `/login?next=${next}`)
    return
  }

  proxy.web(req, res)
}

const server = http.createServer((req, res) => {
  void handleRequest(req, res)
})

server.on("upgrade", (req, socket, head) => {
  const cookies = parseCookies(req)
  const sessionToken = cookies[cookieName]

  if (!verifySessionToken(sessionToken)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n")
    socket.destroy()
    return
  }

  proxy.ws(req, socket, head)
})

server.listen(port, () => {
  process.stdout.write(`auth-proxy listening on :${port}, upstream ${upstreamUrl}\n`)
})
