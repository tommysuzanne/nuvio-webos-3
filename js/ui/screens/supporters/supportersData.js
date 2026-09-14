export function normalizeSupporterMembers(rawMembers) {
  if (!Array.isArray(rawMembers)) return [];

  return rawMembers
    .map((member, index) => {
      const name = String(member?.displayName || "").trim();
      const membershipLevel = String(member?.membershipLevel || "").trim();
      if (!name || !["SUPPORTER", "SUPPORTER_PLUS"].includes(membershipLevel)) return null;

      const supporterSince = String(member?.supporterSince || "").trim() || null;
      const avatarUrl = String(member?.avatarUrl || "").trim() || null;
      return {
        id: `${name}|${supporterSince || ""}#${index}`,
        name,
        avatarUrl,
        membershipLevel,
        supporterSince
      };
    })
    .filter(Boolean);
}

export function normalizeContributors(rawContributors) {
  if (!Array.isArray(rawContributors)) return [];

  return rawContributors
    .map((contributor, index) => {
      const name = String(contributor?.name || "").trim();
      const totalContributions = Number(contributor?.total || 0);
      if (!name || totalContributions <= 0) return null;

      const rawProfile = typeof contributor?.profile === "string" ? contributor.profile : "";
      const profileUrl = rawProfile.trim() ? rawProfile : null;
      const profileParts = String(profileUrl || "").split("/");
      const githubLogin = profileParts[profileParts.length - 1] || null;
      const rawAvatar = typeof contributor?.avatar === "string" ? contributor.avatar : "";
      return {
        id: profileUrl || `${name}|${index}`,
        name,
        githubLogin,
        avatarUrl: rawAvatar.trim() ? rawAvatar : null,
        profileUrl,
        totalContributions,
        tvContributions: Number(contributor?.tv || 0),
        mobileContributions: Number(contributor?.mobile || 0),
        webContributions: Number(contributor?.web || 0)
      };
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.totalContributions - left.totalContributions ||
        right.tvContributions - left.tvContributions ||
        right.mobileContributions - left.mobileContributions ||
        right.webContributions - left.webContributions ||
        compareNames(left.name, right.name)
    );
}

function compareNames(leftName, rightName) {
  const left = leftName.toLowerCase();
  const right = rightName.toLowerCase();
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function parseSponsorNames(rawNames) {
  return String(rawNames || "")
    .split(",")
    .map((rawName, index) => {
      const name = rawName.trim();
      if (!name) return null;

      return {
        id: `${name.toLowerCase()}|${index}`,
        name,
        channelUrl: null,
        createdAt: "",
        sortTimestamp: 2147483647 - index
      };
    })
    .filter(Boolean);
}
