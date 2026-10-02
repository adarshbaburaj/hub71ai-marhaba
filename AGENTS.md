<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Marhaba project context

Read [docs/PROJECT_HANDOFF.md](docs/PROJECT_HANDOFF.md) before making substantial changes. It explains the product goal, current implementation, architecture, invariants, verification, and deferred work. [README.md](README.md) covers local setup; the current section of [settle.md](settle.md) records the product brief.

Marhaba helps founders plan a business and a life in Abu Dhabi together. Nori is the interactive guide. The current experience uses warm white surfaces, bold black Inter type, an editable branching timeline, and compact animated question prompts. The welcome page has two business paths and a subtle mouse effect confined to that page. Older purple, space, star, and gazelle concepts in the archived brief are superseded.

Keep calculations deterministic and independent of AI. Preserve confirmed edits, dormant answers, Undo, exact saved question position, and selected plans that need review. Keep all API credentials server-only and ignored; never print or commit them. Catalogue records, prices, routes, providers, and bank concepts are demonstration data, with real details requiring confirmation. Do not turn previews into claims of live data or completed external actions.

After a change, run the checks appropriate to its scope and report what actually passed. Read the handoff's latest verification section before relying on a previous result. Avoid committing or pushing changes unless requested.
