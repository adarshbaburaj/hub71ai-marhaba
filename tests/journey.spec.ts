import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Do not generate automated bulk requests against the community tile service.
  await page.route("**/tile.openstreetmap.org/**", route => route.abort());
  await page.goto("/");
});

async function savedMove(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("marhaba.move.v1")!));
}

function treeButtons(page: Page) {
  return page.locator('section[aria-label="Your move, taking shape"] button[data-move-node]:visible');
}

async function chooseBranch(page: Page, label: string) {
  await treeButtons(page).filter({ has: page.getByText(label, { exact: true }) }).click();
}

async function expectQuestion(page: Page, id: string) {
  const document = page.locator(".question-document");
  await expect(document).toHaveCount(1);
  await expect(document).toHaveAttribute("data-question-id", id);
  await expect(document.locator(".question-title")).toHaveCount(1);
  await expect(document.locator(".question-title")).toBeVisible();
  const controls = document.locator(".question-answer input, .question-answer select, .question-answer textarea");
  if (id === "child-age") {
    const children = (await savedMove(page)).profile.household.children;
    await expect(controls).toHaveCount(children);
    for (let child = 1; child <= children; child++) await expect(document.getByRole("spinbutton", { name: `Child ${child} age`, exact: true })).toBeVisible();
  } else expect(await controls.count()).toBeLessThanOrEqual(1);
  expect(await document.locator(".document-choices").count()).toBeLessThanOrEqual(1);
  await expect(document.getByRole("img", { name: "Nori, your guide", exact: true })).toBeVisible();
  return document;
}

async function advance(page: Page) {
  await page.getByRole("button", { name: /^(Continue|Apply changes|See my first plan)$/ }).click();
}

async function chooseAnswer(page: Page, id: string, label: string) {
  const document = await expectQuestion(page, id);
  await document.getByRole("button", { name: label, exact: true }).click();
  await advance(page);
}

async function startMove(page: Page, path: "move" | "start" = "move") {
  const label = path === "move" ? "Plan to move business to AD" : "Plan to start your startup in AD";
  await page.getByRole("radio", { name: label, exact: true }).click();
  await page.getByRole("button", { name: "Let’s go / start", exact: true }).click();
}

async function answerBusiness(page: Page) {
  await chooseAnswer(page, "business-field", "Software & technology");
  await expectQuestion(page, "household-composition");
  expect((await savedMove(page)).profile.business.workplaceId).toBe("harbor-lab");
}

test("the empty start offers exactly two business directions", async ({ page }) => {
  await expect(page.getByText("To Abu Dhabi; made easier", { exact: true })).toBeVisible();
  await expect(page.getByText("Hi, I’m Nori, your AI friend in UAE!", { exact: true })).toBeVisible();
  await expect(page.locator(".entry-option")).toHaveCount(2);
  await expect(page.getByRole("radio", { name: "Plan to move business to AD", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Plan to start your startup in AD", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Let’s go / start", exact: true })).toBeDisabled();
  await expect(page.locator(".blank-start input, .blank-start select, .blank-start textarea")).toHaveCount(0);
  await expect(page.locator('.blank-start section[aria-label="Your move, taking shape"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try a sample move", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Say hello to Nori", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Plan to move business to AD", exact: true })).toBeVisible();
  await expect(page.locator(".question-document")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("marhaba.move.v1"))).toBeNull();
});

test("the welcome chirp waits for start and the prompt mascot opens chat", async ({ page }) => {
  await page.evaluate(() => {
    const browser = window as unknown as { startTones: number[]; AudioContext: unknown };
    browser.startTones = [];
    browser.AudioContext = class {
      state = "running"; currentTime = 0; destination = {};
      createOscillator() {
        const frequency = { value: 0 };
        return { frequency, type: "sine", onended: null, connect() {},
          start() { browser.startTones.push(frequency.value); }, stop() {} };
      }
      createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
      close() { return Promise.resolve(); }
    };
  });
  await page.getByRole("radio", { name: "Plan to move business to AD", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { startTones: number[] }).startTones)).toEqual([]);
  await page.getByRole("button", { name: "Let’s go / start", exact: true }).click();
  await expectQuestion(page, "business-field");
  expect(await page.evaluate(() => (window as unknown as { startTones: number[] }).startTones)).toEqual([660, 880]);
  const profileBeforeChat = (await savedMove(page)).profile;
  await page.route("**/api/guide", async route => {
    const body = route.request().postDataJSON();
    await route.fulfill({ json: { explanation: "I can explain your first estimate and what needs confirming.", revision: body.revision, edits: [] } });
  });
  await page.getByRole("button", { name: "Ask Nori about this question", exact: true }).click();
  await page.getByLabel("What would you like to think through?").fill("How does this work?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("log", { name: "Guide conversation" })).toContainText("first estimate");
  expect((await savedMove(page)).profile).toEqual(profileBeforeChat);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Ask Nori about this question", exact: true })).toBeFocused();
});

test("Nori's agent conversations loop locally and voices play only on click", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Try a sample move", exact: true }).click();
  const before = await savedMove(page);
  await page.evaluate(() => {
    const browser = window as unknown as { demoVoices: string[]; demoPauses: string[]; rejectNextVoice: boolean; demoAudio: HTMLMediaElement | null };
    browser.demoVoices = []; browser.demoPauses = []; browser.rejectNextVoice = false; browser.demoAudio = null;
    Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: function(this: HTMLMediaElement) {
      browser.demoAudio = this;
      browser.demoVoices.push(new URL(this.src, location.href).pathname);
      if (browser.rejectNextVoice) { browser.rejectNextVoice = false; return Promise.reject(new DOMException("Playback blocked", "NotAllowedError")); }
      return Promise.resolve();
    } });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: function(this: HTMLMediaElement) {
      browser.demoPauses.push(new URL(this.src, location.href).pathname);
    } });
  });
  await page.clock.install();
  const trigger = page.getByRole("button", { name: "See Nori at work", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  const messages = dialog.locator("[data-simulation-message]");
  await expect(messages).toHaveCount(1);
  await expect(dialog.getByText("Amaya · Estate agent", { exact: true })).toBeVisible();
  await expect(dialog).not.toContainText(/fictional/i);
  await expect(dialog).toContainText("Simulation · no messages sent");
  expect(await page.evaluate(() => (window as unknown as { demoVoices: string[] }).demoVoices)).toEqual([]);
  await dialog.getByRole("button", { name: "Pause", exact: true }).click();
  await page.clock.runFor(5000);
  await expect(messages).toHaveCount(1);
  await dialog.getByRole("button", { name: "Resume", exact: true }).click();
  const noriVoice = messages.first().getByRole("button");
  await expect(noriVoice).toHaveAccessibleName("Voice message · Nori");
  await noriVoice.click();
  await expect(dialog.getByRole("status")).toContainText(/playing.*Nori/i);
  await expect(dialog.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { demoVoices: string[] }).demoVoices)).toEqual(["/audio/nori-enquiry.wav"]);
  await page.clock.runFor(5000);
  await expect(messages).toHaveCount(1);
  await page.evaluate(() => { (window as unknown as { demoAudio: HTMLMediaElement }).demoAudio.currentTime = .3; });
  await noriVoice.click();
  expect(await page.evaluate(() => (window as unknown as { demoAudio: HTMLMediaElement }).demoAudio.currentTime)).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { demoPauses: string[] }).demoPauses)).toContain("/audio/nori-enquiry.wav");
  await noriVoice.click();
  await dialog.getByRole("button", { name: "Replay", exact: true }).click();
  await expect(messages).toHaveCount(1);
  expect(await page.evaluate(() => (window as unknown as { demoAudio: HTMLMediaElement }).demoAudio.currentTime)).toBe(0);
  for (let count = 2; count <= 8; count++) {
    await page.clock.runFor(2200);
    await expect(messages).toHaveCount(count);
  }
  await expect(dialog).toContainText(/2BHK|two-bedroom/i);
  await expect(messages.first()).toHaveAttribute("data-message-direction", "outgoing");
  await expect(messages.nth(3)).toHaveAttribute("data-message-direction", "incoming");
  await messages.nth(7).getByRole("button", { name: "Voice message · estate agent", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { demoVoices: string[] }).demoVoices)).toEqual(["/audio/nori-enquiry.wav", "/audio/nori-enquiry.wav", "/audio/estate-agent-2bhk.mp3"]);
  await expect(dialog.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await page.clock.runFor(5000);
  await expect(messages).toHaveCount(8);
  await page.screenshot({ path: `test-results/nori-work-${test.info().project.name}.png` });
  await page.evaluate(() => { (window as unknown as { demoAudio: HTMLMediaElement }).demoAudio.currentTime = 1; });
  await dialog.getByRole("button", { name: "Replay", exact: true }).click();
  await expect(messages).toHaveCount(1);
  expect(await page.evaluate(() => (window as unknown as { demoAudio: HTMLMediaElement }).demoAudio.currentTime)).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { demoPauses: string[] }).demoPauses)).toContain("/audio/estate-agent-2bhk.mp3");
  for (let count = 2; count <= 10; count++) {
    await page.clock.runFor(2200);
    await expect(messages).toHaveCount(count);
  }
  await page.clock.runFor(2200);
  await expect(messages).toHaveCount(1);
  expect(await page.evaluate(() => (window as unknown as { demoVoices: string[] }).demoVoices)).toHaveLength(3);
  await page.evaluate(() => { (window as unknown as { rejectNextVoice: boolean }).rejectNextVoice = true; });
  await messages.first().getByRole("button", { name: "Voice message · Nori", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText(/could not play|unavailable|unable|cannot play|couldn’t play/i);
  await expect(dialog.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await messages.first().getByRole("button", { name: "Voice message · Nori", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText(/playing.*Nori/i);
  await page.evaluate(() => { (window as unknown as { demoAudio: HTMLMediaElement }).demoAudio.currentTime = .3; });
  await dialog.getByRole("button", { name: "Close Nori simulation", exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(await savedMove(page)).toEqual(before);
  expect(await page.evaluate(() => (window as unknown as { demoAudio: HTMLMediaElement }).demoAudio.currentTime)).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { demoPauses: string[] }).demoPauses.length)).toBeGreaterThanOrEqual(4);
});

test("Nori's recorded voice assets load and decode as non-silent audio", async ({ page }) => {
  const clips = await page.evaluate(async () => {
    const audio = new AudioContext();
    try {
      const decoded = [];
      for (const path of ["/audio/nori-enquiry.wav", "/audio/estate-agent-2bhk.mp3"]) {
        const response = await fetch(path);
        const bytes = await response.arrayBuffer();
        const buffer = await audio.decodeAudioData(bytes);
        decoded.push({ path, status: response.status, type: response.headers.get("content-type"), duration: buffer.duration,
          channels: buffer.numberOfChannels, nonSilent: buffer.getChannelData(0).some(value => Math.abs(value) > .001) });
      }
      return decoded;
    } finally { await audio.close(); }
  });
  expect(clips.map(clip => clip.path)).toEqual(["/audio/nori-enquiry.wav", "/audio/estate-agent-2bhk.mp3"]);
  for (const clip of clips) {
    expect(clip.status).toBe(200);
    expect(clip.type).toMatch(/^audio\//);
    expect(clip.duration).toBeGreaterThan(1);
    expect(clip.duration).toBeLessThan(10);
    expect(clip.channels).toBeGreaterThan(0);
    expect(clip.nonSilent).toBe(true);
  }
});

test("the decorative cursor stays on the start page and respects pointer and motion preferences", async ({ page }) => {
  const cursor = page.locator("[data-start-cursor]");
  await expect(cursor).toHaveCount(1);
  const eligible = await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches);
  await expect(cursor).toHaveAttribute("data-enabled", String(eligible));
  await page.mouse.move(260, 240);
  if (eligible) {
    await expect(cursor).toHaveAttribute("data-visible", "true");
    expect(await cursor.evaluate(element => getComputedStyle(element).pointerEvents)).toBe("none");
    const trail = cursor.locator("span").first();
    const before = await trail.evaluate(element => getComputedStyle(element).transform);
    await page.mouse.move(430, 300);
    await expect.poll(() => trail.evaluate(element => getComputedStyle(element).transform)).not.toBe(before);
  } else {
    await expect(cursor).toHaveAttribute("data-visible", "false");
    await expect(cursor).not.toBeVisible();
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(cursor).toHaveAttribute("data-enabled", "false");
  await expect(cursor).toHaveAttribute("data-visible", "false");
  await expect(cursor).not.toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(cursor).toHaveAttribute("data-enabled", String(eligible));
  await startMove(page);
  await expectQuestion(page, "business-field");
  await expect(cursor).toHaveCount(0);
});

test("question changes animate out and in while keeping a single focused prompt", async ({ page }) => {
  await startMove(page);
  const question = await expectQuestion(page, "business-field");
  await expect(page.locator("[data-question-transition]")).toHaveAttribute("data-question-transition", "steady");
  await question.getByRole("button", { name: "Software & technology", exact: true }).click();
  await page.evaluate(() => {
    const browser = window as unknown as {
      transitionCapture: Array<{ phase: string | null; id: string | null; questionCount: number }>;
      transitionObserver: MutationObserver;
    };
    browser.transitionCapture = [];
    browser.transitionObserver = new MutationObserver(() => {
      const wrapper = document.querySelector("[data-question-transition]");
      browser.transitionCapture.push({ phase: wrapper?.getAttribute("data-question-transition") ?? null,
        id: document.querySelector(".question-document")?.getAttribute("data-question-id") ?? null,
        questionCount: document.querySelectorAll(".question-document").length });
    });
    browser.transitionObserver.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ["data-question-transition"] });
  });
  await advance(page);
  const next = await expectQuestion(page, "household-composition");
  await expect(page.locator("[data-question-transition]")).toHaveAttribute("data-question-transition", "steady");
  const phases = await page.evaluate(() => {
    const browser = window as unknown as {
      transitionCapture: Array<{ phase: string | null; id: string | null; questionCount: number }>;
      transitionObserver: MutationObserver;
    };
    browser.transitionObserver.disconnect();
    return browser.transitionCapture;
  });
  expect(phases.some(frame => frame.phase === "exiting" && frame.id === "business-field")).toBe(true);
  expect(phases.some(frame => frame.phase === "entering" && frame.id === "household-composition")).toBe(true);
  expect(phases.every(frame => frame.questionCount === 1 || frame.phase === "thinking" && frame.questionCount === 0)).toBe(true);
  expect(phases.some(frame => frame.phase === "thinking")).toBe(true);
  await expect(next.locator(".question-title")).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const animations = await page.locator("[data-question-transition]").evaluate(element =>
    [element, ...element.querySelectorAll("*")].map(part => getComputedStyle(part).animationName));
  expect(animations.every(name => name === "none")).toBe(true);
  await chooseAnswer(page, "household-composition", "Just me");
  const home = await expectQuestion(page, "home-areas");
  await expect(home.locator(".question-title")).toBeFocused();
});

test("sample family connects plans, no-car changes, money and redacted enquiries", async ({ page }) => {
  await page.getByRole("button", { name: "Try a sample move" }).click();
  await expect(page.getByRole("heading", { name: "Your life, connected.", exact: true })).toBeVisible();
  await expect(page.locator(".plan-column")).toHaveCount(3);
  await expect(page.getByRole("region", { name: "Your connected places", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  const map = page.getByRole("region", { name: "Your Abu Dhabi proximity map", exact: true });
  await expect(map.getByRole("button", { name: "Work", exact: true })).toBeVisible();
  await expect(map.getByRole("button", { name: "Healthcare", exact: true })).toBeVisible();
  await expect(map.getByRole("button", { name: "Groceries", exact: true })).toBeVisible();
  await expect(map.getByRole("button", { name: "Public bus", exact: true })).toBeVisible();
  const before = await page.locator(".plan-column").first().locator(".plan-price-row").innerText();
  await page.locator(".plan-column").first().getByRole("button", { name: "Choose this plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your next chapter, taking shape." })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Explore", exact: true }).click();
  await page.getByLabel("Your transport", { exact: true }).selectOption("none");
  await expect(page.getByRole("status").first()).toContainText("Transport changed");
  await expect(page.getByRole("status").first()).toContainText("travel min/week");
  await expect(page.locator(".plan-column").first().locator(".plan-price-row")).not.toHaveText(before);
  await expect(page.locator(".plan-row").filter({ hasText: "Daily life" }).first()).not.toContainText("One rental car");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Your transport", { exact: true })).toHaveValue("rental");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Money", exact: true }).click();
  const flow = page.getByRole("region", { name: "How spending moves", exact: true });
  await expect(flow.getByRole("img")).toHaveAttribute("aria-label", /dated expense and deposit payments/);
  await flow.getByRole("button", { name: /^Period 2,/ }).click();
  await expect(flow.getByRole("button", { name: /^Period 2,/ })).toHaveAttribute("aria-pressed", "true");
  await flow.getByRole("button", { name: "Monthly spending", exact: true }).click();
  await expect(flow.getByRole("img")).toHaveAttribute("aria-label", /monthly-equivalent spending/);
  await page.screenshot({ path: `test-results/money-${test.info().project.name}.png`, fullPage: true });
  await expect(page.getByRole("heading", { name: "Dated payments & cash received" })).toBeVisible();
  await expect(page.locator(".payment-table-row").first()).toContainText("−AED");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Next steps", exact: true }).click();
  await page.getByRole("button", { name: /Education Guide/ }).click();
  await expect(page.getByRole("dialog")).toContainText("School enquiry");
  await expect(page.locator(".brief-preview")).not.toContainText("Opening business cash");
  await expect(page.locator(".brief-preview")).not.toContainText("Available household cash");
  await page.getByRole("button", { name: "Close brief" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "From a possibility to a plan." })).toBeVisible();
});

test("connected places show colored home connections and toggles keep plan facts unchanged", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Try a sample move", exact: true }).click();
  const before = await savedMove(page);
  const places = page.getByRole("region", { name: "Your connected places", exact: true });
  const layers = places.getByRole("group", { name: "Show connected places", exact: true });
  const expenses = page.getByRole("region", { name: "Monthly household expenses", exact: true });
  const originalCosts = await expenses.innerText();
  const work = places.locator('[aria-label^="Work:"]');
  const school = places.locator('[aria-label^="School:"]');
  const shopping = places.locator('[aria-label^="Shopping:"]');
  await expect(work).toHaveAttribute("aria-label", /Hub71/);
  for (const [node, color] of [[work, "Red"], [school, "Green"], [shopping, "Blue"]] as const) {
    await expect(node).toHaveAttribute("aria-label", new RegExp(`${color} connection from home`, "i"));
    await expect(node).toHaveAttribute("aria-label", /\d+\.\d km[\s\S]*straight-line/i);
  }
  for (const legend of ["Work · red", "School · green", "Shopping · blue"]) await expect(places).toContainText(legend);
  await page.screenshot({ path: `test-results/connected-places-${test.info().project.name}.png`, fullPage: true });
  const schoolToggle = layers.getByRole("button", { name: "School", exact: true });
  await schoolToggle.click();
  await expect(schoolToggle).toHaveAttribute("aria-pressed", "false");
  await expect(school).toHaveCount(0);
  await expect(places.locator('[data-connection="school"]')).toHaveCount(0);
  const shoppingToggle = layers.getByRole("button", { name: "Shopping", exact: true });
  await shoppingToggle.click();
  await expect(shoppingToggle).toHaveAttribute("aria-pressed", "false");
  await expect(shopping).toHaveCount(0);
  await expect(places.locator('[data-connection="shopping"]')).toHaveCount(0);
  await expect(work).toBeVisible();
  expect(await expenses.innerText()).toBe(originalCosts);
  expect(await savedMove(page)).toEqual(before);
  await schoolToggle.click();
  await shoppingToggle.click();
  await expect(school).toBeVisible();
  await expect(shopping).toBeVisible();
  await expect(places.locator('[data-connection="school"]')).not.toHaveCount(0);
  await expect(places.locator('[data-connection="shopping"]')).not.toHaveCount(0);
});

test("an alternative's inspector and enquiry keep that plan's home", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Try a sample move", exact: true }).click();
  const first = page.locator(".plan-column").first();
  const chosenHome = await first.locator(".plan-row").first().getByRole("button").innerText();
  await first.getByRole("button", { name: "Choose this plan", exact: true }).click();
  const selectedId = (await savedMove(page)).selectedPlanId;
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Explore", exact: true }).click();
  const other = page.locator(".plan-column").nth(1);
  const otherHome = await other.locator(".plan-row").first().getByRole("button").innerText();
  expect(otherHome).not.toBe(chosenHome);
  await other.locator(".plan-row").first().getByRole("button").click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: otherHome, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Prepare an enquiry", exact: true }).click();
  await expect(page.locator(".brief-preview")).toContainText(otherHome);
  await expect(page.locator(".brief-preview")).not.toContainText(chosenHome);
  expect((await savedMove(page)).selectedPlanId).toBe(selectedId);
  await page.getByRole("button", { name: "Close brief", exact: true }).click();
  await other.getByRole("button", { name: "Explore this plan", exact: true }).click();
  await expect(page.getByRole("region", { name: "Plan details", exact: true })).toBeFocused();
  await expect(page.locator(".plan-detail > .section-heading")).toContainText(otherHome);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("eight family questions retain each child's age and resume the exact microstep", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startMove(page);
  await answerBusiness(page);
  await expectQuestion(page, "household-composition");
  const initialNodes = await treeButtons(page).count();
  await chooseAnswer(page, "household-composition", "My partner, children and me");
  const ages = await expectQuestion(page, "child-age");
  await ages.getByRole("button", { name: "Add child", exact: true }).click();
  expect((await savedMove(page)).profile.household.children).toBe(1);
  await ages.getByRole("spinbutton", { name: "Child 1 age", exact: true }).fill("6");
  await ages.getByRole("spinbutton", { name: "Child 2 age", exact: true }).fill("12");
  await advance(page);
  await expectQuestion(page, "child-curriculum");
  expect(await treeButtons(page).count()).toBeGreaterThanOrEqual(initialNodes);
  const stored = await savedMove(page);
  expect(stored.profile.intent).toBe("move");
  expect(stored.profile.business.workplaceId).toBe("harbor-lab");
  expect(stored.profile.household.composition).toBe("family");
  expect(stored.profile.household.children).toBe(2);
  expect(stored.profile.household.childAges).toEqual([6, 12]);
  expect(stored.activeQuestionId).toBe("child-curriculum");
  await page.reload();
  await expectQuestion(page, "child-curriculum");
  await page.getByRole("button", { name: "Previous question", exact: true }).click();
  const restoredAges = await expectQuestion(page, "child-age");
  await expect(restoredAges.getByRole("spinbutton", { name: "Child 1 age", exact: true })).toHaveValue("6");
  await expect(restoredAges.getByRole("spinbutton", { name: "Child 2 age", exact: true })).toHaveValue("12");
  await restoredAges.getByRole("button", { name: "Remove last child", exact: true }).click();
  await expect(restoredAges.getByRole("spinbutton")).toHaveCount(1);
  await advance(page);
  expect((await savedMove(page)).profile.household.children).toBe(1);
  expect((await savedMove(page)).profile.household.childAges).toEqual([6, 12]);
  await page.getByRole("button", { name: "Previous question", exact: true }).click();
  const oneAge = await expectQuestion(page, "child-age");
  await oneAge.getByRole("button", { name: "Add child", exact: true }).click();
  await expect(oneAge.getByRole("spinbutton", { name: "Child 2 age", exact: true })).toHaveValue("12");
  await advance(page);
  await chooseAnswer(page, "child-curriculum", "British");
  const areas = await expectQuestion(page, "home-areas");
  await areas.getByRole("button", { name: "Al Reem Island", exact: true }).click();
  await advance(page);
  await chooseAnswer(page, "transport-car", "Yes, one rental car");
  await (await expectQuestion(page, "money-budget")).getByRole("spinbutton").fill("30000");
  await advance(page);
  const priorities = await expectQuestion(page, "priorities-order");
  await expect(priorities.locator(".question-step-label")).toHaveText("8 / 8 · QUICK PLAN");
  await advance(page);
  await expect(page.getByRole("heading", { name: "Your life, connected.", exact: true })).toBeVisible();
  const completed = await savedMove(page);
  expect(completed.profile.household.childAges).toEqual([6, 12]);
  expect(completed.profile.home.areas).toEqual(["reem"]);
  expect(completed.answeredQuestionIds.filter((id: string) => id !== "business-path")).toHaveLength(8);
});

test("Nori edits require confirmation and handles unavailable service", async ({ page }) => {
  await page.getByRole("button", { name: "Try a sample move" }).click();
  await page.route("**/api/guide", async route => {
    const body = route.request().postDataJSON();
    await route.fulfill({ json: { explanation: "A no-car plan will recheck supported school journeys and costs.", revision: body.revision, edits: [{ path: "transport.car", value: "none" }] } });
  });
  await page.getByRole("button", { name: "Ask Nori", exact: true }).click();
  await page.getByLabel("What would you like to think through?").fill("Remove the rental car");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("button", { name: "Apply changes", exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("marhaba.move.v1")!).profile.transport.car)).toBe("rental");
  await page.getByRole("button", { name: "Apply changes", exact: true }).click();
  await page.getByRole("button", { name: "Close guide" }).click();
  await expect(page.getByLabel("Your transport", { exact: true })).toHaveValue("none");
  await page.unroute("**/api/guide");
  await page.route("**/api/guide", route => route.fulfill({ status: 503, json: { error: "Nori is temporarily unavailable. Your answer cards still work." } }));
  await page.getByRole("button", { name: "Ask Nori", exact: true }).click();
  await page.getByLabel("What would you like to think through?").fill("Explain my plan");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
});

test("the new-business solo path skips irrelevant branches and respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startMove(page, "start");
  await answerBusiness(page);
  await chooseAnswer(page, "household-composition", "Just me");
  const areas = await expectQuestion(page, "home-areas");
  await areas.getByRole("spinbutton", { name: "Bedrooms", exact: true }).fill("1");
  await expect(treeButtons(page).filter({ hasText: "Your partner’s work" })).toHaveCount(0);
  await expect(treeButtons(page).filter({ hasText: "School & activities" })).toHaveCount(0);
  const stored = await savedMove(page);
  expect(stored.profile.intent).toBe("start");
  expect(stored.profile.household.composition).toBe("solo");
  expect(stored.profile.business.workplaceId).toBe("harbor-lab");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
  expect(overflow).toBe(false);
  const motion = await page.locator('.question-document [role="img"][aria-label="Nori, your guide"]').evaluate(element =>
    [element, ...element.querySelectorAll("*")].map(part => getComputedStyle(part).animationName));
  expect(motion.every(name => name === "none")).toBe(true);
  await advance(page);
  await chooseAnswer(page, "transport-car", "Yes, one rental car");
  const budget = await expectQuestion(page, "money-budget");
  await expect(budget).toContainText("Demo plans:");
  await budget.getByRole("button", { name: "Use this example", exact: true }).click();
  expect((await savedMove(page)).profile.money.monthlyBudget).toBeNull();
  await expect(budget.getByRole("spinbutton")).not.toHaveValue("");
  await budget.getByRole("spinbutton").fill("18000");
  await advance(page);
  const priorities = await expectQuestion(page, "priorities-order");
  await expect(priorities.locator(".question-step-label")).toHaveText("6 / 6 · QUICK PLAN");
  while (await priorities.locator('button[aria-pressed="true"]').count()) await priorities.locator('button[aria-pressed="true"]').first().click();
  await priorities.getByRole("button", { name: "Preserve cash", exact: true }).click();
  await priorities.getByRole("button", { name: "Shorter journeys", exact: true }).click();
  await advance(page);
  await expect(page.getByRole("heading", { name: "Your life, connected.", exact: true })).toBeVisible();
  const completed = await savedMove(page);
  expect(completed.view).toBe("workspace");
  expect(completed.profile.money.priorities).toEqual(["cash", "travel"]);
  expect(completed.profile.transport.car).toBe("rental");
  expect(completed.profile.money.monthlyBudget).toBe(1800000);
  expect(completed.answeredQuestionIds.filter((id: string) => id !== "business-path")).toHaveLength(6);
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Money", exact: true }).click();
  await expect(page.getByRole("region", { name: "How spending moves", exact: true }).getByRole("img")).toBeVisible();
  await expect(page.locator(".missing-cash")).toBeVisible();
});

test("area distances and journeys follow the chosen workplace and retain the shortlist", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startMove(page);
  await answerBusiness(page);
  await chooseAnswer(page, "household-composition", "Just me");
  const areas = await expectQuestion(page, "home-areas");
  const hub71 = areas.getByRole("group", { name: "Neighbourhoods around Hub71", exact: true });
  await expect(hub71.getByRole("button")).toHaveCount(4);
  const khalifa = hub71.getByRole("button", { name: "Khalifa City", exact: true });
  await expect(khalifa).toContainText("~36 min");
  await expect(khalifa).toContainText(/\d+\.\d km straight-line/);
  const originalDistance = (await khalifa.textContent())!.match(/\d+\.\d km straight-line/)![0];
  const sketch = areas.getByRole("group", { name: /^Illustrative daily life around/ });
  const layers = areas.getByRole("group", { name: "Show places in the local sketch", exact: true });
  await expect(layers.getByRole("button", { name: "School", exact: true })).toHaveCount(0);
  await expect(sketch.locator('[aria-label^="Work:"]')).toHaveAttribute("aria-label", /Hub71/);
  for (const [label, color] of [["Work", "Red"], ["Shopping", "Blue"]]) {
    const node = sketch.locator(`[aria-label^="${label}:"]`);
    await expect(node).toHaveAttribute("aria-label", new RegExp(`${color}[\\s\\S]*connection from sample home`, "i"));
    await expect(node).toHaveAttribute("aria-label", /\d+\.\d km straight-line/i);
  }
  await layers.getByRole("button", { name: "Shopping", exact: true }).click();
  await expect(layers.getByRole("button", { name: "Shopping", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(sketch.locator('[aria-label^="Shopping:"]')).toHaveCount(0);
  await expect(sketch.locator('[data-connection="shopping"]')).toHaveCount(0);
  await layers.getByRole("button", { name: "Shopping", exact: true }).click();
  expect((await savedMove(page)).profile.home.areas).toEqual([]);
  const promptBox = await areas.boundingBox();
  expect(promptBox!.width).toBeLessThanOrEqual(402);
  expect(promptBox!.height).toBeLessThanOrEqual(602);
  await page.screenshot({ path: `test-results/location-${test.info().project.name}.png`, fullPage: true });
  await khalifa.click();
  await expect(khalifa).toHaveAttribute("aria-pressed", "true");
  await advance(page);
  expect((await savedMove(page)).profile.home.areas).toEqual(["khalifa"]);
  await chooseBranch(page, "A place to work");
  await chooseAnswer(page, "workspace-type", "A flexible desk");
  await chooseAnswer(page, "workspace-anchor", "Orchard Works");
  await chooseBranch(page, "Home");
  await expectQuestion(page, "home-bedrooms");
  await advance(page);
  await chooseAnswer(page, "home-furnishing", "Either could work");
  await expectQuestion(page, "home-rent");
  await advance(page);
  const changedAreas = await expectQuestion(page, "home-areas");
  const orchard = changedAreas.getByRole("group", { name: "Neighbourhoods around Orchard Works", exact: true });
  await expect(changedAreas).toContainText(/Hub71 reference[\s\S]*\d+\.\d km/);
  const newKhalifa = orchard.getByRole("button", { name: "Khalifa City", exact: true });
  await expect(newKhalifa).toContainText("~8 min");
  await expect(newKhalifa).not.toContainText(originalDistance);
  await expect(newKhalifa).toHaveAttribute("aria-pressed", "true");
  expect((await savedMove(page)).profile.business.workplaceId).toBe("orchard-works");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)).toBe(false);
});

test("a single parent without a car gets reviewable recovery changes and can undo them", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startMove(page);
  await answerBusiness(page);
  await chooseAnswer(page, "household-composition", "My children and me");
  const ages = await expectQuestion(page, "child-age");
  await ages.getByRole("button", { name: "Add child", exact: true }).click();
  await ages.getByRole("spinbutton", { name: "Child 1 age", exact: true }).fill("7");
  await ages.getByRole("spinbutton", { name: "Child 2 age", exact: true }).fill("10");
  await advance(page);
  await chooseAnswer(page, "child-curriculum", "British");
  await expectQuestion(page, "home-areas");
  await expect(treeButtons(page).filter({ hasText: "Your partner’s work" })).toHaveCount(0);
  await advance(page);
  await chooseAnswer(page, "transport-car", "We won’t have a car");
  await (await expectQuestion(page, "money-budget")).getByRole("spinbutton").fill("1000");
  await advance(page);
  await expectQuestion(page, "priorities-order");
  await advance(page);
  await expect(page.getByRole("heading", { name: "A few changes worth exploring.", exact: true })).toBeVisible();
  await expect(page.locator(".plan-column")).toHaveCount(0);
  const before = await savedMove(page);
  expect(before.profile.household.composition).toBe("single-parent");
  expect(before.profile.money.monthlyBudget).toBe(100000);
  expect(before.profile.transport.car).toBe("none");
  const proposal = page.locator(".recovery-card").filter({ has: page.getByRole("button", { name: "Try these changes", exact: true }) }).first();
  await expect(proposal).toContainText("your answers have not changed");
  await expect(proposal.locator("li")).toContainText(["AED 1,000"]);
  expect((await savedMove(page)).profile).toEqual(before.profile);
  await proposal.getByRole("button", { name: "Try these changes", exact: true }).click();
  await expect(page.locator(".plan-column").first()).toBeVisible();
  const applied = await savedMove(page);
  expect(applied.profile.money.monthlyBudget).toBeGreaterThan(before.profile.money.monthlyBudget);
  expect(applied.profile.transport.car).toBe("none");
  expect(applied.profile.household).toEqual(before.profile.household);
  expect(applied.profile.money.cash).toBeNull();
  expect(applied.profile.money.monthlyIncome).toBeNull();
  expect(applied.selectedPlanId).toBeNull();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A few changes worth exploring.", exact: true })).toBeVisible();
  expect((await savedMove(page)).profile).toEqual(before.profile);
  await expect(page.locator(".plan-column")).toHaveCount(0);
});

test("all revealed tree branches stay reachable and their buttons do not overlap", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Try a sample move", exact: true }).click();
  await page.getByRole("button", { name: "Edit circumstances", exact: true }).click();
  const buttons = treeButtons(page);
  expect(await buttons.count()).toBeGreaterThanOrEqual(10);
  const overlaps = await buttons.evaluateAll(elements => {
    const bounds = elements.map(element => ({ label: element.getAttribute("aria-label"), box: element.getBoundingClientRect() }));
    const collisions: string[] = [];
    for (let left = 0; left < bounds.length; left++) for (let right = left + 1; right < bounds.length; right++) {
      const a = bounds[left], b = bounds[right];
      if (a.box.left < b.box.right - 1 && a.box.right > b.box.left + 1 && a.box.top < b.box.bottom - 1 && a.box.bottom > b.box.top + 1)
        collisions.push(`${a.label} overlaps ${b.label}`);
    }
    return collisions;
  });
  expect(overlaps).toEqual([]);
  for (const button of await buttons.all()) {
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
  await chooseBranch(page, "Money & priorities");
  const question = await expectQuestion(page, "money-budget");
  const prompt = page.locator('[data-active-prompt][data-stage="money"]');
  await expect(prompt).toBeVisible();
  await expect(prompt.locator(".question-document")).toHaveCount(1);
  expect(await question.evaluate(element => element.closest('section[aria-label="Your move, taking shape"]') !== null)).toBe(true);
  if (page.viewportSize()!.width > 850) {
    const timeline = page.locator('[data-move-timeline="desktop"]');
    await expect(timeline).toBeVisible();
    const stages = timeline.locator("[data-timeline-stage]");
    await expect(stages).toHaveCount(5);
    const positions = await stages.evaluateAll(elements => elements.map(element => ({
      stage: element.getAttribute("data-timeline-stage"), y: element.getBoundingClientRect().y,
    })));
    expect(positions.map(stage => stage.stage)).toEqual(["business", "household", "home", "transport", "money"]);
    for (let index = 1; index < positions.length; index++) {
      expect(positions[index].y).toBeGreaterThan(positions[index - 1].y);
    }
    const promptBox = await prompt.boundingBox();
    expect(promptBox!.width).toBeLessThanOrEqual(442);
    const timelineBox = await timeline.boundingBox();
    expect(timelineBox!.x + timelineBox!.width).toBeLessThanOrEqual(promptBox!.x);
    const promptOverlaps = await buttons.evaluateAll((elements, rectangle) => elements
      .filter(element => {
        const box = element.getBoundingClientRect();
        return box.left < rectangle.x + rectangle.width - 1 && box.right > rectangle.x + 1 && box.top < rectangle.y + rectangle.height - 1 && box.bottom > rectangle.y + 1;
      }).map(element => element.getAttribute("data-move-node")), promptBox!);
    expect(promptOverlaps).toEqual([]);
  } else {
    await expect(page.getByRole("navigation", { name: "Your move branches", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)).toBe(false);
  }
});

test("removing the active child branch recovers parent focus and undo restores it", async ({ page }) => {
  await page.getByRole("button", { name: "Try a sample move", exact: true }).click();
  await page.getByRole("button", { name: "Edit circumstances", exact: true }).click();
  await chooseBranch(page, "School & activities");
  await expectQuestion(page, "child-age");
  await page.route("**/api/guide", async route => {
    const body = route.request().postDataJSON();
    await route.fulfill({ json: { explanation: "School planning will become dormant; your child’s answers stay saved.", revision: body.revision, edits: [{ path: "household.composition", value: "solo" }] } });
  });
  await page.getByRole("button", { name: "Ask Nori", exact: true }).click();
  await page.getByLabel("What would you like to think through?").fill("I am moving on my own.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Apply changes", exact: true }).click();
  await page.getByRole("button", { name: "Close guide", exact: true }).click();
  const household = await expectQuestion(page, "household-composition");
  await expect(household.locator(".question-title")).toBeFocused();
  expect((await savedMove(page)).activeNode).toBe("household");
  expect((await savedMove(page)).profile.household.child.age).toBe(8);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  const child = await expectQuestion(page, "child-age");
  await expect(child.getByRole("spinbutton")).toHaveValue("8");
  await expect(child.locator(".question-title")).toBeFocused();
  await page.reload();
  await expectQuestion(page, "child-age");
});

test("family branches become dormant, undo restores them and old suggestions expire", async ({ page }) => {
  await page.getByRole("button", { name: "Try a sample move" }).click();
  await page.locator(".plan-column").first().getByRole("button", { name: "Choose this plan", exact: true }).click();
  await page.route("**/api/guide", async route => {
    const body = route.request().postDataJSON();
    await route.fulfill({ json: { explanation: "This change will recheck travel and money.", revision: body.revision, edits: [{ path: "transport.car", value: "none" }] } });
  });
  await page.getByRole("button", { name: "Ask Nori", exact: true }).click();
  await page.getByLabel("What would you like to think through?").fill("Remove car access");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("button", { name: "Apply changes", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close guide" }).click();
  await page.getByRole("button", { name: "Edit circumstances" }).click();
  await chooseBranch(page, "Household");
  await chooseAnswer(page, "household-composition", "Just me");
  await expectQuestion(page, "lifestyle-hobbies");
  const stored = await savedMove(page);
  expect(stored.profile.household.composition).toBe("solo");
  expect(stored.profile.household.child.age).toBe(8);
  expect(stored.selectedPlanId).toBeTruthy();
  await expect(treeButtons(page).filter({ hasText: "School & activities" })).toHaveCount(0);
  await expect(treeButtons(page).filter({ hasText: "Your partner’s work" })).toHaveCount(0);
  await page.getByRole("button", { name: "Ask Nori", exact: true }).click();
  await expect(page.locator(".guide-notice")).toContainText("discarded");
  await expect(page.getByRole("dialog").getByRole("button", { name: "Apply changes", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close guide" }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect((await savedMove(page)).profile.household.composition).toBe("family");
  await chooseBranch(page, "Household");
  await chooseAnswer(page, "household-composition", "Just me");
  await chooseBranch(page, "Household");
  await chooseAnswer(page, "household-composition", "My partner, children and me");
  await chooseBranch(page, "School & activities");
  const child = await expectQuestion(page, "child-age");
  await expect(child.getByRole("spinbutton")).toHaveValue("8");
  await advance(page);
  const curriculum = await expectQuestion(page, "child-curriculum");
  await expect(curriculum.getByRole("button", { name: "British", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "View my move" }).click();
  await expect(page.locator(".plan-status")).toContainText("Chosen");
});

test("banking saves separately and leaves the relocation projection unchanged", async ({ page }) => {
  await page.getByRole("button", { name: "Try a sample move" }).click();
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Money", exact: true }).click();
  const money = await page.locator(".money-stats").innerText();
  const moveBefore = await page.evaluate(() => localStorage.getItem("marhaba.move.v1"));
  await page.getByText("Tell Nori what you need from banking", { exact: true }).click();
  await page.getByLabel(/Banks you already use/).fill("Current Bank");
  await page.getByRole("button", { name: "Personal and business", exact: true }).click();
  await page.getByRole("button", { name: "I have a score", exact: true }).click();
  await page.getByLabel(/Current report score/).fill("720");
  await page.getByRole("button", { name: "Prepare comparison", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your account concepts" })).toBeVisible();
  await expect(page.locator(".money-stats")).toHaveText(money, { useInnerText: true });
  expect(await page.evaluate(() => localStorage.getItem("marhaba.move.v1"))).toBe(moveBefore);
  await page.reload();
  await expect(page.getByLabel(/Banks you already use/)).toHaveValue("Current Bank");
  await expect(page.getByLabel(/Current report score/)).toHaveValue("720");
  await page.getByRole("button", { name: "Clear banking preferences", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your account concepts" })).toHaveCount(0);
});

test("Nori welcomes keyboard users and rejected suggestions do not change answers", async ({ page }) => {
  const entry = page.getByRole("radio", { name: "Plan to move business to AD", exact: true });
  await entry.focus();
  await expect(entry).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(entry).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Let’s go / start", exact: true }).click();
  const document = await expectQuestion(page, "business-field");
  await expect(document.locator(".question-title")).toBeFocused();
  await page.route("**/api/guide", async route => {
    const body = route.request().postDataJSON();
    await route.fulfill({ json: { explanation: "A proposed spending limit.", revision: body.revision, edits: [{ path: "money.monthlyBudget", value: 1800000 }] } });
  });
  await page.getByRole("button", { name: "Ask Nori", exact: true }).click();
  await page.getByLabel("What would you like to think through?").fill("Set my spending limit to AED 18,000");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(page.locator(".guide-notice")).toContainText("stay as they are");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("marhaba.move.v1")!).profile.money.monthlyBudget)).toBeNull();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Ask Nori", exact: true })).toBeFocused();
});
