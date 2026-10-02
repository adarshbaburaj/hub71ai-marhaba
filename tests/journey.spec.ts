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
  expect(await controls.count()).toBeLessThanOrEqual(1);
  expect(await document.locator(".document-choices").count()).toBeLessThanOrEqual(1);
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

test("the empty start offers exactly two business directions", async ({ page }) => {
  await expect(page.locator(".entry-option")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Scale my business", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start a new business", exact: true })).toBeVisible();
  await expect(page.locator(".landing input, .landing select, .landing textarea")).toHaveCount(0);
  await expect(page.locator('.landing section[aria-label="Your move, taking shape"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try a sample move", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Say hello to Nori", exact: true }).click();
  await expect(page.getByRole("button", { name: "Scale my business", exact: true })).toBeVisible();
  await expect(page.locator(".question-document")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("marhaba.move.v1"))).toBeNull();
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
  await page.getByRole("button", { name: "Scale my business", exact: true }).click();
  await expectQuestion(page, "business-field");
  await expect(cursor).toHaveCount(0);
});

test("question changes animate out and in while keeping a single focused prompt", async ({ page }) => {
  await page.getByRole("button", { name: "Scale my business", exact: true }).click();
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
  const next = await expectQuestion(page, "business-description");
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
  expect(phases.some(frame => frame.phase === "entering" && frame.id === "business-description")).toBe(true);
  expect(phases.every(frame => frame.questionCount === 1)).toBe(true);
  await expect(next.locator(".question-title")).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const animations = await page.locator("[data-question-transition]").evaluate(element =>
    [element, ...element.querySelectorAll("*")].map(part => getComputedStyle(part).animationName));
  expect(animations.every(name => name === "none")).toBe(true);
  await next.getByRole("textbox").fill("A software startup.");
  await advance(page);
  const team = await expectQuestion(page, "business-team");
  await expect(team.locator(".question-title")).toBeFocused();
});

test("sample family connects plans, no-car changes, money and redacted enquiries", async ({ page }) => {
  await page.getByRole("button", { name: "Try a sample move" }).click();
  await expect(page.getByRole("heading", { name: "Different ways to feel at home." })).toBeVisible();
  await expect(page.locator(".plan-column")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Work", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Healthcare", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Groceries", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Public bus", exact: true })).toBeVisible();
  const before = await page.locator(".plan-column").first().locator(".plan-price-row").innerText();
  await page.locator(".plan-column").first().getByRole("button", { name: "Choose this plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your next chapter, taking shape." })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Explore", exact: true }).click();
  await page.getByLabel("Your transport", { exact: true }).selectOption("none");
  await expect(page.getByRole("status").first()).toContainText("Transport changed");
  await expect(page.locator(".plan-column").first().locator(".plan-price-row")).not.toHaveText(before);
  await expect(page.locator(".plan-row").filter({ hasText: "Daily life" }).first()).not.toContainText("One rental car");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Your transport", { exact: true })).toHaveValue("rental");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Money", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dated payments & cash received" })).toBeVisible();
  await expect(page.locator(".payment-table-row").first()).toContainText("−AED");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Next steps", exact: true }).click();
  await page.getByRole("button", { name: /Sample Education Guide/ }).click();
  await expect(page.getByRole("dialog")).toContainText("School enquiry");
  await expect(page.locator(".brief-preview")).not.toContainText("Opening business cash");
  await expect(page.locator(".brief-preview")).not.toContainText("Available household cash");
  await page.getByRole("button", { name: "Close brief" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "From a possibility to a plan." })).toBeVisible();
});

test("one question at a time grows the family tree and resumes the exact microstep", async ({ page }) => {
  await page.getByRole("button", { name: "Scale my business", exact: true }).click();
  await expectQuestion(page, "business-field");
  const initialNodes = await treeButtons(page).count();
  await chooseAnswer(page, "business-field", "Software & technology");
  const idea = await expectQuestion(page, "business-description");
  await idea.getByRole("textbox").fill("We’re expanding a software company.");
  await advance(page);
  const team = await expectQuestion(page, "business-team");
  await team.getByRole("spinbutton").fill("2");
  await advance(page);
  await chooseAnswer(page, "workspace-type", "Mostly from home");
  await chooseAnswer(page, "business-finance-toggle", "I’ll leave that for later");
  await chooseAnswer(page, "household-composition", "My family, including a child");
  await chooseAnswer(page, "partner-work", "They work remotely");
  const child = await expectQuestion(page, "child-age");
  await child.getByRole("spinbutton").fill("8");
  await advance(page);
  await chooseAnswer(page, "child-curriculum", "British");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await chooseAnswer(page, "child-swimming", "Yes, keep swimming in the plan");
  await chooseAnswer(page, "child-bus", "No, other arrangements could work");
  await expectQuestion(page, "lifestyle-hobbies");
  expect(await treeButtons(page).count()).toBeGreaterThan(initialNodes);
  const stored = await savedMove(page);
  expect(stored.profile.intent).toBe("move");
  expect(stored.profile.business.sector).toBe("Software");
  expect(stored.profile.business.teamSize).toBe(2);
  expect(stored.profile.household.partner.work).toBe("remote");
  expect(stored.profile.household.child.age).toBe(8);
  expect(stored.profile.household.child.curriculum).toBe("British");
  expect(stored.activeQuestionId).toBe("lifestyle-hobbies");
  await page.reload();
  await expectQuestion(page, "lifestyle-hobbies");
  await page.getByRole("button", { name: "Previous question", exact: true }).click();
  const bus = await expectQuestion(page, "child-bus");
  await expect(bus.getByRole("button", { name: "No, other arrangements could work", exact: true })).toHaveAttribute("aria-pressed", "true");
  await chooseBranch(page, "School & activities");
  const restoredAge = await expectQuestion(page, "child-age");
  await expect(restoredAge.getByRole("spinbutton")).toHaveValue("8");
  await chooseBranch(page, "Business");
  const business = await expectQuestion(page, "business-field");
  await expect(business.getByRole("button", { name: "Software & technology", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expectQuestion(page, "business-field");
});

test("Nori edits require confirmation and handles unavailable service", async ({ page }) => {
  await page.getByRole("button", { name: "Try a sample move" }).click();
  await page.route("**/api/guide", async route => {
    const body = route.request().postDataJSON();
    await route.fulfill({ json: { explanation: "A no-car plan will recheck supported school journeys and costs.", revision: body.revision, edits: [{ path: "transport.car", value: "none" }] } });
  });
  await page.getByRole("button", { name: "Ask Nori" }).click();
  await page.getByLabel("What would you like to think through?").fill("Remove the rental car");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("button", { name: "Apply changes", exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("marhaba.move.v1")!).profile.transport.car)).toBe("rental");
  await page.getByRole("button", { name: "Apply changes", exact: true }).click();
  await page.getByRole("button", { name: "Close guide" }).click();
  await expect(page.getByLabel("Your transport", { exact: true })).toHaveValue("none");
  await page.unroute("**/api/guide");
  await page.route("**/api/guide", route => route.fulfill({ status: 503, json: { error: "Nori is temporarily unavailable. Your answer cards still work." } }));
  await page.getByRole("button", { name: "Ask Nori" }).click();
  await page.getByLabel("What would you like to think through?").fill("Explain my plan");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
});

test("the new-business solo path skips irrelevant branches and respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Start a new business", exact: true }).click();
  await chooseAnswer(page, "business-field", "I’m still exploring");
  await expectQuestion(page, "business-description");
  await page.getByRole("button", { name: "Skip for now", exact: true }).click();
  await expectQuestion(page, "business-team");
  await advance(page);
  await chooseAnswer(page, "workspace-type", "Mostly from home");
  await chooseAnswer(page, "business-finance-toggle", "I’ll leave that for later");
  await chooseAnswer(page, "household-composition", "Just me");
  await expectQuestion(page, "lifestyle-hobbies");
  await expect(treeButtons(page).filter({ hasText: "Your partner’s work" })).toHaveCount(0);
  await expect(treeButtons(page).filter({ hasText: "School & activities" })).toHaveCount(0);
  const stored = await savedMove(page);
  expect(stored.profile.intent).toBe("start");
  expect(stored.profile.household.composition).toBe("solo");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
  expect(overflow).toBe(false);
  const motion = await page.locator('.question-document [role="img"][aria-label="Nori, your guide"]').evaluate(element =>
    [element, ...element.querySelectorAll("*")].map(part => getComputedStyle(part).animationName));
  expect(motion.every(name => name === "none")).toBe(true);
  await chooseAnswer(page, "lifestyle-hobbies", "Running");
  const routine = await expectQuestion(page, "lifestyle-routine");
  await routine.getByRole("textbox").fill("A morning run before work.");
  await advance(page);
  const bedrooms = await expectQuestion(page, "home-bedrooms");
  await bedrooms.getByRole("spinbutton").fill("2");
  await advance(page);
  await chooseAnswer(page, "home-furnishing", "Either could work");
  const rent = await expectQuestion(page, "home-rent");
  await rent.getByRole("spinbutton").fill("90000");
  await advance(page);
  await chooseAnswer(page, "home-areas", "Al Reem Island");
  await chooseAnswer(page, "transport-car", "Yes, one rental car");
  const commute = await expectQuestion(page, "transport-commute");
  await commute.getByRole("spinbutton").fill("30");
  await advance(page);
  for (const [id, amount] of [["money-budget", "15000"], ["money-cash", "100000"], ["money-income", "15000"], ["money-reserve", "5000"]]) {
    const money = await expectQuestion(page, id);
    await money.getByRole("spinbutton").fill(amount);
    await advance(page);
  }
  await expectQuestion(page, "money-arrival");
  await page.getByRole("button", { name: "Skip for now", exact: true }).click();
  const reference = await expectQuestion(page, "money-reference");
  await reference.getByLabel("Which date should we use for planning?", { exact: true }).fill("2026-12-01");
  await advance(page);
  const priorities = await expectQuestion(page, "priorities-order");
  while (await priorities.locator('button[aria-pressed="true"]').count()) await priorities.locator('button[aria-pressed="true"]').first().click();
  await priorities.getByRole("button", { name: "Preserve cash", exact: true }).click();
  await priorities.getByRole("button", { name: "Shorter journeys", exact: true }).click();
  await advance(page);
  await expect(page.getByRole("heading", { name: "Different ways to feel at home." })).toBeVisible();
  const completed = await savedMove(page);
  expect(completed.view).toBe("workspace");
  expect(completed.profile.lifestyle.hobbies).toEqual(["Running"]);
  expect(completed.profile.money.monthlyBudget).toBe(1_500_000);
  expect(completed.profile.money.cash).toBe(10_000_000);
  expect(completed.profile.money.referenceDate).toBe("2026-12-01");
  expect(completed.profile.money.priorities).toEqual(["cash", "travel"]);
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
  await expectQuestion(page, "money-budget");
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
  await page.getByRole("button", { name: "Ask Nori" }).click();
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
  await page.getByRole("button", { name: "Ask Nori" }).click();
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
  await page.getByRole("button", { name: "Ask Nori" }).click();
  await expect(page.locator(".guide-notice")).toContainText("discarded");
  await expect(page.getByRole("dialog").getByRole("button", { name: "Apply changes", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close guide" }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect((await savedMove(page)).profile.household.composition).toBe("family");
  await chooseBranch(page, "Household");
  await chooseAnswer(page, "household-composition", "Just me");
  await chooseBranch(page, "Household");
  await chooseAnswer(page, "household-composition", "My family, including a child");
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
  await page.getByRole("button", { name: "Prepare demo comparison", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your demo account concepts" })).toBeVisible();
  await expect(page.locator(".money-stats")).toHaveText(money, { useInnerText: true });
  expect(await page.evaluate(() => localStorage.getItem("marhaba.move.v1"))).toBe(moveBefore);
  await page.reload();
  await expect(page.getByLabel(/Banks you already use/)).toHaveValue("Current Bank");
  await expect(page.getByLabel(/Current report score/)).toHaveValue("720");
  await page.getByRole("button", { name: "Clear banking preferences", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your demo account concepts" })).toHaveCount(0);
});

test("Nori welcomes keyboard users and rejected suggestions do not change answers", async ({ page }) => {
  const entry = page.getByRole("button", { name: "Scale my business", exact: true });
  await entry.focus();
  await expect(entry).toBeFocused();
  await page.keyboard.press("Enter");
  const document = await expectQuestion(page, "business-field");
  await expect(document.locator(".question-title")).toBeFocused();
  await page.route("**/api/guide", async route => {
    const body = route.request().postDataJSON();
    await route.fulfill({ json: { explanation: "A proposed spending limit.", revision: body.revision, edits: [{ path: "money.monthlyBudget", value: 1800000 }] } });
  });
  await page.getByRole("button", { name: "Ask Nori" }).click();
  await page.getByLabel("What would you like to think through?").fill("Set my spending limit to AED 18,000");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(page.locator(".guide-notice")).toContainText("stay as they are");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("marhaba.move.v1")!).profile.money.monthlyBudget)).toBeNull();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Ask Nori" })).toBeFocused();
});
