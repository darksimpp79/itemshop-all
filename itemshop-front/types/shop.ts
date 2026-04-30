/**
 * Type definitions for ItemShop SaaS
 * Ensures type safety across the application
 */

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  mode: string;
  imageUrl?: string;
  iconEmoji?: string;
}

export interface ShopMode {
  name: string;
}

export interface ShopInfo {
  serverName: string;
  serverIp?: string;
  discordLink?: string;
  bannerText?: string;
}

export interface MinecraftServerStatus {
  online: boolean;
  players?: {
    online: number;
    max: number;
  };
}

export interface PaymentStatus {
  ok: boolean;
  text: string;
}

export interface RewardResponse {
  success: boolean;
  message?: string;
  cooldownTime?: string;
}

export interface CheckoutResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export type ModeStyle = {
  color: string;
  bg: string;
  glow: string;
};

export type Theme = "default" | "rpg" | "retro" | "cyber";

export interface ShopPageProps {
  serverName: string;
  currentMode: string;
  products: Product[];
  availableModes: string[];
  onlinePlayers: number | null;
  isLoading: boolean;
  executeBuy: (productId: number, nick: string, promoCode?: string) => Promise<Response>;
  paymentToast: PaymentStatus | null;
  clearPaymentToast: () => void;
}
