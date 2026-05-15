import { NextResponse } from "next/server";

const PRODUCTS = [
  // Survival
  { id: 1,  name: "VIP",             description: "Kolorowy nick w czacie, dostęp do VIP lounge i komendy /fly na 30 dni.",     price: 9.99,  mode: "survival", iconEmoji: "⭐" },
  { id: 2,  name: "VIP+",            description: "Wszystko z VIP plus /hat, /craft i dostęp do prywatnego warpu VIP+.",        price: 19.99, mode: "survival", iconEmoji: "🌟" },
  { id: 3,  name: "Ranga Admin",     description: "Najwyższa ranga. Pełny dostęp do komend, specjalny tag i ekskluzywne obszary.", price: 49.99, mode: "survival", iconEmoji: "👑" },
  { id: 4,  name: "Zestaw Startowy", description: "Pełny zestaw narzędzi i zbroi diamentowej na dobry start na serwerze.",        price: 5.99,  mode: "survival", iconEmoji: "🎒" },
  { id: 5,  name: "Klucz Skrzynki",  description: "Otwiera losową skrzynię nagród z rzadkimi przedmiotami i uprawnieniami.",     price: 3.99,  mode: "survival", iconEmoji: "🗝️" },
  { id: 6,  name: "Monety x1000",    description: "1000 monet w grze. Kup cokolwiek chcesz na serwerowym bazarze.",              price: 7.99,  mode: "survival", iconEmoji: "💰" },
  // SkyBlock
  { id: 7,  name: "VIP SkyBlock",    description: "Specjalne uprawnienia SkyBlock: większa wyspa, dodatkowe sloty i /fly.",      price: 9.99,  mode: "skyblock", iconEmoji: "⭐" },
  { id: 8,  name: "Lucky Block x32", description: "32 Lucky Bloki prosto do ekwipunku. Szczęście gwarantowane!",                  price: 4.99,  mode: "skyblock", iconEmoji: "🟡" },
  { id: 9,  name: "Zestaw Buildera", description: "Kompletny zestaw narzędzi ze Skuteczność V i inne zaklęcia dla budowniczych.", price: 14.99, mode: "skyblock", iconEmoji: "🏗️" },
  { id: 10, name: "Ochrona X",       description: "Komplet zbroi z Ochrona X, Ognioodporność IV i Upadek Piór IV.",              price: 7.99,  mode: "skyblock", iconEmoji: "🛡️" },
  { id: 11, name: "Wyspiarze Elite",  description: "Ranga Elite SkyBlock: własna wyspa deluxe, /is warp publiczny i bossowe spawny.", price: 34.99, mode: "skyblock", iconEmoji: "🏝️" },
  { id: 12, name: "Monety x2000",    description: "2000 monet na serwerowym rynku SkyBlock. Więcej niż cały zestaw basic.",       price: 12.99, mode: "skyblock", iconEmoji: "💰" },
];

export async function GET() {
  return NextResponse.json(PRODUCTS);
}
