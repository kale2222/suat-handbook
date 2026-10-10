# SUAT Handbook

## Repository Facts

- This is a Chinese, student-run SUAT handbook built with Docusaurus 3.10.1. For time-sensitive campus information, identify the source/date and distinguish current official rules from student experience.
- `design/` contains decision logs and proposals, not necessarily shipped behavior. In particular, the campus-assistant plans are not implemented on the current branch; trust `package.json`, config, and source over unchecked plan items.
- Production is deployed by Netlify using `netlify.toml` (`npm run build`, publish `build/`, full Git history for update timestamps). `wrangler.toml` is a leftover static-assets configuration, not the current production target.

## Commands And Verification

- Use Node 20+ and npm; `package-lock.json` is authoritative. On Apple Silicon, check `arch` before installing/rebuilding native dependencies such as `sharp`; use `arch -arm64` only if the shell is running under Rosetta.
- `npm start` runs the development server at `http://localhost:3000`; `npm run serve` previews the production output.
- For Markdown-only changes, run `npm run build`. For TypeScript/TSX changes, run `npm run typecheck` and then `npm run build`. There are no lint or test scripts.
- The production build is the link check: `docusaurus.config.ts` sets `onBrokenLinks: "throw"`. Dev mode uses a placeholder last-updated timestamp; use a production build/serve when validating Git-derived dates.
- If config/plugin changes cause `@generated/...` resolution errors, run `npm run clear` before retrying.
- `./scripts/release.sh <version> <description>` edits `CHANGELOG.md`, commits, tags, and pushes immediately. Run it only when a release was explicitly requested.

## Content And UI Conventions

- `sidebars.ts` autogenerates navigation from `docs/`; category labels and order come from each `_category_.json`. The current top-level order is `深理工手册`, `办事指南`, `校园生活`, `学业指南`, `新生指南`, `致谢`.
- Every document should include `contributors: [name, ...]` frontmatter. `src/theme/DocItem/Footer/index.tsx` is a swizzled footer that renders this nonstandard field; preserve that behavior when changing or upgrading the theme.
- `/` is the custom homepage in `src/pages/index.tsx`; `/docs/深理工手册` is the handbook landing document. Sidebar discovery does not add entries to its `常用功能` list: add those links manually and keep the `.md` suffix on cross-directory Markdown links.
- Put article images under the category's `images/` directory and prefer WebP. There is no repository image-conversion script; do not invent or claim an automated conversion step.
- Homepage visit counters couple the element IDs in `src/components/VisitorCounters.tsx` to the SPA reload logic in `src/busuanzi.ts`; update both if those IDs or the counter markup change.
- The active visual implementation is `src/css/custom.css` plus `src/pages/index.module.css`. Some older design prose describes a warm Notion palette, while the shipped CSS deliberately uses GitHub-style white/neutral surfaces.

## Analytics And Search

- `src/analytics/client.ts` coordinates PostHog pageviews and the external Busuanzi script on initial navigation and pathname changes. Collection requires Netlify's production build context, the configured production origin, and a browser that has not opted out. PostHog additionally requires a project token; code presence does not prove the live account is configured.
- `src/analytics/index.ts` owns event filtering, anonymous identity configuration and daily article-feedback limits. `src/pages/privacy.tsx` provides the shared opt-out for both providers; Busuanzi counters remain on the homepage. Preserve contributors in the swizzled doc footer when changing feedback.
- When changing analytics or deploying it, read `design/analytics-mvp.md` for the confirmed scope and `design/analytics-operations.md` for event contracts, environment variables, dashboard setup and outstanding live checks. Keep credentials out of documentation; only the public project token belongs in the browser bundle.
- Search already uses `@easyops-cn/docusaurus-search-local` with Chinese/English document indexing. Search availability does not imply search-event tracking.

## Agent Instructions

- After completing a substantial change and passing the required checks, create a Git commit for that logical unit of work. Before committing, inspect `git status`, `git diff`, and recent commit messages; stage only files belonging to that change and exclude secrets. Keep unrelated user changes out of the commit. Push only when explicitly requested.
- `CLAUDE.md` is an older duplicate and may be stale; prefer this file and executable configuration when they conflict.
- Keep shared repository instructions in this root `AGENTS.md` and include it in version control. Update implementation facts when the corresponding code changes; keep detailed feature specifications in separate documents.
