import { describe, expect, it } from "vitest";
import { isExactSlideOrder } from "./db";

describe("presentation slide ordering", () => {
  it("accepts a reordering only when it contains each slide exactly once", () => {
    expect(isExactSlideOrder([3, 7, 11], [11, 3, 7])).toBe(true);
    expect(isExactSlideOrder([3, 7, 11], [3, 7])).toBe(false);
    expect(isExactSlideOrder([3, 7, 11], [3, 7, 7])).toBe(false);
    expect(isExactSlideOrder([3, 7, 11], [3, 7, 15])).toBe(false);
  });
});
