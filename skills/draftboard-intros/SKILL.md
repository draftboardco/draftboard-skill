---
name: draftboard-intros
description: Use when the user wants warm introductions, intro paths, or network-based outreach to a person or company — discovering who can introduce them to a prospect, checking if they're already connected to someone, finding their best intro opportunities, tracking intro progress, or writing outreach that name-drops mutual connections. Triggers include "warm intro", "who can introduce me to", "am I connected to", "best paths", "intro opportunities", "namedrop mutual connection", and any work against Draftboard targets/connections. Requires the hosted Draftboard MCP server at https://mcp.draftboard.com.
---

# Draftboard intros

Help the user get **warm introductions** using their Draftboard network data, through Draftboard's
hosted MCP server (`https://mcp.draftboard.com`). Draftboard's core idea is **relationship
proximity**: the shortest path from the user to a prospect (a **target**) runs through a mutual
**connection** (a **connector**), scored 0–100 by **rank**.

## Before anything else

1. Confirm the Draftboard tools are available. If they are missing, the connection has not been
   made — point the user to `references/setup.md`: it is one address and a browser approval, with
   nothing to install.
2. Call **`get_me`** once to confirm whose account this is (`customer.name` / `customer.user`). For
   "through my teammate" requests, the team roster is here too: match the teammate's name in
   `customer.teamMembers[]` and pass their `id` as `ownerIds`.
3. If a call comes back unauthorized, do **not** retry it and do not ask for a key — there is
   none. The connection was revoked or expired; tell the user to reconnect (`references/setup.md`),
   or to check **Settings → Connected apps** if they did not expect it to be gone.

## Pick the right tool

Prefer the **outcome tools** — they do the multi-step work and return a `telemetry` block so you
know how complete the answer is. Drop to **thin tools** only when no outcome tool fits.

| User wants… | Use |
|-------------|-----|
| Best intro opportunities right now | `find_top_paths` — one ranked call, one path per target |
| Paths through a specific teammate's network | `find_top_paths` with `ownerIds` |
| Several connectors for the SAME target (not just the strongest) | `get_target_connections` — `find_top_paths` returns only one (the strongest) path per target |
| **Paths only through people I'd actually ask** ("use my supporters", "only my 4–5 star people") | `find_top_paths` with **`ratings: [4,5]`** (2–5; one call — never cross-check a starred list against targets by hand). For one person: `get_target_connections` with `ratings` |
| Whether ONE named person is already a target (and their `targetId`) | `resolve_target` — one lookup, never a page walk |
| Whether they're already connected to people (by LinkedIn URL) | `check_if_connected` (a batch of URLs) |
| Progress of intros (new / completed / stopped) | `intro_status_overview` |
| Cold email that name-drops a mutual connection | `find_top_paths` (`includeRankDetails: true`), use `rankDetails` |
| Who can a specific connector introduce me to? | `get_connector_intros` (connector-first) |
| **Star / rate a connection** ("star this person", "mark them as a go-to", "rate them 5") | `set_connector_tier` with **`rating` 1–5, higher is better** (5 = ★★★★★ "ask anytime", 1 = ★ "don't ask" — which also hides them; `tier: 0` clears) |
| **My / a teammate's / the team's LinkedIn connections** ("my connections", "who does Alice know", export a network) | `get_me` → take the id (yours: `customerProfileId`; a teammate's: `teamMembers[].id`; if the name fits several people or none exactly, ask which one) → `list_network_connections` with `ownerIds`, paging until `nextPage` is 0; each row's `owners` says who on the team knows them |
| **List my starred / closest connections** ("who did I rate 5", "my go-tos") | `list_network_connections` with **`ratings: [5]`** (or `[4,5]`) |
| **Paths through a group** ("paths to Stripe through our investors", "intros via my close friends") | `find_top_paths` with **`connectorLabels: ["investor"]`** (for one target: `get_target_connections` with `connectorLabels`) |
| **People in my network by label** ("my investors", "who are my advisors") | `list_network_connections` with `labels` |
| **How many** ("how many investors do I know?", "how is my network labelled?", "how many haven't I rated?") | `get_label_counts` — one call; then `list_network_connections` with the same filters to see the people |
| **Label a person** ("mark Anna as a mentor", "she's an investor") | `set_connector_labels` with `{ add: ["mentor"] }` — but "make them a supporter" is a **rating**: `set_connector_tier` |
| **Label a company** ("Sequoia is an investor", "Acme is a customer") | `find_network_companies` (name → `id`, show every row with its `connectorsCount`) → `set_company_labels` |
| Hide connections I'd never ask | `set_connector_tier` with `rating: 1` — a rating of 1 hides them |
| List the ones I already hid | `list_network_connections` with `ratings: [1]` — the rating filter *is* the "Hidden" scope; the default listing omits them |
| How do these two know each other? (connector ↔ target) | `get_target_connections` / `get_connector_intros` / `find_top_paths` — read `relationships` + `relationshipDetails`, and fall back to `scoreDetails` |
| Account-level view (companies with targets) | `list_accounts` |
| My saved leads at a specific company | `list_accounts` (name→`id`), then `list_targets` with `accountId` |
| My saved leads with a specific title/role | `list_targets` with `title` (a title/position substring; optionally + `accountId`) |
| Best intros to my targets at a specific company | `list_accounts` (name→`id`), then `find_top_paths` with `accountId` |
| Find NEW people by role at companies I name (I don't have the names) | `search_accounts` (BETA; adds targets automatically, paths charged) → wait → `find_top_paths`; the rest via `list_pool` → `confirm_pool` |
| Find NEW people by role through people I know ("who can Alice get me to?") | `search_supporters` (BETA; nothing charged, everyone found waits in the pool) → later `list_pool` (its `campaignId`) → tell the user confirming takes them on and charges their paths → `confirm_pool` the ones they want |
| …and only at companies like my ideal customer ("VPs of Sales at B2B SaaS companies in the US, through my investors") | `search_supporters` with `icp` (only what the user said; not with `companies`) → later `list_pool` (`campaignId` + `minIcpFit: 50`) → show the user who fits → `confirm_pool` the ones they pick |
| Move an intro forward (sent / made / declined) | `set_intro_status` |
| Raw target / connection / tag data | `list_targets`, `get_target_connections`, `list_tags` |
| Add new people / supporters to track | `import_targets`, `import_supporters` |

**"Star" means the `rating`, and only the `rating`.** It is 1–5, higher is better, and it is the
only thing with ★ glyphs. `tier` is the same setting spelled as the raw wire number (1–5, **lower**
is better) — pass it only when the user already holds tier numbers, and never describe it in stars.
The `preferred` flag is a third thing entirely and is **not** a star.

**Legacy — `preferred` and `excluded` (still wired, still work).** The product moved both onto the
rating, so reach for `set_connector_tier` / `ratings` for every set-and-search intent, and use these
two only when the user explicitly asks for those flags:
- `set_connector_preferred` (set) and `list_network_connections` with `preferred` (search) drive a separate
  boolean column. `set_connector_tier` **never writes it** — `rating: 5` does not mark someone
  preferred, and marking someone preferred does not give them a rating.
- `set_connector_excluded` hides a connector like `rating: 1` does, but the sync runs **one way**:
  writing a rating updates the flag, while `excluded: false` does *not* clear a `rating: 1`. To
  un-hide someone, give them a `rating` of 2–5 — don't un-exclude.

Tools marked WRITE change Draftboard data; the host approves each call, but still confirm
destructive ones (`archive_target` is **not reversible**) with the user first.

The full 12-pain playbook — including the jobs the Integration API does **not** yet support and the
closest workarounds — is in `references/user-stories.md`. The tool catalog with arguments is in
`references/tools.md`.

## How to work

- **Labels say who someone is; the rating says whether to ask them.** Labels (`investor`,
  `close_friend`, …) are set with `set_connector_labels` / `set_company_labels`; "supporter" is the
  2–5 star **rating**, never a label write. `do_not_contact` is only a label and hides nobody — leave
  those people out only when the user asks. A label count of 0 means nobody has been labelled yet,
  not that the network holds no such people. Before labelling a company, tell the user how many
  people it will reach (`connectorsCount`). Token list: `references/tools.md` → **Labels**.
- **`find_top_paths` is one ranked call, not a scan.** It asks the server for the strongest open
  paths — one per target, already excluding paths you've requested — and returns at most `limit`
  (default 20, max 100). Narrow with `accountId`, `tagNames`, `title`, or `ownerIds` to focus the
  ranked list on what the user actually asked about, not to bound cost. If `telemetry.truncated` is
  true, more qualifying paths exist than were returned — say so, and raise `limit` or narrow further
  rather than presenting the page as everything.
- **Company questions → scope by `accountId`, don't scan.** For "who do I have at company X" or
  "best intros at company X", resolve the company with `list_accounts` (name → `id`) and pass
  `accountId` to `list_targets` / `find_top_paths`. Without it, `find_top_paths` ranks across the
  whole book and returns only `limit` opportunities — a company's real but weaker paths can be
  crowded out by stronger ones elsewhere. `accountId` scopes the ranking pool to that company so
  they surface.
- **Describe `basis` honestly.** Every opportunity from `find_top_paths` carries a `basis`:
  `overlap_both_sides` and `overlap_connector_target` are a real shared employer or school — call
  those strong. `other_quality_signal` is a real, qualifying path with **no** work/school overlap —
  describe it only from `rankDetails` (e.g. "you both know 500 people") and never call it "strong".
- **Company-first discovery adds targets on its own — say so before launching (BETA).** `search_accounts`
  (companies + titles) only *starts* a search and returns a `campaignId` — it does not return people.
  People it finds are normally added as targets **automatically**, up to a limit per company, and their
  warm paths are charged like any target's; only the ones beyond that limit wait in the pool for review.
  Everyone arrives asynchronously with no completion signal. The review step: `list_pool` (filter by that
  `campaignId`), then `confirm_pool` the ones the user wants (charged the same way) and `reject_pool` the
  rest. An empty pool right after a search means results may not be ready yet — it does not mean the search has finished. **Every call
  launches a new search** — never repeat one to retry or to check on it.
- **Supporter-first discovery puts everyone in the pool — the charge comes at `confirm_pool` (BETA).**
  `search_supporters` (supporters' LinkedIn profile URLs + titles, optionally companies) searches the
  networks of people the user knows. Launching it charges nothing and takes nobody on: everyone it
  finds waits in the pool for review. Someone the user rejected earlier stays rejected. It returns
  `status`, `errors`, a `campaignId` and counts of supporters accepted / not accepted — not the people
  found, who arrive over time with no completion signal. Check back later with `list_pool` (filter by
  that `campaignId`); an empty pool soon after means results may not be ready yet — it does not mean the search has finished. **Before
  `confirm_pool`,** tell the user that confirming takes those people on as targets and their warm paths
  are then charged; confirm the ones they want in one batch and `reject_pool` the rest. **Every call
  launches a new search** — never repeat one to retry or to check on it. It does not change anyone's
  rating.
- **An ideal customer scores everyone a supporter search finds — it hides nobody.** `search_supporters`
  takes an optional `icp` (`industry`, `companySize`, `location`, `description`, at least one). Take
  it **only from what the user said** — never infer or fill in an ideal customer they did not
  describe. It cannot be combined with `companies`. Each pool row then carries `icpFits`
  (`campaignId`, `percent` 0–100, `reason`); no `percent` means the search **could not assess** that
  person — not a poor fit, and not 0. A person **fits** when `percent` is 50 or more — that is the
  product's threshold; do not invent others. The pool returns everyone whatever their fit; to keep a
  review short, read `list_pool({ campaignId, minIcpFit: 50 })` (`minIcpFit` needs `campaignId`, and
  leaves out the people the search could not assess) rather than paging through everyone. Show the
  user who fits and say the rest are a poor fit or could not be assessed; confirm only the people
  they choose — never on the fit alone.
- **Stay inside these tools.** They are the only sanctioned way to reach Draftboard. If a request
  isn't possible with them, say so plainly and stop (or point to the app) — never run raw API
  calls, read API keys from config/files, query a database, or brute-force by paging thousands of
  records. Don't import people as targets just to answer an exploratory question (that changes the
  user's data) without explicit approval.
- **Be honest about coverage.** Always surface counts from `telemetry` (e.g. "returned 20 of 142
  qualifying paths"). Never imply you saw every opportunity when `truncated` is true.
- **Connector by name (e.g. "paths through Jane Smith").** The API filters connections by team
  member (`ownerIds`), not by connector name. Run `find_top_paths`, then filter the opportunities
  client-side on the `connector` field, and say you did.
- **An import is accepted, not finished — and there are TWO waits, not one.** Getting this wrong is
  how a perfectly good import gets reported to the user as a failure.
  1. **The target row: about half a minute.** Confirm with `resolve_target`, which finds a saved
     target as soon as the batch lands. `check_if_connected` reports it as `import_pending` until
     then and tells you when to look again.
  2. **Its warm-intro paths: minutes** — 14 minutes on a large network. Only after that does the
     person appear in `list_targets` or carry connectors.

  So `list_targets` answers neither question right after an import: it returns only targets that
  **already have a path**. "Not in `list_targets`" never means "not saved" — say the paths are
  still being computed, and re-check, rather than reporting the person as missing or path-less.
- **Name-drop responsibly.** A connector's `rankDetails`/`scoreDetails` (shared history) describes the
  **connector↔target** relationship — why *that* connector can introduce *that* target. It is **not**
  the user's own background and not the user↔connector history. Use it for the warm line about that
  specific intro, mention only real returned facts, and never present it as a fact about the user or
  invent a shared connection. (The teammate↔connector tie is a bare score with no reason exposed.)
  **The same rule covers `relationships` and `relationshipDetails`**: `current_colleague` means the
  connector and the *target* work together now, and an `employment.company` is *their* shared
  employer — never the user's. Don't say "you both worked at X" off these fields.
- **A missing `relationships`/`relationshipDetails` is not a weak connector.** Both keys are present
  when Draftboard holds that signal for the pair and simply **absent** when it does not (never `[]`),
  so read them as `connection.relationships ?? []`. Absence means "no structured signal for this
  pair", **not** "these two have no relationship": **promote on the signal, never demote on its
  absence** — never drop, downrank, or apologise for a connector on that basis, and keep using
  `scoreDetails`, which carries the human-readable summary (read it as `scoreDetails ?? []` — it too
  is omitted when there is nothing to say). The three `relationships` values are exactly
  `current_colleague`, `former_colleague`, `university_classmate`. The two fields are independent —
  a shared-contacts-only signal gives a `relationshipDetails` record and **no** `relationships`
  entry — so never derive or align one from the other. Details in `references/tools.md` →
  **Field notes**.
- **Tagging or describing connectors/supporters — don't invent a backstory.** The tools return a
  connector's name, LinkedIn URL, position, `rank`, and (for an intro) `rankDetails` — **not** their
  bio, seniority, or personal background. When you tag, rate, or describe a supporter, use only
  user-provided facts or fields actually returned; never infer *whose* network it is, their role, or a
  shared history with the user. If asked to tag supporters "by <something>" you can't verify from
  returned data, say what you're basing the tag on (e.g. the user's own words) rather than guessing.

## Output

Lead with the answer (the top opportunities, the yes/no, the status numbers), then the supporting
detail. For each intro opportunity, name the **connector**, the **target**, the **rank**, and the
**reason** (`rankDetails`). Keep it skimmable.
