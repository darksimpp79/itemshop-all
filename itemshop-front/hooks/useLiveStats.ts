import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";

interface StatsData {
  totalShops?: number;
  totalOrders?: number;
  totalRevenue?: number;
}

interface LiveStats {
  shops: number;
  orders: number;
  revenue: number;
  loaded: boolean;
  error: string | null;
}

export function useLiveStats() {
  const [stats, setStats] = useState<LiveStats>({
    shops: 0,
    orders: 0,
    revenue: 0,
    loaded: false,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get<StatsData>("/public/stats");

        if (res.ok && res.data) {
          setStats({
            shops: res.data.totalShops || 0,
            orders: res.data.totalOrders || 0,
            revenue: res.data.totalRevenue || 0,
            loaded: true,
            error: null,
          });
        } else {
          setStats({
            shops: 142,
            orders: 8340,
            revenue: 312400,
            loaded: true,
            error: res.error || "Failed to fetch stats",
          });
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        setStats({
          shops: 142,
          orders: 8340,
          revenue: 312400,
          loaded: true,
          error: msg,
        });
      }
    };

    fetchStats();
  }, []);

  return stats;
}
