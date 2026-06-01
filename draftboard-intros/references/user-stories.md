# User-story playbook

How to solve each documented customer pain with the Draftboard MCP. ✅ = supported today,
🟡 = partial / workaround, 🚧 = not yet exposed by the Integration API (roadmap).

### 1. ✅🟡 Map paths through specific people who I know will intro for me
Run `find_top_paths`. If "specific people" are **teammates**, pass their `ownerIds` (from `get_me`).
If they're **named connectors** (not team members), the API can't filter by connector name — run
`find_top_paths`, then filter the returned opportunities client-side on the `connector` field and
say you did. Raise `minRank` to keep only strong paths.

### 2. 🚧 I have target accounts (companies) but no people — find intros to those accounts
The Integration API has no company/account search. Workaround: identify specific people at those
companies (LinkedIn), `import_targets` their profile URLs, then `find_top_paths`. Tell the user
account-level discovery lives in the Draftboard app today.

### 3. 🚧 Build a target list from my ICP description
ICP-based target generation (auto-prospecting) isn't exposed via the Integration API. Workaround:
the user supplies known LinkedIn URLs → `import_targets` (optionally tag them as an ICP batch).
Generating targets from a text ICP is a roadmap item.

### 4. ✅ See if teammates are connected to prospects without them doing anything
`get_target_connections` (or `find_top_paths`) returns `owners` — the team members whose network
each path comes from. Filter by `ownerIds` to focus on specific teammates. They must be in the same
Draftboard org with their networks already scanned.

### 5. ✅ Map paths through my colleagues' networks (mine is weak)
`find_top_paths` with `ownerIds` set to your colleagues' team member ids. Discover those ids from
the `owners[].id` field on connections (run `find_top_paths` once unfiltered, or
`get_target_connections`, and read the owner names/ids) — they are not in `get_me`.

### 6. 🟡 Exclude connections I'm not close enough to ask
No server-side exclude in the Integration API. Workaround: raise `minRank` and/or filter the
returned opportunities client-side to drop specific connectors. Persistent supporter/exclude
preferences are managed in the app.

### 7. 🟡 Mark my closest connections and only see paths through them
Marking "supporters" (preferred connectors) isn't writable via the Integration API. Workaround:
approximate "closest" with a high `minRank`, and use `ownerIds` if the close relationships are
through specific teammates. True supporter marking is done in the app.

### 8. ✅ Am I already connected to the prospects I upload?
`check_if_connected` with the LinkedIn URLs. Returns per-URL `directlyConnected` (true when you/a
teammate already know them directly — `degree` "1st"), `hasPaths`, `pathsCount`, `topConnector`,
`topRank`. Newly uploaded people may need a moment for enrichment.

### 9. ✅ Show me my top paths right now
`find_top_paths` (defaults to status `new`, sorted by connector `rank`). This is the headline use
case — keep it scoped with `tagNames`/`minTargetMaxRank` on large lists.

### 10. ✅ Cold email that name-drops a mutual connection
`find_top_paths` with `includeRankDetails: true`. For the chosen target, take the top connector and
weave a real `rankDetails` fact ("you both worked at Apalon") into the opener. Only use facts the
tool actually returned.

### 11. ✅ Track the status of requested intros
`intro_status_overview` → counts of `new` / `completed` / `stopped`, optionally per tag. Scope with
`tagNames` to a campaign.

### 12. 🚧 History of my intro requests to a given connection (last asked, hit rate, responsiveness)
Per-connector intro history/analytics isn't exposed by the Integration API. Roadmap. Today you can
only report current target status (story 11), not historical request outcomes per connector.

---

**Coverage honesty.** Outcome tools return a `telemetry` block. Always tell the user what was
actually scanned (e.g. "top 25 of 142 targets") and, when `truncated` is true, offer the
`nextSuggestedFilter`. Don't present a partial scan as exhaustive.
