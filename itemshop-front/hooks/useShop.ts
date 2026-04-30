import { useState, useEffect } from "react";
import { shopApi } from "@/lib/api/client";
import type { Product, ShopMode, ShopInfo } from "@/types/shop";

interface UseShopReturn {
  products: Product[];
  modes: string[];
  serverInfo: ShopInfo | null;
  onlinePlayers: number | null;
  isLoading: boolean;
  error: string | null;
}

export function useShop(
  serverName: string,
  currentMode?: string
): UseShopReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [modes, setModes] = useState<string[]>([]);
  const [serverInfo, setServerInfo] = useState<ShopInfo | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serverName) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [productsRes, infoRes, modesRes] = await Promise.all([
          shopApi.getProducts(serverName),
          shopApi.getInfo(serverName),
          shopApi.getModes(serverName),
        ]);

        if (productsRes.ok && productsRes.data) {
          const allProducts = Array.isArray(productsRes.data)
            ? productsRes.data
            : [];
          if (currentMode) {
            setProducts(
              allProducts.filter(
                (p: Product) =>
                  p.mode && p.mode.toLowerCase() === currentMode.toLowerCase()
              )
            );
          } else {
            setProducts(allProducts);
          }
        } else {
          setError(productsRes.error || "Failed to fetch products");
        }

        if (modesRes.ok && modesRes.data) {
          const modeNames = Array.isArray(modesRes.data)
            ? modesRes.data.map((m: ShopMode) => m.name)
            : [];
          setModes(modeNames);
        } else {
          setError(modesRes.error || "Failed to fetch modes");
        }

        if (infoRes.ok && infoRes.data) {
          setServerInfo(infoRes.data as ShopInfo);

          const info = infoRes.data as ShopInfo;
          if (info.serverIp) {
            try {
              const mcRes = await fetch(
                `https://api.mcsrvstat.us/2/${info.serverIp}`
              );
              if (mcRes.ok) {
                const mcData = await mcRes.json();
                setOnlinePlayers(mcData.players?.online ?? 0);
              }
            } catch (mcError) {
              console.error("Failed to fetch MC server status:", mcError);
              setOnlinePlayers(0);
            }
          }
        } else {
          setError(infoRes.error || "Failed to fetch server info");
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("Error in useShop:", errorMsg);
        setError(`Błąd ładowania sklepu: ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [serverName, currentMode]);

  return { products, modes, serverInfo, onlinePlayers, isLoading, error };
}
