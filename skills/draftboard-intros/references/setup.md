# Setup

Two things to put in place: the **connection** (so the assistant can reach Draftboard) and the
**skill** (so it knows how to use it). The connection takes a browser approval; there is no package
to install, no Node, and no API key to copy anywhere.

## 1. Connect Draftboard to your assistant

The address is the same everywhere:

```
https://mcp.draftboard.com
```

**You must be signed in to Draftboard in a browser on this machine** — the approval screen only
appears for a signed-in account. If you do not have one yet, create it first at
<https://intros.draftboard.com>; the connection cannot be completed without it.

### Claude Code

```bash
claude mcp add --transport http draftboard https://mcp.draftboard.com
claude mcp login draftboard
```

`login` opens the approval screen directly — there is no need to start Claude and hunt for an
Authenticate button. On a machine with no browser, `claude mcp login draftboard --no-browser`
prints the URL and waits for you to paste the redirect back.

### Codex CLI

```bash
codex mcp add draftboard --url https://mcp.draftboard.com
codex mcp login draftboard
```

### Claude Desktop

Settings → **Connectors** → **Add** → **Add custom connector** → paste the address → **Add**, then
approve in the browser window that opens.

### What you are approving

The screen lists the permissions the assistant is asking for and connects it to **the account you
are signed in as**. Two things follow from that, and both are improvements on an API key:

- the grant is **scoped** — the assistant gets the permissions shown, not everything you can do;
- it is **revocable on its own**, from **Settings → Connected apps**, without disturbing anything
  else. Revoking takes effect immediately.

## 2. Install the skill

Both clients load the same `SKILL.md` — drop the `draftboard-intros/` folder into the client's
skills directory:

- **Claude Code / Claude Desktop:** copy `draftboard-intros/` into `~/.claude/skills/` (or a
  project's `.claude/skills/`).
- **Codex CLI:** copy `draftboard-intros/` into `~/.codex/skills/` (user-scoped; Codex also supports
  repo-scoped skills — see the Codex skills docs). Codex loads it on demand from the `SKILL.md`
  frontmatter, exactly like Claude.

The thin `AGENTS.md` next to `SKILL.md` is only a fallback pointer, for setups that use always-on
`AGENTS.md` project guidance instead of skills.

## 3. Verify

Ask the agent: *"Use Draftboard to tell me who I am."* It should call `get_me` and return your name
and team members.

If the tools are missing, the connection was not completed — run the `login` step again. If calls
come back unauthorized, the connection was revoked or expired; reconnect the same way.

On Codex you can check registration out-of-band with `codex mcp get draftboard`, then end-to-end
without a TUI: `codex exec "Use Draftboard to tell me who I am."`.

## Running the server yourself

There is also a self-installed server (`github:draftboardco/mcp`) that runs on your machine over
stdio and authenticates with a Draftboard API key. **It is superseded and not the recommended
path** — prefer the hosted connection above.

It remains useful for exactly one case: **a headless environment — CI, a container, a server with
no browser** — which cannot complete the browser approval the hosted connection requires.

Understand the trade before choosing it. An API key is **all-or-nothing and invisible once pasted**:
it carries everything your account can do, it sits in a config file in plaintext, and nothing in the
product shows you it is being used. The hosted connection is scoped, listed in Settings → Connected
apps, and revocable on its own. That difference is the reason the hosted path is the default, not
convenience.

If you do run it yourself, its README carries the current instructions:
<https://github.com/draftboardco/mcp>.
