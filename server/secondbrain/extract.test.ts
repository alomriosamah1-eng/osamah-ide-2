import { describe, expect, it } from "vitest";
import { extractSecondBrainTaskCandidates } from "./extract";

describe("Second Brain source bridge", () => {
  it("uses the upstream extractor for open checkbox tasks and ignores closed tasks", async () => {
    await expect(extractSecondBrainTaskCandidates("## Action items\n- [ ] حفظ الملاحظة\n- [x] مهمة مكتملة")).resolves.toEqual(["حفظ الملاحظة"]);
  });
});
