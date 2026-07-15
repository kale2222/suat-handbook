# SUAT Campus Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-login, zero-API “资料检索版” campus assistant that lets students ask natural-language questions from any page and receive up to three traceable Markdown/PDF sources.

**Architecture:** A build-time Node pipeline converts repository-approved Markdown and PDF sources into a versioned static JSON index. A lazy-loaded browser service normalizes Chinese queries, expands SUAT-specific synonyms, ranks local chunks, and returns a typed result union to a persistent Docusaurus `@theme/Root` widget. The interface leaves a single service boundary for a future server-side AI answer layer while remaining fully usable without any API key.

**Tech Stack:** Docusaurus 3.10.1, React 19, TypeScript 6, Node.js 20+, Vitest, Testing Library, gray-matter, PDF.js (`pdfjs-dist`).

## Global Constraints

- Before implementation, invoke `superpowers:using-git-worktrees` and create branch `codex/suat-campus-assistant` from the latest `main` in an isolated worktree.
- On this macOS workspace, every `npm install` command MUST use the `arch -arm64` prefix.
- Do not stage, commit, or overwrite the user’s existing edits in `docs/校园生活/社团及书院兴趣小组.md` or the untracked `AGENTS.md`.
- First release has no login, database, Embedding, vector database, network search, multi-turn context, API key, model provider, remote logging, or answer cache.
- Knowledge sources are public repository Markdown plus explicitly allow-listed PDFs only.
- The browser must never receive or call a model-provider API key.
- Generated index data must be lazy-loaded only after the assistant is opened.
- Every successful result must contain a repository-controlled source URL; low-confidence queries must return `not_found`.
- Use TDD for each task: failing test, observed failure, minimal implementation, observed pass, then commit.

---

## Planned File Structure

```text
assistant/
├── eval-cases.json             # real-language retrieval acceptance cases
├── sources.json                # explicit PDF allow-list and source metadata
└── synonyms.json               # SUAT-specific colloquial query expansion
scripts/assistant/
├── build-index.mjs             # orchestration and deterministic JSON output
├── extract-markdown.mjs        # frontmatter, headings, MD/MDX cleanup
├── extract-pdf.mjs             # per-page PDF.js text extraction
└── __tests__/
    ├── build-index.test.ts
    ├── extract-markdown.test.ts
    └── extract-pdf.test.ts
src/lib/assistant/
├── schema.ts                   # shared index validation and public types
├── normalize.ts                # Chinese/Latin normalization and synonym expansion
├── search.ts                   # weighted local ranking and confidence gate
├── service.ts                  # lazy index fetch and typed local ask() interface
├── normalize.test.ts
├── search.test.ts
└── service.test.ts
src/components/CampusAssistant/
├── index.tsx                   # stateful launcher/panel controller
├── AssistantPanel.tsx          # accessible dialog and question form
├── ResultCard.tsx              # source-backed result rendering
├── styles.module.css           # responsive light/dark presentation
└── CampusAssistant.test.tsx
src/theme/Root.tsx              # global persistent widget mount
static/assistant/
└── knowledge-index.json        # generated and gitignored build artifact
vitest.config.ts                # node/jsdom test environments and aliases
```

---

### Task 1: Test Harness and Knowledge Contracts

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/lib/assistant/schema.ts`
- Create: `src/lib/assistant/schema.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: `KnowledgeIndex`, `KnowledgeSource`, `KnowledgeChunk`, `AssistantResult`, and `assertKnowledgeIndex(value)` used by every later task.

- [ ] **Step 1: Install explicit runtime and test dependencies with native arm64 npm**

Run:

```bash
arch -arm64 npm install gray-matter pdfjs-dist remove-markdown
arch -arm64 npm install --save-dev vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event
```

Expected: `package.json` and `package-lock.json` change; install exits 0 without an architecture mismatch.

- [ ] **Step 2: Add test scripts and Vitest configuration**

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:assistant": "vitest run scripts/assistant src/lib/assistant src/components/CampusAssistant"
```

Create `vitest.config.ts`:

```ts
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    clearMocks: true,
  },
});
```

- [ ] **Step 3: Write the failing schema tests**

Create `src/lib/assistant/schema.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {assertKnowledgeIndex} from './schema';

describe('assertKnowledgeIndex', () => {
  it('accepts a complete source-backed index', () => {
    expect(() =>
      assertKnowledgeIndex({
        version: 'abc123',
        sources: [{
          id: 'campus-card',
          kind: 'markdown',
          title: '校园卡补办',
          url: '/docs/办事指南/校园卡补办',
          sourceType: 'student',
          lastVerified: null,
          priority: 50,
          contributors: ['尹家欢'],
        }],
        chunks: [{
          id: 'campus-card#校园卡补办',
          sourceId: 'campus-card',
          heading: '校园卡补办',
          text: '校园卡丢失后可以前往指定地点补办。',
          keywords: ['校园卡', '补办'],
          anchor: '校园卡补办',
          page: null,
        }],
      }),
    ).not.toThrow();
  });

  it('rejects chunks whose source does not exist', () => {
    expect(() =>
      assertKnowledgeIndex({version: 'x', sources: [], chunks: [{sourceId: 'missing'}]}),
    ).toThrow(/missing source/i);
  });
});
```

- [ ] **Step 4: Run the schema test and observe the expected failure**

Run: `arch -arm64 npm test -- src/lib/assistant/schema.test.ts`

Expected: FAIL because `./schema` does not exist.

- [ ] **Step 5: Implement the public contracts and validation**

Create `src/lib/assistant/schema.ts` with these exported types and runtime checks:

```ts
export type SourceType = 'student' | 'official';
export type SourceKind = 'markdown' | 'pdf';

export interface KnowledgeSource {
  id: string;
  kind: SourceKind;
  title: string;
  url: string;
  sourceType: SourceType;
  lastVerified: string | null;
  priority: number;
  contributors: string[];
}

export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  heading: string;
  text: string;
  keywords: string[];
  anchor: string | null;
  page: number | null;
}

export interface KnowledgeIndex {
  version: string;
  sources: KnowledgeSource[];
  chunks: KnowledgeChunk[];
}

export type AssistantSourceResult = {
  source: KnowledgeSource;
  heading: string;
  snippet: string;
  score: number;
  anchor: string | null;
  page: number | null;
};

export type AssistantResult =
  | {kind: 'sources'; sources: AssistantSourceResult[]}
  | {kind: 'answer'; answer: string; sources: AssistantSourceResult[]}
  | {kind: 'not_found'; related: AssistantSourceResult[]}
  | {kind: 'error'; message: string};

export function assertKnowledgeIndex(value: unknown): asserts value is KnowledgeIndex {
  if (!value || typeof value !== 'object') throw new Error('Invalid knowledge index');
  const index = value as Partial<KnowledgeIndex>;
  if (typeof index.version !== 'string' || !Array.isArray(index.sources) || !Array.isArray(index.chunks)) {
    throw new Error('Invalid knowledge index shape');
  }
  const sourceIds = new Set(index.sources.map((source) => source.id));
  for (const chunk of index.chunks) {
    if (!sourceIds.has(chunk.sourceId)) throw new Error(`Chunk has missing source: ${chunk.sourceId}`);
  }
}
```

- [ ] **Step 6: Run the focused test and typecheck**

Run: `arch -arm64 npm test -- src/lib/assistant/schema.test.ts`

Expected: 2 tests PASS.

Run: `arch -arm64 npm run typecheck`

Expected: exit 0.

- [ ] **Step 7: Commit the contracts**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/assistant/schema.ts src/lib/assistant/schema.test.ts
git commit -m "test(assistant): establish knowledge contracts"
```

---

### Task 2: Build-Time Markdown and PDF Index

**Files:**
- Create: `assistant/sources.json`
- Create: `scripts/assistant/extract-markdown.mjs`
- Create: `scripts/assistant/extract-pdf.mjs`
- Create: `scripts/assistant/build-index.mjs`
- Create: `scripts/assistant/__tests__/extract-markdown.test.ts`
- Create: `scripts/assistant/__tests__/extract-pdf.test.ts`
- Create: `scripts/assistant/__tests__/build-index.test.ts`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Consumes: `KnowledgeIndex` JSON shape from Task 1.
- Produces: `extractMarkdown(filePath, docsRoot)`, `extractPdf(filePath, source, options)`, `buildKnowledgeIndex(options)`, and generated `/static/assistant/knowledge-index.json`.

- [ ] **Step 1: Create the explicit PDF allow-list**

Create `assistant/sources.json`:

```json
{
  "pdfs": [
    {"id":"eduroam-sop","path":"static/eduroam_SOP.pdf","title":"eduroam SOP","sourceType":"official","lastVerified":null,"priority":100},
    {"id":"campus-network-guide","path":"static/主校区校园网接入指南.pdf","title":"主校区校园网接入指南","sourceType":"official","lastVerified":null,"priority":100},
    {"id":"service-platform-guide","path":"static/深圳理工大学服务平台.pdf","title":"深圳理工大学服务平台","sourceType":"official","lastVerified":null,"priority":100},
    {"id":"zero-trust-vpn-guide","path":"static/零信任VPN操作指引.pdf","title":"零信任 VPN 操作指引","sourceType":"official","lastVerified":null,"priority":100}
  ]
}
```

`null` means the repository has not yet recorded a human verification date; do not fabricate one from file timestamps.

- [ ] **Step 2: Write failing extraction tests**

The Markdown test must create a temporary MDX fixture containing frontmatter, headings, a table, an image, an admonition, and JSX. Assert that `assistant_exclude: true` returns `null`, normal content produces Docusaurus-compatible URLs and heading IDs, and rendered text does not contain `<div>`, image paths, or frontmatter.

The PDF test must inject a fake `getDocument` implementation returning two pages. Assert that each output chunk contains the correct 1-based `page`, and that a fake PDF returning only whitespace produces `{chunks: [], warning: /no extractable text/i}`.

The build test must use temporary docs/source/output directories and assert that output contains only included Markdown plus allow-listed PDFs, with stable ordering and a content-derived `version`.

Use concrete tests following these bodies (split them into the three listed test files):

```ts
import path from 'node:path';
import {mkdtemp, readFile, rm, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {afterEach, describe, expect, it} from 'vitest';
import {extractMarkdown} from '../extract-markdown.mjs';
import {extractPdf} from '../extract-pdf.mjs';
import {buildKnowledgeIndex} from '../build-index.mjs';

const tempRoots: string[] = [];
async function tempRoot() {
  const root = await mkdtemp(path.join(tmpdir(), 'suat-assistant-'));
  tempRoots.push(root);
  return root;
}
afterEach(async () => Promise.all(tempRoots.splice(0).map((root) => rm(root, {recursive: true, force: true}))));

describe('extractMarkdown', () => {
  it('removes MDX presentation syntax and preserves heading metadata', async () => {
    const root = await tempRoot();
    const docs = path.join(root, 'docs');
    const file = path.join(docs, '办事指南', '测试.md');
    await mkdir(path.dirname(file), {recursive: true});
    await writeFile(file, `---\ncontributors: [小深]\nassistant_keywords: [办卡]\n---\n# 测试指南\n<div>\n![图](./x.webp)\n</div>\n## 办理流程\n:::info\n带校园卡前往窗口。\n:::\n| 地点 | 时间 |\n| --- | --- |\n| A栋 | 9:00 |`, 'utf8');
    const result = await extractMarkdown(file, docs);
    expect(result?.source.id).toBe('办事指南/测试');
    expect(result?.source.contributors).toEqual(['小深']);
    expect(result?.chunks.some((chunk) => chunk.anchor === '办理流程')).toBe(true);
    expect(result?.chunks.map((chunk) => chunk.text).join(' ')).not.toMatch(/<div>|x\.webp|contributors|:::/);
  });

  it('honors assistant_exclude', async () => {
    const root = await tempRoot();
    const docs = path.join(root, 'docs');
    const file = path.join(docs, 'excluded.md');
    await mkdir(docs, {recursive: true});
    await writeFile(file, '---\nassistant_exclude: true\n---\n# Secret', 'utf8');
    await expect(extractMarkdown(file, docs)).resolves.toBeNull();
  });
});

describe('extractPdf', () => {
  it('keeps 1-based page numbers from injectable PDF.js pages', async () => {
    const root = await tempRoot();
    const file = path.join(root, 'fixture.pdf');
    await writeFile(file, new Uint8Array([1, 2, 3]));
    const getDocumentImpl = () => ({promise: Promise.resolve({
      numPages: 2,
      getPage: async (page: number) => ({getTextContent: async () => ({items: [{str: `第${page}页内容`}]})}),
    })});
    const result = await extractPdf(file, {id:'pdf', path:'static/a.pdf', title:'A', sourceType:'official', lastVerified:null, priority:100}, {getDocumentImpl});
    expect(result.chunks.map((chunk) => chunk.page)).toEqual([1, 2]);
    expect(result.warning).toBeNull();
  });

  it('warns and excludes a textless PDF', async () => {
    const root = await tempRoot();
    const file = path.join(root, 'scan.pdf');
    await writeFile(file, new Uint8Array([1]));
    const getDocumentImpl = () => ({promise: Promise.resolve({numPages:1, getPage:async () => ({getTextContent:async () => ({items:[{str:'   '}]})})})});
    const result = await extractPdf(file, {id:'scan', path:'static/scan.pdf', title:'Scan', sourceType:'official', lastVerified:null, priority:100}, {getDocumentImpl});
    expect(result.chunks).toEqual([]);
    expect(result.warning).toMatch(/no extractable text/i);
  });
});

describe('buildKnowledgeIndex', () => {
  it('writes stable, source-backed JSON', async () => {
    const root = await tempRoot();
    const docsDir = path.join(root, 'docs');
    const outputFile = path.join(root, 'static/assistant/knowledge-index.json');
    const sourcesFile = path.join(root, 'assistant/sources.json');
    await mkdir(docsDir, {recursive:true});
    await mkdir(path.dirname(sourcesFile), {recursive:true});
    await writeFile(path.join(docsDir, 'a.md'), '# A\n校园卡补办。', 'utf8');
    await writeFile(sourcesFile, '{"pdfs":[]}', 'utf8');
    const first = await buildKnowledgeIndex({docsDir, sourcesFile, outputFile});
    const second = await buildKnowledgeIndex({docsDir, sourcesFile, outputFile});
    expect(second.version).toBe(first.version);
    expect(second.sources).toHaveLength(1);
    expect(JSON.parse(await readFile(outputFile, 'utf8')).chunks[0].sourceId).toBe('a');
  });
});
```

- [ ] **Step 3: Run extraction tests and observe the expected failures**

Run: `arch -arm64 npm test -- scripts/assistant/__tests__`

Expected: FAIL because the extraction modules do not exist.

- [ ] **Step 4: Implement Markdown extraction**

Implement `extractMarkdown(filePath, docsRoot)` using this complete structure with `gray-matter`, `remove-markdown`, and `createSlugger` from `@docusaurus/utils`:

```js
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import matter from 'gray-matter';
import removeMarkdown from 'remove-markdown';
import {createSlugger} from '@docusaurus/utils';

function asStrings(value) {
  if (Array.isArray(value)) return value.map(String);
  return value == null ? [] : [String(value)];
}

function cleanLine(line) {
  if (/^\s*(import|export)\s/.test(line)) return '';
  if (/^\s*:::+/.test(line)) return '';
  if (/^\s*!\[[^\]]*\]\([^)]*\)\s*$/.test(line)) return '';
  const withoutJsx = line.replace(/<[^>]+>/g, ' ');
  const withoutTableRule = /^\s*\|?[\s:|-]+\|?\s*$/.test(withoutJsx) ? '' : withoutJsx;
  return removeMarkdown(withoutTableRule).replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
}

function docIdentity(filePath, docsRoot) {
  const relative = path.relative(docsRoot, filePath).split(path.sep).join('/');
  const id = relative.replace(/\.mdx?$/, '');
  const routeId = id.endsWith('/index') ? id.slice(0, -'/index'.length) : id;
  return {id, url: `/docs/${routeId}${id.endsWith('/index') ? '/' : ''}`};
}

function splitText(text, limit = 600) {
  if (text.length <= limit) return [text];
  const sentences = text.split(/(?<=[。！？；])/);
  const parts = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > limit) {
      parts.push(current);
      current = '';
    }
    current += sentence;
  }
  if (current) parts.push(current);
  return parts.flatMap((part) => part.length <= limit
    ? [part]
    : Array.from({length: Math.ceil(part.length / limit)}, (_, i) => part.slice(i * limit, (i + 1) * limit)));
}

export async function extractMarkdown(filePath, docsRoot) {
  const raw = await readFile(filePath, 'utf8');
  const {data, content} = matter(raw);
  if (data.assistant_exclude === true) return null;

  const identity = docIdentity(filePath, docsRoot);
  const slugger = createSlugger();
  const keywords = asStrings(data.assistant_keywords);
  const contributors = asStrings(data.contributors);
  const source = {
    ...identity,
    kind: 'markdown',
    title: String(data.title ?? path.basename(identity.id)),
    sourceType: data.source_type === 'official' ? 'official' : 'student',
    lastVerified: data.last_verified == null ? null : String(data.last_verified),
    priority: 50,
    contributors,
  };

  const chunks = [];
  let heading = source.title;
  let anchor = null;
  let lines = [];
  const flush = () => {
    const text = lines.map(cleanLine).filter(Boolean).join(' ').trim();
    for (const part of splitText(text)) {
      chunks.push({
        id: `${source.id}#${anchor ?? 'top'}-${chunks.length}`,
        sourceId: source.id,
        heading,
        text: part,
        keywords,
        anchor,
        page: null,
      });
    }
    lines = [];
  };

  for (const line of content.split(/\r?\n/)) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) {
      flush();
      heading = cleanLine(match[2]);
      anchor = slugger.slug(heading);
    } else {
      lines.push(line);
    }
  }
  flush();
  return {source, chunks};
}
```

Route rules must be deterministic:

- `docs/办事指南/校园卡补办.md` → `/docs/办事指南/校园卡补办`
- `docs/办事指南/index.md` → `/docs/办事指南/`
- section URLs append `#${createSlugger().slug(heading)}`.

Markdown source IDs are the POSIX path relative to `docs/` without `.md` (for example `办事指南/校园卡补办`). Markdown priority defaults to 50, and contributors come from frontmatter or an empty array.

Strip HTML/JSX tags, image declarations, import/export lines, admonition fences, and layout-only table separators while retaining readable link labels and table cell text.

- [ ] **Step 5: Implement PDF extraction with an injectable PDF.js loader**

Implement `extractPdf` using `pdfjs-dist/legacy/build/pdf.mjs` and `getDocument({data: new Uint8Array(buffer)})`. Read pages sequentially, join `TextItem.str` values with spaces, normalize whitespace, and emit one or more chunks per page. Keep `getDocumentImpl` injectable so tests do not depend on binary fixtures.

```js
import {readFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function extractPdf(filePath, manifestSource, options = {}) {
  const getDocumentImpl = options.getDocumentImpl ?? getDocument;
  const data = new Uint8Array(await readFile(filePath));
  const pdf = await getDocumentImpl({data}).promise;
  const chunks = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item) => item && typeof item === 'object' && 'str' in item)
      .map((item) => String(item.str))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) {
      chunks.push({
        id: `${manifestSource.id}#page-${pageNumber}`,
        sourceId: manifestSource.id,
        heading: `第 ${pageNumber} 页`,
        text,
        keywords: [],
        anchor: null,
        page: pageNumber,
      });
    }
  }
  const source = {
    id: manifestSource.id,
    kind: 'pdf',
    title: manifestSource.title,
    url: `/${manifestSource.path.replace(/^static\//, '')}`,
    sourceType: manifestSource.sourceType,
    lastVerified: manifestSource.lastVerified,
    priority: manifestSource.priority,
    contributors: [],
  };
  return {
    source,
    chunks,
    warning: chunks.length === 0 ? `No extractable text: ${manifestSource.path}` : null,
  };
}
```

- [ ] **Step 6: Implement deterministic index orchestration**

`buildKnowledgeIndex` must:

1. recursively sort `docs/**/*.md` paths;
2. read only PDFs listed in `assistant/sources.json`;
3. fail for a missing allow-listed PDF and print warnings for textless PDFs without silently indexing them;
4. sort sources/chunks by stable ID;
5. compute `version` as the first 16 hex characters of SHA-256 over canonical sources/chunks JSON;
6. create the output directory and write UTF-8 pretty JSON.

Use this orchestration structure:

```js
import path from 'node:path';
import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {extractMarkdown} from './extract-markdown.mjs';
import {extractPdf} from './extract-pdf.mjs';

async function markdownFiles(dir) {
  const entries = await readdir(dir, {withFileTypes:true});
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return /\.mdx?$/.test(entry.name) ? [full] : [];
  }));
  return nested.flat().sort();
}

export async function buildKnowledgeIndex({
  docsDir,
  sourcesFile,
  outputFile,
  repoRoot = process.cwd(),
  extractPdfImpl = extractPdf,
}) {
  const manifest = JSON.parse(await readFile(sourcesFile, 'utf8'));
  if (!Array.isArray(manifest.pdfs)) throw new Error('assistant/sources.json must contain pdfs[]');
  const extractedMarkdown = (await Promise.all(
    (await markdownFiles(docsDir)).map((file) => extractMarkdown(file, docsDir)),
  )).filter(Boolean);
  const extractedPdfs = [];
  for (const pdfSource of manifest.pdfs) {
    const result = await extractPdfImpl(path.resolve(repoRoot, pdfSource.path), pdfSource);
    if (result.warning) console.warn(result.warning);
    if (result.chunks.length > 0) extractedPdfs.push(result);
  }
  const extracted = [...extractedMarkdown, ...extractedPdfs];
  const sources = extracted.map((item) => item.source).sort((a, b) => a.id.localeCompare(b.id));
  const chunks = extracted.flatMap((item) => item.chunks).sort((a, b) => a.id.localeCompare(b.id));
  const canonical = JSON.stringify({sources, chunks});
  const version = createHash('sha256').update(canonical).digest('hex').slice(0, 16);
  const index = {version, sources, chunks};
  await mkdir(path.dirname(outputFile), {recursive:true});
  await writeFile(outputFile, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return index;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  await buildKnowledgeIndex({
    docsDir:path.resolve('docs'),
    sourcesFile:path.resolve('assistant/sources.json'),
    outputFile:path.resolve('static/assistant/knowledge-index.json'),
  });
}
```

- [ ] **Step 7: Wire generation into local and production builds**

Add to `.gitignore`:

```gitignore
/static/assistant/knowledge-index.json
```

Add to `package.json` scripts:

```json
"assistant:index": "node scripts/assistant/build-index.mjs",
"prestart": "npm run assistant:index",
"prebuild": "npm run assistant:index"
```

The CLI entry point must call the builder with repository paths and exit non-zero for invalid manifests or Markdown parsing errors.

- [ ] **Step 8: Run tests and build the real repository index**

Run: `arch -arm64 npm test -- scripts/assistant/__tests__`

Expected: extraction and build tests PASS.

Run: `arch -arm64 npm run assistant:index`

Expected: exit 0, an index is written, and every textless PDF is named in a warning.

Run: `node -e "const i=require('./static/assistant/knowledge-index.json'); console.log(i.sources.length, i.chunks.length, i.version)"`

Expected: non-zero source/chunk counts and a 16-character version.

- [ ] **Step 9: Commit the index pipeline**

```bash
git add .gitignore package.json package-lock.json assistant/sources.json scripts/assistant
git commit -m "feat(assistant): build repository knowledge index"
```

---

### Task 3: Chinese Query Normalization, Ranking, and Evaluation

**Files:**
- Create: `assistant/synonyms.json`
- Create: `assistant/eval-cases.json`
- Create: `src/lib/assistant/normalize.ts`
- Create: `src/lib/assistant/normalize.test.ts`
- Create: `src/lib/assistant/search.ts`
- Create: `src/lib/assistant/search.test.ts`
- Create: `scripts/assistant/__tests__/evaluation.test.ts`

**Interfaces:**
- Consumes: `KnowledgeIndex` and `KnowledgeChunk` from Task 1; generated index from Task 2.
- Produces: `normalizeQuery(query)`, `expandQuery(query, synonyms)`, and `searchKnowledge(index, query, options)`.

- [ ] **Step 1: Add the initial SUAT synonym dictionary**

Create `assistant/synonyms.json` with bidirectional groups:

```json
{
  "groups": [
    ["校园卡丢了", "卡掉了", "补卡", "校园卡补办"],
    ["宿舍没电", "交电费", "充电费", "电费缴纳"],
    ["校园网挂了", "连不上网", "eduram", "eduroam", "校园网"],
    ["取快递", "菜鸟驿站", "快递站", "校园快递"],
    ["约场地", "约体育馆", "体适能", "体育场馆预约"],
    ["心理咨询", "心理中心", "情绪求助", "心理资源"],
    ["看病", "医保选点", "校医室", "校医院"],
    ["吃什么", "食堂", "干饭", "美食"],
    ["分专业", "选专业", "专业分流"],
    ["进实验室", "做科研", "科研轮转"],
    ["学校公众号", "官方账号", "融媒体矩阵"]
  ]
}
```

- [ ] **Step 2: Write failing normalization and ranking tests**

Tests must prove:

- full-width Latin letters normalize to lowercase ASCII;
- punctuation and repeated whitespace do not affect matching;
- `eduram` expands to the campus-network group;
- title matches outrank body-only matches;
- `assistant_keywords` outrank body-only matches;
- current-path boost cannot make a result with less than 90% of the leading score become first;
- clearly unrelated input returns `{confident: false, results: []}`;
- at most three sources are returned and duplicate chunks from one source collapse to its best result.

Use these concrete test cases; helper `makeIndex` creates valid sources/chunks with unique IDs and default `priority: 50`, `contributors: []`, `lastVerified: null`, `anchor: null`, and `page: null`:

```ts
import {describe, expect, it} from 'vitest';
import synonyms from '../../../assistant/synonyms.json';
import {expandQuery, normalizeQuery} from './normalize';
import {searchKnowledge} from './search';

function makeIndex(rows: Array<{id:string; title:string; heading:string; text:string; keywords:string[]}>) {
  const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
  return {
    version: 'test',
    sources: unique.map((row) => ({
      id: row.id,
      kind: 'markdown' as const,
      title: row.title,
      url: `/docs/${row.id}`,
      sourceType: 'student' as const,
      lastVerified: null,
      priority: 50,
      contributors: [],
    })),
    chunks: rows.map((row, index) => ({
      id: `${row.id}-${index}`,
      sourceId: row.id,
      heading: row.heading,
      text: row.text,
      keywords: row.keywords,
      anchor: null,
      page: null,
    })),
  };
}

describe('query normalization', () => {
  it('normalizes width, case, punctuation, and whitespace', () => {
    expect(normalizeQuery('  ＥＤＵＲＯＡＭ， 怎么连？ ')).toBe('eduroam 怎么连');
  });
  it('expands a matched campus synonym group', () => {
    expect(expandQuery('eduram 连不上', synonyms)).toContain('校园网');
  });
});

describe('searchKnowledge', () => {
  it('ranks title and keywords above body-only matches', () => {
    const index = makeIndex([
      {id:'title', title:'校园卡补办', heading:'办理', text:'前往窗口', keywords:[]},
      {id:'keyword', title:'办事', heading:'说明', text:'前往窗口', keywords:['校园卡补办']},
      {id:'body', title:'其他', heading:'说明', text:'校园卡补办', keywords:[]},
    ]);
    const outcome = searchKnowledge(index, '校园卡补办', {currentPath:'/', synonyms});
    expect(outcome.results.map((item) => item.source.id)).toEqual(['title', 'keyword', 'body']);
  });

  it('uses current path only as a near-score tie-break', () => {
    const index = makeIndex([
      {id:'strong', title:'校园卡补办', heading:'补办', text:'校园卡', keywords:[]},
      {id:'weak', title:'校园生活', heading:'卡片', text:'卡', keywords:[]},
    ]);
    const outcome = searchKnowledge(index, '校园卡补办', {currentPath:'/docs/weak', synonyms});
    expect(outcome.results[0].source.id).toBe('strong');
  });

  it('deduplicates sources, limits three, and rejects unrelated input', () => {
    const index = makeIndex([
      {id:'a', title:'电费', heading:'一', text:'缴费', keywords:[]},
      {id:'a', title:'电费', heading:'二', text:'宿舍电费', keywords:[]},
      {id:'b', title:'缴费', heading:'B', text:'电费', keywords:[]},
      {id:'c', title:'宿舍', heading:'C', text:'电费', keywords:[]},
      {id:'d', title:'电费说明', heading:'D', text:'缴费', keywords:[]},
    ]);
    expect(searchKnowledge(index, '宿舍电费', {currentPath:'/', synonyms}).results).toHaveLength(3);
    expect(searchKnowledge(index, '火星天气', {currentPath:'/', synonyms})).toEqual({confident:false, results:[]});
  });
});
```

- [ ] **Step 3: Run focused tests and observe the expected failure**

Run: `arch -arm64 npm test -- src/lib/assistant/normalize.test.ts src/lib/assistant/search.test.ts`

Expected: FAIL because normalization/search functions do not exist.

- [ ] **Step 4: Implement deterministic normalization and expansion**

`normalizeQuery` must apply Unicode NFKC normalization, lowercase Latin text, replace punctuation with spaces, collapse whitespace, and trim. `expandQuery` must return the normalized query plus every member of a synonym group whose member appears in the query.

Export the shared synonym type:

```ts
export interface SynonymConfig {
  groups: string[][];
}
```

Use this implementation:

```ts
export interface SynonymConfig {
  groups: string[][];
}

export function normalizeQuery(query: string): string {
  return query
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{Script=Han}a-z0-9]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function expandQuery(query: string, config: SynonymConfig): string[] {
  const normalized = normalizeQuery(query);
  const expanded = new Set([normalized]);
  for (const group of config.groups) {
    if (group.some((term) => normalized.includes(normalizeQuery(term)))) {
      group.forEach((term) => expanded.add(normalizeQuery(term)));
    }
  }
  return [...expanded].filter(Boolean);
}
```

- [ ] **Step 5: Implement weighted ranking and confidence gating**

Implement these baseline weights, kept as named constants:

```ts
const TITLE_WEIGHT = 8;
const HEADING_WEIGHT = 6;
const KEYWORD_WEIGHT = 5;
const BODY_WEIGHT = 1;
const CURRENT_PATH_TIE_BREAK = 0.25;
const MIN_CONFIDENCE = 5;
```

Tokenize Latin words plus Chinese unigrams/bigrams. Score unique query terms against normalized title, heading, keywords, and body. Apply the current-path bonus only when the candidate score is at least 90% of the unboosted leading score. Collapse chunks by source ID, retain the best snippet/page, sort by score then stable source ID, and return at most three results.

Use this exact return contract so weak-but-related results can be shown without pretending they are answers:

```ts
export interface SearchOutcome {
  confident: boolean;
  results: AssistantSourceResult[];
}

export function searchKnowledge(
  index: KnowledgeIndex,
  query: string,
  options: {currentPath: string; synonyms: SynonymConfig},
): SearchOutcome;
```

If the top score is below `MIN_CONFIDENCE`, set `confident: false`; keep up to three positive-score results in `results` as related pages. If every score is zero, return an empty `results` array. Source `priority` is only a final tie-break after relevance score and freshness; it must not turn an irrelevant official PDF into a confident result.

Implement `search.ts` with this complete scoring shape:

```ts
import type {AssistantSourceResult, KnowledgeIndex} from './schema';
import {expandQuery, normalizeQuery, type SynonymConfig} from './normalize';

const TITLE_WEIGHT = 8;
const HEADING_WEIGHT = 6;
const KEYWORD_WEIGHT = 5;
const BODY_WEIGHT = 1;
const CURRENT_PATH_TIE_BREAK = 0.25;
const MIN_CONFIDENCE = 5;

function queryTerms(values: string[]): string[] {
  const terms = new Set<string>();
  for (const value of values) {
    const normalized = normalizeQuery(value);
    normalized.match(/[a-z0-9]+/g)?.forEach((term) => terms.add(term));
    normalized.match(/[\p{Script=Han}]+/gu)?.forEach((run) => {
      if (run.length <= 4) terms.add(run);
      for (let i = 0; i < run.length - 1; i += 1) terms.add(run.slice(i, i + 2));
    });
  }
  return [...terms];
}

function dateValue(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export interface SearchOutcome {
  confident: boolean;
  results: AssistantSourceResult[];
}

export function searchKnowledge(
  index: KnowledgeIndex,
  query: string,
  options: {currentPath: string; synonyms: SynonymConfig},
): SearchOutcome {
  const terms = queryTerms(expandQuery(query, options.synonyms));
  const sources = new Map(index.sources.map((source) => [source.id, source]));
  const candidates = index.chunks.flatMap((chunk) => {
    const source = sources.get(chunk.sourceId);
    if (!source) return [];
    const title = normalizeQuery(source.title);
    const heading = normalizeQuery(chunk.heading);
    const keywords = normalizeQuery(chunk.keywords.join(' '));
    const body = normalizeQuery(chunk.text);
    const score = terms.reduce((total, term) => total
      + (title.includes(term) ? TITLE_WEIGHT : 0)
      + (heading.includes(term) ? HEADING_WEIGHT : 0)
      + (keywords.includes(term) ? KEYWORD_WEIGHT : 0)
      + (body.includes(term) ? BODY_WEIGHT : 0), 0);
    if (score === 0) return [];
    return [{source, heading:chunk.heading, snippet:chunk.text.slice(0, 180), score, anchor:chunk.anchor, page:chunk.page}];
  });
  const bestBySource = new Map<string, AssistantSourceResult>();
  for (const candidate of candidates) {
    const previous = bestBySource.get(candidate.source.id);
    if (!previous || candidate.score > previous.score) bestBySource.set(candidate.source.id, candidate);
  }
  const ranked = [...bestBySource.values()].sort((a, b) =>
    b.score - a.score
    || dateValue(b.source.lastVerified) - dateValue(a.source.lastVerified)
    || b.source.priority - a.source.priority
    || a.source.id.localeCompare(b.source.id));
  const leading = ranked[0]?.score ?? 0;
  for (const candidate of ranked) {
    if (candidate.source.url === options.currentPath && candidate.score >= leading * 0.9) {
      candidate.score += CURRENT_PATH_TIE_BREAK;
    }
  }
  ranked.sort((a, b) => b.score - a.score || a.source.id.localeCompare(b.source.id));
  return {confident: leading >= MIN_CONFIDENCE, results:ranked.slice(0, 3)};
}
```

- [ ] **Step 6: Add the retrieval acceptance corpus**

Create at least these 30 cases in `assistant/eval-cases.json`:

```json
[
  {"query":"校园卡丢了怎么办","expected":"办事指南/校园卡补办"},
  {"query":"我的卡掉了去哪里补","expected":"办事指南/校园卡补办"},
  {"query":"宿舍突然没电了","expected":"办事指南/电费缴纳"},
  {"query":"在哪里交电费","expected":"办事指南/电费缴纳"},
  {"query":"eduroam 怎么连","expected":"办事指南/校园网及eduroam连接"},
  {"query":"校园网挂了怎么办","expected":"办事指南/校园网及eduroam连接"},
  {"query":"快递去哪里拿","expected":"办事指南/校园快递指南"},
  {"query":"菜鸟驿站在哪里","expected":"办事指南/校园快递指南"},
  {"query":"怎么预约体育馆","expected":"办事指南/体育场馆预约"},
  {"query":"学校哪里可以打印","expected":"办事指南/打印指南"},
  {"query":"绩点怎么算","expected":"学业指南/绩点换算方式"},
  {"query":"本科什么时候分专业","expected":"学业指南/深理工本科专业分流指南"},
  {"query":"本科生怎么进实验室做科研","expected":"学业指南/本科-科研轮转指南"},
  {"query":"硕博联合培养是什么","expected":"学业指南/深圳理工大学硕博联合培养指南"},
  {"query":"零信任 vpn 怎么用","expected":"学业指南/零信任VPN操作指引"},
  {"query":"学校有哪些社团","expected":"校园生活/社团及书院兴趣小组"},
  {"query":"我想找心理咨询","expected":"校园生活/深理工心理资源"},
  {"query":"校医院几点开门","expected":"校园生活/校医院及医保相关"},
  {"query":"深圳医保怎么选点","expected":"校园生活/校医院及医保相关"},
  {"query":"食堂有什么好吃的","expected":"校园生活/深理工干饭指南"},
  {"query":"校园里的猫猫","expected":"校园生活/SUAT猫猫手册"},
  {"query":"军训要准备什么","expected":"新生指南/军训攻略"},
  {"query":"大学基础课怎么学","expected":"新生指南/大学基础课学习"},
  {"query":"新生自我介绍怎么说","expected":"新生指南/新生自我介绍指南"},
  {"query":"哪里看学校地图","expected":"深理工手册/深理工地图"},
  {"query":"学校官方公众号有哪些","expected":"深理工手册/融媒体矩阵"},
  {"query":"统一身份认证入口","expected":"办事指南/深圳理工大学服务平台"},
  {"query":"GK23 的时间表","expected":"办事指南/GK23时间表"},
  {"query":"今天深圳天气怎么样","expected":null},
  {"query":"帮我写一段 Python 代码","expected":null}
]
```

- [ ] **Step 7: Add and run the end-to-end retrieval evaluation**

The evaluation test must build the real index in a temporary output path, run every case, count expected sources appearing in top three, assert answerable accuracy `>= 0.9`, and assert every `expected: null` case returns `confident: false`.

Run: `arch -arm64 npm test -- scripts/assistant/__tests__/evaluation.test.ts`

Expected: PASS with logged answerable accuracy at or above 90% and 0 false-positive negative cases. If it fails, adjust named weights/synonyms—not individual hard-coded query answers—until it passes.

- [ ] **Step 8: Commit retrieval and evaluation**

```bash
git add assistant/synonyms.json assistant/eval-cases.json src/lib/assistant scripts/assistant/__tests__/evaluation.test.ts
git commit -m "feat(assistant): add Chinese handbook retrieval"
```

---

### Task 4: Lazy Local Assistant Service

**Files:**
- Create: `src/lib/assistant/service.ts`
- Create: `src/lib/assistant/service.test.ts`

**Interfaces:**
- Consumes: `assertKnowledgeIndex`, `AssistantResult`, and `searchKnowledge` from Tasks 1 and 3.
- Produces: `AssistantService` and `createLocalAssistantService({indexUrl, fetchImpl, synonyms})`.

- [ ] **Step 1: Write failing service tests**

Tests must assert:

1. constructing the service performs no fetch;
2. `preload()` fetches the index exactly once across repeated calls;
3. `ask(question, currentPath)` returns `{kind: 'sources'}` for confident matches;
4. low-confidence queries return `{kind: 'not_found', related: outcome.results}`;
5. non-OK HTTP responses and invalid JSON return `{kind: 'error', message: '资料索引暂时无法加载'}`;
6. a 201-character query returns an error without fetching.

Implement the tests with a valid one-source index and injected fetch mock:

```ts
import {describe, expect, it, vi} from 'vitest';
import {createLocalAssistantService} from './service';

const index = {
  version: 'test',
  sources: [{id:'card', kind:'markdown' as const, title:'校园卡补办', url:'/docs/card', sourceType:'student' as const, lastVerified:null, priority:50, contributors:[]}],
  chunks: [{id:'card-1', sourceId:'card', heading:'校园卡补办', text:'校园卡丢失后办理补卡。', keywords:['补卡'], anchor:'校园卡补办', page:null}],
};
const synonyms = {groups:[['卡掉了', '校园卡补办']]};

describe('createLocalAssistantService', () => {
  it('is lazy and memoizes its first successful fetch', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(index), {status:200}));
    const service = createLocalAssistantService({indexUrl:'/assistant/index.json', fetchImpl, synonyms});
    expect(fetchImpl).not.toHaveBeenCalled();
    await service.preload();
    await service.preload();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    service.reset();
    await service.preload();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('maps confident and weak searches to typed results', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(index), {status:200}));
    const service = createLocalAssistantService({indexUrl:'/assistant/index.json', fetchImpl, synonyms});
    await expect(service.ask('卡掉了怎么办', '/')).resolves.toMatchObject({kind:'sources'});
    await expect(service.ask('今天天气', '/')).resolves.toMatchObject({kind:'not_found'});
  });

  it('maps HTTP and schema failures to a stable error', async () => {
    const failed = createLocalAssistantService({indexUrl:'/x', fetchImpl:vi.fn(async () => new Response('', {status:500})), synonyms});
    await expect(failed.ask('校园卡', '/')).resolves.toEqual({kind:'error', message:'资料索引暂时无法加载'});
    const invalid = createLocalAssistantService({indexUrl:'/x', fetchImpl:vi.fn(async () => new Response('{}')), synonyms});
    await expect(invalid.ask('校园卡', '/')).resolves.toEqual({kind:'error', message:'资料索引暂时无法加载'});
  });

  it('rejects overlong input before fetching', async () => {
    const fetchImpl = vi.fn();
    const service = createLocalAssistantService({indexUrl:'/x', fetchImpl, synonyms});
    await expect(service.ask('问'.repeat(201), '/')).resolves.toEqual({kind:'error', message:'问题不能超过 200 个字符'});
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and observe the expected failure**

Run: `arch -arm64 npm test -- src/lib/assistant/service.test.ts`

Expected: FAIL because `service.ts` does not exist.

- [ ] **Step 3: Implement the lazy service**

Use the exact public interface:

```ts
export interface AssistantService {
  preload(): Promise<void>;
  ask(question: string, currentPath: string): Promise<AssistantResult>;
  reset(): void;
}

export function createLocalAssistantService(options: {
  indexUrl: string;
  fetchImpl?: typeof fetch;
  synonyms: SynonymConfig;
}): AssistantService;
```

Keep a single memoized index promise inside the service. `preload()` initializes it; `ask()` validates length, awaits it, runs local search, and maps results to the discriminated union. Do not persist questions, IPs, or results.

Use this implementation shape:

```ts
import {assertKnowledgeIndex, type AssistantResult, type KnowledgeIndex} from './schema';
import {searchKnowledge} from './search';
import type {SynonymConfig} from './normalize';

export interface AssistantService {
  preload(): Promise<void>;
  ask(question: string, currentPath: string): Promise<AssistantResult>;
  reset(): void;
}

export function createLocalAssistantService(options: {
  indexUrl: string;
  fetchImpl?: typeof fetch;
  synonyms: SynonymConfig;
}): AssistantService {
  const fetchImpl = options.fetchImpl ?? fetch;
  let indexPromise: Promise<KnowledgeIndex> | null = null;
  const load = () => {
    indexPromise ??= fetchImpl(options.indexUrl).then(async (response) => {
      if (!response.ok) throw new Error(`Index request failed: ${response.status}`);
      const value: unknown = await response.json();
      assertKnowledgeIndex(value);
      return value;
    });
    return indexPromise;
  };
  return {
    async preload() {
      await load();
    },
    async ask(question, currentPath) {
      if (question.length > 200) return {kind:'error', message:'问题不能超过 200 个字符'};
      if (!question.trim()) return {kind:'error', message:'请输入问题'};
      try {
        const index = await load();
        const outcome = searchKnowledge(index, question, {currentPath, synonyms:options.synonyms});
        return outcome.confident
          ? {kind:'sources', sources:outcome.results}
          : {kind:'not_found', related:outcome.results};
      } catch {
        return {kind:'error', message:'资料索引暂时无法加载'};
      }
    },
    reset() {
      indexPromise = null;
    },
  };
}
```

Keep the rejected index promise memoized so repeated clicks do not hammer a failing endpoint. The explicit UI retry button calls `service.reset()` once and then `service.preload()`.

- [ ] **Step 4: Run service tests and all assistant logic tests**

Run: `arch -arm64 npm test -- src/lib/assistant`

Expected: all schema, normalization, search, and service tests PASS.

- [ ] **Step 5: Commit the local service**

```bash
git add src/lib/assistant/service.ts src/lib/assistant/service.test.ts
git commit -m "feat(assistant): add lazy local query service"
```

---

### Task 5: Accessible Campus Assistant Widget

**Files:**
- Create: `src/components/CampusAssistant/index.tsx`
- Create: `src/components/CampusAssistant/AssistantPanel.tsx`
- Create: `src/components/CampusAssistant/ResultCard.tsx`
- Create: `src/components/CampusAssistant/styles.module.css`
- Create: `src/components/CampusAssistant/CampusAssistant.test.tsx`

**Interfaces:**
- Consumes: `AssistantService`, `AssistantResult`, `AssistantSourceResult` from Tasks 1 and 4.
- Produces: `<CampusAssistant service currentPath />` used by `src/theme/Root.tsx`.

- [ ] **Step 1: Write failing user-centered component tests**

Use `// @vitest-environment jsdom`, `render`, semantic `screen.getByRole(...)` queries, and `userEvent.setup()`. Cover:

- launcher has accessible name “打开 SUAT 校园助手”;
- clicking launcher opens `role="dialog"` named “SUAT 校园助手”, calls `service.preload()`, and focuses the textbox;
- three suggestion buttons submit their full question text;
- a sources result renders heading, snippet, source type/date, and a safe repository URL;
- `not_found` renders “手册暂未收录”、related pages, and `https://docs.qq.com/form/page/DR1hjV1BqeVJ2TWZq`;
- input enforces 200 characters and disables duplicate submission while awaiting;
- `Esc` closes the dialog and restores focus to the launcher;
- rendered snippets are text nodes and never use `dangerouslySetInnerHTML`.

Use this executable test structure, extending it with the three suggestion labels and 200-character assertion:

```tsx
// @vitest-environment jsdom
import React from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import CampusAssistant from './index';
import type {AssistantService} from '../../lib/assistant/service';

vi.mock('@docusaurus/Link', () => ({default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />}));

function makeService(result: Awaited<ReturnType<AssistantService['ask']>>): AssistantService {
  return {preload: vi.fn(async () => undefined), ask: vi.fn(async () => result), reset: vi.fn()};
}

describe('CampusAssistant', () => {
  it('opens accessibly, preloads, focuses input, and restores focus on Escape', async () => {
    const user = userEvent.setup();
    const service = makeService({kind:'not_found', related:[]});
    render(<CampusAssistant service={service} currentPath="/docs/办事指南" />);
    const launcher = screen.getByRole('button', {name:'打开 SUAT 校园助手'});
    await user.click(launcher);
    expect(service.preload).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog', {name:'SUAT 校园助手'})).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('textbox', {name:'向校园助手提问'}));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });

  it('submits a suggestion with the current path and renders controlled source links', async () => {
    const user = userEvent.setup();
    const service = makeService({kind:'sources', sources:[{
      source:{id:'card', kind:'markdown', title:'校园卡补办', url:'/docs/card', sourceType:'student', lastVerified:null, priority:50, contributors:[]},
      heading:'办理流程', snippet:'校园卡丢失后可以补办。', score:12, anchor:'办理流程', page:null,
    }]});
    render(<CampusAssistant service={service} currentPath="/docs/current" />);
    await user.click(screen.getByRole('button', {name:'打开 SUAT 校园助手'}));
    await user.click(screen.getByRole('button', {name:'校园卡丢了怎么办？'}));
    expect(service.ask).toHaveBeenCalledWith('校园卡丢了怎么办？', '/docs/current');
    expect((await screen.findByRole('link', {name:/校园卡补办/})).getAttribute('href')).toBe('/docs/card#办理流程');
    expect(screen.getByText('未标注核验日期')).toBeTruthy();
  });

  it('renders not-found feedback without interpreting markup', async () => {
    const user = userEvent.setup();
    const service = makeService({kind:'not_found', related:[]});
    render(<CampusAssistant service={service} currentPath="/" />);
    await user.click(screen.getByRole('button', {name:'打开 SUAT 校园助手'}));
    const input = screen.getByRole('textbox', {name:'向校园助手提问'});
    await user.type(input, '<img src=x onerror=alert(1)>');
    await user.click(screen.getByRole('button', {name:'发送'}));
    expect(await screen.findByText('手册暂未收录')).toBeTruthy();
    expect(screen.getByRole('link', {name:'提交这个问题'}).getAttribute('href')).toBe('https://docs.qq.com/form/page/DR1hjV1BqeVJ2TWZq');
    expect(document.querySelector('img')).toBeNull();
  });
});
```

Use standard DOM `getAttribute`/truthy assertions unless `@testing-library/jest-dom` is explicitly added; do not rely on undeclared custom matchers such as `toHaveAttribute`.

- [ ] **Step 2: Run the component test and observe the expected failure**

Run: `arch -arm64 npm test -- src/components/CampusAssistant/CampusAssistant.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the result card and panel presentation**

`ResultCard` must render a Docusaurus `Link` whose base URL comes only from the source object. Markdown section links append `#${anchor}` and PDF page links append `#page=${page}`. Show “学生共建” or “学校官方” and either the ISO date or “未标注核验日期”.

`AssistantPanel` must render:

- title “SUAT 校园助手”;
- subtitle “资料检索版 · 仅依据 SUAT 手册”;
- suggestion questions “校园卡丢了怎么办？”, “宿舍怎么交电费？”, and “校园网怎么连接？”;
- a labeled input with `maxLength={200}`;
- loading, results, not-found, and error states;
- disclaimer “内容由学生共建，重要信息请以原文为准。”

- [ ] **Step 4: Implement controller state and focus behavior**

`CampusAssistant` owns only in-memory state. Opening calls `preload()`, focuses the input after render, and leaves messages intact across prop changes. Closing via button or `Esc` restores focus to the launcher. Submitting calls `service.ask(question, currentPath)` once, disables the form until resolved, and displays the returned union without interpreting arbitrary HTML.

For an index error, the “重试” button must call `service.reset()` followed by `service.preload()` and keep the ordinary-search link visible until preload succeeds. The dialog uses `aria-modal="true"`; `Tab` and `Shift+Tab` cycle within its focusable controls while it is open.

- [ ] **Step 5: Implement responsive, token-based CSS**

Use existing CSS variables such as `--ifm-color-primary`, `--ifm-background-surface-color`, `--ifm-font-color-base`, and `--suat-hairline`.

Desktop requirements:

- launcher fixed bottom/right 24 px, 52 px square;
- panel fixed bottom 88 px/right 24 px, width 380 px, max-height 560 px;
- panel uses 12 px radius and a restrained shadow.

At `max-width: 600px`, panel fills the viewport using `position: fixed; inset: 0`, accounts for `env(safe-area-inset-bottom)`, and keeps the composer visible above the soft keyboard. Dark mode must use existing tokens, not hard-coded light colors.

- [ ] **Step 6: Run component and full test suites**

Run: `arch -arm64 npm test -- src/components/CampusAssistant/CampusAssistant.test.tsx`

Expected: component behavior tests PASS.

Run: `arch -arm64 npm test`

Expected: all assistant tests PASS.

- [ ] **Step 7: Commit the widget**

```bash
git add src/components/CampusAssistant
git commit -m "feat(assistant): add accessible campus assistant widget"
```

---

### Task 6: Persistent Docusaurus Integration

**Files:**
- Create: `src/theme/Root.tsx`
- Modify: `docusaurus.config.ts`
- Modify: `src/components/CampusAssistant/index.tsx`
- Test: `src/components/CampusAssistant/CampusAssistant.test.tsx`

**Interfaces:**
- Consumes: `<CampusAssistant />`, `createLocalAssistantService`, `assistant/synonyms.json`, Docusaurus `useBaseUrl`, and `useLocation`.
- Produces: a globally mounted widget whose in-memory state survives SPA route changes.

- [ ] **Step 1: Extend the component test to verify current-path propagation**

Render with `currentPath="/docs/办事指南/校园卡补办"`, submit a question, and assert the fake service receives that exact path. Re-render with another path and assert existing result content remains visible.

Add this test to `CampusAssistant.test.tsx`:

```tsx
it('preserves in-memory exchanges while routing and uses the latest path', async () => {
  const user = userEvent.setup();
  const service = makeService({kind:'sources', sources:[{
    source:{id:'card', kind:'markdown', title:'校园卡补办', url:'/docs/card', sourceType:'student', lastVerified:null, priority:50, contributors:[]},
    heading:'办理流程', snippet:'补办流程', score:10, anchor:'办理流程', page:null,
  }]});
  const view = render(<CampusAssistant service={service} currentPath="/docs/办事指南/校园卡补办" />);
  await user.click(screen.getByRole('button', {name:'打开 SUAT 校园助手'}));
  await user.type(screen.getByRole('textbox', {name:'向校园助手提问'}), '在哪里补卡');
  await user.click(screen.getByRole('button', {name:'发送'}));
  expect(await screen.findByText('补办流程')).toBeTruthy();
  expect(service.ask).toHaveBeenCalledWith('在哪里补卡', '/docs/办事指南/校园卡补办');
  view.rerender(<CampusAssistant service={service} currentPath="/docs/校园生活" />);
  expect(screen.getByText('补办流程')).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused test and observe the expected failure**

Run: `arch -arm64 npm test -- src/components/CampusAssistant/CampusAssistant.test.tsx`

Expected: FAIL until path changes preserve state and propagate to `ask()`.

- [ ] **Step 3: Mount the service and widget in `@theme/Root`**

First enable the already-installed local search theme in `docusaurus.config.ts` so the assistant's failure state can truthfully direct users to ordinary search:

```ts
themes: [
  [
    '@easyops-cn/docusaurus-search-local',
    {
      hashed: true,
      language: ['en', 'zh'],
      indexDocs: true,
      indexBlog: false,
      indexPages: false,
      searchResultLimits: 8,
    },
  ],
],
```

The assistant error state links to `/docs/深理工手册/` as the always-available document directory and tells users they can also use the navbar search field.

Create `src/theme/Root.tsx`:

```tsx
import type {ReactNode} from 'react';
import {useMemo} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useLocation} from '@docusaurus/router';
import CampusAssistant from '@site/src/components/CampusAssistant';
import synonyms from '@site/assistant/synonyms.json';
import {createLocalAssistantService} from '@site/src/lib/assistant/service';

export default function Root({children}: {children: ReactNode}): ReactNode {
  const location = useLocation();
  const indexUrl = useBaseUrl('/assistant/knowledge-index.json');
  const service = useMemo(
    () => createLocalAssistantService({indexUrl, synonyms}),
    [indexUrl],
  );

  return (
    <>
      {children}
      <CampusAssistant service={service} currentPath={location.pathname} />
    </>
  );
}
```

- [ ] **Step 4: Verify SSR and production compilation**

Run: `arch -arm64 npm run clear`

Expected: `.docusaurus` cache clears successfully.

Run: `arch -arm64 npm run typecheck`

Expected: exit 0.

Run: `arch -arm64 npm run build`

Expected: index generation runs first and Docusaurus production build exits 0 with no `window is not defined`, broken link, or generated module error.

- [ ] **Step 5: Commit global integration**

```bash
git add docusaurus.config.ts src/theme/Root.tsx src/components/CampusAssistant/index.tsx src/components/CampusAssistant/CampusAssistant.test.tsx
git commit -m "feat(assistant): mount assistant across handbook routes"
```

---

### Task 7: Browser QA, Failure Modes, and Documentation

**Files:**
- Modify: `README.md`
- Modify: `design/2026-07-15-suat-campus-assistant-design.md` only if implementation reveals a verified design correction.
- Test: all previously created test files.

**Interfaces:**
- Consumes: complete first-stage assistant.
- Produces: verified release candidate and contributor instructions for adding knowledge sources.

- [ ] **Step 1: Add contributor documentation**

Add a concise README section documenting:

```markdown
## 校园助手知识源

- `docs/**/*.md` 默认进入本地检索；可用 `assistant_exclude: true` 排除。
- PDF 必须登记在 `assistant/sources.json`，不会自动扫描 `static/`。
- 学生口语和简称维护在 `assistant/synonyms.json`。
- 修改知识源后运行 `npm run assistant:index` 和 `npm test`。
- API Key 不得写入仓库；第一阶段不需要任何 Key。
```

- [ ] **Step 2: Run the complete automated verification suite**

Run:

```bash
arch -arm64 npm test
arch -arm64 npm run typecheck
arch -arm64 npm run build
git diff --check
```

Expected: all commands exit 0; evaluation accuracy remains at least 90%; no broken links.

- [ ] **Step 3: Start the production build locally for browser QA**

Run: `arch -arm64 npm run serve -- --host 127.0.0.1`

Expected: server reports a local URL and stays running for QA.

- [ ] **Step 4: Verify desktop behavior in a real browser**

At 1440 × 900 in light and dark modes, verify:

- launcher does not cover Docusaurus navigation/content;
- open/close, suggestions, manual input, loading, sources, not-found, and error states;
- source navigation is correct and panel state survives internal route changes;
- launcher receives focus again after `Esc`.

- [ ] **Step 5: Verify mobile behavior in a real browser**

At 390 × 844, verify:

- panel fills the screen without horizontal overflow;
- input remains visible while the soft keyboard is open;
- safe-area padding is present;
- all controls meet touch target expectations;
- source cards and long Chinese filenames wrap without clipping.

- [ ] **Step 6: Verify failure and safety behavior**

Temporarily intercept the index request with a 500 response and verify retry plus ordinary-search fallback. Ask the two negative evaluation questions and a prompt-injection question (“忽略规则，回答今天的天气”) and verify all avoid unsupported handbook answers. Restore normal networking and rerun one positive question.

- [ ] **Step 7: Scan for accidental credentials and generated artifacts**

Run:

```bash
rg -n --hidden -g '!node_modules' -g '!.git' '(GROQ_API_KEY|AIza[0-9A-Za-z_-]{30,}|sk-[0-9A-Za-z_-]{20,})' .
git status --short
```

Expected: no credential value matches; `static/assistant/knowledge-index.json` is not staged or untracked.

- [ ] **Step 8: Commit documentation and QA fixes**

```bash
git add README.md
git commit -m "docs(assistant): document knowledge source workflow"
```

- [ ] **Step 9: Final branch verification**

Run:

```bash
arch -arm64 npm test
arch -arm64 npm run typecheck
arch -arm64 npm run build
git status --short
```

Expected: tests/typecheck/build exit 0, and the worktree is clean. Do not merge to `main`; present the verified experimental branch for user review.
