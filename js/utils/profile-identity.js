export function profileDisplayName(profile, user) {
  const displayName = String(profile?.display_name ?? profile?.displayName ?? "").trim();
  if (displayName) return displayName;

  const email = String(user?.email ?? "").trim();
  return email.split("@")[0] || "ผู้ใช้";
}

export function profileInitials(name) {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  if (!words.length) return "U";

  const letters = words.length > 1
    ? [Array.from(words[0])[0], Array.from(words.at(-1))[0]]
    : Array.from(words[0]).slice(0, 2);
  return letters.join("").toLocaleUpperCase();
}

export function bindProfileIdentity(root, profile, user) {
  const displayName = profileDisplayName(profile, user);
  const initials = profileInitials(displayName);

  root.querySelectorAll("[data-profile-name]").forEach((element) => {
    element.textContent = displayName;
  });
  root.querySelectorAll("[data-profile-initials]").forEach((element) => {
    element.textContent = initials;
    element.setAttribute("aria-label", `บัญชี ${displayName}`);
  });
  root.querySelectorAll("[data-profile-currency]").forEach((element) => {
    element.textContent = profile?.base_currency || "THB";
  });
}
