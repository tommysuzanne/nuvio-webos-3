export function createUserProfile({
  id,
  name,
  avatarColorHex = "#1E88E5",
  isPrimary = false,
  avatarId = null,
  avatarUrl = null,
  profileBackgroundId = null,
  profileBackgroundUrl = null
}) {
  return {
    id,
    name,
    avatarColorHex,
    isPrimary,
    avatarId,
    avatarUrl,
    profileBackgroundId: String(profileBackgroundId || "").trim() || null,
    profileBackgroundUrl: String(profileBackgroundUrl || "").trim() || null
  };
}
