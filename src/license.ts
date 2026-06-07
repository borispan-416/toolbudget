// No backend: validate a license key directly against LemonSqueezy's public
// license API (same BYOK mechanism shipped in ReleaseScribe). Fails closed.
const LS_VALIDATE_URL = "https://api.lemonsqueezy.com/v1/licenses/validate";

interface Deps { fetch: typeof globalThis.fetch }

export async function isProUnlocked(licenseKey: string | undefined, deps: Deps = { fetch: globalThis.fetch }): Promise<boolean> {
  if (!licenseKey) return false;
  try {
    const res = await deps.fetch(LS_VALIDATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ license_key: licenseKey }).toString(),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { valid?: boolean };
    return data.valid === true;
  } catch {
    return false;
  }
}
