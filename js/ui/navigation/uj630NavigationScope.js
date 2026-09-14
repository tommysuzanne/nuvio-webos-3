import { collectionSyncScope } from "../../core/sync/collectionSyncContext.js";
import { SessionStore } from "../../core/storage/sessionStore.js";
import { ProfileManager } from "../../core/profile/profileManager.js";
import { registerSessionTeardownHandler } from "../../core/auth/sessionLifecycle.js";

let token, profile, scope, guestGeneration = 0;
// Decode the account once per session/profile, never once per navigation item.
export function uj630NavigationScope() {
  const nextToken = SessionStore.accessToken, nextProfile = String(ProfileManager.getActiveProfileId() || "1");
  if (token !== nextToken || profile !== nextProfile || !scope) {
    token = nextToken; profile = nextProfile;
    scope = collectionSyncScope(profile) || `guest-${guestGeneration}:${profile}`;
  }
  return scope;
}
registerSessionTeardownHandler(() => { token = null; scope = null; guestGeneration++; });
