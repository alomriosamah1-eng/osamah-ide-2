import { describe, expect, it } from "vitest";
import { hasDistinctKnowledgeLinkEndpoints } from "./db";

describe("hasDistinctKnowledgeLinkEndpoints", () => {
  it("accepts links only when their endpoints are different", () => {
    expect(hasDistinctKnowledgeLinkEndpoints({ fromItemId: 4, toItemId: 7 })).toBe(true);
    expect(hasDistinctKnowledgeLinkEndpoints({ fromItemId: 4, toItemId: 4 })).toBe(false);
  });
});
