# Marhaba

Marhaba connects business, home, school, transport and money decisions for founders considering a move to Abu Dhabi. Nori is the guide. The main planning journey runs with local demonstration data; optional Luna chat explains the calculated plans and proposes changes for the user to approve.

The start is deliberately empty: choose **Scale an existing business** or **Start a new business**. One bold question appears at a time in a clean document layout. A black organic tree grows as answers are confirmed; every revealed branch remains editable. Warm white pages, strong Inter typography and a small animated liquid Nori keep the experience simple and personal.

## Run locally

```sh
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). Use **Try a sample move** for a complete founder, partner and child scenario.

For live Nori chat, create an ignored `.env.local` with a server-side key, then restart the server:

```dotenv
OPENAI_API_KEY=your_server_key
```

The guide route uses `gpt-6-luna`. Never use a `NEXT_PUBLIC_` variable for the key or commit a real credential. Without a key, model access or API credits, questions, comparisons, maps, money and exports continue to work. Sending a Nori message sends the message, current relocation answers and derived planning context through the server to OpenAI; banking preferences stay separate.

The local live check confirmed `gpt-6-luna` access; the configured API account reported no remaining credits. Add API credits to enable real replies. The structured experience works independently.

See [the complete colour palette](docs/colour-palette.md) for design tokens, map colours, Nori artwork and supporting shades.

## How the prototype works

- The document asks one question at a time, with a saved position inside each branch so reload returns to the precise question. The ink tree grows with confirmed answers and shows the branches relevant to the household. Earlier answers remain editable, while inactive partner, child and company-finance fields are excluded from current calculations.
- Nori is a small monochrome liquid character with eyes, blinks and a springy bounce after an answer. The desktop question sits beside the tree; phones place the question first and expose every branch in a compact outline. Keyboard focus and reduced-motion preferences are supported.
- The deterministic engine checks complete combinations, preserves essential requirements, and distinguishes ready, conditional and excluded plans. Changing transport recomputes journeys and spending.
- Nori returns explanations and proposed edits. **Apply changes** confirms an edit; **Discard** leaves the answers unchanged. Proposals expire if the profile changes while a response is pending.
- Leaflet uses OpenStreetMap tiles with attribution. Demo pins cover homes, schools and nearby services; a place list remains usable when map tiles fail. Dotted lines and displayed distances indicate straight-line proximity, not verified routes or journey times.
- [Hub71's official address](https://www.hub71.com/contact) is the business anchor: Al Khatem Tower, ADGM Square, Al Maryah Island. Its pin is approximate. Workspace amounts are synthetic planning allowances, with programme access and availability requiring confirmation.
- All money is stored as integer fils. Cost averages and dated cash payments are separate: rent and school instalments are not deducted twice, deposits remain distinct, and founder pay creates matching business and household transfers. Unknown cash or income suppresses balances. An undecided arrival uses the editable reference date for an explicitly illustrative 12-month schedule.
- Banking is an independent intake and comparison. Synthetic account concepts use account type and selected features; credit scores and hobbies do not rank them or imply eligibility. The optional current score range is [300–850 according to Etihad Credit Bureau](https://etihadbureau.ae/Individual/CreditScore). Users choose whether copied questions include their bank names or score.

## Local state and checks

Relocation state uses `marhaba.move.v1`; banking uses `marhaba.banking.v1`. Settings **Reset move** resets the move with Undo available. **Clear banking preferences** separately removes banking answers. Save notices reflect actual browser-storage success. Sample UAE contact numbers are masked and non-dialable; enquiry previews and copied briefs never claim to have been sent.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The browser suite starts or reuses the local dev server and exercises desktop/mobile flows. If Chromium is missing, install it with `npx playwright install chromium`.

## Implementation boundaries

Next.js, React and TypeScript provide the app; the planner and finance modules are independent of chat and map rendering. Domain tests cover constraint handling, transport changes, money arithmetic, guide edits, map provenance and banking persistence. See [settle.md](settle.md) for the product reference.

This is a local prototype with one fully supported child, a bounded fictional catalogue and prepared travel estimates. It has no live listings, verified admissions, provider outreach, bank applications, document uploads or real connector authentication. Nori's request limits are local preview guards, not production authentication or a distributed rate limiter. Future document collection needs an explicit secure-upload design before any passport or company files are accepted.

The configured GitHub origin is [hub71ai-marhaba](https://github.com/adarshbaburaj/hub71ai-marhaba). Deployment and pushing repository changes are separate steps.
