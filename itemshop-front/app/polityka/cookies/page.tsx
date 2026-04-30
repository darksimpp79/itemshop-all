import LegalPage from "@/components/legal/LegalPage";

export default function PolitykaCookies() {
  return (
    <LegalPage
      title="Polityka Cookies"
      subtitle="Jak używamy plików cookie i lokalnego przechowywania danych"
      updatedAt="2026-01-01"
    >
      <Section title="1. Co to są cookies?">
        <p>Pliki cookies to małe pliki tekstowe zapisywane na Twoim urządzeniu przez przeglądarkę. ZiutekShop używa głównie <strong className="text-gray-300">localStorage</strong> (przechowywanie lokalne) w przeglądarce, a nie tradycyjnych cookies HTTP.</p>
      </Section>

      <Section title="2. Jak przechowujemy dane sesji?">
        <ul>
          <li><strong className="text-gray-300">auth_token</strong> (localStorage) — token JWT autoryzacji. Niezbędny do zalogowania się w panelu admina. Wygasa po 24h.</li>
          <li><strong className="text-gray-300">auth_email</strong> (localStorage) — adres e-mail zalogowanego użytkownika.</li>
          <li><strong className="text-gray-300">pending_points</strong> (sessionStorage) — tymczasowe dane o punktach po przekierowaniu ze Stripe. Automatycznie usuwane po odczytaniu.</li>
        </ul>
      </Section>

      <Section title="3. Cookies podmiotów trzecich">
        <ul>
          <li><strong className="text-gray-300">Stripe</strong> — bramka płatności może ustawiać własne cookies w czasie procesu płatności (fraud detection, sesja checkout).</li>
        </ul>
        <p>Nie korzystamy z cookies analitycznych (Google Analytics, Hotjar itp.) ani marketingowych.</p>
      </Section>

      <Section title="4. Zarządzanie danymi lokalnych przechowywania">
        <p>Możesz usunąć dane zapisane przez panel w ustawieniach przeglądarki (DevTools → Application → Local Storage). Usunięcie <code className="text-[#bbf028] bg-white/5 px-1 rounded text-xs">auth_token</code> spowoduje wylogowanie.</p>
      </Section>

      <Section title="5. Brak wymogu zgody na cookies">
        <p>Platforma nie używa cookies śledzących ani profilujących. Dane w localStorage są ściśle niezbędne do działania usługi i nie wymagają odrębnej zgody RODO.</p>
      </Section>
    </LegalPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-black text-white mb-3">{title}</h2>
      <div className="space-y-2 text-gray-500 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">{children}</div>
    </section>
  );
}
