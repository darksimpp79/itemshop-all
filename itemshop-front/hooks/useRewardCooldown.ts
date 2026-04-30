import { useState, useEffect } from "react";
import { decrementCooldown } from "@/lib/utils";

interface UseRewardCooldownReturn {
  cooldown: string | null;
  setCooldown: (time: string | null) => void;
}

export function useRewardCooldown(): UseRewardCooldownReturn {
  const [cooldown, setCooldown] = useState<string | null>(null);

  useEffect(() => {
    if (!cooldown) return;

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (!prev) return null;
        return decrementCooldown(prev);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  return { cooldown, setCooldown };
}
