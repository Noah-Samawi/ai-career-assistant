import type { ApplicationStatus } from "@/db/schema";

/**
 * Allowed transitions. "submitted" is intentionally NOT reachable by a user action:
 * it requires a channel confirmation (see markSubmitted in service.ts).
 */
export const TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ["pending_approval", "withdrawn"],
  pending_approval: ["approved", "draft", "withdrawn"],
  approved: ["applied_externally", "pending_approval", "withdrawn"],
  submitted: ["interview", "rejected", "offer", "withdrawn"],
  applied_externally: ["interview", "rejected", "offer", "withdrawn"],
  interview: ["offer", "rejected", "withdrawn"],
  offer: ["withdrawn"],
  rejected: [],
  withdrawn: ["draft"],
};

export class InvalidTransitionError extends Error {
  constructor(from: ApplicationStatus, to: ApplicationStatus) {
    super(`Status change ${from} → ${to} is not allowed`);
  }
}

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ApplicationStatus, to: ApplicationStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

export const SENT_STATUSES: ApplicationStatus[] = ["submitted", "applied_externally", "interview", "offer", "rejected"];
