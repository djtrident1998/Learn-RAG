import { afterEach, describe, expect, it, vi } from "vitest";
import { demoDocuments, type KnowledgeDocument } from "./engine";
import {
  loadKnowledgeDocuments,
  migrateKnowledgeDocuments,
} from "./knowledgeStorage";
const legacy: KnowledgeDocument[] = [
  {
    id: "remote",
    title: "Remote work handbook",
    category: "People & culture",
    text: "Old sample content",
  },
  {
    id: "benefits",
    title: "Benefits & wellbeing",
    category: "People & culture",
    text: "Old sample content",
  },
  {
    id: "onboarding",
    title: "Your first 30 days",
    category: "Getting started",
    text: "Old sample content",
  },
  {
    id: "security",
    title: "Security essentials",
    category: "IT & security",
    text: "Old sample content",
  },
];
const custom: KnowledgeDocument = {
  id: "my-source",
  title: "Remote work handbook",
  category: "People & culture",
  text: "My own document should be retained.",
};
afterEach(() => vi.unstubAllGlobals());
describe("upgrading saved knowledge", () => {
  it("replaces old bundled samples and preserves custom documents", () => {
    const result = migrateKnowledgeDocuments([...legacy, custom]);
    expect(result.slice(0, 4)).toEqual(demoDocuments);
    expect(result[4]).toBe(custom);
    expect(migrateKnowledgeDocuments(result)).toEqual(result);
  });
  it("preserves deleted samples and an intentionally empty library", () => {
    expect(migrateKnowledgeDocuments([])).toEqual([]);
    expect(migrateKnowledgeDocuments([legacy[1], custom])).toEqual([
      demoDocuments[1],
      custom,
    ]);
    expect(migrateKnowledgeDocuments([custom])).toEqual([custom]);
  });
  it("does not duplicate a new sample already saved with legacy samples", () => {
    expect(
      migrateKnowledgeDocuments([legacy[0], demoDocuments[0], custom]),
    ).toEqual([demoDocuments[0], custom]);
  });
  it("loads and upgrades valid browser storage", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify([...legacy, custom]),
    });
    expect(loadKnowledgeDocuments()).toEqual([...demoDocuments, custom]);
  });
  it.each([null, "not JSON", JSON.stringify([{ id: 42 }])])(
    "uses the new samples for absent or corrupt storage: %s",
    (value) => {
      vi.stubGlobal("localStorage", { getItem: () => value });
      expect(loadKnowledgeDocuments()).toEqual(demoDocuments);
    },
  );
});
