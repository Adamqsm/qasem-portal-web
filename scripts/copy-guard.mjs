#!/usr/bin/env node
// copy-guard.mjs: repository copy guard, spec v2 (Node implementation, the
// reference for the Dart and Python ports; one identical file in every Node
// repo, configured per repo by copy-guard.config.json).
//
// Two checks over the files tracked by git:
//   CHECK A (PILL-*)  bans the decorative pill, a small rounded badge line
//                     set above a hero or section headline, in English and
//                     Arabic, plus the component names that render it. Raw
//                     text, comments
//                     included, every scanned file, line by line; on "ts"
//                     surfaces also the text each JSX element renders, so a
//                     phrase wrapped over lines is caught too.
//   CHECK B (DASH)    bans U+2013 (en dash) and U+2014 (em dash) inside
//                     user-facing copy: string literals, JSX text, locale
//                     values, HTML text and attribute values. Never inside
//                     comments. Where the copy renders character references
//                     (JSX text, JSX attribute strings, HTML), the dash
//                     references (&mdash; &ndash; &#8212; &#x2013; ...) count
//                     too; an escape in a string literal (\u2014) does not.
//
// Usage, from the repository root:
//   node scripts/copy-guard.mjs              scan the repository
//   node scripts/copy-guard.mjs --self-test  build a throwaway repo, prove every rule
// Exit status: 0 clean, 1 violations, 2 usage or internal error.
//
// No dependencies. The TypeScript compiler is loaded lazily, only when
// copy-guard.config.json declares a "ts" copy surface: first from the repo's
// own node_modules, then from $GUARD_TS_DIR.
//
// This file is scanned by itself, so it must never contain a banned phrase
// verbatim: patterns put the first letter in a character class or split the
// word, and the self-test assembles its fixtures from fragments at runtime.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const CONFIG_FILE = 'copy-guard.config.json';
const MAX_BYTES = 2 * 1024 * 1024; // files over 2 MiB are skipped
const SNIFF_BYTES = 8192; // a NUL byte in the first 8 KiB marks a binary file
const EXCERPT_MAX = 80; // code points
const USAGE = 'usage: node scripts/copy-guard.mjs [--self-test]  (run from the repository root)';

class UsageError extends Error {}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

// CHECK A patterns, matched against the normalised line (see normalise()):
//   PILL-EN-LAUNCH  "launching" + "soon"; also the pre-launch status label,
//                   "pre" + "launch" + a separator dot or a single bar (a
//                   "||" operator is code)
//   PILL-EN-COMING  "coming" + "soon"
//   PILL-EN-LIVE    "now" + "live", in either order, as whole words; it also
//                   runs on the words of the line's identifiers split apart
//                   (see splitWords()), so a camelCase or SNAKE_CASE name
//                   holding the two words is caught too
//   PILL-NAME       the component names: the two stock words for a pill
//                   label (spelled with a bracketed first letter below), and
//                   "announcement", "hero" or "launch" + "pill", "badge" or
//                   "chip"
// English words may be joined by whitespace, "_" or "-". normalise() has
// already read every escape or entity for a line break, a tab or a no-break
// space, and a JSX {" "} gap, as one space.
// Arabic reads right to left; the alternations below are, in order:
//   PILL-AR-LAUNCH  "the launch / we launch / it launches / it will be
//                   launched" (verbs and both nouns) + "soon"; "before the
//                   launch" + a separator
//   PILL-AR-COMING  "coming / arriving / available / stay tuned / wait for
//                   us" + "soon" (the word may keep its accusative alef);
//                   "soon" as the whole label; "soon" + a separator dot, bar
//                   or slash; "soon in ..."; a separator + "soon" closing the
//                   label
//   PILL-AR-LIVE    "available / live / we launched" + "now", and the
//                   reverse; neither "now" nor the word after it may run on
//                   into an Arabic letter (U+0621..U+064A), so a longer word
//                   that starts with the same letters ("waiting", "directly")
//                   never matches
// The Arabic word lists are written in normalised form. The word for "soon"
// is split in this source, so no line here can match itself.
// No pattern uses the "u" or "i" flag, so \b and \s keep JavaScript's plain
// semantics: \b is an ASCII word boundary ([A-Za-z0-9_] on one side only).
// Dart regular expressions follow JavaScript, so the Dart port uses these
// patterns verbatim; the Python port spells \s out as an explicit class and
// compiles PILL-EN-LIVE with re.ASCII.
const AR_SOON = 'قري' + 'با'; // "soon"
const AR_NOW = 'الان'; // "now"
const anyOf = (words) => `(?:${words.split(' ').join('|')})`;
const AR_LAUNCH = anyOf('الاطلاق اطلاق الانطلاق انطلاق انطلاقنا نطلق ننطلق سنطلق سننطلق ينطلق سينطلق يطلق سيطلق تطلق ستطلق');
const AR_LAUNCH_NOUN = anyOf('الاطلاق الانطلاق');
const AR_COMING = anyOf('قادم قادمة قادمون ياتي تاتي متوفر متوفرة متاح متاحة يتوفر تتوفر ترقبونا انتظرونا');
const AR_LIVE_BEFORE = anyOf('متاح متاحة متوفر متوفرة مباشر انطلق انطلقت انطلقنا اطلقنا');
const AR_LIVE_AFTER = anyOf('متاح متاحة متوفر متوفرة مباشر');
const AR_BEFORE = 'قبل'; // "before"
const AR_IN = 'في'; // "in"
const NOT_AR_LETTER = String.raw`(?![\u0621-\u064A])`;
const LABEL_END = String.raw`(?=$|["'` + '`' + String.raw`<·•|،,.!:\-\u2013\u2014])`;
const LABEL_START = String.raw`(?:^|["'` + '`' + String.raw`>:])`;
const pillRule = (id, ...alternatives) => [id, new RegExp(alternatives.join('|'), 'g')];
const PILL_RULES = [
  pillRule('PILL-EN-LAUNCH', String.raw`[l]aunching[\s_\-]*soon`, String.raw`[p]re[\s_\-]*launch\s*(?:[·•]|\|(?!\|))`),
  pillRule('PILL-EN-COMING', String.raw`[c]oming[\s_\-]*soon`),
  pillRule('PILL-EN-LIVE', String.raw`\b(?:[n]ow[\s_\-]*live|[l]ive[\s_\-]*now)\b`),
  pillRule('PILL-NAME', String.raw`[e]yebrow|[k]icker|(?:[a]nnouncement|[h]ero|[l]aunch)[\s_\-]*(?:pill|badge|chip)`),
  pillRule('PILL-AR-LAUNCH', String.raw`${AR_LAUNCH}\s+${AR_SOON}`, String.raw`${AR_BEFORE}\s+${AR_LAUNCH_NOUN}\s*[·•|]`),
  pillRule('PILL-AR-COMING',
    String.raw`${AR_COMING}ا?\s+${AR_SOON}`,
    String.raw`${LABEL_START}\s*${AR_SOON}\s*${LABEL_END}`,
    String.raw`${AR_SOON}\s*[·•|/]`,
    String.raw`${AR_SOON}\s+${AR_IN}\s`,
    String.raw`[·•|]\s*${AR_SOON}\s*${LABEL_END}`),
  pillRule('PILL-AR-LIVE',
    String.raw`${AR_LIVE_BEFORE}ا?\s+${AR_NOW}${NOT_AR_LETTER}`,
    String.raw`${AR_NOW}\s+${AR_LIVE_AFTER}ا?${NOT_AR_LETTER}`),
];
const EN_LIVE = 'PILL-EN-LIVE';
const RULE_IDS = [...PILL_RULES.map(([id]) => id), 'DASH'];
const KINDS = ['ts', 'json', 'arb', 'dart', 'python', 'html', 'text'];

// Never scanned by either check. Lockfiles match by basename at any depth.
const LOCKFILES = new Set([
  'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml',
  'pubspec.lock', 'uv.lock', 'poetry.lock', 'Pipfile.lock',
]);

// Test files never count for CHECK B (they still count for CHECK A).
const TEST_GLOBS = [
  '**/__tests__/**', '**/*.test.*', '**/*.spec.*', 'test/**', 'tests/**', 'e2e/**',
  'integration_test/**', 'test_driver/**', '**/test_*.py', '**/*_test.dart', '**/conftest.py',
].map(globToRegExp);

// An exclude may never cover one of these (source code, markup, styles, locales).
const SOURCE_EXT = /\.(?:[cm]?[jt]sx?|dart|pyi?|html?|xhtml|svg|vue|svelte|astro|css|scss|sass|less|kts?|swift|java|go|rs|rb|php)$/i;
const LOCALE_EXT = /\.(?:arb|po|pot|xliff|xlf|strings|stringsdict|resx|ftl)$/i;
const LOCALE_DIR = /(?:^|\/)(?:i18n|l10n|locales?|langs?|translations|messages)\//i;
const isSourceOrLocale = (p) => SOURCE_EXT.test(p) || LOCALE_EXT.test(p) || LOCALE_DIR.test(p);

function isSkipped(p) {
  if (p === 'CLAUDE.md') return true; // the one allowlisted file: it states the rule
  if (LOCKFILES.has(p.slice(p.lastIndexOf('/') + 1))) return true;
  if (p.startsWith('docs/')) return true;
  return !p.includes('/') && /\.md$/i.test(p); // root-level documentation
}

// ---------------------------------------------------------------------------
// Globs: "**/" spans zero or more directories, "*" and "?" stay inside one
// segment (and match dotfiles), "{a,b}" alternates, "[...]" is a class.
// Matching is case-sensitive, against git's forward-slash paths.
// ---------------------------------------------------------------------------

function globToRegExp(glob) {
  let re = '';
  let braces = 0;
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*' && (i === 0 || glob[i - 1] === '/')) {
      if (glob[i + 2] === '/') { re += '(?:[^/]*/)*'; i += 2; continue; }
      if (i + 2 === glob.length) { re += '.*'; i += 1; continue; }
    }
    if (c === '*') { re += '[^/]*'; while (glob[i + 1] === '*') i++; }
    else if (c === '?') re += '[^/]';
    else if (c === '{') { braces++; re += '(?:'; }
    else if (c === '}' && braces > 0) { braces--; re += ')'; }
    else if (c === ',' && braces > 0) re += '|';
    else if (c === '[' && glob.indexOf(']', i + 2) > 0) {
      const end = glob.indexOf(']', i + 2);
      const body = glob.slice(i + 1, end).replace(/\\/g, '\\\\');
      re += '[' + (body[0] === '!' ? '^' + body.slice(1) : body) + ']';
      i = end;
    } else re += c.replace(/[.+^$()|\\[\]{}]/g, '\\$&');
  }
  if (braces) throw new UsageError(`unbalanced "{" in glob "${glob}"`);
  return new RegExp('^' + re + '$');
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function loadConfig(root, tracked) {
  let raw;
  try {
    raw = fs.readFileSync(path.join(root, CONFIG_FILE), 'utf8');
  } catch {
    throw new UsageError(`${CONFIG_FILE} not found at the repository root`);
  }
  let cfg;
  try {
    cfg = JSON.parse(raw.replace(/^\uFEFF/, ''));
  } catch (err) {
    throw new UsageError(`${CONFIG_FILE}: invalid JSON (${err.message})`);
  }
  return compileConfig(cfg, tracked);
}

// Validates the config and compiles its globs. Every exclude needs a "why",
// and no exclude may cover a tracked source or locale file.
function compileConfig(cfg, tracked) {
  const fail = (msg) => { throw new UsageError(`${CONFIG_FILE}: ${msg}`); };
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) fail('must be a JSON object');
  for (const key of Object.keys(cfg)) {
    if (!['pillExclude', 'copySurfaces', 'copyExclude', '$comment'].includes(key)) fail(`unknown key "${key}"`);
  }
  const list = (key) => {
    const value = cfg[key] ?? [];
    if (!Array.isArray(value)) fail(`"${key}" must be an array`);
    return value;
  };
  const surfaces = list('copySurfaces').map((s, i) => {
    if (!s || typeof s.glob !== 'string' || !s.glob.trim()) fail(`copySurfaces[${i}] needs a "glob"`);
    if (!KINDS.includes(s.kind)) fail(`copySurfaces[${i}] ("${s.glob}") has kind "${s.kind}"; expected one of ${KINDS.join(', ')}`);
    return { glob: s.glob, kind: s.kind, re: globToRegExp(s.glob) };
  });
  const excludes = (key) => list(key).map((e, i) => {
    if (!e || typeof e !== 'object' || typeof e.glob !== 'string' || !e.glob.trim()) fail(`${key}[${i}] needs a "glob"`);
    if (typeof e.why !== 'string' || !e.why.trim()) fail(`${key}[${i}] ("${e.glob}") needs a "why"`);
    const re = globToRegExp(e.glob);
    const hidden = tracked.find((p) => re.test(p) && isSourceOrLocale(p));
    if (hidden) fail(`${key}[${i}] ("${e.glob}") would hide the source or locale file ${hidden}; excludes may only cover other files`);
    return re;
  });
  return { surfaces, pillExclude: excludes('pillExclude'), copyExclude: excludes('copyExclude') };
}

// ---------------------------------------------------------------------------
// TypeScript (lazy)
// ---------------------------------------------------------------------------

let loadedTs = null; // { ts, dir }

function loadTypeScript(root) {
  if (loadedTs) return loadedTs.ts;
  const tried = [];
  const attempt = (label, base, request) => {
    try {
      const req = createRequire(base);
      const ts = req(request);
      if (typeof ts.createSourceFile !== 'function') throw new Error('not the TypeScript compiler');
      const dir = request === 'typescript' ? path.dirname(req.resolve('typescript/package.json')) : request;
      loadedTs = { ts, dir };
      return true;
    } catch (err) {
      tried.push(`${label}: ${err.code || err.message}`);
      return false;
    }
  };
  const env = process.env.GUARD_TS_DIR;
  const envDir = env ? path.resolve(env) : '';
  const ok = attempt(`${root}${path.sep}node_modules`, path.join(root, 'package.json'), 'typescript')
    || (env && attempt(`GUARD_TS_DIR=${env}`, path.join(envDir, 'noop.js'), envDir))
    || (env && attempt(`GUARD_TS_DIR=${env} as an install prefix`, path.join(envDir, 'noop.js'), 'typescript'));
  if (!ok) {
    throw new UsageError([
      'a "ts" copy surface is configured but the TypeScript compiler could not be loaded.',
      ...tried.map((t) => `  tried ${t}`),
      env ? '' : '  GUARD_TS_DIR is not set.',
      'Run "npm ci" in the repository, or set GUARD_TS_DIR to an installed typescript package directory.',
    ].filter(Boolean).join('\n'));
  }
  return loadedTs.ts;
}

// ---------------------------------------------------------------------------
// CHECK A: pill phrases on normalised lines
// ---------------------------------------------------------------------------

// One base character plus its combining marks (and Hangul medial or final
// jamo, which compose with the syllable before them). NFC never reaches
// across two units, so each unit is normalised alone and every normalised
// code unit maps back to a column in the original line.
const UNIT_RE = /[^\p{M}\u1160-\u11FF][\p{M}\u1160-\u11FF]*|[\p{M}\u1160-\u11FF]+/gu;
const ALEF_FORMS = new Set(['\u0623', '\u0625', '\u0622', '\u0671']); // hamza above, hamza below, madda, wasla

// Deleted by normalise(): Arabic tatweel U+0640, harakat U+064B..U+065F and
// superscript alef U+0670; invisible format characters (zero-width space,
// joiners and directional marks U+200B..U+200F, the Arabic letter mark
// U+061C, bidi embeddings and overrides U+202A..U+202E, the word joiner
// U+2060, bidi isolates U+2066..U+2069), so none of them can hide a phrase.
const isDropped = (cp) => cp === 0x0640 || (cp >= 0x064b && cp <= 0x065f) || cp === 0x0670
  || (cp >= 0x200b && cp <= 0x200f) || cp === 0x061c || (cp >= 0x202a && cp <= 0x202e)
  || cp === 0x2060 || (cp >= 0x2066 && cp <= 0x2069);

// Escapes and entities for a line break, a tab or a no-break space, as they
// read once the line is lower-cased (so any case matches), plus the JSX {" "}
// gap: \n \r \t   \u{a0} \xa0 &nbsp; &#160; &#xa0; (leading zeros
// allowed in the braced, decimal and hex forms). Each one reads as a single
// space, so a phrase written with one between its words is still the phrase.
const SPACE_ESCAPE_RE = /\\(?:[nrt]|u00a0|u\{0*a0\}|xa0)|&(?:nbsp|#0*160|#x0*a0);|\{(?:" "|' '|` `)\}/g;

// NFC; delete the characters above; fold alef variants to bare alef
// (U+0627); lower-case; read space escapes as one space. Returns the
// normalised text and a map from each normalised UTF-16 index to the
// original UTF-16 index (null when the two are the same).
function normalise(line) {
  if (/^[\x00-\x7f]*$/.test(line)) return readEscapes(line.toLowerCase(), null);
  let text = '';
  const map = [];
  for (const unit of line.matchAll(UNIT_RE)) {
    for (const ch of unit[0].normalize('NFC')) {
      const cp = ch.codePointAt(0);
      if (isDropped(cp)) continue;
      const out = (ALEF_FORMS.has(ch) ? 'ا' : ch).toLowerCase();
      text += out;
      for (let k = 0; k < out.length; k++) map.push(unit.index);
    }
  }
  return readEscapes(text, map);
}

// Replaces every SPACE_ESCAPE_RE match in a normalised text with one space
// that maps to the first character of the escape.
function readEscapes(text, map) {
  if (!/[\\&{]/.test(text)) return { text, map };
  const at = (i) => (map ? map[i] : i);
  let out = '';
  const outMap = [];
  let done = 0;
  SPACE_ESCAPE_RE.lastIndex = 0;
  for (let m; (m = SPACE_ESCAPE_RE.exec(text)); ) {
    for (let k = done; k < m.index; k++) { out += text[k]; outMap.push(at(k)); }
    out += ' ';
    outMap.push(at(m.index));
    done = m.index + m[0].length;
  }
  if (done === 0) return { text, map };
  for (let k = done; k < text.length; k++) { out += text[k]; outMap.push(at(k)); }
  return { text: out, map: outMap };
}

// The line with the words of its identifiers set apart, for PILL-EN-LIVE: a
// space before every ASCII capital that follows a lower-case ASCII letter or
// a digit, and a space in place of every "_". A prefixed camelCase or
// SNAKE_CASE name then reads as separate words, so the ASCII \b holds at the
// start of the phrase. Null when the line has neither; otherwise the text
// and, per UTF-16 unit, its index in the line.
function splitWords(line) {
  let text = '';
  const map = [];
  let changed = false;
  for (let i = 0; i < line.length; i++) {
    const c = line.charCodeAt(i);
    if (c === 0x5f) { text += ' '; map.push(i); changed = true; continue; }
    if (i > 0 && c >= 0x41 && c <= 0x5a && /[a-z0-9]/.test(line[i - 1])) { text += ' '; map.push(i); changed = true; }
    text += line[i];
    map.push(i);
  }
  return changed ? { text, map } : null;
}

// Every PILL_RULES match in a string, as [rule, first, last]: the indexes of
// the match's first and last character in the string (not the normalised
// copy). PILL-EN-LIVE then runs once more on the split words; a position it
// already reported is not reported again.
function pillMatches(str) {
  const { text: norm, map } = normalise(str);
  const back = (i) => (map ? map[i] : i);
  const found = [];
  const liveAt = new Set();
  for (const [rule, re] of PILL_RULES) {
    re.lastIndex = 0;
    for (let m; (m = re.exec(norm)); ) {
      const first = back(m.index);
      if (rule === EN_LIVE) liveAt.add(first);
      found.push([rule, first, back(m.index + Math.max(m[0].length, 1) - 1)]);
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  const split = norm.includes('live') ? splitWords(str) : null;
  if (split) {
    const words = normalise(split.text);
    const back2 = (i) => split.map[words.map ? words.map[i] : i];
    const re = PILL_RULES.find(([id]) => id === EN_LIVE)[1];
    re.lastIndex = 0;
    for (let m; (m = re.exec(words.text)); ) {
      const first = back2(m.index);
      if (liveAt.has(first)) continue;
      liveAt.add(first);
      found.push([EN_LIVE, first, back2(m.index + m[0].length - 1)]);
    }
  }
  return found;
}

// The per-line pass. Each hit's file offsets go to spans, so the JSX pass
// can tell which of its hits this pass already reported.
function checkPill(text, add, spans) {
  const lines = text.split('\n');
  let lineStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].endsWith('\r') ? lines[i].slice(0, -1) : lines[i];
    for (const [rule, first, last] of pillMatches(line)) {
      add(rule, i + 1, line, first);
      spans.push({ rule, start: lineStart + first, end: lineStart + last });
    }
    lineStart += lines[i].length + 1;
  }
}

// The JSX pass (ts surfaces only). React renders a run of JSX text children
// as one string, so a banned phrase can reach the page from source in which
// no single line holds it: wrapped over two lines, joined by {" "}, or
// spaced with &nbsp;. For every JSX element and fragment this rebuilds the
// string its children render and runs PILL_RULES over it:
//   - JSX text is cleaned as the JSX transform cleans it (lines trimmed,
//     blank lines dropped, the rest joined by one space), then its entities
//     are decoded;
//   - a {"..."} or {`...`} child adds its string value verbatim;
//   - an empty {/* comment */} child adds nothing;
//   - any other child (an element, any other expression) adds JSX_BREAK, a
//     character no pattern can match or cross, so text in sibling elements
//     is never joined and the start-of-label case only fires at the start
//     of the element.
// JSX attribute strings are checked with their entities decoded. A hit maps
// back to the source offset of its first character (an entity maps to its
// "&"); one that overlaps a per-line hit of the same rule is that hit again.
const JSX_BREAK = '\ufffc';
const JSX_ENTITIES = {
  nbsp: '\u00a0', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', middot: '\u00b7', bull: '\u2022',
  ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009', hellip: '\u2026', ndash: '\u2013', mdash: '\u2014',
};
const ENTITY_RE = /&(?:#(\d{1,7})|#[xX]([0-9A-Fa-f]{1,6})|([A-Za-z][A-Za-z0-9]{1,31}));/g;

// A string under construction plus, per UTF-16 unit, its source offset.
const newRun = () => ({ text: '', map: [] });
function pushChars(run, chars, offset) {
  run.text += chars;
  for (let k = 0; k < chars.length; k++) run.map.push(offset);
}
function pushSource(run, src, from, to) {
  run.text += src.slice(from, to);
  for (let i = from; i < to; i++) run.map.push(i);
}

// src[from, to) with HTML entities decoded (unknown names stay as written).
function pushDecoded(run, src, from, to) {
  const s = src.slice(from, to);
  let done = 0;
  ENTITY_RE.lastIndex = 0;
  for (let m; (m = ENTITY_RE.exec(s)); ) {
    const cp = m[1] ? parseInt(m[1], 10) : m[2] ? parseInt(m[2], 16) : -1;
    const ch = cp >= 0 ? (cp <= 0x10ffff ? String.fromCodePoint(cp) : undefined) : JSX_ENTITIES[m[3]];
    if (ch === undefined) continue;
    pushSource(run, src, from + done, from + m.index);
    pushChars(run, ch, from + m.index);
    done = m.index + m[0].length;
  }
  pushSource(run, src, from + done, to);
}

// The body of a string or template literal, src[from, to), with its escapes
// decoded; each decoded character maps to its backslash. value is the
// parser's reading of the literal: should the decoding differ from it, the
// value is used with every character mapped to the opening quote.
const SIMPLE_ESCAPES = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', 0: '\0' };
function pushLiteral(run, src, from, to, value) {
  const part = newRun();
  for (let i = from; i < to; ) {
    if (src[i] !== '\\') { pushSource(part, src, i, i + 1); i++; continue; }
    const c = src[i + 1];
    let m;
    if (c === '\r' && src[i + 2] === '\n') i += 3; // line continuation
    else if (c === '\n' || c === '\r' || c === '\u2028' || c === '\u2029') i += 2;
    else if ((m = /^x([0-9A-Fa-f]{2})/.exec(src.slice(i + 1, i + 4)))) { pushChars(part, String.fromCharCode(parseInt(m[1], 16)), i); i += 4; }
    else if ((m = /^u([0-9A-Fa-f]{4})/.exec(src.slice(i + 1, i + 6)))) { pushChars(part, String.fromCharCode(parseInt(m[1], 16)), i); i += 6; }
    else if ((m = /^u\{([0-9A-Fa-f]{1,6})\}/.exec(src.slice(i + 1, i + 10))) && parseInt(m[1], 16) <= 0x10ffff) {
      pushChars(part, String.fromCodePoint(parseInt(m[1], 16)), i);
      i += 2 + m[0].length - 1;
    } else if (c in SIMPLE_ESCAPES && !(c === '0' && /[0-9]/.test(src[i + 2] ?? ''))) { pushChars(part, SIMPLE_ESCAPES[c], i); i += 2; }
    else if (c !== undefined) { pushChars(part, c, i); i += 2; } // an identity escape: \' \" \\ \` \$ and the like
    else i++;
  }
  if (part.text === value) { run.text += part.text; run.map.push(...part.map); }
  else pushChars(run, value, from - 1);
}

// One JSX text node, src[from, to), cleaned like the JSX transform: split
// into lines; trim spaces and tabs at the start of every line but the first
// and at the end of every line but the last; drop lines left empty; join the
// rest with one space (mapped to the line break it replaces).
function pushJsxText(run, src, from, to) {
  const lines = [];
  let start = from;
  for (let i = from; i < to; i++) {
    if (src[i] !== '\n' && src[i] !== '\r') continue;
    lines.push([start, i]);
    if (src[i] === '\r' && src[i + 1] === '\n' && i + 1 < to) i++;
    start = i + 1;
  }
  lines.push([start, to]);
  const blank = (c) => c === ' ' || c === '\t';
  let lastFull = -1;
  lines.forEach(([a, b], k) => { for (let i = a; i < b; i++) if (!blank(src[i])) { lastFull = k; break; } });
  lines.forEach(([a, b], k) => {
    if (k > 0) while (a < b && blank(src[a])) a++;
    if (k < lines.length - 1) while (b > a && blank(src[b - 1])) b--;
    if (a === b) return;
    pushDecoded(run, src, a, b);
    if (k !== lastFull) pushChars(run, ' ', b);
  });
}

function jsxPillHits(sf, src) {
  const ts = loadedTs.ts;
  const K = ts.SyntaxKind;
  const hits = [];
  const check = (run) => {
    for (const [rule, first, last] of pillMatches(run.text)) hits.push({ rule, start: run.map[first], end: run.map[last] });
  };
  const visit = (node) => {
    if (node.kind === K.JsxElement || node.kind === K.JsxFragment) {
      const run = newRun();
      for (const child of node.children) {
        const e = child.kind === K.JsxExpression ? child.expression : null;
        if (child.kind === K.JsxText) pushJsxText(run, src, child.pos, child.end);
        else if (child.kind === K.JsxExpression && !e) continue;
        else if (e && !child.dotDotDotToken && (e.kind === K.StringLiteral || e.kind === K.NoSubstitutionTemplateLiteral)) {
          pushLiteral(run, src, e.getStart(sf) + 1, e.end - 1, e.text);
        } else pushChars(run, JSX_BREAK, child.pos);
      }
      check(run);
    } else if (node.kind === K.JsxAttribute && node.initializer && node.initializer.kind === K.StringLiteral) {
      const run = newRun();
      pushDecoded(run, src, node.initializer.getStart(sf) + 1, node.initializer.end - 1);
      check(run);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);
  return hits;
}

// ---------------------------------------------------------------------------
// CHECK B: dashes inside copy. Each extractor returns UTF-16 offsets of the
// dash characters that sit inside copy, never inside comments or code.
// ---------------------------------------------------------------------------

const isDash = (c) => c === '\u2013' || c === '\u2014';

function dashesIn(text, from, to, out) {
  for (let i = from; i < to; i++) if (isDash(text[i])) out.push(i);
}

// The character references to either dash (named, decimal, hex), in copy
// that renders them (JSX text and attribute strings, HTML text and attribute
// values); each is reported at its "&".
const DASH_REF_RE = /&(?:mdash|ndash);|&#0*(?:8211|8212);|&#[xX]0*(?:2013|2014);/g;

function dashRefsIn(text, from, to, out) {
  const s = text.slice(from, to);
  DASH_REF_RE.lastIndex = 0;
  for (let m; (m = DASH_REF_RE.exec(s)); ) out.push(from + m.index);
}

const lineEnd = (text, i) => {
  const e = text.indexOf('\n', i);
  return e < 0 ? text.length : e;
};

// ts: string literals, template pieces, JSX text and JSX attribute strings,
// read through the TypeScript parser. The raw literal text is inspected, so
// an escaped \u2014 (for example in a normaliser) passes. JSX text and JSX
// attribute strings render character references, so there the dash
// references count as well; ordinary strings decode nothing.
const TS_SCRIPT_KINDS = { '.ts': 'TS', '.mts': 'TS', '.cts': 'TS', '.tsx': 'TSX', '.js': 'JS', '.mjs': 'JS', '.cjs': 'JS', '.jsx': 'JSX' };

// One parse per file, shared by the JSX pass of CHECK A and by CHECK B.
let parsedTs = null; // { file, text, sf }
function parseTs(text, file) {
  if (parsedTs && parsedTs.file === file && parsedTs.text === text) return parsedTs.sf;
  const scriptKind = TS_SCRIPT_KINDS[path.extname(file).toLowerCase()];
  if (!scriptKind) throw new UsageError(`${file}: a "ts" copy surface only accepts ${Object.keys(TS_SCRIPT_KINDS).join(' ')} files`);
  const ts = loadedTs.ts;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, ts.ScriptKind[scriptKind]);
  parsedTs = { file, text, sf };
  return sf;
}

function dashesTs(text, file) {
  const sf = parseTs(text, file);
  const ts = loadedTs.ts;
  const K = ts.SyntaxKind;
  const copyKinds = new Set([K.StringLiteral, K.NoSubstitutionTemplateLiteral, K.TemplateHead, K.TemplateMiddle, K.TemplateTail, K.JsxText]);
  const out = [];
  const visit = (node) => {
    if (copyKinds.has(node.kind)) {
      const start = node.getStart(sf);
      const raw = node.getText(sf);
      for (let i = 0; i < raw.length; i++) if (isDash(raw[i])) out.push(start + i);
    }
    if (node.kind === K.JsxText) dashRefsIn(text, node.pos, node.end, out);
    else if (node.kind === K.JsxAttribute && node.initializer && node.initializer.kind === K.StringLiteral) {
      dashRefsIn(text, node.initializer.getStart(sf), node.initializer.end, out);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);
  return out;
}

// json / arb: string values, never keys. For arb, everything under a
// top-level key that starts with "@" (metadata, @@locale) is skipped too.
// Comments are tolerated so JSONC files do not confuse the scanner.
function dashesJson(text, arb) {
  const out = [];
  const stack = [];
  let topKey = null;
  const skipGap = (i) => {
    for (;;) {
      while (i < text.length && /\s/.test(text[i])) i++;
      if (text.startsWith('//', i)) i = lineEnd(text, i);
      else if (text.startsWith('/*', i)) { const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 2; }
      else return i;
    }
  };
  for (let i = 0; i < text.length; ) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"' && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
      const end = text[j] === '"' ? j + 1 : j;
      const isKey = stack[stack.length - 1] === '{' && text[skipGap(end)] === ':';
      if (isKey && stack.length === 1) topKey = text.slice(i + 1, j);
      if (!isKey && !(arb && stack.length > 0 && topKey !== null && topKey.startsWith('@'))) dashesIn(text, i, end, out);
      i = end;
    } else if (text.startsWith('//', i) || text.startsWith('/*', i)) {
      i = skipGap(i);
    } else {
      if (c === '{' || c === '[') stack.push(c);
      else if (c === '}' || c === ']') stack.pop();
      i++;
    }
  }
  return out;
}

// dart: string literal contents. Skips // /// and nested /* */ comments,
// handles '...', "...", '''...''', """...""", raw r'...' strings and ${...}
// interpolation, whose code is lexed as code (nested strings still count).
function dashesDart(text) {
  const out = [];
  const n = text.length;
  const isIdent = (c) => c !== undefined && /[A-Za-z0-9_$]/.test(c);

  function code(i, untilBrace) {
    let depth = 0;
    while (i < n) {
      const c = text[i];
      if (c === '/' && text[i + 1] === '/') { i = lineEnd(text, i); continue; }
      if (c === '/' && text[i + 1] === '*') { i = blockComment(i); continue; }
      if (c === '"' || c === "'") { i = string(i, false); continue; }
      if (c === 'r' && (text[i + 1] === '"' || text[i + 1] === "'") && !isIdent(text[i - 1])) { i = string(i + 1, true); continue; }
      if (c === '{') depth++;
      else if (c === '}') {
        if (untilBrace && depth === 0) return i + 1;
        depth--;
      }
      i++;
    }
    return n;
  }

  function blockComment(i) {
    let depth = 0;
    while (i < n) {
      if (text[i] === '/' && text[i + 1] === '*') { depth++; i += 2; }
      else if (text[i] === '*' && text[i + 1] === '/') { depth--; i += 2; if (depth === 0) return i; }
      else i++;
    }
    return n;
  }

  function string(i, raw) {
    const q = text[i];
    const close = text[i + 1] === q && text[i + 2] === q ? q.repeat(3) : q;
    i += close.length;
    while (i < n) {
      const c = text[i];
      if (text.startsWith(close, i)) return i + close.length;
      if (close.length === 1 && c === '\n') return i; // unterminated single-line string
      if (!raw && c === '\\') { // an escape; a real dash after the backslash is still raw copy
        if (isDash(text[i + 1])) out.push(i + 1);
        i += 2;
        continue;
      }
      if (!raw && c === '$' && text[i + 1] === '{') { i = code(i + 2, true); continue; }
      if (isDash(c)) out.push(i);
      i++;
    }
    return n;
  }

  code(0, false);
  return out;
}

// python: str constants, f-string literal parts and strings nested in
// f-string fields; docstrings (first statement of a module, class or
// function body) and bytes are excluded, as with ast.Constant.
const PY_PREFIXES = new Set(['', 'r', 'u', 'b', 'br', 'rb', 'f', 'fr', 'rf', 't', 'tr', 'rt']);

function dashesPython(text) {
  const n = text.length;
  const isWord = (c) => c !== undefined && /[\p{L}\p{N}_]/u.test(c);
  const wordEnd = (i) => { while (i < n && isWord(text[i])) i++; return i; };

  // Reads the string literal whose opening quote is at q.
  function string(q, prefix) {
    const quote = text[q];
    const close = text.startsWith(quote.repeat(3), q) ? quote.repeat(3) : quote;
    const fmt = /[ft]/i.test(prefix);
    const bytes = /b/i.test(prefix);
    const hits = [];
    let i = q + close.length;
    while (i < n) {
      const c = text[i];
      if (text.startsWith(close, i)) { i += close.length; break; }
      if (c === '\\') { // an escape; a real dash after the backslash is still raw copy
        if (!bytes && isDash(text[i + 1])) hits.push(i + 1);
        i += 2;
        continue;
      }
      if (c === '\n' && close.length === 1) break; // unterminated
      if (fmt && (c === '{' || c === '}') && text[i + 1] === c) { i += 2; continue; }
      if (fmt && c === '{') { i = field(i + 1, hits); continue; }
      if (!bytes && isDash(c)) hits.push(i);
      i++;
    }
    return { end: Math.min(i, n), hits, kind: bytes ? 'bytes' : fmt ? 'fstr' : 'str' };
  }

  // Lexes an f-string replacement field as code, up to its closing brace.
  // A ":" at depth 0 starts the format spec (see spec()).
  function field(i, hits) {
    let depth = 0;
    while (i < n) {
      const c = text[i];
      if (c === '#') { i = lineEnd(text, i); continue; }
      const s = stringAt(i);
      if (s) { if (s.tok.kind !== 'bytes') hits.push(...s.tok.hits); i = s.tok.end; continue; }
      if (isWord(c)) { i = wordEnd(i); continue; }
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') {
        if (depth === 0 && c === '}') return i + 1;
        depth--;
      } else if (c === ':' && depth === 0) return spec(i + 1, hits);
      i++;
    }
    return n;
  }

  // A format spec is literal text, like the str constants ast puts in a
  // JoinedStr, so its dashes count; nested {fields} are code again.
  function spec(i, hits) {
    while (i < n) {
      const c = text[i];
      if (c === '}') return i + 1;
      if (c === '{') { i = field(i + 1, hits); continue; }
      if (isDash(c)) hits.push(i);
      i++;
    }
    return n;
  }

  // A string literal (with optional prefix) starting at i, or null.
  function stringAt(i) {
    const c = text[i];
    if (c === '"' || c === "'") return { tok: string(i, '') };
    if (!isWord(c)) return null;
    const end = wordEnd(i);
    const word = text.slice(i, end);
    if ((text[end] === '"' || text[end] === "'") && PY_PREFIXES.has(word.toLowerCase())) return { tok: string(end, word) };
    return null;
  }

  // Tokenise into logical lines of string / name / op tokens.
  const lines = [[]];
  let depth = 0;
  for (let i = 0; i < n; ) {
    const c = text[i];
    if (c === '#') { i = lineEnd(text, i); continue; }
    if (c === '\\' && (text[i + 1] === '\n' || (text[i + 1] === '\r' && text[i + 2] === '\n'))) { i += text[i + 1] === '\r' ? 3 : 2; continue; }
    if (c === '\n') { if (depth === 0 && lines[lines.length - 1].length) lines.push([]); i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f') { i++; continue; }
    const s = stringAt(i);
    if (s) { lines[lines.length - 1].push({ t: 'str', ...s.tok }); i = s.tok.end; continue; }
    if (isWord(c)) { const end = wordEnd(i); lines[lines.length - 1].push({ t: 'name', v: text.slice(i, end) }); i = end; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    lines[lines.length - 1].push({ t: 'op', v: c });
    i++;
  }

  // Docstrings: a statement made only of plain str literals (implicit
  // concatenation included, optionally wrapped in one pair of parentheses)
  // that opens the module or a def/class body, as ast sees it.
  const markDocstring = (toks) => {
    const semi = toks.findIndex((t) => t.t === 'op' && t.v === ';');
    let stmt = semi < 0 ? toks : toks.slice(0, semi);
    if (stmt.length > 2 && stmt[0].v === '(' && stmt[stmt.length - 1].v === ')') stmt = stmt.slice(1, -1);
    if (stmt.length && stmt.every((t) => t.t === 'str' && t.kind === 'str')) for (const t of stmt) t.doc = true;
  };
  let expectDoc = true;
  for (const line of lines) {
    if (!line.length) continue;
    if (expectDoc) markDocstring(line);
    expectDoc = false;
    const [a, b] = line;
    const header = a.t === 'name' && (a.v === 'def' || a.v === 'class' || (a.v === 'async' && b && b.t === 'name' && b.v === 'def'));
    if (!header) continue;
    let d = 0;
    const colon = line.findIndex((t) => {
      if (t.t !== 'op') return false;
      if ('([{'.includes(t.v)) d++;
      else if (')]}'.includes(t.v)) d--;
      return t.v === ':' && d === 0;
    });
    if (colon < 0) continue;
    const suite = line.slice(colon + 1);
    if (suite.length) markDocstring(suite);
    else expectDoc = true;
  }

  const out = [];
  for (const line of lines) for (const t of line) if (t.t === 'str' && !t.doc && t.kind !== 'bytes') out.push(...t.hits);
  return out;
}

// html: text nodes and attribute values, dash characters and dash references
// alike; <style> and <script> content, <!-- --> comments and <! / <?
// declarations are skipped. In text, Django / Jinja template comments are
// skipped too: {# ... #} on one line, and {% comment %} ... {% endcomment %}
// (to the end of the file when unclosed).
const TAG_RE = /<(\/?)([A-Za-z][^\s/>]*)/y;
const TEMPLATE_COMMENT_RE = /\{#[^\n]*?#\}|\{%\s*comment\b[^%]*%\}[\s\S]*?(?:\{%\s*endcomment\s*%\}|$)/y;

function dashesHtml(text) {
  const out = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    let lt = i; // text node up to the next tag or template comment
    for (; lt < n && text[lt] !== '<'; lt++) {
      if (text[lt] !== '{') continue;
      TEMPLATE_COMMENT_RE.lastIndex = lt;
      if (TEMPLATE_COMMENT_RE.test(text)) break;
    }
    dashesIn(text, i, lt, out);
    dashRefsIn(text, i, lt, out);
    if (lt >= n) break;
    if (text[lt] === '{') { i = TEMPLATE_COMMENT_RE.lastIndex; continue; }
    if (text.startsWith('<!--', lt)) { const e = text.indexOf('-->', lt + 4); i = e < 0 ? n : e + 3; continue; }
    if (text[lt + 1] === '!' || text[lt + 1] === '?') { const e = text.indexOf('>', lt); i = e < 0 ? n : e + 1; continue; }
    TAG_RE.lastIndex = lt;
    const tag = TAG_RE.exec(text);
    if (!tag) { i = lt + 1; continue; } // a bare "<" in text
    let j = lt + tag[0].length;
    while (j < n && text[j] !== '>') {
      const c = text[j];
      if (c === '"' || c === "'") { // quoted attribute value
        const e = text.indexOf(c, j + 1);
        const end = e < 0 ? n : e;
        dashesIn(text, j + 1, end, out);
        dashRefsIn(text, j + 1, end, out);
        j = end + 1;
      } else if (c === '=') {
        j++;
        while (j < n && /\s/.test(text[j])) j++;
        if (text[j] !== '"' && text[j] !== "'") { // unquoted attribute value
          const start = j;
          while (j < n && !/[\s>]/.test(text[j])) j++;
          dashesIn(text, start, j, out);
          dashRefsIn(text, start, j, out);
        }
      } else j++;
    }
    i = Math.min(j + 1, n);
    const name = tag[2].toLowerCase();
    if (!tag[1] && (name === 'script' || name === 'style') && text[j - 1] !== '/') {
      const close = new RegExp(`</${name}[\\s/>]`, 'gi');
      close.lastIndex = i;
      const m = close.exec(text);
      i = m ? m.index : n;
    }
  }
  return out;
}

const DASH_EXTRACTORS = {
  ts: dashesTs,
  json: (text) => dashesJson(text, false),
  arb: (text) => dashesJson(text, true),
  dart: dashesDart,
  python: dashesPython,
  html: dashesHtml,
  text: (text) => { const out = []; dashesIn(text, 0, text.length, out); return out; },
};

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, maxBuffer: 1 << 30, windowsHide: true });
  if (r.error) throw new UsageError(`cannot run git (${r.error.message})`);
  if (r.status !== 0) throw new UsageError(`git ${args.join(' ')} failed: ${r.stderr.toString().trim()}`);
  return r.stdout.toString('utf8');
}

// Contents of a tracked file, or null when it is missing, not a regular
// file, over the size limit or binary. A leading BOM is dropped.
function readText(abs) {
  let st;
  try { st = fs.lstatSync(abs); } catch { return null; }
  if (!st.isFile() || st.size > MAX_BYTES) return null;
  const buf = fs.readFileSync(abs);
  if (buf.subarray(0, SNIFF_BYTES).includes(0)) return null;
  const text = buf.toString('utf8');
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

const cpLength = (s) => Array.from(s).length;

// The offending line without its indentation, at most EXCERPT_MAX code
// points; long lines are windowed to start 20 code points before the hit.
function excerpt(line, at) {
  const cps = Array.from(line.replace(/[\u0000-\u001f\u007f]/g, ' '));
  let lead = 0;
  while (lead < cps.length && cps[lead] === ' ') lead++;
  const body = cps.slice(lead);
  const hit = Math.max(0, cpLength(line.slice(0, at)) - lead);
  const start = body.length > EXCERPT_MAX ? Math.max(0, Math.min(hit - 20, body.length - EXCERPT_MAX)) : 0;
  return body.slice(start, start + EXCERPT_MAX).join('').trimEnd();
}

// Maps UTF-16 offsets in a file to { line, lineText, at }.
function locator(text) {
  const starts = [0];
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    const end = lo + 1 < starts.length ? starts[lo + 1] - 1 : text.length;
    const lineText = text.slice(starts[lo], end).replace(/\r$/, '');
    return { line: lo + 1, lineText, at: offset - starts[lo] };
  };
}

function scan(root, { quiet = false } = {}) {
  // A path is listed once per stage during a merge conflict: keep the first.
  const tracked = [...new Set(git(root, ['ls-files', '-z']).split('\0').filter(Boolean))];
  const config = loadConfig(root, tracked);
  if (config.surfaces.some((s) => s.kind === 'ts')) loadTypeScript(root);
  if (!quiet) {
    for (const s of config.surfaces) {
      if (!tracked.some((p) => s.re.test(p) && !isSkipped(p))) {
        process.stderr.write(`copy-guard: warning: copy surface "${s.glob}" matches no tracked file\n`);
      }
    }
  }

  const violations = [];
  let scanned = 0;
  let dirtyFiles = 0;
  for (const p of tracked) {
    if (isSkipped(p)) continue;
    const text = readText(path.join(root, p));
    if (text === null) continue;
    scanned++;

    const found = [];
    const add = (rule, line, lineText, at) => {
      found.push({ path: p, line, col: cpLength(lineText.slice(0, at)) + 1, rule, excerpt: excerpt(lineText, at) });
    };
    const surface = config.surfaces.find((s) => s.re.test(p));
    const locate = locator(text);
    if (!config.pillExclude.some((re) => re.test(p))) {
      const spans = [];
      checkPill(text, add, spans);
      // The JSX pass: every file on a "ts" surface (test files included, as
      // for the rest of CHECK A) with an extension the parser accepts.
      if (surface && surface.kind === 'ts' && TS_SCRIPT_KINDS[path.extname(p).toLowerCase()]) {
        for (const hit of jsxPillHits(parseTs(text, p), text)) {
          if (spans.some((s) => s.rule === hit.rule && s.start <= hit.end && hit.start <= s.end)) continue;
          spans.push(hit);
          const { line, lineText, at } = locate(hit.start);
          add(hit.rule, line, lineText, at);
        }
      }
    }

    if (surface && !config.copyExclude.some((re) => re.test(p)) && !TEST_GLOBS.some((re) => re.test(p))) {
      for (const offset of DASH_EXTRACTORS[surface.kind](text, p)) {
        const { line, lineText, at } = locate(offset);
        add('DASH', line, lineText, at);
      }
    }

    if (found.length) {
      dirtyFiles++;
      found.sort((a, b) => a.line - b.line || a.col - b.col || (a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0));
      violations.push(...found);
    }
  }
  return { violations, scanned, dirtyFiles };
}

function report({ violations, scanned, dirtyFiles }) {
  const lines = violations.map((v) => `${v.path}:${v.line}:${v.col} ${v.rule} ${v.excerpt}`);
  lines.push(violations.length
    ? `copy-guard: ${violations.length} violation(s) in ${dirtyFiles} file(s)`
    : `copy-guard: clean (${scanned} files)`);
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Self-test: a throwaway git repo built from fixtures assembled at runtime.
// In a fixture, mark(RULE) sits exactly where a violation must be reported;
// files without marks must stay clean.
// ---------------------------------------------------------------------------

const MARK_OPEN = '\u27e6';
const MARK_CLOSE = '\u27e7';
const mark = (rule) => MARK_OPEN + rule + MARK_CLOSE;

function stripMarks(src) {
  const expected = [];
  const text = src.split('\n').map((raw, i) => {
    let out = '';
    let rest = raw;
    for (let k; (k = rest.indexOf(MARK_OPEN)) !== -1; ) {
      const close = rest.indexOf(MARK_CLOSE, k);
      out += rest.slice(0, k);
      expected.push({ line: i + 1, col: cpLength(out) + 1, rule: rest.slice(k + 1, close) });
      rest = rest.slice(close + 1);
    }
    return out + rest;
  }).join('\n');
  return { text, expected };
}

function fixtures() {
  const w = (...parts) => parts.join('');
  const EM = '\u2014';
  const EN = '\u2013';
  const [LA, CO, LI, NM, AL, AC, AV, DA] = RULE_IDS.map(mark);
  const enLaunch = w('Launch', 'ing soon');
  const enComing = w('Com', 'ing Soon');
  const enLive = w('Now', ' live');
  const eye = w('Eye', 'brow');
  const kick = w('kick', 'er');
  const soon = w('قري', 'باً'); // "soon", tanween written after the alef
  const soon2 = w('قري', 'بًا'); // "soon", tanween written before the alef
  const soonStretched = w('قريـ', 'ـبـاً'); // "soon" stretched with tatweel
  const now = 'الآن';
  const launchWord = w('Launch', 'ing');
  const comingWord = w('Com', 'ing');
  const enPre = w('Pre', '-launch');
  // Invisible format characters that normalise() deletes.
  const [RLM, ALM, ZWSP] = ['\u200F', '\u061C', '\u200B'];
  const [LRI, RLI, PDI] = ['\u2066', '\u2067', '\u2069'];
  // The launch noun with its hamza below written as a combining mark.
  const launchDecomposed = w('الا', '\u0655', 'طلاق');

  return [
    // --- skipped everywhere ---------------------------------------------
    ['CLAUDE.md', `NEVER add ${eye} pills such as "${enLaunch} · Amman" or ${w('متاح ', now)} ${EM} ever.`],
    ['README.md', `${enComing} ${EM}`],
    ['docs/guide.html', `<p>${enLive} ${EM}</p>`],
    ['package-lock.json', `{"x": "${enLaunch} ${EM}"}`],
    ['packages/web/yarn.lock', `"${kick}@1": "${EM}"`],
    ['pubspec.lock', `${eye}: "${EM}"`],
    ['assets/blob.bin', Buffer.concat([Buffer.from('PNG\0'), Buffer.from(enLaunch)])],
    ['assets/huge.txt', Buffer.from('a'.repeat(MAX_BYTES) + enLaunch)],
    ['src/deleted.ts', `export const x = "${enLaunch}";`, { deleteAfterAdd: true }],
    ['src/untracked.tsx', `export const x = <p>${enLaunch} ${EM}</p>;`, { untracked: true }],
    ['third_party/notes.txt', `${enComing} (vendor wording, quoted verbatim)`],
    ['public/licenses/LICENSE.txt', `Copyright ${EM} vendor`],
    ['scripts/build.sh', `echo "build ${EM} done"`],

    // --- CHECK A in places without copy rules ---------------------------
    ['src/components/NOTES.md', `Do not bring back the ${LI}${enLive} label ${EM} ever.`],
    ['src/CLAUDE.md', `Old component: ${NM}${eye}`],

    // --- ts ---------------------------------------------------------------
    ['src/components/Hero.tsx', [
      `// Comments may use dashes ${EM} they are not copy.`,
      `/* block ${EN} comment */`,
      `/** JSDoc ${EM} */`,
      'const sep = "\\u2014"; // escaped for a normaliser',
      `const dashes = /[\\u2013${EM}]/g;`,
      'export function Hero({ city }: { city: string }) {',
      '  return (',
      '    <section>',
      `      <span className="${NM}${kick}">${LA}${enLaunch} · Amman</span>`,
      `      <h1 title="Book ${DA}${EM} now">Skip the line ${DA}${EM} join</h1>`,
      `      <p>{\`Table for \${city} ${DA}${EM} tonight\`}</p>`,
      `      <p>{\`Head ${DA}${EM} \${city} middle ${DA}${EN} \${city} tail ${DA}${EM}\`}</p>`,
      `      <p>{'single ${DA}${EM}'}</p>`,
      `      <${NM}${eye} />`,
      `      <${NM}${w('Announcement', 'Pill')} text={\`${DA}${EM}\`} />`,
      '    </section>',
      '  );',
      '}',
      `export const ${NM}${w('hero', '_badge')} = "${LI}${w('now', ' live')}";`,
    ].join('\n')],
    ['src/__tests__/hero.test.tsx', [
      `// ${CO}${enComing.toLowerCase()} is banned inside tests too`,
      `it('renders', () => expect(text).toBe("a ${EM} b"));`,
    ].join('\n')],
    ['src/lib/util.spec.ts', `export const s = "x ${EM} y";`],
    ['e2e/home.spec.ts', `test('home', () => "x ${EM}");`],
    // Word joins written as escapes, entities or a JSX gap, on one line.
    ['src/components/Joins.tsx', [
      'export function Joins() {',
      '  return (',
      '    <div>',
      `      <span>${LA}${launchWord}&nbsp;soon · Amman</span>`,
      `      <span>${LA}${launchWord}&#160;soon</span>`,
      `      <span>${LA}${launchWord}&#xA0;soon</span>`,
      `      <span>${LA}${launchWord}{" "}soon</span>`,
      `      <span>{"${LA}${launchWord}\\u00a0soon"}</span>`,
      `      <span>{'${CO}${comingWord}\\xa0Soon'}</span>`,
      `      <span>${LA}${enPre} · Amman</span>`,
      `      <span>${LI}${w('Live', ' now')} · Amman</span>`,
      `      <span>${LI}${w('Now', '&nbsp;live')}</span>`,
      `      <span>{"${LI}${w('Now', '\\u00A0live')}"}</span>`,
      '      <span>The pre-launch offers stay open</span>',
      '    </div>',
      '  );',
      '}',
      `export const either = ${w('isPre', 'Launch')} || ${w('pre', 'Launch')}Done;`,
    ].join('\n')],
    // PILL-EN-LIVE also reads the words of camelCase and SNAKE_CASE names.
    ['src/lib/flags.ts', [
      `export const is${LI}${w('Now', 'Live')} = true;`,
      `export const show${LI}${w('Now', 'Live')} = true;`,
      `export const ${LI}${w('now', 'Live')} = true;`,
      `export const SHOW_${LI}${w('NOW', '_LIVE_PILL')} = true;`,
      `export const ${LI}${w('NOW', '_LIVE')} = 1;`,
      `export const ${LI}${w('NOW', '_LIVE_TEXT')} = 'x';`,
      `export const labels = { ${LI}${w('now', 'LiveLabel')}: 'x', flag: "${LI}${w('LIVE', '_NOW')}" };`,
      `export function ${LI}${w('Now', 'LiveBadge')}() { return null; }`,
      `export const ${w('known', 'Liveness')} = 1, ${w('snow', 'Live')} = 2, ${w('olive', 'Nowhere')} = 3;`,
      'export const negatives = ["She now lives here", "known live", "NOW LIVES", "unknown lively", "a snow-live cam", "olive nowhere"];',
    ].join('\n')],

    // --- ts: the JSX pass of CHECK A, dash entities in JSX for CHECK B -------
    ['src/components/Wrapped.tsx', [
      'export function Wrapped({ n }: { n: number }) {',
      '  return (',
      '    <section>',
      `      <p>${LA}${w('Launch', 'ing')}&nbsp;soon</p>`,
      `      <p>${LA}${w('Launch', 'ing')}{" "}soon</p>`,
      '      <p>',
      `        ${LA}${w('Launch', 'ing')}`,
      '        soon · Amman',
      '      </p>',
      `      <p>${CO}${w('Com', 'ing')}{" "}`,
      '        soon</p>',
      `      <p>${LI}${w('N', 'ow')}{" "}`,
      '        live</p>',
      `      <p>${AC}قادمة`,
      `        ${soon} للجميع</p>`,
      `      <img alt="${LA}${w('Launch', 'ing')}&#160;soon" title="Open&#xA0;now" />`,
      `      <p>${LA}${enLaunch}</p>`,
      `      <span${AC}>${soon}</span>`,
      '      <p>The navy band now{" "}',
      '        lives here</p>',
      '      <p>Book now</p><p>Live tables tonight</p>',
      `      <p>{n} ${soon}.</p>`,
      '      <StatusPill label="Open" />',
      '      <p>Fish &amp; chips{/* a comment */}</p>',
      `      <p>Alpha ${DA}&mdash; beta, 9${DA}&ndash;5, A ${DA}&#8212; B, C ${DA}&#x2014; D</p>`,
      `      <img alt="9${DA}&ndash;5" title="A ${DA}&mdash; B" />`,
      '      <p>{"a\\u2014b"} &middot; &#8213; &bogus;</p>',
      '    </section>',
      '  );',
      '}',
      'export const esc = "a\\u2014b";',
      'export const plain = "Alpha &mdash; beta, outside JSX";',
    ].join('\n')],

    // --- json ---------------------------------------------------------------
    ['src/i18n/en.json', [
      '{',
      `  "${NM}${eye.toLowerCase()}": "${LA}${enLaunch.toUpperCase()}",`,
      `  "${LA}${w('launch', 'ing_soon')}": "x",`,
      `  "live": "${LI}${w('now', '-live')}",`,
      `  "emoji": "\u{1F389} ${CO}${enComing}",`,
      `  "key ${EM}": "Join the queue ${DA}${EM} today ${DA}${EN}",`,
      '  "esc": "\\u2014 escaped",',
      `  "raw": "a backslash, then a real dash \\${DA}${EM}",`,
      `  "ascii": "${LI}${enLive}\u00e9 (ASCII word boundary: the accented letter is not a word character)",`,
      '  "neg1": "The navy character now lives only in the brand band",',
      '  "neg2": "announcement",',
      '  "neg3": "StatusPill",',
      '  "neg4": "badge count",',
      '  "neg5": "The waitlist now lives on the venue page"',
      '}',
    ].join('\n')],
    ['src/i18n/ar.json', [
      '{',
      `  "launch": "${AL}الإطلاق ${AC}${soon} · عمّان",`,
      `  "launch2": "${AL}سننطلق ${soon2}",`,
      `  "coming": "${AC}قادمة ${soon}",`,
      `  "coming2": "${AC}يأتي ${soonStretched}",`,
      `  "label": ${AC}"${soon}",`,
      `  "where": "${AC}${soon} في عمّان",`,
      `  "live": "${AV}متاح ${now}",`,
      `  "live2": "${AV}${now} متاحة",`,
      `  "live3": "${AV}انطلقنا ${now}",`,
      `  "dash": "انضم ${DA}${EM} وفّر وقتك",`,
      '  "wait": "صار متاح الانتظار بالدور من التطبيق",',
      '  "neg1": "سيؤكد المكان طاولتك قريبًا.",',
      '  "neg2": "معلم قريب (اختياري)",',
      '  "neg3": "مطلوبة أيضًا في وقت قريب"',
      '}',
    ].join('\n')],
    ['src/i18n/ar-more.json', [
      '{',
      `  "noun": "${AL}الانطلاق ${soon}، عمّان",`,
      `  "noun2": "${AL}انطلاق ${soon}",`,
      `  "decomposed": "${AL}${launchDecomposed} ${soon}",`,
      `  "entity": "${AL}الإطلاق&nbsp;${soon}",`,
      `  "before": "${AL}${w('قبل الإط', 'لاق · عمّان')}",`,
      `  "passive": "${AL}${w('يُطلَق ', soon2)}",`,
      `  "passive2": "Cue ${AL}${w('سيُطلق ', soon2)}",`,
      `  "passive3": "${AL}${w('ستُطلق ', soon2)}",`,
      `  "avail": "${AC}متاحاً ${soon}",`,
      `  "avail2": "سيكون Cue ${AC}${w('متاحًا ', soon2)}",`,
      `  "tuned": "${AC}${w('ترقبونا ', soon2)}",`,
      `  "wait": "${AC}${w('انتظرونا ', soon2)}",`,
      `  "after": "{city} ${AC}· ${soon2}",`,
      `  "bar": "عمّان ${AC}| ${soon2}",`,
      `  "slash": "${AC}${soon} / عمّان",`,
      `  "where": "${AC}${soon}&nbsp;في عمّان",`,
      `  "rlm": ${AC}"${RLM}${soon}",`,
      `  "live": "${AV}متاحاً ${now}",`,
      `  "live2": "${AV}متوفراً ${now}",`,
      `  "live3": "أصبح Cue ${AV}${w('متاحًا ', now)} في عمّان",`,
      `  "isolate": "${AV}متاح ${LRI}${now}${PDI}",`,
      '  "neg1": "انطلاقاً من خبرتنا في المطاعم",',
      '  "neg2": "الانطلاق في عمّان",',
      `  "neg3": "${w('قبل الإط', 'لاق بأسبوع')}",`,
      `  "neg4": "${soon} بخصوص حجزك",`,
      `  "neg5": "${w('تنتهي صلاحيته ', soon2)}، لذا",`,
      `  "neg6": "${w('احجز ', now, ' مباشرةً')}"`,
      '}',
    ].join('\n')],
    ['src/i18n/bom.json', `{"a": "x ${DA}${EM}"}`, { bom: true }],

    // --- arb ----------------------------------------------------------------
    ['lib/l10n/app_en.arb', [
      '{',
      `  "@@locale": "en ${EM}",`,
      `  "heroTitle": "Skip the queue ${DA}${EM} join Cue",`,
      '  "@heroTitle": {',
      `    "description": "Hero title ${EM} on onboarding",`,
      `    "placeholders": { "x": { "example": "a ${EM} b" } }`,
      '  },',
      `  "${NM}${eye.toLowerCase()}Label": "${LI}${enLive}",`,
      `  "esc1": "${CO}${comingWord}\\nsoon",`,
      `  "esc2": "${LA}${launchWord}\\r\\nsoon",`,
      `  "count": "{n, plural, =1{one ${DA}${EN} item} other{many}}"`,
      '}',
    ].join('\n')],
    ['lib/l10n/app_ar.arb', [
      '{',
      '  "@@locale": "ar",',
      `  "${NM}${w('hero', 'Badge')}": ${AC}"${soon}",`,
      '  "booking": "سيؤكد المكان طاولتك قريبًا."',
      '}',
    ].join('\n')],

    // --- dart ---------------------------------------------------------------
    ['lib/screens/onboarding.dart', [
      `/// Doc comment ${EM} is fine.`,
      `// Line comment ${EN} is fine.`,
      `/* outer /* nested ${EM} */ still a comment ${EM} */`,
      `class ${NM}${w('Hero', 'Badge')} extends StatelessWidget {`,
      `  final a = 'single ${DA}${EM} quote';`,
      `  final b = "double ${DA}${EM} it's";`,
      "  final c = '''triple",
      `${DA}${EM} second line''';`,
      `  final d = r'C:\\raw ${DA}${EM} $notInterpolated';`,
      `  final e = 'Hi \${name} ${DA}${EM} \${cond ? 'in ${DA}${EN}' : other /* ${EM} */} end';`,
      "  final f = '\\u2014 escaped';",
      `  final g = 'it\\'s ${DA}${EM}';`,
      `  final h = """multi \${x} ${DA}${EM}""";`,
      `  final k = 'backslash \\${DA}${EM} then a real dash';`,
      `  Widget build(c) => Chip(label: Text('${LA}${enLaunch}'));`,
      '}',
    ].join('\n')],
    ['test/widget_test.dart', `void main() { expect('a ${EM} b', isNotNull); }`],
    ['integration_test/app_test.dart', `final s = 'x ${EM}';`],
    ['test_driver/driver.dart', `final s = 'x ${EM}';`],
    ['lib/screens/onboarding_test.dart', `final s = 'x ${EM}';`],
    ['lib/names.dart', [
      `class ${NM}${w('Hero', 'Pill')} {}`,
      `class ${NM}${w('Launch', 'Pill')} {}`,
      `final a = ${NM}${w('Hero', 'Chip')}();`,
      `final b = ${NM}${w('Announcement', 'Badge')}();`,
      `final c = ${NM}${w('Announcement', 'Chip')}();`,
      "final fab = FloatingActionButton(heroTag: 'fab');", // an animation property, not a component name
      `final is${LI}${w('No', 'wLive')} = true;`,
      `const kBadge${LI}${w('No', 'wLive')} = 1;`,
      `const STATUS_${LI}${w('NOW', '_LIVE')} = 2;`,
      "final negatives = [knownLive, snowLive, nowLives, 'now lives'];",
    ].join('\n')],
    ['lib/escapes.dart', [
      `const e1 = '${LA}${launchWord}\\u00A0soon';`,
      `const e2 = '${CO}${comingWord}\\u{00A0}soon';`,
      `const e3 = '${CO}${comingWord}\\u{a0}soon';`,
      `const e4 = '${LA}${launchWord}\\t soon';`,
      `const e5 = '${comingWord}\\\\soon';`, // an escaped backslash is not a space
      `const e6 = '${CO}${comingWord}\\u{000a0}soon';`,
    ].join('\n')],
    ['lib/norm.dart', [
      `// ${NM}\u212Aicker uses the Kelvin sign, which NFC reads as K`,
      `// ${enLive.slice(0, 7)}e\u0301 stays clean: NFC composes the accent, so the word is not spelled out`,
      `// ${LI}${enLive}e\u0301 is caught: after a composed letter the ASCII \\b holds`,
      `// \u0130${LI}${enLive} is caught: JavaScript lower-cases the capital I with dot above to two characters`,
    ].join('\n')],

    // --- python -------------------------------------------------------------
    ['app/views.py', [
      `"""Module docstring ${EM} is not copy."""`,
      `# comment ${EM}`,
      'from x import name, cond',
      '',
      `TITLE = "Book now ${DA}${EM} skip the queue"`,
      `LABEL = f"Hi {name} ${DA}${EM} {'nested ${DA}${EN}' if cond else ''} {name!r:>10}"`,
      `RAW = r'raw ${DA}${EM}'`,
      'ESC = "\\u2014 escaped"',
      'MULTI = ("implicit "',
      `         "concat ${DA}${EM}")`,
      '',
      '',
      'class Hero:',
      `    '''Class docstring ${EM} is not copy.'''`,
      '',
      '    def title(self):',
      '        # a comment before the docstring',
      `        """Function docstring ${EM} is not copy."""`,
      `        return "${LA}${enLaunch}"`,
      '',
      `    async def other(self): "one-line docstring ${EM}"`,
      '',
      '    def body(self):',
      '        x = 1',
      `        "not a docstring ${DA}${EM}"`,
      '        return x',
      '',
      '',
      'def decorated(',
      '    a: int = 1,',
      ') -> str:',
      `    """Header split over lines ${EM}."""`,
      `    return f'''{a} ${DA}${EM} {{literal}}'''`,
      '',
      '',
      'def wrapped():',
      `    ("Parenthesised docstring ${EM}"`,
      '     " is still a docstring")',
      `    spec = f"{name:${DA}${EM}^9} {name!r:>{9}}"`,
      `    return "backslash \\${DA}${EM} then a real dash"`,
    ].join('\n')],
    ['app/cli.py', ['#!/usr/bin/env python3', '# -*- coding: utf-8 -*-', `"""Docstring after comments ${EM}."""`, 'X = 1'].join('\n')],
    ['app/fstring_first.py', `f"""Not a docstring {1} ${DA}${EM}"""`],
    ['tests/test_views.py', `S = "x ${EM}"`],
    ['app/conftest.py', `S = "x ${EM}"`],
    ['app/test_util.py', `S = "x ${EM}"`],

    // --- html ---------------------------------------------------------------
    ['public/ads/ad-1.html', [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      `  <title>Cue ${DA}${EM} book</title>`,
      `  <style>.x::after { content: "${EM}"; }</style>`,
      `  <STYLE>p { content: "${EN}" }</STYLE>`,
      `  <script>const s = "${EM}";</script>`,
      '</head>',
      '<body>',
      `  <!-- ${NM}${w('announcement', ' pill')} removed ${EM} -->`,
      `  <div class="${NM}${kick}">${LA}${enLaunch} &middot; Amman</div>`,
      `  <img alt="Queue ${DA}${EM} free" src="a.png">`,
      `  <p data-x='single ${DA}${EM}'>Text ${DA}${EM} node</p>`,
      `  <input value=Queue${DA}${EM}free>`,
      `  <span${AC}>${soon}</span>`,
      `  <p>${CO}${enComing}</p>`,
      `  <p>References count: ${DA}&mdash; ${DA}&ndash; ${DA}&#8212; ${DA}&#X2013; (not &#8213; or &bogus;)</p>`,
      `  <img alt="9${DA}&#x2013;5" title='a ${DA}&mdash; b' data-x=a${DA}&ndash;b>`,
      '  <!-- a comment &mdash; is not copy --><style>p::after { content: "&ndash;"; }</style>',
      '  {# a template comment &mdash; #}',
      `  <p>${LA}${launchWord}&nbsp;soon</p><p>${CO}${comingWord}&#160;soon</p><p>${CO}${comingWord}&#XA0;soon</p>`,
      `  <p>${LA}${launchWord}&#0160;soon</p><p>${CO}${comingWord}&#x00A0;soon</p>`,
      `  <span class="${NM}${w('hero', '-badge')}">x</span>`,
      `  {# template comment ${EM} #}`,
      '  {% comment %}',
      `  <p>Draft ${EM} copy</p>`,
      '  {% endcomment %}',
      `  <p>{{ price|default:"${DA}${EN}" }}</p>`,
      `  <script src="a.js" /><p>After a self-closing script ${DA}${EM}</p>`,
      '</body>',
      '</html>',
    ].join('\n')],

    // --- text ---------------------------------------------------------------
    ['public/manifest.txt', `Cue ${DA}${EM} tables\r\nsecond line ${DA}${EN}\r\nStatus${AC}: ${soon}\r\n`],
    ['public/long.txt', `${'x'.repeat(300)}${DA}${EM}${'y'.repeat(300)}`],
    ['public/indent.txt', `\t   ${'a'.repeat(100)}${DA}${EM}${'b'.repeat(10)}   `],
    ['public/escape.txt', `${LA}${launchWord}\\xa0soon\n`],
    // Not a copy surface: CHECK A only. Invisible format characters inside a
    // phrase, and an Arabic label closed by an em dash.
    ['notes/bidi.txt', [
      `x ${AC}${soon2}${RLM} · عمّان`,
      `x ${AC}${soon2}${ALM} · عمّان`,
      `x ${RLI}${AC}${soon2}${PDI} · عمّان`,
      `x ${LRI}${AC}${soon2}${PDI} | عمّان`,
      `${LA}${launchWord}${ZWSP}soon`,
      `${AC}'${soon2} ${EM} عمّان'`,
    ].join('\n')],
  ];
}

// Excerpts every implementation must print for these fixture lines.
const EXCERPT_CASES = [
  ['public/long.txt', `${'x'.repeat(20)}\u2014${'y'.repeat(59)}`],
  ['public/indent.txt', `${'a'.repeat(66)}\u2014${'b'.repeat(10)}`],
];

// Glob semantics shared by every implementation: [glob, path, matches].
const GLOB_CASES = [
  ['src/**/*.ts', 'src/a.ts', true],
  ['src/**/*.ts', 'src/a/b/c.ts', true],
  ['src/**.ts', 'src/a/b.ts', false], // "**" not followed by "/" is a plain "*"
  ['src/**', 'src/a/b.ts', true],
  ['src/**', 'src', false],
  ['**/*.md', 'README.md', true],
  ['*.md', 'lib/README.md', false],
  ['*.txt', '.hidden.txt', true],
  ['lib/{a,b/{c,d}}/*.dart', 'lib/b/d/x.dart', true],
  ['lib/{a,b}/*.dart', 'lib/c/x.dart', false],
  ['assets/[!x]?.json', 'assets/ab.json', true],
  ['assets/[!x]?.json', 'assets/xb.json', false],
  ['a*b/**', 'a/b/c', false],
  ['Src/*.ts', 'src/a.ts', false],
];

const SELF_TEST_CONFIG = {
  $comment: 'copy-guard self-test fixture',
  pillExclude: [{ glob: 'third_party/*.txt', why: 'vendored third-party notes, quoted verbatim' }],
  copySurfaces: [
    { glob: '{src,e2e,scripts}/**/*.{ts,tsx,mjs}', kind: 'ts' },
    { glob: 'src/i18n/*.json', kind: 'json' },
    { glob: 'lib/l10n/*.arb', kind: 'arb' },
    { glob: '**/*.dart', kind: 'dart' },
    { glob: '**/*.py', kind: 'python' },
    { glob: 'public/**/*.html', kind: 'html' },
    { glob: 'public/**/*.txt', kind: 'text' },
  ],
  copyExclude: [{ glob: 'public/licenses/*.txt', why: 'third-party license text, reproduced verbatim' }],
};

function selfTest() {
  loadTypeScript(process.cwd()); // the fixture repo has no node_modules of its own
  const failures = [];
  let checks = 0;
  const check = (ok, message) => { checks++; if (!ok) failures.push(message); };
  const gitQuiet = (cwd, args) => git(cwd, ['-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false', ...args]);
  const cli = (cwd, args = []) => spawnSync(process.execPath, [SELF, ...args], {
    cwd, encoding: 'utf8', windowsHide: true, env: { ...process.env, GUARD_TS_DIR: loadedTs.dir },
  });

  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-guard-selftest-'));
  try {
    gitQuiet(repo, ['-c', 'init.defaultBranch=main', 'init', '-q']);
    const expected = [];
    const marked = new Set();
    const later = [];
    const files = [...fixtures(), ['copy-guard.config.json', JSON.stringify(SELF_TEST_CONFIG, null, 2) + '\n']];
    for (const [rel, body, opts = {}] of files) {
      const abs = path.join(repo, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      if (opts.untracked) { later.push([abs, body]); continue; }
      if (Buffer.isBuffer(body)) { fs.writeFileSync(abs, body); continue; }
      const { text, expected: hits } = stripMarks(body);
      fs.writeFileSync(abs, (opts.bom ? '\uFEFF' : '') + text);
      for (const h of hits) expected.push(`${rel}:${h.line}:${h.col} ${h.rule}`);
      if (hits.length) marked.add(rel);
      if (opts.deleteAfterAdd) later.push([abs, null]);
    }
    // The guard's own source must pass both checks (no self-exclusion).
    fs.mkdirSync(path.join(repo, 'scripts'), { recursive: true });
    fs.copyFileSync(SELF, path.join(repo, 'scripts', 'copy-guard.mjs'));
    gitQuiet(repo, ['add', '-A']);
    for (const [abs, body] of later) {
      if (body === null) fs.unlinkSync(abs);
      else fs.writeFileSync(abs, stripMarks(body).text);
    }

    // 1. The real scan reports exactly the marked positions, nothing else.
    const result = scan(repo, { quiet: true });
    const actual = result.violations.map((v) => `${v.path}:${v.line}:${v.col} ${v.rule}`);
    const missing = expected.filter((e) => !actual.includes(e));
    const extra = actual.filter((a) => !expected.includes(a));
    check(missing.length === 0, `expected violations not reported:\n    ${missing.join('\n    ')}`);
    check(extra.length === 0, `unexpected violations (negative cases must stay clean):\n    ${extra.join('\n    ')}`);
    check(actual.length === expected.length, `reported ${actual.length} violations, expected ${expected.length}`);

    // 2. Every rule fires, and DASH fires for every copy kind.
    for (const rule of RULE_IDS) check(actual.some((a) => a.endsWith(` ${rule}`)), `rule ${rule} never fired`);
    const kindOf = (p) => SELF_TEST_CONFIG.copySurfaces.find((s) => globToRegExp(s.glob).test(p))?.kind;
    for (const kind of KINDS) {
      check(result.violations.some((v) => v.rule === 'DASH' && kindOf(v.path) === kind), `DASH never fired for kind ${kind}`);
    }

    // 3. Excerpts are capped and exact; globs behave as in every other implementation.
    for (const v of result.violations) check(cpLength(v.excerpt) <= EXCERPT_MAX, `excerpt over ${EXCERPT_MAX} code points: ${v.path}:${v.line}`);
    for (const [file, want] of EXCERPT_CASES) {
      const got = result.violations.find((v) => v.path === file)?.excerpt;
      check(got === want, `excerpt for ${file} was "${got}", expected "${want}"`);
    }
    for (const [glob, p, want] of GLOB_CASES) check(globToRegExp(glob).test(p) === want, `glob "${glob}" on "${p}" should be ${want}`);

    // 4. Config validation.
    const tracked = ['src/a.ts', 'notes.txt', 'src/i18n/en.json'];
    const bad = [
      [{ pillExclude: [{ glob: 'notes.txt' }] }, 'needs a "why"'],
      [{ pillExclude: ['notes.txt'] }, 'needs a "glob"'],
      [{ copyExclude: [{ glob: 'src/**', why: 'too broad' }] }, 'would hide'],
      [{ pillExclude: [{ glob: '**/en.json', why: 'locale' }] }, 'would hide'],
      [{ copySurfaces: [{ glob: 'src/**', kind: 'yaml' }] }, 'kind'],
      [{ copySurfaces: [{ glob: 'src/{a,b', kind: 'text' }] }, 'unbalanced'],
      [{ copySurface: [] }, 'unknown key'],
    ];
    for (const [cfg, needle] of bad) {
      let message = '';
      try { compileConfig(cfg, tracked); } catch (err) { message = err instanceof UsageError ? err.message : `non-usage error ${err}`; }
      check(message.includes(needle), `config ${JSON.stringify(cfg)} should fail with "${needle}", got "${message}"`);
    }
    try {
      compileConfig({ pillExclude: [{ glob: 'notes.txt', why: 'vendored notes' }] }, tracked);
      checks++;
    } catch (err) {
      check(false, `a valid exclude was rejected: ${err.message}`);
    }

    // 5. The CLI: violations exit 1 with the summary, bad usage exits 2,
    //    and removing the offending files makes it exit 0.
    const dirty = cli(repo);
    const out = dirty.stdout.trimEnd().split('\n');
    check(dirty.status === 1, `CLI on the fixture repo exited ${dirty.status}, expected 1 (${dirty.stderr.trim()})`);
    check(out[out.length - 1] === `copy-guard: ${expected.length} violation(s) in ${marked.size} file(s)`, `CLI summary was "${out[out.length - 1]}"`);
    check(out.slice(0, -1).every((l) => /^\S+:\d+:\d+ (?:PILL-[A-Z-]+|DASH) /.test(l)), 'CLI violation lines must read "<path>:<line>:<col> <RULE> <excerpt>"');
    check(cli(repo, ['--bogus']).status === 2, 'an unknown argument must exit 2');
    for (const rel of marked) fs.unlinkSync(path.join(repo, rel));
    gitQuiet(repo, ['add', '-u']); // stage the deletions; the untracked fixture stays untracked
    const clean = cli(repo);
    check(clean.status === 0, `CLI after removing the violations exited ${clean.status}, expected 0:\n${clean.stdout}${clean.stderr}`);
    check(/^copy-guard: clean \(\d+ files\)$/.test(clean.stdout.trim()), `CLI clean summary was "${clean.stdout.trim()}"`);
  } finally {
    if (failures.length === 0) fs.rmSync(repo, { recursive: true, force: true, maxRetries: 3 });
  }

  if (failures.length) {
    process.stdout.write(`copy-guard self-test: FAIL (${failures.length} of ${checks} checks)\n  ${failures.join('\n  ')}\n  fixture repo kept at ${repo}\n`);
    return 1;
  }
  process.stdout.write(`copy-guard self-test: PASS (${checks} checks)\n`);
  return 0;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(argv) {
  if (argv.length === 1 && argv[0] === '--self-test') return selfTest();
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) {
    process.stdout.write(USAGE + '\n');
    return 0;
  }
  if (argv.length) throw new UsageError(`unknown argument "${argv[0]}"\n${USAGE}`);
  const root = process.cwd();
  const prefix = git(root, ['rev-parse', '--show-prefix']).trim();
  if (prefix) throw new UsageError(`run copy-guard from the repository root, not from ${prefix}`);
  const result = scan(root);
  process.stdout.write(report(result));
  return result.violations.length ? 1 : 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  process.stderr.write(err instanceof UsageError ? `copy-guard: ${err.message}\n` : `copy-guard: internal error: ${err.stack || err}\n`);
  process.exitCode = 2;
}
