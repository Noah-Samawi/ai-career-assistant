import { describe, expect, it } from "vitest";
import { canTransition, TRANSITIONS } from "@/lib/applications/state";

describe("application state machine", () => {
  it("never lets a user action set 'submitted'", () => {
    for (const targets of Object.values(TRANSITIONS)) expect(targets).not.toContain("submitted");
  });
  it("requires approval before marking as applied", () => {
    expect(canTransition("pending_approval", "applied_externally")).toBe(false);
    expect(canTransition("approved", "applied_externally")).toBe(true);
  });
  it("rejected is terminal", () => expect(TRANSITIONS.rejected).toEqual([]));
});
