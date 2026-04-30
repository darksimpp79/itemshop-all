/**
 * Domain detection utilities for multi-tenant ItemShop
 * Detects server name from hostname based on environment configuration
 */

interface DomainConfig {
  baseDomain?: string; // e.g., "pumpking.club"
  allowLocalhost?: boolean;
}

/**
 * Detect server name from hostname
 * Supports patterns like:
 * - szymoncraft.pumpking.club → "szymoncraft"
 * - szymoncraft.localhost → "szymoncraft"
 * - admin.pumpking.club → ignored (returns empty)
 * - www.pumpking.club → ignored (returns empty)
 */
export function detectServerNameFromHostname(
  hostname: string,
  config: DomainConfig = {}
): string {
  const baseDomain = config.baseDomain || process.env.NEXT_PUBLIC_DOMAIN_BASE || "pumpking.club";
  const allowLocalhost = config.allowLocalhost !== false;

  if (!hostname) return "";

  // Check for custom base domain (e.g., szymoncraft.pumpking.club)
  if (hostname.endsWith(`.${baseDomain}`)) {
    const serverName = hostname.replace(`.${baseDomain}`, "").toLowerCase();
    // Ignore known non-server subdomains
    if (!["www", "admin", "api", "mail", "cdn"].includes(serverName)) {
      return serverName;
    }
  }

  // Check for localhost pattern (e.g., szymoncraft.localhost)
  if (allowLocalhost && hostname.includes(".localhost") && !hostname.startsWith("localhost")) {
    const serverName = hostname.split(".")[0].toLowerCase();
    if (!["www", "admin", "api"].includes(serverName)) {
      return serverName;
    }
  }

  return "";
}

/**
 * Get server name from query params or hostname
 * Useful in client components where we need to detect from either source
 */
export function getServerNameFromLocation(
  useHostname: boolean = true,
  config: DomainConfig = {}
): string {
  if (typeof window === "undefined") return "";

  // Try query param first (set by proxy)
  const params = new URLSearchParams(window.location.search);
  const queryServerName = params.get("serverName");
  if (queryServerName) return queryServerName.toLowerCase();

  // Fall back to hostname detection
  if (useHostname) {
    const detected = detectServerNameFromHostname(window.location.hostname, config);
    if (detected) return detected;
  }

  return "";
}
