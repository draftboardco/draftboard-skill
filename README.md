# Draftboard intros — talk to your network in plain language

Ask your AI assistant *"who can introduce me to the VP of Sales at Acme?"* and get a real answer,
drawn from your own Draftboard network — the warm path, who can make the intro, and why they'll say
yes. No dashboards, no exports, no clicking around. You ask; it works the network for you.

> **New here?** Jump to [Getting started](#getting-started-one-time-5-minutes) — you'll be running in
> ~5 minutes. This is an early beta; if anything breaks or reads wrong, [tell us](#feedback--support).

This package is two pieces that work together:

- **The skill** — the know-how that teaches your assistant *how* to use Draftboard well: which
  question maps to which action, how to read a relationship score, how to be honest about what it
  found.
- **The connector (MCP server)** — the secure link between your assistant and your Draftboard
  account. It runs on your machine; your API key never leaves it.

You install both once. After that, you just talk.

---

## What you can do

> **When you ask "what are my best intro opportunities right now?"**, you get a ranked shortlist of
> real people you can reach warmly today — each with the connector who can introduce you, a 0–100
> strength score, and the shared history that makes the ask natural ("they worked together at EPAM
> for 82 months"). The win: you spend your outreach time on the few intros most likely to land,
> instead of guessing.

> **When you paste a list of LinkedIn profiles and ask "am I already connected to these?"**, you
> get a per-person verdict — already directly connected, reachable through someone, or not yet in
> reach — plus your strongest path to each. The win: you stop cold-emailing people a teammate could
> have introduced you to.

> **When you ask "which of my targets can my colleague Dana introduce me to?"**, you get the
> opportunities that run specifically through Dana's network. The win: even if your own network is
> thin, you can borrow your team's — and see exactly where the overlaps are.

> **When you're writing a cold email and ask "give me a warm opener for this target"**, you get a
> real, name-droppable connection and the true shared history behind it. The win: a first line that
> earns a reply instead of getting deleted.

> **When you ask "how are my intros going?"**, you get a clean count of what's new, completed, and
> stopped — across everything or one campaign. The win: a progress check in one sentence, no report
> to pull.

Every answer tells you **how much it actually looked at** ("scanned the top 25 of 142 targets") and
offers to dig deeper. It won't pretend it searched everything when it didn't.

---

## How to use it

You don't drive the tools — you describe the **job** and let the assistant choose the moves. The
skill is what makes that reliable.

- **Talk in outcomes, not commands.** "Who should I reach out to at fintech companies this week?"
  works better than naming a tool. The skill maps your goal to the right action.
- **Be specific when it helps it narrow.** A tag, a company, a status ("only ones I haven't started
  yet"), or a teammate's name lets it focus and gives you a tighter, faster answer.
- **Trust the coverage line.** On a big list it works the strongest candidates first and tells you
  what it covered. If it says "top 25 of 142," ask it to go wider or add a filter — don't assume the
  rest are empty.
- **Reading is free; changing asks first.** Looking things up (best paths, who's connected, status)
  happens instantly. Anything that *changes* your Draftboard data — starring a connector, tagging,
  moving an intro's status, importing people — the assistant proposes and waits for your go-ahead.
  One action, archiving a target, is irreversible and needs an explicit confirm.
- **Take its limits at face value.** When something isn't possible through the API (e.g. generating
  a target list from a written ICP), it will say so and offer the closest real workaround rather than
  inventing an answer.

A good first session: *"Use Draftboard to show me my top warm intros this week, tell me which I'm
already connected to, and draft a warm opener for the best one."* — one sentence, three jobs, and it
sequences them for you.

---

## Getting started (one-time, ~5 minutes)

You need a Draftboard account with API access (Team plan for full read/write; Pro is read-only) and
your API key from **Settings → API keys** — it looks like `db-api_…`.

**The easy way — let Claude set it up for you.** No config files, no terminal. In
[Claude Code](https://claude.com/claude-code), paste one message:

> **Set up the Draftboard intros MCP and skill from
> https://github.com/draftboardco/draftboard-skill — my API key is `db-api_your_key_here`.**

Claude follows the [setup steps for your assistant](#setup-for-your-assistant) below — it adds the
connector, installs the skill, and confirms it works. When it says it's ready, ask:
*"Use Draftboard to show me my top intro opportunities."* That's the whole setup.

<details>
<summary>Prefer to set it up by hand (or on Claude Desktop / Codex)?</summary>

**1. Connect your assistant to Draftboard.** Add this to your assistant's tool configuration
(Claude Code `.mcp.json`, Claude Desktop config, or the Codex equivalent), pasting your key:

```json
{
  "mcpServers": {
    "draftboard": {
      "command": "npx",
      "args": ["-y", "github:draftboardco/mcp"],
      "env": { "DRAFTBOARD_API_KEY": "db-api_your_key_here" }
    }
  }
}
```

**2. Add the skill.** Copy the `draftboard-intros/` folder into your assistant's skills directory —
for Claude Code, `~/.claude/skills/`; for Codex, point it at `draftboard-intros/AGENTS.md`.

**3. Try it.** Ask: *"Use Draftboard to show me my top intro opportunities."*

</details>

Full setup detail (environment options, verifying it works, switching between accounts) lives in
[`draftboard-intros/references/setup.md`](./draftboard-intros/references/setup.md).

## Setup (for your assistant)

*If you're an AI assistant that a user asked to "set up Draftboard" from this repo, do exactly this,
then stop and tell them it's ready:*

1. **Add the MCP server.** Configure a stdio MCP server named `draftboard` in the user's client
   (Claude Code `.mcp.json`, Claude Desktop config, etc.): command `npx`, args
   `["-y", "github:draftboardco/mcp"]`, env `DRAFTBOARD_API_KEY` = the key the user gave you. Use your
   MCP-add command or edit the config file directly. **Never print the key back to the user.**
2. **Install the skill.** Copy the `draftboard-intros/` folder from this repo into the user's skills
   directory (`~/.claude/skills/draftboard-intros/` for Claude Code). If you don't have the files
   locally, clone `https://github.com/draftboardco/draftboard-skill` first.
3. **Verify.** Restart the client if the tools aren't loaded yet, then call the `get_me` tool. If it
   returns the user's name, tell them setup worked and suggest *"Use Draftboard to show me my top
   intro opportunities."* If the tools are missing → the client needs a restart; if you get `401` →
   the API key is wrong or expired.

---

## What it can and can't do yet

**It's great at:** finding and ranking warm paths, checking if you're already connected, working
through a specific teammate's network, name-drop material for cold outreach, and intro progress.
Eight of the twelve common "how do I…" questions are answered directly today — the rest the
assistant solves by combining the basics. The full playbook is in
[`draftboard-intros/references/user-stories.md`](./draftboard-intros/references/user-stories.md).

**Not yet, and the honest workaround:**

- **"Find me intros into these companies (I have no names)."** Today you point it at specific people
  at those companies; company-first discovery still lives in the Draftboard app.
- **"Build my target list from a description of my ideal customer."** You bring the names (or
  LinkedIn URLs) for now; idea-to-list generation is on the roadmap.
- **"Let me permanently hide connections I'd never ask."** You can filter them out in the moment;
  saved preferences are managed in the app.
- **"Show my intro-request history with a given person — hit rate, last asked."** Not exposed yet;
  you can see current status, not past-request analytics.

**Worth knowing:** a just-added person may need a short while before paths appear — Draftboard is
still enriching them in the background, so "no path yet" can mean "not ready yet." The assistant
will tell you when that's the case rather than concluding there's no connection.

**Your key stays yours.** The connector runs locally and never logs or transmits your key anywhere
except to Draftboard's own API. Nothing about your network is sent to any third party.

---

## Where to go next

- Just want to use it → finish [setup](./draftboard-intros/references/setup.md) and start asking.
- Working an ideal-customer push → [Using Draftboard intros for your ICP](./using-draftboard-for-icp.md).
- Curious what each capability does → the [playbook](./draftboard-intros/references/user-stories.md).
- Building on top of it → the engine and its full tool list:
  [`@draftboard/mcp`](https://github.com/draftboardco/mcp).

---

## Feedback & support

This is an early beta, and your reports shape it directly. If setup snags or an answer looks off,
open an issue at
**[github.com/draftboardco/draftboard-skill/issues](https://github.com/draftboardco/draftboard-skill/issues)**
— tell us what you asked, what the assistant did, and the coverage line it showed. That's usually
enough for us to reproduce.
