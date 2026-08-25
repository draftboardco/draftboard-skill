#!/usr/bin/env node
/**
 * Docs vocabulary guard for the draftboard-intros skill.
 *
 * These .md files are the instructions an agent actually loads, so they are a customer-facing
 * contract. Two rules must hold in every one of them, and both have rotted before:
 *
 *   RULE 1 — state the CONTRACT, never the kitchen.
 *            No `rating` <-> `tier` derivation formula (including the subtle form: printing both
 *            ladders in the same star unit, which lets a reader recover the formula by pairing on
 *            star count). No coverage statistics. No internal history / roadmap.
 *   RULE 2 — "star" (word or glyph) names the `rating`, and only the `rating`.
 *            Never `tier`, never `preferred` / `excluded`.
 *
 * It also asserts a handful of sentences must STAY, so a red build can never be "fixed" by
 * deleting the useful guidance.
 *
 * Dependency-free on purpose: this is a docs repo, not an app.
 *   run:  node scripts/check-docs.mjs
 *   exit: 0 clean, 1 on any violation.
 */

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules']);

// Default: the whole repo. Explicit paths are for fixtures/self-tests; the
// "these sentences must stay" assertions only apply to a full-repo run.
const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const SCAN = ARGS.length ? ARGS.map((a) => resolve(a)) : [ROOT];
const CHECK_REQUIRED = ARGS.length === 0;

const STAR = '★'; // the star glyph

/* ------------------------------------------------------------------ *
 * Normalisation: strictly 1 char -> 1 char, so match indexes still
 * point at the right place in the raw line when we quote it back.
 * ------------------------------------------------------------------ */
const TYPO_MAP = {
  '—': '-', '–': '-', '−': '-', // em / en dash, minus sign
  '‘': "'", '’': "'", '“': '"', '”': '"',
  ' ': ' ',
};
const norm = (s) => s.replace(/[—–−‘’“” ]/g, (c) => TYPO_MAP[c]);

/* ------------------------------------------------------------------ *
 * Building blocks
 * ------------------------------------------------------------------ */

// "binder" chars only — punctuation/whitespace/markdown, never a letter or a digit.
// Two tokens separated by binders alone are *bound together* (a table cell boundary,
// an "=", an arrow). Prose between them always contains letters, so it never matches.
const BIND = '[\\s|=:<>\\-→()\\[\\]{},;.\"\'`*_~/+#]';

// a `tier` / `rating` token immediately carrying a number: "tier 1", "`tier`: 5", "rating (1"
// \b keeps this off the tool names set_connector_tier / _preferred / _excluded (underscore is \w).
const TIER_NUM = '\\btiers?\\b[\\s`*_:=(\\[]{0,3}\\d';
const RATING_NUM = '\\bratings?\\b[\\s`*_:=(\\[]{0,3}\\d';

const rx = (...parts) => new RegExp(parts.join(''), 'gi');

/* ------------------------------------------------------------------ *
 * Line rules
 * ------------------------------------------------------------------ */

const NEGATED = /\b(not|never|no|nor|isn't|aren't|doesn't|don't)\b/i;

const LINE_RULES = [
  /* ---- RULE 1a: explicit derivation formulas ------------------- */
  {
    id: 'formula',
    why: 'Customer docs state the contract, not the arithmetic between `rating` and `tier`.',
    re: rx('\\b(rating|tier)s?\\b\\s*=\\s*6\\s*-\\s*\\b(tier|rating)s?\\b'),
  },
  {
    id: 'formula',
    why: 'No "6 minus tier" style derivation.',
    re: rx('\\b6\\s*(-|minus)\\s*(the\\s+)?\\b(tier|rating)s?\\b'),
  },
  {
    id: 'formula',
    why: 'No "subtract from 6" derivation.',
    re: rx('\\bsubtract(s|ed|ing)?\\b[^.\\n]{0,25}\\bfrom\\s*(6|six)\\b'),
  },
  {
    id: 'formula',
    why: 'No "same value, other way round" paraphrase of the formula.',
    re: rx(
      '\\b(',
      'derived\\s+from\\s+the\\s+same\\s+value',
      '|the\\s+same\\s+value\\s+(the\\s+right\\s+way\\s+up|inverted|flipped|reversed|upside\\s+down)',
      '|counts?\\s+the\\s+other\\s+way\\s+(round|around|up)',
      '|the\\s+other\\s+way\\s+(round|around|up)',
      '|in\\s+the\\s+star\\s+direction',
      '|one\\s+is\\s+the\\s+(inverse|reverse|opposite|complement)\\s+of\\s+the\\s+other',
      ')\\b'
    ),
  },
  {
    id: 'formula',
    why: 'No "invert / flip / mirror the tier" paraphrase of the formula.',
    re: rx('\\b(invert|inverts|inverted|inverting|flip|flips|flipped|flipping|mirror|mirrors|mirrored|reverse|reverses|reversed)\\s+(the\\s+)?\\b(tier|rating)s?\\b'),
  },
  {
    id: 'formula',
    why: 'No "`tier` is the inverse of `rating`" paraphrase of the formula.',
    re: rx('\\b(tier|rating)s?\\b\\s+(is|are)\\s+the\\s+(inverse|reverse|opposite|complement|mirror)\\s+of\\b'),
  },
  {
    id: 'formula',
    why: 'Pairing a rating value with a tier value IS the derivation table — two ladders, one key.',
    re: rx(RATING_NUM, BIND, '{0,8}', TIER_NUM),
  },
  {
    id: 'formula',
    why: 'Pairing a tier value with a rating value IS the derivation table — two ladders, one key.',
    re: rx(TIER_NUM, BIND, '{0,8}', RATING_NUM),
  },

  /* ---- RULE 1b / RULE 2: the star glyph on `tier` --------------- */
  {
    id: 'two-ladder',
    why: 'The ' + STAR + ' glyph belongs to `rating` only. A tier value printed in stars publishes the second ladder in the same unit — the formula is recoverable by pairing on star count.',
    re: rx(TIER_NUM, BIND, '{0,10}', STAR),
  },
  {
    id: 'two-ladder',
    why: 'The ' + STAR + ' glyph belongs to `rating` only — never bound to a tier value.',
    re: rx(STAR, '+', BIND, '{0,12}', TIER_NUM),
  },

  {
    id: 'two-ladder',
    why: 'The ' + STAR + ' glyph belongs to `rating` only — never bound to `tier`, even without a number.',
    re: rx('\\btiers?\\b', BIND, '{0,6}', STAR),
  },
  {
    id: 'two-ladder',
    why: 'The ' + STAR + ' glyph belongs to `rating` only — never bound to `tier`, even without a number.',
    re: rx(STAR, '+', BIND, '{0,6}\\btiers?\\b'),
  },

  {
    id: 'two-ladder',
    why: 'A tier ladder drawn in ' + STAR + ' glyphs — the ' + STAR + ' unit belongs to `rating` alone.',
    re: rx('\\btiers?\\b[^.\\n|]{0,30}?\\b(scale|ladder|runs?|written|printed|shown|shows|displayed|rendered|drawn|goes)\\b[^.\\n|]{0,20}?', STAR),
  },
  {
    id: 'two-ladder',
    why: 'A ' + STAR + ' run equated to `tier` — the ' + STAR + ' unit belongs to `rating` alone.',
    re: rx(STAR, '[^.\\n|]{0,25}?\\b(is|are|means?)\\b[^.\\n|]{0,25}?\\btiers?\\b'),
    skip: (m) => NEGATED.test(m[0]),
  },

  /* ---- RULE 2: the WORD "star" on tier / preferred / excluded --- */
  {
    id: 'star-word',
    why: '"star" names the `rating`, and only the `rating` — never `tier`, `preferred` or `excluded`.',
    re: rx('\\bstar(s|red|ring)?\\b', BIND, '{0,6}\\b(tiers?|preferred|excluded)\\b'),
  },
  {
    id: 'star-word',
    why: '"star" names the `rating`, and only the `rating` — never `tier`, `preferred` or `excluded`.',
    re: rx('\\b(tiers?|preferred|excluded)\\b', BIND, '{0,6}\\bstar(s|red|ring)?\\b'),
  },
  {
    id: 'star-word',
    why: '"star" names the `rating`, and only the `rating`. (Saying it is NOT a star is fine.)',
    // "preferred ... is ... a star" — allowed only when negated ("is **not** a star").
    re: rx('\\b(tiers?|preferred|excluded)\\b([^.\\n|]{0,40}?)\\b(is|are|means?)\\b([^.\\n|]{0,20}?)\\bstar(s|red|ring)?\\b'),
    skip: (m) => NEGATED.test(m[2]) || NEGATED.test(m[4]),
  },
  {
    id: 'star-word',
    why: '"star" names the `rating`, and only the `rating`. (Saying it is NOT a star is fine.)',
    re: rx('\\bstar(s|red|ring)?\\b([^.\\n|]{0,40}?)\\b(is|are|means?)\\b([^.\\n|]{0,20}?)\\b(tiers?|preferred|excluded)\\b'),
    skip: (m) => NEGATED.test(m[2]) || NEGATED.test(m[4]),
  },

  /* ---- RULE 1c: coverage statistics ----------------------------- */
  {
    id: 'coverage-stat',
    why: 'No coverage statistics in customer docs — how often a field is populated is kitchen, not contract.',
    re: rx('\\b\\d+(\\.\\d+)?\\s?%'),
  },
  {
    id: 'coverage-stat',
    why: 'No coverage statistics in customer docs.',
    re: rx('\\b(a\\s+|the\\s+)?(vast\\s+)?majority\\b'),
  },
  {
    id: 'coverage-stat',
    why: 'No coverage statistics in customer docs.',
    re: rx('\\b(the\\s+)?(common|usual|typical|normal)\\s+(case|shape|state|situation)\\b'),
  },
  {
    id: 'coverage-stat',
    why: 'No coverage statistics in customer docs.',
    re: rx('\\bmost\\s+(connections?|intros?|introductions?|ranks?|ratings?|tiers?|targets?|connectors?|supporters?|pairs?|paths?|customers?|users?|accounts?|records?|rows?|people|of\\s+the\\s+time)\\b'),
  },
  {
    id: 'coverage-stat',
    why: 'No coverage statistics in customer docs.',
    re: rx('\\b(in\\s+most\\s+cases|more\\s+often\\s+than\\s+not|(far|much|way)\\s+more\\s+often|nine\\s+out\\s+of\\s+ten)\\b'),
  },
  {
    id: 'coverage-stat',
    why: 'No coverage statistics in customer docs.',
    re: rx('\\bsparse(r|ly|ness)?\\b'),
  },
  {
    id: 'coverage-stat',
    why: 'No frequency claims about whether a field is filled in — absence is not a signal to quantify.',
    re: rx('\\b(usually|rarely|often|typically|seldom|frequently|commonly|mostly|generally|almost\\s+always|hardly\\s+ever)\\s+(empty|absent|present|missing|populated|set|unset|null|omitted|there|available|returned|blank|filled)\\b'),
  },
  {
    id: 'coverage-stat',
    why: 'No frequency claims about whether a field is filled in — absence is not a signal to quantify.',
    re: rx('\\b(empty|absent|present|missing|populated|omitted|blank)\\s+(most\\s+of\\s+the\\s+time|more\\s+often|far\\s+more\\s+often|in\\s+most)\\b'),
  },
  {
    id: 'coverage-stat',
    why: 'No coverage statistics in customer docs.',
    re: rx('\\b\\d+\\s+out\\s+of\\s+(every\\s+)?\\d+\\b'),
  },

  /* ---- RULE 1d: internal history / roadmap ---------------------- */
  {
    id: 'internal-history',
    why: 'Customer docs describe today’s contract, not when it changed internally.',
    re: rx('\\bbefore\\s+(january|february|march|april|may|june|july|august|september|october|november|december)\\b[^.\\n]{0,12}\\d{4}'),
  },
  {
    id: 'internal-history',
    why: 'Customer docs describe today’s contract, not when it changed internally.',
    re: rx('\\b(before|since|as\\s+of|after)\\s+(mid|early|late)?[\\s-]*(19|20)\\d{2}\\b'),
  },
  {
    id: 'internal-history',
    why: 'Customer docs describe today’s contract, not when it changed internally.',
    re: rx('\\bpre-?dat(e|es|ed|ing)\\b'),
  },
  {
    id: 'internal-history',
    why: 'Backfill status is internal history — the contract is what the field means, not how it got there.',
    re: rx('\\bback-?fill(s|ed|ing)?\\b'),
  },
  {
    id: 'internal-history',
    why: 'No roadmap talk about our own fields being retired / sunset / phased out.',
    re: rx('\\b(retir(e|es|ed|ing|ement)|sunset(s|ting|ted)?|phas(e|es|ed|ing)\\s+out|grandfather(ed|ing)?|deprecation)\\b'),
  },
  {
    id: 'internal-history',
    why: 'No internal migration talk in customer docs.',
    re: rx('\\bmigrat(e|es|ed|ing|ion|ions)\\b'),
  },
  {
    id: 'internal-history',
    why: 'No internal history about older data in customer docs.',
    re: rx('\\b(older|legacy|historical|pre-existing)\\s+(rows?|records?|data|entries|values?)\\b'),
  },
  {
    id: 'internal-history',
    why: 'No internal history about when we started storing something.',
    re: rx('\\b(we|draftboard)\\s+(only\\s+)?(started|began)\\s+(storing|writing|collecting|recording|setting)\\b'),
  },
  {
    id: 'internal-history',
    why: 'No internal history about rows written before a cutoff.',
    re: rx('\\b(rows?|records?|pairs?|connections?|ratings?|tiers?)\\s+(created|written|set|added|stamped)\\s+before\\b'),
  },
];

/* ------------------------------------------------------------------ *
 * Table rules — the "glyph column" form a line regex cannot see:
 * a header column keyed to `tier` sitting next to a column of stars.
 * ------------------------------------------------------------------ */

const stripFmt = (cell) => cell.replace(/[`*_]/g, '').trim();
const isTierCol = (cell) => /\btiers?\b/i.test(stripFmt(cell));
const isRatingCol = (cell) => /\bratings?\b/i.test(stripFmt(cell));
const isPureStars = (cell) => new RegExp('^' + STAR + '{1,5}$').test(stripFmt(cell));
const isNumeric = (cell) => /^\d+$/.test(stripFmt(cell));

const splitRow = (line) =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim());

function findTables(lines) {
  const tables = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^\s*\|/.test(lines[i])) continue;
    if (!/^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) continue;
    const header = splitRow(lines[i]);
    const rows = [];
    let j = i + 2;
    for (; j < lines.length && /^\s*\|/.test(lines[j]); j++) {
      rows.push({ lineNo: j + 1, cells: splitRow(lines[j]) });
    }
    tables.push({ headerLine: i + 1, header, rows });
    i = j - 1;
  }
  return tables;
}

function tableFindings(file, lines) {
  const out = [];
  for (const t of findTables(lines)) {
    const tierCols = t.header.map((h, k) => (isTierCol(h) ? k : -1)).filter((k) => k >= 0);
    const ratingCols = t.header.map((h, k) => (isRatingCol(h) ? k : -1)).filter((k) => k >= 0);

    // (a) a tier column whose cells are printed in stars
    for (const k of tierCols) {
      for (const r of t.rows) {
        if ((r.cells[k] || '').includes(STAR)) {
          out.push({
            file, line: r.lineNo, id: 'two-ladder',
            why: 'A `tier` column printed in ' + STAR + ' glyphs publishes the second ladder in the rating’s unit.',
            text: r.cells.join(' | '),
          });
        }
      }
    }

    // (b) a tier column living in the same table as a column of bare stars
    if (tierCols.length) {
      const starRow = t.rows.find((r) => r.cells.some(isPureStars));
      const starHeader = t.header.some((h) => h.includes(STAR));
      if (starRow || starHeader) {
        out.push({
          file, line: starRow ? starRow.lineNo : t.headerLine, id: 'two-ladder',
          why: 'Two ladders keyed to one ' + STAR + ' column: a `tier` column and a star column in the same table let the reader recover the formula.',
          text: (starRow ? starRow.cells : t.header).join(' | '),
        });
      }
    }

    // (c) a rating column and a tier column with numbers lined up = the derivation table
    if (tierCols.length && ratingCols.length) {
      for (const r of t.rows) {
        if (tierCols.some((k) => isNumeric(r.cells[k] || '')) && ratingCols.some((k) => isNumeric(r.cells[k] || ''))) {
          out.push({
            file, line: r.lineNo, id: 'formula',
            why: 'A row pairing a `rating` value with a `tier` value is the derivation table.',
            text: r.cells.join(' | '),
          });
        }
      }
    }

    // (d) any row that puts a bare-star cell beside a `tier` cell
    for (const r of t.rows) {
      if (r.cells.some(isPureStars) && r.cells.some((c) => /\btiers?\b/i.test(c))) {
        out.push({
          file, line: r.lineNo, id: 'two-ladder',
          why: 'A `tier` cell beside a ' + STAR + ' cell attaches the star unit to `tier`.',
          text: r.cells.join(' | '),
        });
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Positive assertions — sentences that must SURVIVE, so a red build
 * can never be "fixed" by deleting the useful guidance.
 * ------------------------------------------------------------------ */

const REQUIRED = [
  ['draftboard-intros/SKILL.md', 'absence guidance: read `relationships` as `?? []`', /relationships \?\? \[\]/i],
  ['draftboard-intros/SKILL.md', 'absence guidance: read `scoreDetails` as `?? []`', /scoreDetails \?\? \[\]/i],
  ['draftboard-intros/SKILL.md', 'absence is not a negative signal ("promote on the signal, never demote on its absence")', /promote on the signal[,;] never demote on its absence/i],
  ['draftboard-intros/SKILL.md', '"star" is pinned to `rating`', /"star" (means|=) (the )?`?rating/i],

  ['draftboard-intros/references/tools.md', 'absence guidance: read `relationships` as `?? []`', /relationships \?\? \[\]/i],
  ['draftboard-intros/references/tools.md', 'absence guidance: read `scoreDetails` as `?? []`', /scoreDetails \?\? \[\]/i],
  ['draftboard-intros/references/tools.md', 'absent means the key is missing, never `[]`', /it is never `\[\]`/i],
  ['draftboard-intros/references/tools.md', 'absence is not a negative signal ("promote on the signal; never demote on its absence")', /promote on the signal[,;] never demote on its absence/i],
  ['draftboard-intros/references/tools.md', '`scoreDetails` carries the human-readable summary', /scoreDetails[^.]{0,40}human-readable summary/i],
  ['draftboard-intros/references/tools.md', '`ratings: [1]` is the Hidden scope', /`ratings: \[1\]`[\s\S]{0,80}?hidden/i],
  ['draftboard-intros/references/tools.md', '"star" is pinned to `rating`', /"star" (means|=) (the )?`?rating/i],

  ['draftboard-intros/references/user-stories.md', 'absence guidance: read `relationships` as `?? []`', /relationships \?\? \[\]/i],
  ['draftboard-intros/references/user-stories.md', 'absence guidance: read `scoreDetails` as `?? []`', /scoreDetails \?\? \[\]/i],
  ['draftboard-intros/references/user-stories.md', 'absence is not a negative signal ("promote on the signal, never demote on its absence")', /promote on the signal[,;] never demote on its absence/i],
];

/* ------------------------------------------------------------------ */

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir).sort()) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (entry.endsWith('.md')) acc.push(full);
  }
  return acc;
}

const shortPath = (full) => {
  const r = relative(process.cwd(), full);
  return r.startsWith('..') ? full : r;
};

const excerpt = (s, max = 110) => {
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length > max ? one.slice(0, max - 1) + '…' : one;
};

function main() {
  const files = [];
  for (const target of SCAN) {
    if (statSync(target).isDirectory()) walk(target, files);
    else files.push(target);
  }
  const findings = [];

  for (const full of files) {
    const rel = CHECK_REQUIRED ? relative(ROOT, full) : shortPath(full);
    const raw = readFileSync(full, 'utf8');
    const lines = raw.split('\n');

    lines.forEach((rawLine, idx) => {
      const line = norm(rawLine);
      for (const rule of LINE_RULES) {
        rule.re.lastIndex = 0;
        let m;
        while ((m = rule.re.exec(line)) !== null) {
          if (m[0].length === 0) { rule.re.lastIndex++; continue; }
          if (rule.skip && rule.skip(m)) continue;
          findings.push({
            file: rel, line: idx + 1, id: rule.id, why: rule.why,
            text: rawLine.slice(m.index, m.index + m[0].length),
          });
        }
      }
    });

    for (const f of tableFindings(rel, lines)) findings.push(f);

    const flat = norm(raw).replace(/\s+/g, ' ');
    for (const [target, desc, re] of CHECK_REQUIRED ? REQUIRED : []) {
      if (target !== rel) continue;
      if (!re.test(flat)) {
        findings.push({
          file: rel, line: 1, id: 'missing-required', text: desc,
          why: 'This sentence is contract and must stay — a guard that only forbids invites "fixing" a failure by deleting the useful line.',
        });
      }
    }
  }

  // required statements in files that vanished entirely
  const present = new Set(files.map((f) => relative(ROOT, f)));
  for (const [target, desc] of CHECK_REQUIRED ? REQUIRED : []) {
    if (present.has(target)) continue;
    findings.push({
      file: target, line: 1, id: 'missing-required', text: desc,
      why: 'File is missing from the repo.',
    });
  }

  const seen = new Set();
  const unique = findings.filter((f) => {
    const key = f.file + ':' + f.line + ':' + f.id + ':' + f.text;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.id.localeCompare(b.id));

  if (unique.length === 0) {
    console.log('check-docs: OK — ' + files.length + ' markdown file(s), no violations.');
    return 0;
  }

  for (const f of unique) {
    console.log(f.file + ':' + f.line + ': ' + f.id + ' — "' + excerpt(f.text) + '"');
    console.log('    ' + f.why);
  }
  console.error('\ncheck-docs: FAILED — ' + unique.length + ' violation(s) in ' + files.length + ' markdown file(s).');
  return 1;
}

process.exit(main());
