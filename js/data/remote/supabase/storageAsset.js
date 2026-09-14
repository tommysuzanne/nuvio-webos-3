export async function createStorageAssetUrl(blob) {
  if (!blob) {
    return null;
  }

  try {
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.warn("Unable to create storage object URL", error);
  }

  if (typeof FileReader === "undefined") {
    return null;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

export function revokeStorageAssetUrl(value) {
  const url = String(value || "");
  if (!url.startsWith("blob:")) {
    return;
  }
  try {
    if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.warn("Unable to revoke storage object URL", error);
  }
}
