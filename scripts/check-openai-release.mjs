#!/usr/bin/env node
// Compares what the plugin ZIP would carry with what was last released, on the
// two channels that do not follow this repository the way a Claude / Codex
// install does:
//
//   download  tag `v<version>`, a GitHub Release whose asset is the ZIP behind
//             the stable link .../releases/latest/download/draftboard-chatgpt-plugin.zip
//             (created by .github/workflows/release.yml when the tag is pushed)
//   ChatGPT   tag `openai-v<version>`, on the same commit, once that ZIP is
//             published in the ChatGPT plugin directory
//
// So "what can people download" and "what is live in ChatGPT" are git questions.
//
//   node scripts/check-openai-release.mjs            report mode (CI): warns when a
//                                                    channel is behind, never fails
//                                                    on that alone
//   node scripts/check-openai-release.mjs --release  gate before building a ZIP to
//                                                    release: fails unless the release
//                                                    files are committed and the
//                                                    version is new (or already
//                                                    released from this very commit)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Keep in step with the zip line in build-openai-zip.sh.
const RELEASE_PATHS = ['plugin.json', 'mcp.json', 'LICENSE', 'skills', 'assets'];
const CHANNELS = [
  { name: 'Download ZIP', prefix: 'v', action: 'push the tag v<version> to publish a new GitHub Release' },
  { name: 'ChatGPT listing', prefix: 'openai-v', action: 'upload and publish a new ZIP in the OpenAI portal' },
];
const [DOWNLOAD, CHATGPT] = CHANNELS;
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

// Only plain X.Y.Z counts: the old v1.0.0-alpha.* pre-releases are ignored.
function publishedVersions(prefix) {
  return git('tag', '--list', `${prefix}*`)
    .split('\n')
    .filter(Boolean)
    .map((tag) => tag.slice(prefix.length))
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

function commitOf(ref) {
  return git('rev-list', '-n', '1', ref);
}

function warn(title, message) {
  console.log(isCi ? `::warning title=${title}::${message}` : `WARNING (${title}): ${message}`);
}

function fail(message) {
  console.error(isCi ? `::error title=Plugin release::${message}` : `ERROR: ${message}`);
  process.exit(1);
}

const version = JSON.parse(readFileSync(join(ROOT, 'plugin.json'), 'utf8')).version;
if (!parseVersion(version)) {
  fail(`plugin.json version "${version}" is not plain MAJOR.MINOR.PATCH.`);
}

const published = Object.fromEntries(CHANNELS.map((c) => [c.prefix, publishedVersions(c.prefix)]));
for (const channel of CHANNELS) {
  const latest = published[channel.prefix].at(-1);
  if (latest && compareVersions(version, latest) < 0) {
    fail(`plugin.json version ${version} is lower than the released ${channel.prefix}${latest}.`);
  }
}

function checkRelease() {
  const dirty = uncommitted();
  if (dirty.length) {
    fail(`commit these first, the tag must point at what was zipped:\n${dirty.join('\n')}`);
  }
  if (published[CHATGPT.prefix].includes(version)) {
    fail(`${CHATGPT.prefix}${version} is already published to ChatGPT; bump plugin.json version.`);
  }
  // A released version is immutable: rebuilding it is fine only from the commit it was tagged on.
  if (published[DOWNLOAD.prefix].includes(version) && commitOf(`${DOWNLOAD.prefix}${version}`) !== commitOf('HEAD')) {
    fail(`${DOWNLOAD.prefix}${version} is already released from another commit; bump plugin.json version.`);
  }
  const latest = published[DOWNLOAD.prefix].at(-1);
  console.log(`OK: ${version} can be released (last download release: ${latest ? DOWNLOAD.prefix + latest : 'none'}).`);
}

function report(channel) {
  const latest = published[channel.prefix].at(-1);
  if (!latest) {
    console.log(`${channel.name}: nothing released yet (no ${channel.prefix}X.Y.Z tag).`);
    return;
  }
  const changed = changedSince(`${channel.prefix}${latest}`);
  if (!changed.length) {
    console.log(`${channel.name}: up to date with ${channel.prefix}${latest}.`);
    return;
  }
  const bumpNote = version === latest ? ` plugin.json is still ${version}: bump it first.` : '';
  warn(
    channel.name,
    `${changed.length} release file(s) changed since ${channel.prefix}${latest}; to ship them, ${channel.action} ` +
      `(see RELEASING.md).${bumpNote} Changed: ${changed.join(', ')}`,
  );
}

if (isReleaseMode) {
  checkRelease();
} else {
  CHANNELS.forEach(report);
}
