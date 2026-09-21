# Draftboard intros — talk to your network in plain language

Ask your AI assistant *"who can introduce me to the VP of Sales at Acme?"* and get a real answer,
drawn from your own Draftboard network — the warm path, who can make the intro, and why they'll say
yes. No dashboards, no exports, no clicking around. You ask; it works the network for you.

Built on **[Draftboard](https://draftboard.com)** — the warm-introduction platform that maps how your
team is really connected to your prospects.

> **New here?** Jump to [Getting started](#getting-started-one-time-5-minutes) — you'll be running in
> ~5 minutes. This is an early beta; if anything breaks or reads wrong, [tell us](#feedback--support).

This package is two pieces that work together:

- **The skill** — the know-how that teaches your assistant *how* to use Draftboard well: which
  question maps to which action, how to read a relationship score, how to be honest about what it
  found.
- **The connection (MCP server)** — the secure link between your assistant and your Draftboard
  account. Draftboard runs it; you approve it in your browser, it is scoped to the permissions you
  granted, and you can withdraw it at any time from Settings → Connected apps.

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

## Getting started (one-time, ~2 minutes)

You need a [Draftboard](https://draftboard.com) account, and you need to be **signed in to it in a
browser on this machine** — connecting is approved in the browser, the same way you connect any
other app. There is nothing to install: no package, no Node, and no API key to copy anywhere.

**The easy way — install it as a plugin.** One command brings both halves: the skill and the
connection, already pointed at the right address.

**Claude Code**

```
/plugin marketplace add draftboardco/draftboard-skill
/plugin install draftboard@draftboard
```

**Codex / ChatGPT** — install this repository as a plugin from the Plugins surface; the same
`skills/` folder and the same server address are picked up from `plugin.json` and `mcp.json`.

Then approve the connection in your browser — the one step nothing can do for you — and ask:
*"Use Draftboard to show me my top intro opportunities."*

Updates arrive on their own: the plugin follows this repository, so a correction we ship is simply
there the next time your assistant starts.

<details>
<summary>Prefer to set it up by hand (or on Claude Desktop / Codex)?</summary>

**1. Connect your assistant to Draftboard.**

```bash
# Claude Code
claude mcp add --transport http draftboard https://mcp.draftboard.com
claude mcp login draftboard

# Codex CLI
codex mcp add draftboard --url https://mcp.draftboard.com
codex mcp login draftboard
```

**Claude Desktop:** Settings → **Connectors** → **Add** → **Add custom connector** →
`https://mcp.draftboard.com`, then approve in the browser.

The approval screen shows the permissions being granted and connects the assistant to the account
you are signed in as. The grant is scoped to those permissions, and you can withdraw it on its own
at any time from **Settings → Connected apps** — which an API key never allowed.

**2. Add the skill.** Copy the `draftboard-intros/` folder into your assistant's skills directory —
`~/.claude/skills/` for Claude Code, `~/.codex/skills/` for Codex CLI. Both load the same `SKILL.md`.

**3. Try it.** Ask: *"Use Draftboard to show me my top intro opportunities."*

</details>

Full setup detail — verifying it works, what the approval grants, and the one case where you would
still run the server yourself — lives in
[`draftboard-intros/references/setup.md`](./skills/draftboard-intros/references/setup.md).

## Setup (for your assistant)

*If you're an AI assistant that a user asked to "set up Draftboard" from this repo, do exactly this,
then stop and tell them it's ready:*

1. **Add the connection.** Register an MCP server named `draftboard` over **HTTP** at
   `https://mcp.draftboard.com` — on Claude Code,
   `claude mcp add --transport http draftboard https://mcp.draftboard.com`; on Codex CLI,
   `codex mcp add draftboard --url https://mcp.draftboard.com`. There is no key and no environment
   block: do not ask the user for one.
2. **Install the skill.** Copy the `draftboard-intros/` folder from this repo into the user's skills
   directory — `~/.claude/skills/draftboard-intros/` for Claude Code,
   `~/.codex/skills/draftboard-intros/` for Codex CLI (both load the same `SKILL.md`). If you don't
   have the files locally, clone `https://github.com/draftboardco/draftboard-skill` first.
3. **Hand the approval back to the user — you cannot do this part.** Tell them to run
   `claude mcp login draftboard` (or `codex mcp login draftboard`), which opens the approval screen,
   and that they must already be signed in to Draftboard in a browser on this machine. Stop here
   until they say they have approved it; the tools do not exist until they do.


---

## What it can and can't do yet

**It's great at:** finding and ranking warm paths, checking if you're already connected, working
through a specific teammate's network, name-drop material for cold outreach, intro progress, and —
new in beta — company-first discovery (find people by role at named companies, then pick who to keep).
Ten of the twelve common "how do I…" questions are answered directly today — the rest the
assistant solves by combining the basics. The full playbook is in
[`draftboard-intros/references/user-stories.md`](./skills/draftboard-intros/references/user-stories.md).

**Not yet, and the honest workaround:**

- **"Build my target list from a free-text description of my ideal customer."** Partly there: "these
  roles at these companies" now works via the beta company-first search (you name the companies and
  titles); turning a pure prose ICP into a company list is still on the roadmap.
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

- Just want to use it → finish [setup](./skills/draftboard-intros/references/setup.md) and start asking.
- Working an ideal-customer push → [Using Draftboard intros for your ICP](./using-draftboard-for-icp.md).
- Curious what each capability does → the [playbook](./skills/draftboard-intros/references/user-stories.md).
- Building on top of it → the full tool list in
  [`references/tools.md`](./skills/draftboard-intros/references/tools.md), and the superseded
  self-installed server at [`draftboardco/mcp`](https://github.com/draftboardco/mcp).
- The Draftboard Integration API itself → <https://intros.draftboard.com/api>.
- About Draftboard → [draftboard.com](https://draftboard.com).

---

## Editing these docs

Every `.md` here is loaded verbatim by an assistant, so the wording is part of the product.
`scripts/check-docs.mjs` guards it on every push and pull request: no derivation formula between
`rating` and `tier`, no coverage statistics, no internal history, and ★ / the word "star" only ever
on `rating` — plus a handful of sentences (such as the "absent is not a negative signal" guidance)
that must stay. Run it locally before you open a PR:

```bash
node scripts/check-docs.mjs
```

Node 20+, no dependencies, no install. It prints `file:line: rule — "offending text"` and exits
non-zero on a violation.

---

## Feedback & support

This is an early beta, and your reports shape it directly. If setup snags or an answer looks off,
open an issue at
**[github.com/draftboardco/draftboard-skill/issues](https://github.com/draftboardco/draftboard-skill/issues)**
— tell us what you asked, what the assistant did, and the coverage line it showed. That's usually
enough for us to reproduce.
