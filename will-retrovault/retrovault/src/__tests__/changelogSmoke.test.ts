import { describe, expect, it } from "vitest";
import { CHANGELOG } from "@/data/changelog";

describe("pipeline smoke changelog entry", () => {
  it("documents the Discord pipeline smoke-test release note", () => {
    const entry = CHANGELOG.find((item) => item.version === "2.1.44");

    expect(entry).toBeDefined();
    expect(CHANGELOG[CHANGELOG.length - 1]?.version).toBe("2.1.44");
    expect(entry?.title).toContain("Pipeline smoke");
    expect(entry?.changes.some((section) =>
      section.category === "Release Pipeline" &&
      section.items.some((item) => item.includes("Discord pipeline smoke test")),
    )).toBe(true);
  });
});
