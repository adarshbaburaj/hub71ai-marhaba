# Marhaba project handoff

This document explains the product, implementation, user decisions and boundaries so another model can continue without the original conversation. Read the repository's [AGENTS.md](../AGENTS.md), this document and the current source before changing the app. The installed Next.js version includes local guides in `node_modules/next/dist/docs/`; project instructions require reading the relevant guide before coding.

Latest user instructions take precedence over older planning drafts. [settle.md](../settle.md) contains the product reference followed by a **superseded archive**. Do not restore the archive's purple space theme, golden-star mascot, dated hackathon schedule or instruction to wait before implementation. The app has already been implemented. Its current name is **Marhaba** and its interactive guide is **Nori**.

## Latest revision — interactive hackathon experience (2 October 2026)

This section supersedes older one-child, blob-mascot and long onboarding descriptions below.

- Welcome follows the supplied sketch: Marhaba, two business paths and explicit start. Nori says “Hi, I’m Nori, your AI friend in UAE!” with “To Abu Dhabi; made easier” directly below. Pressing the start action plays a quiet two-note Web Audio chirp; it never starts automatically. Existing Cursor edits were retained and integrated; no commit or push was made.
- Quick onboarding uses **6 questions for solo founders and 8 with children**: business category, household, neighbourhood plus bedrooms, car, monthly spending and priorities; families add grouped child ages/count and curriculum. Add/Remove controls retain dormant sibling ages without inventing an age for a new child. Workspace defaults to Hub71 after entry; its anchor and richer preferences remain editable through branches / More details. `questionMode` persists along with the exact question ID, including an older saved detail removed from the quick path. Only Continue/Apply commits a draft.
- The desktop composition is a prominent **vertical timeline on the left** and a compact question on the right, capped at 400px wide. Long answer content scrolls inside the card while actions stay available. Phones keep the prompt and timeline in normal page flow. Outgoing prompts become inert; reduced motion skips animation delays.
- Nori uses the supplied sage-and-cream code-native SVG gazelle, with a wave, blink and hop beside every prompt. A short local thinking transition connects questions and the first results. Clicking the mascot opens Luna chat for the current question; the structured flow stays independent of API access.
- `area-explorer.tsx` provides a compact local sketch with neighbourhood choices, approximate distances and prepared car/public minutes. Work lines are red, school green and shopping blue; toggles affect the sketch only. Hub71 is the default reference, while edits retain their actual workplace and identify the distance origin. `hub-results.tsx` connects home to work, school, shopping and outdoors beside the household cost breakdown, with matching measured distances and a Hub71 reference. Synthetic allowances and unavailable quotes remain disclosed.
- The budget prompt offers a range from synthetic ready/conditional combinations with the budget limit temporarily unset, or an explicitly synthetic fallback when none is available. **Use this example** changes the local draft only. It does not claim an Abu Dhabi market average or weaken any requirement.
- **Money** includes an interactive **How spending moves** graph with Monthly spending / Payment timing views and selectable periods. It shows priced costs and dated expense/deposit payments even without opening cash or income. Cash-balance forecasts remain separate and require those inputs; transfers are not mixed into the spending chart.
- **Nori at work** presents an iMessage-style two-bedroom enquiry between Nori and Amaya, an estate-agent demo persona. The interface uses blue/gray chat bubbles and clickable recorded voice messages rather than repeated fictional labels. A small demo indicator preserves the simulation boundary. Text repeats every 22 seconds with Pause/Replay controls. Recordings are `/audio/nori-enquiry.wav` (1.75s) and `/audio/estate-agent-2bhk.mp3` (about 5.6s). Listening pauses the text loop; closing or replaying stops audio. The 2BHK case is separate from the selected home's bedroom count. No message is sent, no booking or quote is confirmed, and no profile or plan status changes.
- Profiles support single-parent households and **0–20 children**, with optional retained `childAges`. Each school-age child contributes school/activity/bus costs and dated payments. Shared curriculum / shared school remains an explicit approximation. Under-5 and over-18 care/education costs need separate quotes and make totals partial. Unknown sibling ages are not copied from the first child. Count reductions and inactive branches retain hidden ages.
- The planner keeps all essential checks strict. `PlanningResult.recoveries` contains evaluated, explicit what-if changes, preview costs, `cashGap` and `nextStep`. Users apply a suggestion before their answers change; Undo and chosen-plan review remain intact. Impossible budgets do not become false guarantees. Extreme profiles still receive concrete next steps.
- Repeated demo banners and prefixes were removed from the showcase flow. Estimates, unknown quotes and source provenance remain available without pretending listings, admissions, providers or external actions are live.
- The server Luna context includes recovery suggestions and per-child ages. An independent Luna review informed recovery design. After the user added API credits, the latest live guide check returned **HTTP 200 with `available: true` and a real Luna reply**. The earlier exhausted-credit result is historical; deterministic questions and recovery options remain independent of API availability.

Latest recorded-audio verification (2 October 2026): **lint, TypeScript, production build and all 4 targeted desktop/mobile playback and audio-decode tests passed**. After shortening the enquiry copy, both desktop/mobile playback tests and a fresh production build passed again. Checks cover no autoplay, full clip playback, conversation pause, stop/reset, Replay/Close cleanup, blocked-playback retry, the unchanged 22-second text loop and unchanged saved move. Both local files returned HTTP 200 with audio MIME types and decoded into non-silent buffers. The original WAV and MP3 were copied unchanged. These checks replace the earlier browser-speech demo verification.

Earlier same-day verification: **lint, TypeScript, 99 domain tests, 34 desktop/mobile browser tests and the production build passed**. After the final chat focus change, all 12 affected desktop/mobile chat and simulation tests passed again, along with lint, TypeScript and a fresh production build. Browser coverage includes the 6/8 flow, grouped and dormant child ages, spending graphs without cash, red sketch toggles, user-triggered start tones, mascot chat, simulation pause/replay/loop, click-only voice samples, unchanged saved answers and inspector/enquiry plan context. Desktop and phone screenshots were inspected. The restricted build stalled and was interrupted; the identical command passed outside the sandbox with permission.

A production preview on port 3001 separately confirmed the 400px desktop prompt to the right of the timeline, the 330px phone prompt, progression through thinking, and no horizontal overflow at those widths. Sample results, spending/payment amounts and Nori's Pause control worked in production; the browser reported the earlier speech preview finished. No production-origin JavaScript errors were observed. The development preview on port 3000 remains available. The production preview was rebuilt and restarted after the recorded-audio revision. [DEMO_SCRIPT.txt](DEMO_SCRIPT.txt) contains a short talk track, sample answers and the recorded voice controls.

Concurrent-edit warning: Cursor twice reintroduced automatic constraint softening and changed core-question flags while this task was running. Those conflicts were reconciled. Future edits must preserve strict `alternatives` and explicit `recoveries`; do not demote failed essential requirements or mark excluded plans ready to force a result.

## Product goal

Marhaba helps founders considering Abu Dhabi connect a business move with the life around it. The core question is: **Can this move work for my business, household and money?** The repository description is “to Abu Dhabi” just got easier.

The app collects relevant circumstances, compares complete demonstration plans and explains their tradeoffs. A complete plan connects founder workspace, partner work when relevant, home, children's shared school and activities, transport, spending, payment timing and next actions. A user should be able to change one assumption, such as arriving without a car, and see the connected consequences rather than unrelated search results.

This is a locally delivered relocation prototype. The structured experience runs independently of AI or external connections. Live Nori chat can explain the deterministic results and propose edits, with explicit user confirmation before applying them.

## Current user direction

- Use a **warm white background, black text and branches, neutral surfaces, generous spacing and bold Inter typography**. The user explicitly chose warm white rather than a fully dark page and asked for bold type. Green undertones were removed from the main interface; map categories still have distinct colours.
- Begin with a quiet, mostly empty welcome page and exactly two main directions: **Scale my business** and **Start a new business**. A user-triggered chirp accompanies start. A separate sample action restores a fictional founder family; a saved move can be resumed.
- Onboarding should feel like a document or branching timeline rather than a large conventional form. Only the current prompt is open, and answers commit through **Continue** or **Apply changes**.
- The **timeline itself is the focal element**: five vertical major stages on the left with editable branches and a compact current-question card on the right. Mobile keeps the prompt and branches in normal vertical flow. Long answers scroll inside the bounded card; actions remain visible.
- Questions should animate both into and out of view. Respect reduced motion. The outgoing prompt becomes inert during its exit so it cannot be submitted twice.
- Add a small decorative cursor-following effect **on the welcome page only**. Keep the native cursor. Disable it for touch/coarse pointers and reduced motion; it must never capture clicks or keyboard focus.
- Nori is a small sage-and-cream SVG gazelle with eyes, gentle blinks, a wave and a springy hop. Click the question mascot to ask Luna; the short thinking transition represents local progress rather than external research.
- Show an interactive street map with coloured proximity lines connecting work, home, school and everyday places such as healthcare, supermarkets and public stops. Hub71 is the primary startup anchor. Synthetic data is acceptable when real listings or routing are unavailable, provided it is labelled honestly.
- Ask about founder hobbies and routines in optional details; local sketch layers can be toggled independently. Keep banking questions separate; hobbies must not determine banking recommendations or credit eligibility.
- Show spending and payment timing before requiring cash or income. The optional Nori at work showcase remains explicitly scripted, with click-only supplied recordings and a fictional estate adviser.
- Document upload, passport parsing and automatic form filling were explicitly left for later.

The source and latest verification record describe implemented behaviour. Final checks for this revision are recorded separately from previous results; future integrations must remain distinct from the current local simulation.

## Main user journey

1. Choose whether to scale an existing business or start one, or load the fictional sample family.
2. Answer six quick prompts, or eight with children, across **Business, Household, Home, Transport, Money & priorities**. Ages/count and neighbourhood/bedrooms use grouped cards; optional workspace, company, partner and lifestyle details stay editable through branches.
3. Use **My move** for a circumstances summary and chosen-plan status; use **Edit circumstances** to reopen onboarding.
4. Use **Explore** to compare up to three distinct ready plans and separately inspect conditional plans. Map, readable location list and inspector refer to the same combination.
5. Use **Money** to review average costs, arrival payments, the first 30 days and the 12-period spending/payment graph without entering cash. Add known cash and receipts for balance projections, with household and company accounts separated.
6. Choose a plan and use **Next steps** for phased tasks, provider previews and editable enquiry or move briefs. Copy or print them; the app does not send them.
7. **Connections** is secondary and shows honest previews of potential integrations.
8. Open **Nori at work** for the repeating local coordination simulation; optional sample voices are user-triggered. It performs no provider outreach.

The signature demonstration is the sample family → comparison and local sketch layers → remove car → revised journeys and costs → review selected plan → inspect spending/payment timing → Nori at work simulation → prepare an enquiry and next steps → Undo or restore sample.

## Stack and source map

The project uses Next.js **16.3.8** App Router, React **19.2**, TypeScript, Tailwind **4**, npm, Radix accessible dialog primitives, a shadcn-style Button, Lucide icons, Leaflet/OpenStreetMap, Zod **4**, the OpenAI SDK **6**, Vitest and Playwright. Check `package.json` for exact versions rather than assuming older Next.js conventions.

| File | Responsibility |
| --- | --- |
| `src/app/page.tsx` | App entry. |
| `src/app/layout.tsx` | Root metadata, global styles and Inter font configuration. |
| `src/app/globals.css` | Shared visual tokens, workspace, map, money, dialog and document controls. |
| `src/components/marhaba-app.tsx` | Root state, persistence, welcome page, primary destinations, profile updates, Undo, selection, notices, dialogs, checklists and brief preparation. Several destination components live in this file. |
| `src/components/onboarding.tsx` and `.module.css` | Applicable question selection, local draft answer, confirmation, Back/Skip, branch navigation, compact prompt and enter/exit transition. |
| `src/components/move-tree.tsx` and `.module.css` | Editable branching timeline, major stages, revealed child branches, labels and decorative connectors. The filename remains `move-tree` through the timeline redesign. |
| `src/components/start-cursor.tsx` and `.module.css` | Welcome-only pointer companion using refs and requestAnimationFrame, media preference handling and cleanup. |
| `src/lib/start-sound.ts` | Short user-triggered Web Audio welcome chirp with context cleanup and graceful failure. |
| `src/components/nori-blob.tsx` and `.module.css` | Code-native SVG mascot and reduced-motion-aware animation. No generated image asset is necessary. |
| `src/components/nori-at-work.tsx` and `.module.css` | Repeating scripted 2BHK enquiry, Pause/Replay, fictional estate adviser and click-only recorded messages with cleanup. |
| `public/audio/` | User-supplied Nori WAV and estate-adviser MP3 bundled as local static files. |
| `src/components/money-flow.tsx` and `.module.css` | Interactive monthly-equivalent spending and dated payment graphs, including deposits and readable period amounts without requiring balances. |
| `src/components/guide-panel.tsx` | Nori chat dialog, pending/error states, validated proposal review, Apply/Discard, stale-response handling and focus restoration. |
| `src/app/api/guide/route.ts` | Server-only Responses API integration and authoritative planning-context recomputation. |
| `src/components/proximity-map.tsx` | Leaflet rendering, coloured markers/lines, popups, filtering, fit controls and fallback place list. Dynamically imported with SSR disabled. |
| `src/components/banking-panel.tsx` | Independent banking intake, validation, saving, comparison concepts and copyable questions. |
| `src/lib/types.ts` | Shared profile, catalogue, requirement, plan, journey, money, payment, task and guide-proposal types. |
| `src/lib/profile.ts` | Blank/sample profiles, partner/child predicates and effective-profile projection. |
| `src/lib/questions.ts` | Quick 6/8 and detail question definitions, conditional applicability, confirmed-answer application, retained ages/count and next/previous question lookup. |
| `src/lib/onboarding.ts` | Underlying branch order, labels and derived summary nodes. |
| `src/lib/data.ts` | Bundled areas, homes, schools, workplaces, activities and provider previews. |
| `src/lib/planner.ts` | Candidate combinations, essential checks, prepared journeys, ranking, selected-combination recovery and phased tasks. |
| `src/lib/finance.ts` | Integer-fils arithmetic, average costs, dated signed payment events, projections, deposits, transfers and the financial fixture. |
| `src/lib/map-data.ts` | Approximate pins, category colours, nearby demo services, hobby tags, map-context assembly and straight-line distance. |
| `src/lib/guide.ts` | Shared profile/proposal schemas, supported edit paths, edit validation/application and human-readable consequences. |
| `src/lib/banking.ts` | Independent banking types, validation, storage, synthetic concepts and prepared questions. |
| `src/lib/*.test.ts` | Domain tests independent of browser rendering and live AI. |
| `tests/journey.spec.ts` and `playwright.config.ts` | Desktop/mobile journey, accessibility, persistence, proposal and visual-layout behaviour tests. |

The full colour inventory is in [colour-palette.md](colour-palette.md). Core variables include warm background `#F7F6F2`, surface `#FDFCF9`, ink `#171717`, muted `#74716B` and border `#DDDAD4`. Map colours are informational categories rather than the app's action palette.

## Profile, navigation and persistence

`MoveProfile` holds business intent and workspace, optional company money, household composition and retained partner/child answers, hobbies/routine, home requirements, car access and commute limit, household finances, dates and ordered priorities. All money fields use integer fils: **100 fils = AED 1**.

Navigation is stored separately from profile facts. Root `AppState` holds `view`, `tab`, `activeNode`, `activeQuestionId`, `answeredQuestionIds`, `visited`, `selectedPlanId`, task completion and guide-pause state, alongside the profile and revision. Do not derive answers from which page is open or make an unconfirmed draft change the planner.

Relocation state is saved in browser local storage under **`marhaba.move.v1`**. Loading validates the profile and sanitises navigation IDs, falling back safely if saved data is malformed. Reload returns to the precise current question. Save feedback reflects actual storage success. Root updates use a current-state ref so multiple synchronous callbacks do not overwrite each other with stale state.

Banking is saved separately under **`marhaba.banking.v1`**. Reset move and clear banking preferences are separate actions. Sample restoration replaces the relocation scenario with a reliable fictional family and opens comparison. No account, database or cross-device sync exists.

Important invariants:

- `effectiveProfile` excludes inactive partner, child, remote-workplace and disabled company-finance fields from planning. Retained profile answers remain available for restoration and Undo.
- Removing a child must remove school fees, school journeys, activities and admissions tasks from current outputs and copied briefs. Reintroducing the branch restores its earlier answers.
- Remote or job-seeking partners have no assumed daily office commute. Switching back to office work can reuse the retained workplace.
- If a currently open branch becomes irrelevant, return navigation and focus to its valid parent. Dialog closure must not focus a removed element.
- Preserve `selectedPlanId` when circumstances invalidate it. Mark it **Needs review**; do not silently choose a replacement. A saved inactive-child combination must not resurrect child costs.
- Undo stores the previous root state in memory and creates a newer revision when restored. It is a single previous-state action, not a persistent history log.

## Deterministic planning and transport

`generatePlans` combines the bounded catalogue and tests requirements as **met**, **not-met** or **unknown**. Any failed essential requirement excludes a candidate; an unknown essential requirement makes it conditional. Ready and conditional plans remain separate. Missing information does not become an invented confirmation, and no-match output reports conflicts rather than weakening the user's constraints.

The current three objectives are Preserve cash, Reduce daily travel and Balance family priorities. The engine respects the order of selected objective preferences, avoids duplicate plan IDs and prefers distinct homes where possible. Cash ranks arrival payments alone; monthly household cost and stable record ID break ties. A regression fixture covers a lower-arrival-cost home that has higher recurring spending, so recurring costs cannot silently change this objective. Travel ranks combined prepared weekly minutes; family fit penalises missing in-school swimming and non-preferred areas, then travel. These are transparent prototype rules, not learned or live recommendations.

Travel uses prepared area-to-area estimates, not map-derived routing. School drop-off can form a chained home → school → founder-workplace journey. School-bus coverage is a separate record and requirement; a nearby public bus stop never satisfies it. Removing car access removes reliance on the rental-car arrangement and reevaluates supported public/school-bus/taxi packages. Missing prepared public journeys remain unknown. The one rental car is allocated to the founder; relevant partner office days receive a separate taxi allowance rather than silently sharing the same car.

## Money rules

Average monthly spending and dated cash payments are distinct views. Annual rent is divided by twelve for comparison but paid in four instalments in the schedule. School fees are averaged for cost comparison but paid in three instalments. Do not also subtract those averages from cash: that would double-count prepaid expenses.

`MoneyFlow` shows either monthly cost equivalents or the actual dated expense/deposit payments over twelve periods. Its period buttons support click, focus and hover inspection. It requires no opening cash or income because it is a spending view, not a balance forecast. Transfers are separate; deposits appear only in payment timing. Both account views retain partial-total and illustrative-date notes.

Refundable housing and rental-car deposits reduce available cash, are labelled separately and have no assumed refund. Payment amounts are signed; costs/deposits reduce balances, receipts increase them. Founder pay has matching business outflow and household inflow and is an internal transfer rather than additional external income.

Events cover twelve calendar periods and sort consistently, with expenses before receipts on the same date. Calendar arithmetic clamps month-end dates. Projections require the relevant known cash and receipts and valid chronological dates. Unknown cash or income leaves balances unavailable; specialist quotes and unpriced setup approvals remain visible as partial estimates.

Arrival timing can remain undecided. The editable planning reference date then anchors an **illustrative** schedule; the UI must not imply a committed arrival. The first 30 days are calculated from dated events, while arrival payments are their own summary.

The isolated fixture `financeFixture()` must continue returning **AED 33,600 initial payments**, **AED 66,400 remaining from AED 100,000 cash**, and **AED 13,000 average monthly expenses**. This is an arithmetic fixture, not a guarantee that the sample family's cheapest plan has those totals.

## Geography and data provenance

The catalogue includes four real area names — Al Reem Island, Al Maryah Island, Khalifa City and Al Raha Beach — with **eleven fictional homes, six fictional schools, three workspace anchors, three swimming activities and eight sample provider profiles**.

Hub71 is the primary real ecosystem reference at Al Khatem Tower, ADGM Square, Al Maryah Island. Its source is the [official contact page](https://www.hub71.com/contact); its map pin is approximate. The stable catalogue ID is `harbor-lab`. Its workspace allowance is synthetic and is explicitly **not a Hub71 quoted price**. Programme access, suitability and availability require confirmation.

Leaflet uses OpenStreetMap tiles with attribution. Healthcare, groceries, public stops and leisure venues are demo locations. Coloured dotted lines and haversine distances show straight-line proximity, **not roads, usable routes, opening hours, insurance coverage or travel minutes**. The map provides a readable place list even when tiles fail. Hobby answers filter nearby leisure suggestions only.

Housing contacts use masked UAE-format numbers such as `+971 50 XXX 0101`, which are deliberately non-dialable. Document-preparation and other providers are fictional previews. Enquiries, copied briefs and print output must not claim a message was sent or a booking was made. Sensitive financial fields in enquiry previews are opt-in rather than automatically included.

## Nori, Luna and server boundaries

The guide uses **`gpt-6-luna` through the Responses API**. The real credential belongs exclusively in ignored server environment configuration, normally `.env.local` as `OPENAI_API_KEY`. `.env.example` contains placeholders. Never print credentials, copy them into source or docs, commit them, or create a `NEXT_PUBLIC_` key variable.

`POST /api/guide` accepts a message, validated profile, selected-plan ID and profile revision. The server recomputes `effectiveProfile`, planning facts, selection status and proximity context. Client-supplied calculated totals are not authoritative. The prompt limits Nori to the bundled facts and permitted edit paths: it cannot create listings, fees, routes, admission confirmations or computed totals.

Model output is structured with Zod. Proposed edits are parsed, allowlisted, type-checked and applied to a clone for validation. The client displays before/after values and consequences. **Apply changes** is required to commit; **Discard** leaves the profile unchanged. A proposal or pending reply with an older revision cannot overwrite newer circumstances. Closing chat cancels a pending request. Failures and invalid replies have visible safe messages, while answer cards continue to work.

The current route is intentionally a **local-preview service**: it requires exact same-origin loopback requests, JSON content type, a bounded 32 KiB request body, messages up to 2,000 characters, 12 requests per minute and at most two concurrent calls. The SDK has a 25-second timeout, no automatic retries and `store: false`. These are process-local budget guards, not production authentication or a distributed limiter. Public deployment requires deliberately revisiting the loopback restriction and adding suitable production controls.

The latest live check after the user added API credits returned **HTTP 200, `available: true` and a real `gpt-6-luna` reply**. An earlier check had confirmed model access but returned `credit_balance_exhausted` / `insufficient_quota`; that result is historical. The UI handles unavailable credits, missing credentials, rejected keys and upstream failures while keeping the structured app usable. Banking preferences are not included in the relocation guide request.

The question mascot opens this same chat dialog. **Nori at work** is a separate local showcase: it shows the current estimate, then a fixed two-bedroom room enquiry on a 22-second text timer. It calls no model, specialist service or human contact. The two user-supplied recordings are copied unchanged into `public/audio/` and play through browser audio only after clicking. Playback pauses the conversation, and closing or replaying cancels it. The recordings are illustrative rather than verified transcripts or offers for the selected home. Live ElevenLabs generation and real provider conversations remain future integrations; the simulation must not confirm admission, availability, quotes or completed action.

## Banking boundary

Banking is an independent intake shown after the core relocation features. It records existing bank names, personal/business/both account interest, optional current bureau score, feature preferences and optional residency. The optional current Etihad score validates as an integer from 300–850, based on the official reference linked in `banking.ts`.

Results are fictional **account concepts and questions to investigate**, ranked only by account type and selected banking features. Scores, residency, hobbies and relocation assumptions do not determine product eligibility, loan limits, pricing or approval. Users choose whether copied banking questions include existing bank names or their supplied score. Changing or clearing banking must leave relocation plans, projections and Nori context unchanged.

## Running and verification

```sh
npm install
npm run dev
```

Open `http://localhost:3000`. The development and start scripts bind `0.0.0.0`; the guide route still accepts loopback browser origins only. Create server credentials separately if needed and restart after changing environment configuration.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

If Chromium is unavailable, run `npx playwright install chromium`. Playwright starts or reuses the development server and runs Desktop Chrome and iPhone 13 emulation in Chromium, one worker. Browser tests abort bulk map-tile requests so the suite does not rely on the tile service.

Use the **Current revision verification** record near the top of this document for the latest observed results. Previous counts and screenshots do not verify subsequent edits. Final checks should cover the short 6/8 flow, grouped ages and dormant restoration, bounded desktop/phone prompts with reachable actions, exact-question persistence, sketch toggles, spending without cash, start sound, clickable Nori, simulation/voice controls, keyboard access and reduced motion. Report the actual commands and counts that pass.

Inspect a production-server journey as well as the development preview when confirming prompt sizing and typography: production CSS ordering can differ. Check normal and shorter desktop/phone viewports, overflow, focus, cursor removal after welcome and JavaScript page errors.

Domain coverage includes money fixture and payment schedules, transport and constraint handling, conditional/no matches, inactive-profile filtering, validated guide edits, map provenance, banking independence and question applicability. Browser coverage includes both entry paths, sample no-car adjustment, exact-question reload, arbitrary revisiting, dormant branch restoration, Undo, selected-plan review, Nori confirmation/rejection/staleness/failure, keyboard and dialog focus, banking persistence, branch layout, cursor eligibility and question transitions. Inspect desktop and phone visually in addition to tests; disable animations for settled screenshots and test reduced motion separately.

## Repository and continuation

The configured origin is [adarshbaburaj/hub71ai-marhaba](https://github.com/adarshbaburaj/hub71ai-marhaba). Current history includes commit `09b4ebc` (`Initial Marhaba application`). A configured remote or local commit does not establish that new changes have been pushed or deployed. Check current Git state before reporting delivery.

The short onboarding, results sketches, money graph and Nori simulation are implemented; use the latest verification record for their check status. The cash-ranking correction has a regression test. Continue with the next user-directed change while preserving the deterministic planner and the invariants above. Avoid introducing connectors or image generation just because earlier messages offered them: this version does not need either.

Intentional future work includes secure document uploads and form filling, live listings and source refresh, real routing and timetables, confirmed school places, bank/provider applications, consented connectors, provider outreach, authentication, shared households, cross-device storage, individual school/curriculum choices per child and live voice generation. None should be presented as implemented. Passport or company-file handling needs a separate secure-upload design with access control, retention and deletion before collecting files.

For the next change, identify the controlling user instruction, read the relevant source and local Next.js guide, preserve the invariants above, make the concrete change, and run checks proportionate to its impact. Keep a distinction between fictional assumptions, calculated results and facts requiring outside confirmation.
