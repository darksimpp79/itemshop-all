"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getServerNameFromLocation } from "@/lib/domain";
import { apiClient } from "@/lib/api/client";

interface ShopInfo {
  serverName: string;
  discordLink?: string;
}

const SECTIONS = [
  { id: "zakup",    label: "Jak kupować?" },
  { id: "magazyn",  label: "Odbieranie nagród" },
  { id: "punkty",   label: "System punktów" },
  { id: "bonus",    label: "Darmowy bonus" },
  { id: "skrzynka", label: "Lootbox / Skrzynka" },
  { id: "komendy",  label: "Komendy" },
  { id: "faq",      label: "FAQ" },
];

export default function DocsPage() {
  const [serverName, setServerName] = useState("");
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [activeSection, setActiveSection] = useState("zakup");

  useEffect(() => {
    const detected = getServerNameFromLocation();
    if (!detected) return;
    setServerName(detected);
    apiClient.get(`/storefront/${detected}/info`).then(res => {
      if (res.ok && res.data) setShopInfo(res.data as ShopInfo);
    });
  }, []);

  const displayName = shopInfo?.serverName || serverName;
  const discordLink = shopInfo?.discordLink;

  return (
    <main
      className="min-h-screen bg-[#111111] text-white font-sans pb-24 relative"
      style={{ backgroundImage: `url('/bgMain.png')`, backgroundRepeat: "repeat" }}
    >
      <div className="absolute inset-0 bg-[#111111]/88 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-16">

        {/* Navbar */}
        <nav className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
          <span className="text-xl font-black text-[#bbf028] italic uppercase">{displayName}</span>
          <div className="flex items-center gap-6">
            {discordLink && (
              <a href={discordLink} target="_blank" rel="noopener noreferrer"
                className="text-[#5865F2] hover:text-[#7289da] text-[10px] font-black uppercase tracking-[0.2em] transition-colors">
                Discord ↗
              </a>
            )}
            <Link href="/" className="text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors">
              ◀ Wróć do sklepu
            </Link>
          </div>
        </nav>

        {/* Nagłówek */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[#bbf028]/10 border border-[#bbf028]/20 px-4 py-1.5 rounded-full text-[#bbf028] text-[10px] font-black uppercase tracking-widest mb-4">
            📚 Wiki gracza
          </div>
          <h1 className="text-5xl font-black mb-3 uppercase italic tracking-tighter">
            Pomoc & <span className="text-[#bbf028]">Dokumentacja</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium max-w-2xl">
            Wszystko, co musisz wiedzieć o sklepie, systemie punktów i komendach dostępnych na serwerze.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar nawigacja */}
          <aside className="lg:w-56 shrink-0">
            <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl p-4 sticky top-8">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 mb-3 px-2">Sekcje</p>
              <ul className="space-y-1">
                {SECTIONS.map(s => (
                  <li key={s.id}>
                    <button
                      onClick={() => setActiveSection(s.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                        activeSection === s.id
                          ? "bg-[#bbf028]/10 text-[#bbf028]"
                          : "text-gray-500 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Treść */}
          <div className="flex-1 min-w-0">

            {/* Jak kupować */}
            {activeSection === "zakup" && (
              <Section title="Jak kupować?" icon="🛒">
                <Steps steps={[
                  { n: "1", title: "Wybierz tryb gry", desc: "Na stronie głównej sklepu znajdziesz listę dostępnych trybów gry. Kliknij interesujący Cię tryb, aby zobaczyć dostępne produkty." },
                  { n: "2", title: "Wybierz produkt", desc: "Przeglądaj ofertę i kliknij \"Kup\" przy wybranym produkcie. Zobaczysz jego szczegółowy opis, cenę i zawarte komendy." },
                  { n: "3", title: "Wpisz nick", desc: "Podaj swój nick z gry dokładnie tak, jak masz na serwerze. Przedmioty zostaną przypisane do tego nicku." },
                  { n: "4", title: "Zapłać", desc: "Zostaniesz przekierowany do bezpiecznej bramki płatności (Stripe). Obsługujemy karty płatnicze i BLIK." },
                  { n: "5", title: "Odbierz nagrody", desc: "Po pomyślnej płatności nagrody trafią do Twojego magazynu. Odbierz je komendą /magazyn na serwerze." },
                ]} />
                <InfoBox>
                  Nagrody czekają w magazynie — możesz je odebrać w dowolnym momencie, nawet po restarcie serwera.
                </InfoBox>
              </Section>
            )}

            {/* Odbieranie nagród */}
            {activeSection === "magazyn" && (
              <Section title="Odbieranie nagród" icon="📦">
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  Po zakupie Twoje nagrody trafiają do wirtualnego <strong className="text-white">magazynu</strong> na serwerze.
                  Możesz je odebrać w dowolnym momencie bez pośpiechu.
                </p>
                <CommandCard
                  cmd="/magazyn"
                  desc="Otwiera Twój osobisty magazyn. Wyświetla listę wszystkich nieoddanych nagród."
                />
                <CommandCard
                  cmd="/magazyn <nick>"
                  desc="Administratorzy mogą sprawdzić magazyn innego gracza. Zwykli gracze widzą tylko swój."
                />
                <Steps steps={[
                  { n: "1", title: "Wejdź na serwer", desc: "Zaloguj się na serwerze Minecraft i wpisz /magazyn." },
                  { n: "2", title: "Wybierz nagrodę", desc: "W oknie ekwipunku (chest GUI) zobaczysz swoje nagrody. Kliknij na wybrany przedmiot, aby go odebrać." },
                  { n: "3", title: "Nagroda odebrana", desc: "Komendy z nagrody zostaną wykonane automatycznie. Przedmioty pojawią się w Twoim ekwipunku lub na koncie." },
                ]} />
                <InfoBox type="warning">
                  Nagroda zostanie odebrana dopiero po kliknięciu na nią w magazynie. Samo wpisanie /magazyn jej nie odbiera.
                </InfoBox>
              </Section>
            )}

            {/* System punktów */}
            {activeSection === "punkty" && (
              <Section title="System punktów" icon="⭐">
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  Za każdy zakup w sklepie otrzymujesz <strong className="text-[#bbf028]">Punkty Sklepu (PKT)</strong>.
                  Punkty możesz wydać na lootboxy lub inne nagrody.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <StatCard value="10 PKT" label="za każde 1 PLN zakupu" color="text-[#bbf028]" />
                  <StatCard value="500 PKT" label="koszt jednej skrzynki" color="text-violet-400" />
                  <StatCard value="24h" label="cooldown na bonus dzienny" color="text-blue-400" />
                </div>
                <CommandCard cmd="/punkty" desc="Sprawdza Twoje aktualne saldo punktów." />
                <CommandCard cmd="/punkty <nick>" desc="Sprawdza saldo punktów wybranego gracza." />
                <InfoBox>
                  Punkty są globalne — działają na wszystkich trybach tego serwera.
                  Nie wygasają, ale są przypisane do Twojego nicku. Zmiana nicku może spowodować ich utratę — skontaktuj się z adminem.
                </InfoBox>
              </Section>
            )}

            {/* Darmowy bonus */}
            {activeSection === "bonus" && (
              <Section title="Darmowy bonus dzienny" icon="🎁">
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  Każdy gracz może raz na 24 godziny odebrać <strong className="text-white">darmową nagrodę</strong>.
                  Nie wymaga zakupu — wystarczy odwiedzić stronę sklepu.
                </p>
                <Steps steps={[
                  { n: "1", title: "Wejdź na stronę bonus", desc: "Przejdź do zakładki 'Darmowy Bonus' w menu sklepu lub odwiedź /bonus." },
                  { n: "2", title: "Wpisz swój nick", desc: "Podaj nick dokładnie taki sam, jak na serwerze Minecraft." },
                  { n: "3", title: "Wybierz tryb gry", desc: "Jeśli serwer ma wiele trybów, wybierz ten, na którym chcesz odebrać bonus." },
                  { n: "4", title: "Odbierz!", desc: "Kliknij przycisk. Nagroda pojawi się w Twoim magazynie (/magazyn)." },
                ]} />
                <InfoBox type="warning">
                  Cooldown jest liczony per nick, per tryb gry. Możesz odebrać bonus na każdym trybie osobno.
                </InfoBox>
              </Section>
            )}

            {/* Lootbox */}
            {activeSection === "skrzynka" && (
              <Section title="Lootbox / Skrzynka" icon="🎰">
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                  Skrzynka to losowa nagroda — wpisz komendę, zapłać punktami i sprawdź, co wylosujesz.
                  Animacja w stylu CS:GO sprawia, że każde otwarcie jest emocjonujące!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <StatCard value="500 PKT" label="koszt jednego otwarcia" color="text-violet-400" />
                  <StatCard value="~6s" label="czas animacji" color="text-orange-400" />
                </div>
                <CommandCard cmd="/skrzynka" desc="Otwiera skrzynkę za 500 punktów. Animacja otworzy się w oknie ekwipunku." />
                <Steps steps={[
                  { n: "1", title: "Zgromadź punkty", desc: "Potrzebujesz co najmniej 500 PKT. Sprawdź saldo przez /punkty." },
                  { n: "2", title: "Wpisz /skrzynka", desc: "Komenda pobierze 500 PKT i uruchomi animację w oknie ekwipunku." },
                  { n: "3", title: "Obejrzyj animację", desc: "Przedmioty przewijają się w klatce. Wylosowana nagroda zatrzyma się na środku." },
                  { n: "4", title: "Odbierz nagrodę", desc: "Po zakończeniu animacji nagroda jest automatycznie wykonywana lub trafia do magazynu." },
                ]} />
                <InfoBox type="warning">
                  Nie zamykaj okna skrzynki podczas animacji — to może spowodować problemy z odbiorem nagrody.
                </InfoBox>
              </Section>
            )}

            {/* Komendy */}
            {activeSection === "komendy" && (
              <Section title="Lista komend" icon="⌨️">
                <p className="text-gray-400 text-sm mb-6">
                  Wszystkie komendy wpisuj na czacie serwera Minecraft.
                </p>
                <div className="space-y-3">
                  <CommandCard cmd="/magazyn" desc="Otwiera Twój magazyn z nagrodami do odebrania." />
                  <CommandCard cmd="/magazyn <nick>" desc="[Admin] Otwiera magazyn wybranego gracza." />
                  <CommandCard cmd="/punkty" desc="Pokazuje Twoje aktualne saldo punktów w chacie." />
                  <CommandCard cmd="/punkty <nick>" desc="Pokazuje saldo punktów wybranego gracza." />
                  <CommandCard cmd="/skrzynka" desc="Otwiera lootbox za 500 PKT. Wymaga wystarczającego salda." />
                </div>
                <InfoBox>
                  Twoje aktualne saldo punktów jest też widoczne na pasku akcji (action bar) przez cały czas gry.
                </InfoBox>
              </Section>
            )}

            {/* FAQ */}
            {activeSection === "faq" && (
              <Section title="Często zadawane pytania" icon="❓">
                <div className="space-y-4">
                  <FaqItem
                    q="Zapłaciłem, ale nie otrzymałem nagrody."
                    a="Nagrody trafiają do magazynu (/magazyn). Upewnij się, że wpisałeś poprawny nick. Jeśli nagrody nie ma przez 15 minut — skontaktuj się z administracją przez Discord z potwierdzeniem płatności."
                  />
                  <FaqItem
                    q="Wpisałem zły nick. Co robić?"
                    a="Niestety nie możemy automatycznie przenieść nagrody. Skontaktuj się z administracją — w wielu przypadkach możemy ręcznie poprawić nick przypisany do zakupu."
                  />
                  <FaqItem
                    q="Czy punkty wygasają?"
                    a="Nie, punkty nie mają daty ważności. Są bezpiecznie przechowywane na koncie przypisanym do Twojego nicku."
                  />
                  <FaqItem
                    q="Zmieniłem nick w Minecraft. Czy stracę punkty i nagrody?"
                    a="Punkty i nagrody są przypisane do poprzedniego nicku. Skontaktuj się z administracją, aby przenieść je na nowy nick."
                  />
                  <FaqItem
                    q="Chcę zwrot pieniędzy."
                    a="Zgodnie z regulaminem, produkty cyfrowe (wirtualne komendy serwerowe) nie podlegają zwrotowi po ich wydaniu. Nieodebrane nagrody (w magazynie) możemy zwrócić — skontaktuj się z adminem."
                  />
                  <FaqItem
                    q="Gdzie zgłosić problem lub błąd?"
                    a={discordLink
                      ? `Najszybszy kontakt to serwer Discord sklepu. Możesz też wysłać wiadomość do administracji bezpośrednio.`
                      : "Skontaktuj się z administracją serwera przez Discord lub dedykowany kanał wsparcia."}
                  />
                  <FaqItem
                    q="Czy sklep jest bezpieczny? Jak wygląda płatność?"
                    a="Płatności obsługuje Stripe — jeden z największych i najbezpieczniejszych operatorów płatności na świecie. Twoje dane karty nigdy nie trafiają na nasze serwery."
                  />
                </div>
                {discordLink && (
                  <div className="mt-8 p-6 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-[#7289da] font-black text-sm uppercase tracking-wide mb-1">Nie znalazłeś odpowiedzi?</p>
                      <p className="text-gray-500 text-xs">Dołącz do naszego Discorda i zapytaj bezpośrednio.</p>
                    </div>
                    <a
                      href={discordLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 bg-[#5865F2] hover:bg-[#4752c4] text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-colors"
                    >
                      Dołącz do Discord ↗
                    </a>
                  </div>
                )}
              </Section>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}

// --- Sub-komponenty ---

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-black uppercase italic tracking-tight mb-6 flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Steps({ steps }: { steps: { n: string; title: string; desc: string }[] }) {
  return (
    <ol className="space-y-4 mb-6">
      {steps.map(s => (
        <li key={s.n} className="flex gap-4 items-start bg-[#1a1a1a] border border-white/5 p-4 rounded-2xl">
          <span className="w-8 h-8 shrink-0 bg-[#bbf028]/10 border border-[#bbf028]/20 text-[#bbf028] font-black text-sm rounded-xl flex items-center justify-center">
            {s.n}
          </span>
          <div>
            <p className="text-white font-bold text-sm mb-0.5">{s.title}</p>
            <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function CommandCard({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#1a1a1a] border border-white/5 p-4 rounded-2xl mb-3">
      <code className="shrink-0 bg-black/40 text-[#bbf028] font-mono font-bold text-sm px-3 py-1 rounded-lg border border-[#bbf028]/20">
        {cmd}
      </code>
      <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="bg-[#1a1a1a] border border-white/5 p-4 rounded-2xl text-center">
      <p className={`text-2xl font-black ${color} mb-1`}>{value}</p>
      <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}

function InfoBox({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" }) {
  const styles = type === "warning"
    ? "bg-yellow-500/5 border-yellow-500/20 text-yellow-400"
    : "bg-[#bbf028]/5 border-[#bbf028]/10 text-[#bbf028]/80";
  return (
    <div className={`mt-4 p-4 border rounded-2xl text-xs font-medium leading-relaxed ${styles}`}>
      {type === "warning" ? "⚠ " : "ℹ "}
      {children}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-bold text-white">{q}</span>
        <span className={`shrink-0 text-[#bbf028] transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-gray-500 text-xs leading-relaxed border-t border-white/5 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}
