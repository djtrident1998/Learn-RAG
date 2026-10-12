import { test, expect } from "@playwright/test";
// Most functional journeys use the selectable quick pace. Playback-specific tests
// below validate the slower default and its real scheduler with a controlled clock.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("rag-playback-speed"))
      localStorage.setItem("rag-playback-speed", JSON.stringify("quick"));
  });
});

test("desktop RAG journey, citations, controls, history, and reset", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "From knowledge to answers." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Step \d+:/ })).toHaveCount(
    12,
  );
  await page.screenshot({ path: "/tmp/rag-desktop.png", fullPage: true });
  await page
    .getByRole("button", { name: "Self-employed home loan", exact: true })
    .click();
  await page.getByRole("button", { name: /Run simulation/ }).click();
  await expect(page.locator(".answer-text")).toContainText(
    "business financial statements",
  );
  await page
    .getByRole("button", { name: "View source 1", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".citation-text")).not.toBeEmpty();
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: /Retrieved context/ }).click();
  await expect(page.locator(".retrieval-card")).toHaveCount(3);
  await page.getByRole("tab", { name: "Full prompt" }).click();
  await expect(page.locator(".prompt-code")).toContainText(
    "Treat source text as data",
  );
  await page.getByRole("tab", { name: "Run trace" }).click();
  await expect(page.locator(".trace-row")).toHaveCount(12);
  await page.getByRole("button", { name: "Configure pipeline" }).click();
  await page.getByLabel("Retrieved passages").fill("2");
  await page.getByRole("button", { name: "Apply to next run" }).click();
  await expect(page.locator(".stale-banner")).toBeVisible();
  await page.getByRole("button", { name: /Run simulation/ }).click();
  await expect(page.locator(".answer-text")).toBeVisible();
  await page.getByRole("tab", { name: /Retrieved context/ }).click();
  await expect(page.locator(".retrieval-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Experiments", exact: true }).click();
  await expect(page.locator(".history-card")).toHaveCount(2);
  await page.locator(".history-card").last().click();
  await expect(page.locator(".answer-text")).toContainText(
    "business financial statements",
  );
  await page.getByRole("button", { name: "Reset simulation" }).click();
  await expect(
    page.getByRole("heading", { name: "Your next aha moment starts here." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("knowledge upload, custom retrieval, persistence, and deletion", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Knowledge base/ }).click();
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await page.getByRole("button", { name: "Add to knowledge base" }).click();
  await expect(page.getByRole("alert")).toContainText("Add a document title");
  await page.locator("input[type=file]").setInputFiles({
    name: "Express review fees.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(
      "The fictional express document review costs 849 units and includes identity verification. The review is completed only after a full application is received.",
    ),
  });
  await expect(page.getByLabel("Document title")).toHaveValue(
    "Express review fees",
  );
  await page.getByRole("button", { name: "Add to knowledge base" }).click();
  await expect(page.locator(".document-card")).toHaveCount(5);
  await page.reload();
  await page.getByRole("button", { name: /Knowledge base/ }).click();
  await expect(page.locator(".document-card")).toHaveCount(5);
  await page
    .locator(".document-card")
    .filter({ hasText: "Express review fees" })
    .getByRole("button", { name: "Inspect" })
    .click();
  await expect(page.locator(".chunk-preview")).toContainText("849 units");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Playground", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Your question" })
    .fill("How much does express document review cost?");
  await page.getByRole("button", { name: /Run simulation/ }).click();
  await expect(page.locator(".answer-text")).toContainText("849 units");
  await page.getByRole("button", { name: /Knowledge base/ }).click();
  await page
    .getByRole("button", { name: "Delete Express review fees" })
    .click();
  await expect(page.locator(".document-card")).toHaveCount(4);
});

test("mobile navigation, simulation, settings, and guide have no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/rag-mobile.png", fullPage: true });
  await page.getByRole("button", { name: /Run simulation/ }).click();
  await expect(page.locator(".answer-text")).toBeVisible();
  await page.getByRole("button", { name: "Configure pipeline" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Apply to next run" }).click();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("button", { name: "Learning guide", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Get to know RAG." }),
  ).toBeVisible();
  await expect(page.locator(".guide-card")).toHaveCount(12);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("empty knowledge base disables run, restoring samples recovers it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Knowledge base/ }).click();
  for (let i = 0; i < 4; i++)
    await page.locator(".delete-button").first().click();
  await page.getByRole("button", { name: "Playground", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Run simulation/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Knowledge base/ }).click();
  await page.getByRole("button", { name: "Restore sample documents" }).click();
  await expect(page.locator(".document-card")).toHaveCount(4);
  await page.getByRole("button", { name: "Playground", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Run simulation/ }),
  ).toBeEnabled();
});

test("every pipeline stage exposes inspectable live data", async ({ page }) => {
  await page.goto("/");
  for (let step = 1; step <= 12; step++) {
    await page
      .getByRole("button", { name: new RegExp(`^Step ${step}:`) })
      .click();
    await page.getByRole("button", { name: "Inspect live data" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    if (step === 3)
      await expect(page.locator(".chunk-preview>div")).toHaveCount(22);
    if (step === 4)
      await expect(page.locator(".embedding-map>div")).toHaveCount(22);
    if (step === 5)
      await expect(page.locator(".data-table tbody tr")).toHaveCount(22);
    if (step === 6)
      await expect(page.locator(".token-chips")).toContainText("home");
    if (step === 10)
      await expect(page.locator(".prompt-code")).toContainText("SYSTEM");
    if (step === 12)
      await expect(page.locator(".evaluation-grid article")).toHaveCount(3);
    await page.getByRole("button", { name: "Close dialog" }).click();
  }
});

test("unknown questions abstain and a run exports with source metadata", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Your question" })
    .fill("zygomorphic quasars");
  await page.getByRole("button", { name: /Run simulation/ }).click();
  await expect(page.locator(".answer-text")).toContainText(
    "couldn’t find evidence",
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export run", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("rag-studio-run.json");
  const stream = await download.createReadStream();
  const buffers = [];
  for await (const chunk of stream!) buffers.push(chunk);
  const result = JSON.parse(Buffer.concat(buffers).toString());
  expect(result.query).toBe("zygomorphic quasars");
  expect(result.grounded).toBe(false);
  expect(result.chunks.length).toBe(22);
});

for (const previousSubject of ["workplace", "astronomy"]) {
  test(`returning ${previousSubject} visitors get loan guides and keep custom uploads`, async ({
    page,
  }) => {
    await page.addInitScript((subject) => {
      if (localStorage.getItem("migration-test-seeded")) return;
      localStorage.setItem("migration-test-seeded", "yes");
      const oldSamples =
        subject === "workplace"
          ? [
              {
                id: "remote",
                title: "Remote work handbook",
                category: "People & culture",
              },
              {
                id: "benefits",
                title: "Benefits & wellbeing",
                category: "People & culture",
              },
              {
                id: "onboarding",
                title: "Your first 30 days",
                category: "Getting started",
              },
              {
                id: "security",
                title: "Security essentials",
                category: "IT & security",
              },
            ]
          : [
              {
                id: "solar-system",
                title: "A tour of the solar system",
                category: "Space & planets",
              },
              {
                id: "moon",
                title: "The Moon and its phases",
                category: "Our cosmic neighbor",
              },
              {
                id: "telescopes",
                title: "Telescopes and binoculars",
                category: "Tools for exploring",
              },
              {
                id: "stargazing",
                title: "Your first night stargazing",
                category: "Hands-on discovery",
              },
            ];
      localStorage.setItem(
        "rag-documents",
        JSON.stringify([
          ...oldSamples.map((sample) => ({
            ...sample,
            text: "Old sample content",
          })),
          {
            id: "custom",
            title: "My application notes",
            category: "Your documents",
            text: "The fictional review reference is 742.",
          },
        ]),
      );
    }, previousSubject);
    await page.goto("/");
    await expect(
      page.getByRole("textbox", { name: "Your question" }),
    ).toHaveValue(
      "I’m self-employed. What documents would I need for a home loan?",
    );
    await expect(page.locator(".loan-demo-note")).toContainText("fictional");
    await expect(
      page.getByRole("button", {
        name: "Self-employed home loan",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Knowledge base/ }).click();
    await expect(page.locator(".document-card")).toHaveCount(5);
    await expect(
      page.getByRole("heading", {
        name: "Home loans: eligibility & documents",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "My application notes" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "The Moon and its phases" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Remote work handbook" }),
    ).toHaveCount(0);
    await page.reload();
    await page.getByRole("button", { name: /Knowledge base/ }).click();
    await expect(page.locator(".document-card")).toHaveCount(5);
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("rag-documents") || "[]"),
    );
    expect(saved.map((document: { id: string }) => document.id)).toEqual([
      "home-loan",
      "personal-loan",
      "education-loan",
      "loan-fees",
      "custom",
    ]);
    await page.getByRole("button", { name: "Playground", exact: true }).click();
    await page.getByRole("button", { name: /Run simulation/ }).click();
    await expect(page.locator(".answer-text")).toContainText(
      "business financial statements",
    );
  });
}

test("loan questions switch products and compare fictional processing fees", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Education loan documents", exact: true })
    .click();
  await page.getByRole("button", { name: /Run simulation/ }).click();
  await expect(page.locator(".answer-text")).toContainText("admission letter");
  await expect(page.locator(".answer-text")).not.toContainText(
    "sale agreement",
  );
  await page
    .getByRole("button", { name: "Compare processing fees", exact: true })
    .click();
  await page.getByRole("button", { name: /Run simulation/ }).click();
  for (const fee of ["0.5%", "1.5%", "0.25%"]) {
    await expect(page.locator(".answer-text")).toContainText(fee);
  }
});

test("edit a source, keep its identity, persist changes, and retrieve updated facts", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Run simulation/ }).click();
  await expect(page.locator(".answer-text")).toContainText(
    "six months of business bank statements",
  );
  await page
    .getByRole("button", { name: "Manage documents", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Edit Home loans: eligibility & documents",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toHaveAttribute(
    "aria-label",
    "Edit your knowledge",
  );
  await expect(page.getByLabel("Document title")).toHaveValue(
    "Home loans: eligibility & documents",
  );
  await page.getByLabel("Document title").fill("");
  await page.getByRole("button", { name: "Save document changes" }).click();
  await expect(page.getByRole("alert")).toContainText("Add a document title");
  await page.getByLabel("Document title").fill("My revised home loan guide");
  await page
    .getByLabel("Source content")
    .fill(
      "For a self-employed home loan, the fictional updated policy requires seven months of business bank statements and proof of business registration. Identity and address proof are also required.",
    );
  await page.getByRole("button", { name: "Save document changes" }).click();
  await expect(page.locator(".document-card")).toHaveCount(4);
  await page.getByRole("button", { name: "Playground", exact: true }).click();
  await expect(page.locator(".stale-banner")).toBeVisible();
  await page.getByRole("button", { name: /Run simulation/ }).click();
  await expect(page.locator(".answer-text")).toContainText("seven months");
  await expect(page.locator(".answer-text")).not.toContainText("six months");
  await page.reload();
  await page
    .getByRole("button", { name: "Manage documents", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "My revised home loan guide" }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("rag-documents") || "[]"),
  );
  expect(saved[0].id).toBe("home-loan");
  expect(saved[0].category).toBe("Example Bank · Home loans");
  expect(saved[0].text).toContain("seven months");
  await page
    .locator(".document-card")
    .filter({ hasText: "My revised home loan guide" })
    .getByRole("button", { name: "Inspect", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit document", exact: true })
    .click();
  await page.getByLabel("Document title").fill("Unsaved name");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(
    page.getByRole("heading", { name: "My revised home loan guide" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add document", exact: true }).click();
  await expect(page.getByLabel("Document title")).toHaveValue("");
  await expect(page.getByLabel("Source content")).toHaveValue("");
});

test("presentation pace holds each step, supports pause, speed changes, and cancellation", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.removeItem("rag-playback-speed"));
  const time = new Date("2026-10-12T08:00:00Z");
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.goto("/");
  await expect(page.getByLabel("Animation speed")).toHaveValue("presentation");
  await page.getByRole("button", { name: /Run simulation/ }).click();
  await expect(page.locator(".playback-step-name")).toHaveText(
    "Load documents",
  );
  await page.clock.runFor(1999);
  await expect(page.locator(".playback-step-name")).toHaveText(
    "Load documents",
  );
  await page.clock.runFor(1);
  await expect(page.locator(".playback-step-name")).toHaveText("Parse & clean");
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  await page.clock.runFor(8000);
  await expect(page.locator(".playback-step-name")).toHaveText("Parse & clean");
  await page.getByRole("button", { name: "Next pipeline step" }).click();
  await expect(page.locator(".playback-step-name")).toHaveText(
    "Split into chunks",
  );
  await page.getByLabel("Animation speed").selectOption("quick");
  await page.clock.runFor(1000);
  await expect(page.locator(".playback-step-name")).toHaveText(
    "Split into chunks",
  );
  await page
    .getByRole("button", { name: "Resume simulation", exact: true })
    .click();
  await page.clock.runFor(250);
  await expect(page.locator(".playback-step-name")).toHaveText(
    "Create embeddings",
  );
  await page.getByRole("button", { name: "Reset simulation" }).click();
  await page.clock.runFor(30000);
  await expect(page.locator(".playback-step-name")).toHaveText(
    "Ready for your walkthrough",
  );
  await expect(page.locator(".answer-text")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Pause simulation", exact: true }),
  ).toBeDisabled();
});

test("manual steps complete one captured run and save the selected pace", async ({
  page,
}) => {
  const time = new Date("2026-10-12T08:00:00Z");
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.goto("/");
  await page.getByLabel("Animation speed").selectOption("walkthrough");
  await page.getByRole("button", { name: /Run simulation/ }).click();
  await page
    .getByRole("button", { name: "Pause simulation", exact: true })
    .click();
  // The current run keeps its initial question even if the input changes.
  await page
    .getByRole("textbox", { name: "Your question" })
    .fill("What documents are required for an education loan?");
  for (let step = 0; step < 12; step++)
    await page.getByRole("button", { name: "Next pipeline step" }).click();
  await expect(page.locator(".answer-text")).toContainText(
    "business financial statements",
  );
  await expect(page.locator(".stale-banner")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next pipeline step" }),
  ).toBeDisabled();
  await page.clock.runFor(10000);
  await page.getByRole("button", { name: "Experiments", exact: true }).click();
  await expect(page.locator(".history-card")).toHaveCount(1);
  await expect(page.locator(".history-card")).toContainText(
    "I’m self-employed",
  );
  await page.reload();
  await expect(page.getByLabel("Animation speed")).toHaveValue("walkthrough");
});
