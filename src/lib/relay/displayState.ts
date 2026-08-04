import { deriveDisplayState } from "../domain/session";
import type { DisplayState } from "../domain/types";
import type { LiveSessionRecord } from "./types";

export const toDisplayState = (record: LiveSessionRecord): DisplayState =>
  deriveDisplayState(record.session, record.expiresAt);

export const expiredDisplayState = (sessionId: string): DisplayState => ({
  sessionId,
  className: "Kudos session expired",
  status: "expired",
  students: [],
  rules: [],
  goals: [],
  rewards: [],
  preferences: {
    showRules: false,
    showGoals: false,
    showRewards: false,
    displayNameMode: "displayName",
    reducedMotion: true,
    pollIntervalMs: 3000,
  },
  version: 0,
  updatedAt: new Date().toISOString(),
});
