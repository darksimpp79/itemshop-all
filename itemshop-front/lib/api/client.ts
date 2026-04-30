/**
 * Centralized API Client for ItemShop SaaS
 * Handles:
 * - Base URL configuration from environment
 * - Request/response error handling
 * - Authorization headers (future)
 * - Request deduplication & caching
 * - Response validation via schemas
 */

export type ApiResponse<T> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  rawResponse?: Response;
};

interface RequestOptions extends RequestInit {
  throwOnError?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private cacheTTL = 30000; // 30 seconds

  constructor() {
    // In the browser, always prefer relative `/api` so Next rewrites can route
    // to the backend domain (Cloudflare Tunnel / production).
    if (typeof window !== "undefined") {
      this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
      return;
    }

    // On the server (RSC/SSR), we can call the backend directly.
    const backendBase =
      process.env.ITEMSHOP_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/?$/, "") ||
      "http://127.0.0.1:8080";

    this.baseUrl = `${backendBase.replace(/\/$/, "")}/api`;
  }

  /**
   * Make a GET request
   */
  async get<T>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  /**
   * Make a POST request
   */
  async post<T>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "POST" });
  }

  /**
   * Core request method with error handling, caching, and deduplication
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const cacheKey = `${options.method || "GET"}:${endpoint}`;
    const { throwOnError = false, ...fetchOptions } = options;

    try {
      // Check cache for GET requests
      if (options.method === "GET" || !options.method) {
        const cached = this.getFromCache<T>(cacheKey);
        if (cached) {
          return { ok: true, status: 200, data: cached };
        }
      }

      // Deduplicate pending requests
      if (options.method === "GET" || !options.method) {
        if (this.pendingRequests.has(cacheKey)) {
          return this.pendingRequests.get(cacheKey);
        }
      }

      const url = `${this.baseUrl}${endpoint}`;
      const requestPromise = fetch(url, {
        ...fetchOptions,
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
          ...fetchOptions.headers,
        },
      });

      // Store pending request for deduplication
      if (options.method === "GET" || !options.method) {
        const pendingPromise = requestPromise
          .then((response) => this.handleResponse<T>(response, cacheKey))
          .finally(() => this.pendingRequests.delete(cacheKey));

        this.pendingRequests.set(cacheKey, pendingPromise);
        return pendingPromise;
      }

      const response = await requestPromise;
      return this.handleResponse<T>(response, cacheKey);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (throwOnError) {
        throw error;
      }

      return {
        ok: false,
        status: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle response status and parsing
   */
  private async handleResponse<T>(
    response: Response,
    cacheKey: string
  ): Promise<ApiResponse<T>> {
    try {
      let data: T | undefined;

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else if (response.ok) {
        data = (await response.text()) as unknown as T;
      }

      // Cache successful GET responses
      if (response.ok && (response.status === 200 || response.status === 201)) {
        this.setCache(cacheKey, data);
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
        rawResponse: response,
      };
    } catch (error) {
      return {
        ok: false,
        status: response.status,
        error:
          error instanceof Error ? error.message : "Failed to parse response",
        rawResponse: response,
      };
    }
  }

  /**
   * Get authorization headers (for future auth implementation)
   */
  private getAuthHeaders(): Record<string, string> {
    if (typeof window === "undefined") return {};

    const token =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("auth_token")
        : null;

    if (!token) return {};

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get base URL (for testing/debugging)
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

/**
 * Convenience functions for common API paths
 */
export const shopApi = {
  getStorefront: (serverName: string) =>
    apiClient.get(`/storefront/${serverName.toLowerCase()}`),

  getProducts: (serverName: string) =>
    apiClient.get(`/storefront/${serverName.toLowerCase()}/produkty`),

  getInfo: (serverName: string) =>
    apiClient.get(`/storefront/${serverName.toLowerCase()}/info`),

  getModes: (serverName: string) =>
    apiClient.get(`/storefront/${serverName.toLowerCase()}/tryby`),

  claimReward: (serverName: string, nick: string, mode: string) =>
    apiClient.post(
      `/storefront/${serverName.toLowerCase()}/nagroda?nick=${encodeURIComponent(nick)}&mode=${encodeURIComponent(mode)}`
    ),

  checkout: (
    serverName: string,
    productId: number,
    nick: string,
    mode: string,
    promoCode?: string
  ) => {
    let url = `/storefront/${serverName.toLowerCase()}/checkout?productId=${productId}&nick=${encodeURIComponent(nick)}&mode=${encodeURIComponent(mode)}`;
    if (promoCode) url += `&promoCode=${encodeURIComponent(promoCode)}`;
    return apiClient.post(url);
  },

  validatePromo: (serverName: string, code: string) =>
    apiClient.get<{ valid: boolean; discountPercent: number; code: string }>(
      `/storefront/${serverName.toLowerCase()}/promo/${encodeURIComponent(code)}`
    ),

  getWallet: (serverName: string, nick: string) =>
    apiClient.get<{ nickname: string; points: number }>(`/storefront/${serverName.toLowerCase()}/wallet/${encodeURIComponent(nick)}`),

  openLootbox: (serverName: string, nick: string, mode: string) =>
    apiClient.post(
      `/storefront/${serverName.toLowerCase()}/lootbox/${encodeURIComponent(nick)}?mode=${encodeURIComponent(mode)}`
    ),
};
