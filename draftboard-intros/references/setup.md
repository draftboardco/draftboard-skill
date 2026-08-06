# Setup

## 1. Get a Draftboard API key

In Draftboard (https://intros.draftboard.com): **Settings → API keys**. Requires a plan with API
access (Pro is read-only; Team adds read/write — needed for `import_targets`). Keys look like
`db-api_xxxxxxxx`.

## 2. Install the MCP server

The skill talks to Draftboard only through the `@draftboard/mcp` server. During the beta it runs
straight from the GitHub repo, so `npx` fetches it on demand — no npm package, no global install.
Requires **Node.js 20+** — install the LTS from [nodejs.org](https://nodejs.org) if you don't have it
(it provides `npx`).

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

### Codex CLI

Register the same stdio server. Either run:

```bash
codex mcp add draftboard --env DRAFTBOARD_API_KEY=db-api_xxxx -- npx -y github:draftboardco/mcp
```

or add it to `~/.codex/config.toml` by hand (this keeps the key out of your shell history):

```toml
[mcp_servers.draftboard]
command = "npx"
args = ["-y", "github:draftboardco/mcp"]
# First launch runs `npx github:` which clones + builds the server; give it headroom
# so Codex doesn't hit its startup timeout and mark the server failed.
startup_timeout_sec = 60

[mcp_servers.draftboard.env]
DRAFTBOARD_API_KEY = "db-api_xxxx"
```

Notes for Codex:

- The key is stored in plaintext in `config.toml` (same as `.mcp.json` on Claude). Run
  `chmod 600 ~/.codex/config.toml`, and rotate the key in the Draftboard app if it ever leaks.
- Codex reads each tool's `readOnlyHint` / `destructiveHint` annotation into its approval decision,
  so reads can auto-approve while the irreversible `archive_target` prompts — but Codex's own
  approval policy (`--full-auto`, `approval_policy`) is the final say.
- If a large `find_top_paths` scan ever hits Codex's tool timeout, raise `tool_timeout_sec` under the
  same `[mcp_servers.draftboard]` block.

## 3. Install the skill

Both clients load the same `SKILL.md` — just drop the `draftboard-intros/` folder into the client's
skills directory:

- **Claude Code / Claude Desktop:** copy `draftboard-intros/` into `~/.claude/skills/` (or a project's
  `.claude/skills/`).
- **Codex CLI:** copy `draftboard-intros/` into `~/.codex/skills/` (user-scoped; Codex also supports
  repo-scoped skills — see the Codex skills docs). Codex loads it on demand from the `SKILL.md`
  frontmatter, exactly like Claude.

The thin `AGENTS.md` next to `SKILL.md` is only a fallback pointer, for setups that use always-on
`AGENTS.md` project guidance instead of skills.

## 4. Verify

Ask the agent: *"Use Draftboard to tell me who I am."* It should call `get_me` and return your name
and team members. If the tools are missing, the MCP server isn't registered; if you get a 401, the
`DRAFTBOARD_API_KEY` is wrong or expired.

On Codex you can confirm registration out-of-band with `codex mcp get draftboard` (it shows
`transport: stdio` and the env key masked), then check it end-to-end without a TUI:
`codex exec "Use Draftboard to tell me who I am."`. Missing tools → the server isn't registered, or it
timed out on first launch (see the startup-timeout note above); `401` → the key is wrong or expired.

## Optional environment variables

| Var                     | Default                                              | Purpose                |
|-------------------------|------------------------------------------------------|------------------------|
| `DRAFTBOARD_BASE_URL`   | `https://intros.draftboard.com/api/v1/integration`   | Override for self-host |
| `DRAFTBOARD_TIMEOUT_MS` | `20000`                                              | Per-request timeout    |

The key is used only to call Draftboard's API directly from your machine — it is never sent to OpenAI,
Anthropic, or any third party, and the server does not log the auth header.
