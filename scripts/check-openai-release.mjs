#!/usr/bin/env node
// Compares what the OpenAI plugin ZIP would carry with what was last published
// to the ChatGPT plugin directory.
//
// The directory keeps the skill and the listing from the last uploaded ZIP; it
// does not follow this repository the way a Claude / Codex install does. Every
// publish is marked by a git tag `openai-v<version>` on the commit that was
// zipped, so "what is live in ChatGPT" is always a git question.
//
//   node scripts/check-openai-release.mjs            report mode (CI): warns when
//                                                    the listing is behind, never fails
//                                                    on that alone
//   node scripts/check-openai-release.mjs --release  gate before building a ZIP to
//                                                    upload: fails unless the release
//                                                    files are committed and the
//                                                    version is new
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Keep in step with the zip line in build-openai-zip.sh.
const RELEASE_PATHS = ['plugin.json', 'mcp.json', 'LICENSE', 'skills', 'assets'];
const TAG_PREFIX = 'openai-v';
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

const isReleaseMode = process.argv.includes('--release');
const isCi = Boolean(process.env.GITHUB_ACTIONS);

// trimEnd, not trim: `git status --porcelain` lines start with a significant space.
function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trimEnd();
}

function parseVersion(version) {
  const match = SEMVER.exec(version);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(a, b) {
  const [pa, pb] = [parseVersion(a), parseVersion(b)];
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function publishedVersions() {
  return git('tag', '--list', `${TAG_PREFIX}*`)
    .split('\n')
    .filter(Boolean)
    .map((tag) => tag.slice(TAG_PREFIX.length))
    .filter((version) => parseVersion(version))
    .sort(compareVersions);
}

function changedSince(tag) {
  const out = git('diff', '--name-only', tag, '--', ...RELEASE_PATHS);
  return out ? out.split('\n') : [];
}

function uncommitted() {
  const out = git('status', '--porcelain', '--', ...RELEASE_PATHS);
  return out ? out.split('\n') : [];
}

function warn(message) {
  console.log(isCi ? `::warning title=ChatGPT listing::${message}` : `WARNING: ${message}`);
}

function fail(message) {
  console.error(isCi ? `::error title=ChatGPT listing::${message}` : `ERROR: ${message}`);
  process.exit(1);
}

const version = JSON.parse(readFileSync(join(ROOT, 'plugin.json'), 'utf8')).version;
if (!parseVersion(version)) {
  fail(`plugin.json version "${version}" is not plain MAJOR.MINOR.PATCH.`);
}

const published = publishedVersions();
const latest = published.at(-1);

if (latest && compareVersions(version, latest) < 0) {
  fail(`plugin.json version ${version} is lower than the published ${TAG_PREFIX}${latest}.`);
}

if (isReleaseMode) {
  const dirty = uncommitted();
  if (dirty.length) {
    fail(`commit these first, the tag must point at what was zipped:\n${dirty.join('\n')}`);
  }
  if (published.includes(version)) {
    fail(`${TAG_PREFIX}${version} is already published; bump plugin.json version.`);
  }
  console.log(`OK: ${version} is new (last published: ${latest ? TAG_PREFIX + latest : 'none'}).`);
  process.exit(0);
}

if (!latest) {
  console.log('ChatGPT listing: nothing published yet (no openai-v* tag).');
  process.exit(0);
}

const changed = changedSince(`${TAG_PREFIX}${latest}`);
if (!changed.length) {
  console.log(`ChatGPT listing: up to date with ${TAG_PREFIX}${latest}.`);
  process.exit(0);
}

const bumpNote = version === latest ? ` plugin.json is still ${version}: bump it before the upload.` : '';
warn(
  `${changed.length} release file(s) changed since ${TAG_PREFIX}${latest}; ChatGPT still serves the old ` +
    `skill until a new ZIP is uploaded and published.${bumpNote} Changed: ${changed.join(', ')}`,
);
