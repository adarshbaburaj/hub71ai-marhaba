# Marhaba

Marhaba connects business, home, school, transport and money decisions for founders considering a move to Abu Dhabi. Nori is the guide. The main planning journey runs with local demonstration data; optional Luna chat explains the calculated plans and proposes changes for the user to approve.

For a detailed account of the goal, completed work, architecture, current checks and continuation guidance, read [the project handoff](docs/PROJECT_HANDOFF.md). Both `AGENTS.md` and `CLAUDE.md` point new coding models to it.

The start is deliberately empty: choose whether to **move a business** or **start a startup**, then press **Let’s go / start** for a quiet two-note welcome chirp. A subtle cursor companion follows mouse movement on this page only. A bold black branching timeline sits on the left through Business, Household, Home, Transport and Money & priorities; one compact question sits on the right. Warm white pages, strong Inter typography and a small animated sage-and-cream gazelle Nori keep the experience simple and personal.

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

The latest local live check, after API credits were added, returned HTTP 200 with `available: true` and a real `gpt-6-luna` reply. An earlier check had exhausted credits. The structured experience continues to work if credentials, model access or credits become unavailable.

See [the complete colour palette](docs/colour-palette.md) for design tokens, map colours, Nori artwork and supporting shades.

## How the prototype works

- The quick flow asks six questions for solo founders or eight for families. **Add child** and **Remove last child** group child count and individual ages in one card; bedrooms share the neighbourhood card. Richer preferences stay under **More details** and editable branches. Only confirmed answers update plans; reload restores the precise question, Undo restores confirmed changes, and inactive answers remain saved. Budget examples come from synthetic plans and change the draft only until confirmed.
- Nori is a sage-and-cream SVG gazelle with big eyes, blinks, a waving hoof and a springy hop beside each question. A brief local thinking transition connects prompts. Click Nori to open Luna chat about the current question. The desktop timeline is a vertical outline on the left, with a compact prompt on the right; long answer content scrolls inside the card while actions remain visible. Phones keep the prompt and branches in normal page flow. Keyboard focus and reduced-motion preferences are supported; touch and reduced motion disable the start-page cursor effect.
- Compact neighbourhood and results sketches show approximate distances and prepared commute estimates. Work connections are red, school green and shopping blue, with Hub71 as the default reference. Distances identify their origin and remain straight-line estimates. Layer toggles change the drawing rather than the plan.
- The deterministic engine checks complete combinations, preserves essential requirements, and distinguishes ready, conditional and excluded plans. Changing transport recomputes journeys and spending. If no ready plan fits, explicit recovery scenarios show proposed changes and funding gaps; applying a suggestion recalculates the plan and supports Undo.
- Nori returns explanations and proposed edits. **Apply changes** confirms an edit; **Discard** leaves the answers unchanged. Proposals expire if the profile changes while a response is pending.
- Leaflet uses OpenStreetMap tiles with attribution. Demo pins cover homes, schools and nearby services; a place list remains usable when map tiles fail. Dotted lines and displayed distances indicate straight-line proximity, not verified routes or journey times.
- [Hub71's official address](https://www.hub71.com/contact) is the business anchor: Al Khatem Tower, ADGM Square, Al Maryah Island. Its pin is approximate. Workspace amounts are synthetic planning allowances, with programme access and availability requiring confirmation.
- All money is stored as integer fils. The **How spending moves** graph switches between monthly spending and payment timing, with selectable monthly periods and distinct deposit payments. It remains usable without opening cash or income; balance forecasts still require those inputs. Rent and school instalments are not deducted twice, deposits remain distinct, and founder pay creates matching business and household transfers. An undecided arrival uses the editable reference date for an explicitly illustrative 12-month schedule.
- **Nori at work** presents a two-bedroom enquiry as an iMessage-style conversation between Nori and Amaya, an estate-agent demo persona. Blue and gray bubbles include the supplied Nori WAV and estate-agent MP3 as clickable voice messages. The text repeats every 22 seconds, with Pause and Replay controls; listening pauses the conversation. Recordings are local, with no live ElevenLabs connection or provider outreach, and saved answers and plans stay unchanged.
- Banking is an independent intake and comparison. Synthetic account concepts use account type and selected features; credit scores and hobbies do not rank them or imply eligibility. The optional current score range is [300–850 according to Etihad Credit Bureau](https://etihadbureau.ae/Individual/CreditScore). Users choose whether copied questions include their bank names or score.

Use [the short demo script](docs/DEMO_SCRIPT.txt) for a talk track, example answers and the recorded voice controls.

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

This is a local prototype with up to 20 children and individual ages, a bounded synthetic catalogue (11 homes) and prepared travel estimates. School-age children share one curriculum and one school; nursery/further education quotes stay visible as unpriced needs. It has no live listings, verified admissions, provider outreach, bank applications, document uploads or real connector authentication. Nori's request limits are local preview guards, not production authentication or a distributed rate limiter. Future document collection needs an explicit secure-upload design before any passport or company files are accepted.

The configured GitHub origin is [hub71ai-marhaba](https://github.com/adarshbaburaj/hub71ai-marhaba). Deployment and pushing repository changes are separate steps.
