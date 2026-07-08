# Setup

## 1. Get a Draftboard API key

In Draftboard (https://intros.draftboard.com): **Settings → API keys**. Requires a plan with API
access (Pro is read-only; Team adds read/write — needed for `import_targets`). Keys look like
`db-api_xxxxxxxx`.

## 2. Install the MCP server

The skill talks to Draftboard only through the `@draftboard/mcp` server. During the beta it runs
straight from the GitHub repo, so `npx` fetches it on demand — no npm package, no global install.
Requires Node.js 20+.

### Claude Code / Claude Desktop

Add to `.mcp.json` (project) or `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "draftboard": {
      "command": "npx",
      "args": ["-y", "github:draftboardco/mcp"],
      "env": { "DRAFTBOARD_API_KEY": "db-api_xxxx" }
    }
  }
}
```

### Codex

Add the same server to your Codex MCP configuration (`command: npx`, `args: ["-y","github:draftboardco/mcp"]`,
`env.DRAFTBOARD_API_KEY`).

## 3. Install the skill

- **Claude:** copy the `draftboard-intros/` directory into your skills directory.
- **Codex:** point Codex at `draftboard-intros/AGENTS.md` (or paste it into your `AGENTS.md`).

## 4. Verify

Ask the agent: *"Use Draftboard to tell me who I am."* It should call `get_me` and return your name
and team members. If the tools are missing, the MCP server isn't registered; if you get a 401, the
`DRAFTBOARD_API_KEY` is wrong or expired.

## Optional environment variables

| Var                     | Default                                              | Purpose                |
|-------------------------|------------------------------------------------------|------------------------|
| `DRAFTBOARD_BASE_URL`   | `https://intros.draftboard.com/api/v1/integration`   | Override for self-host |
| `DRAFTBOARD_TIMEOUT_MS` | `20000`                                              | Per-request timeout    |

The key never leaves your machine — the server runs locally and does not log the auth header.
