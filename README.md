# Bugzilla MCP Server

```
██████╗ ██╗   ██╗ ██████╗ ███████╗██╗██╗     ██╗      █████╗
██╔══██╗██║   ██║██╔════╝ ╚══███╔╝██║██║     ██║     ██╔══██╗
██████╔╝██║   ██║██║  ███╗  ███╔╝ ██║██║     ██║     ███████║
██╔══██╗██║   ██║██║   ██║ ███╔╝  ██║██║     ██║     ██╔══██║
██████╔╝╚██████╔╝╚██████╔╝███████╗██║███████╗███████╗██║  ██║
╚═════╝  ╚═════╝  ╚═════╝ ╚══════╝╚═╝╚══════╝╚══════╝╚═╝  ╚═╝
```

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)
![MCP](https://img.shields.io/badge/MCP-1.0-purple?logo=anthropic)
![npm](https://img.shields.io/badge/npm-%40kud%2Fmcp--bugzilla-red?logo=npm)
![License](https://img.shields.io/badge/License-MIT-blue)

**Search, discuss, and manage Mozilla/Firefox bugs via the Bugzilla REST API.**

<a href="https://kud.io/projects/mcp-bugzilla">Website</a> · <a href="https://kud.io/projects/mcp-bugzilla/docs">Documentation</a>

</div>

---

An MCP server for Bugzilla — search, discuss, and manage Firefox/Mozilla bugs via the Bugzilla REST API. Read-only without a key; create, update, and comment with an API key.

## ✨ Features

- 🔑 **Optional auth** — read-only without a key; create/update/comment with an API key
- 🛠️ **12 tools** covering bugs, comments, history, attachments, products, users, and fields
- 🦊 **Mozilla-first** — defaults to `https://bugzilla.mozilla.org/rest`, configurable via env var
- 🔍 **Powerful search** — filter by product, component, status, severity, assignee, or quicksearch syntax
- 💬 **Full discussion flow** — read comments, post replies, attach work-time logs
- 📎 **Attachment listing** — inspect patches and test files linked to any bug

## 🚀 Install

```json
{
  "mcpServers": {
    "mcp-bugzilla": {
      "command": "npx",
      "args": ["-y", "@kud/mcp-bugzilla"],
      "env": {
        "MCP_BUGZILLA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## 📖 Documentation

Full tool reference, usage, and configuration live on the docs site:

**→ [kud.io/projects/mcp-bugzilla/docs](https://kud.io/projects/mcp-bugzilla/docs)**

## 🔧 Development

1. Run `npm run typecheck` and `npm test` — both must pass
2. Run `npm run build` — verify `dist/` compiles cleanly
3. Follow the existing tool handler pattern: exported arrow function → registered with `server.registerTool`

## License

MIT — see [LICENSE](LICENSE).
