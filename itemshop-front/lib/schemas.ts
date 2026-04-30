/**
 * Runtime validation schemas for API responses
 * Using Zod for type-safe parsing and validation
 */

interface Schema<T> {
  parse: (data: unknown) => T;
  safeParse: (data: unknown) => { success: boolean; data?: T; error?: Error };
}

// Simple validation implementation (light alternative to Zod if not installed)
export const createSchema = <T,>(
  validator: (data: unknown) => data is T
): Schema<T> => ({
  parse: (data: unknown) => {
    if (!validator(data)) {
      throw new Error("Validation failed");
    }
    return data;
  },
  safeParse: (data: unknown) => {
    try {
      if (!validator(data)) {
        return { success: false, error: new Error("Validation failed") };
      }
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  },
});

// Product validation
function isProduct(data: unknown): data is {
  id: number;
  name: string;
  description: string;
  price: number;
  mode: string;
  imageUrl?: string;
  iconEmoji?: string;
} {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === "number" &&
    typeof obj.name === "string" &&
    typeof obj.description === "string" &&
    typeof obj.price === "number" &&
    typeof obj.mode === "string" &&
    (obj.imageUrl === undefined || typeof obj.imageUrl === "string") &&
    (obj.iconEmoji === undefined || typeof obj.iconEmoji === "string")
  );
}

export const productSchema = createSchema(isProduct);

// ShopMode validation
function isShopMode(data: unknown): data is { name: string } {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.name === "string";
}

export const shopModeSchema = createSchema(isShopMode);

// ShopInfo validation
function isShopInfo(data: unknown): data is {
  serverName: string;
  serverIp?: string;
} {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.serverName === "string" &&
    (obj.serverIp === undefined || typeof obj.serverIp === "string")
  );
}

export const shopInfoSchema = createSchema(isShopInfo);

// Product array validation
function isProductArray(data: unknown): data is unknown[] {
  return Array.isArray(data);
}

export const productArraySchema = createSchema(isProductArray);

// ShopMode array validation
export const shopModeArraySchema = createSchema(
  (data: unknown): data is unknown[] => Array.isArray(data)
);

// Reward response validation
function isRewardResponse(data: unknown): data is {
  success: boolean;
  message?: string;
  cooldownTime?: string;
} {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.success === "boolean" &&
    (obj.message === undefined || typeof obj.message === "string") &&
    (obj.cooldownTime === undefined || typeof obj.cooldownTime === "string")
  );
}

export const rewardResponseSchema = createSchema(isRewardResponse);

// Checkout response validation
function isCheckoutResponse(data: unknown): data is {
  success: boolean;
  url?: string;
  error?: string;
} {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.success === "boolean" &&
    (obj.url === undefined || typeof obj.url === "string") &&
    (obj.error === undefined || typeof obj.error === "string")
  );
}

export const checkoutResponseSchema = createSchema(isCheckoutResponse);

// Stats validation
function isStatsResponse(data: unknown): data is {
  totalShops?: number;
  totalOrders?: number;
  totalRevenue?: number;
} {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    (obj.totalShops === undefined || typeof obj.totalShops === "number") &&
    (obj.totalOrders === undefined || typeof obj.totalOrders === "number") &&
    (obj.totalRevenue === undefined || typeof obj.totalRevenue === "number")
  );
}

export const statsResponseSchema = createSchema(isStatsResponse);
