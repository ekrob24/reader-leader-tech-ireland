import { describe, expect, it } from "vitest";
import { getChildReadingProgress, splitApprovedPassageIntoReadingParts } from "@shared/child-reading-canvas";

describe("child reading canvas progress", () => {
  it("creates local reading parts from an approved passage without deriving a learner metric", () => {
    expect(splitApprovedPassageIntoReadingParts("The boat waits. The light is bright.")).toEqual(["The boat waits.", "The light is bright."]);
  });

  it("bounds the visible reading place marker without creating a score", () => {
    expect(getChildReadingProgress(2, 7)).toEqual({ index: 1, currentPart: 2, totalParts: 2, percentage: 100 });
    expect(getChildReadingProgress(0, -1)).toEqual({ index: 0, currentPart: 1, totalParts: 1, percentage: 100 });
  });
});
