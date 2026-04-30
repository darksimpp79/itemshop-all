import React from "react";

export default function ThemeLayout({ children }: { children: React.ReactNode }) {
  // Globalny layout dla motywów jest teraz PUSTY.
  // Każdy motyw (RPG, Retro, Default) sam ładuje swój navbar i footer!
  return <>{children}</>;
}