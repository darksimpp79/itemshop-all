import LegalPage from "@/components/legal/LegalPage";

export default function PolitykaPrywatnosci() {
  return (
    <LegalPage
      title="Polityka Prywatności"
      subtitle="Jak zbieramy, przechowujemy i przetwarzamy Twoje dane"
      updatedAt="2026-01-01"
    >
      <Section title="1. Administrator danych">
        <p>Administratorem Twoich danych osobowych jest Operator serwisu ZiutekShop. Kontakt: poprzez panel administracyjny lub adres e-mail podany przy rejestracji.</p>
      </Section>

      <Section title="2. Jakie dane zbieramy?">
        <ul>
          <li><strong className="text-gray-300">Dane konta:</strong> adres e-mail, hasło (BCrypt), imię i nazwisko (opcjonalnie), numer telefonu (opcjonalnie).</li>
          <li><strong className="text-gray-300">Dane sklepu:</strong> nazwa serwera, IP, konfiguracja produktów i trybów.</li>
          <li><strong className="text-gray-300">Dane płatności:</strong> identyfikatory transakcji Stripe. Dane kart płatniczych nie są przechowywane — obsługuje je wyłącznie Stripe.</li>
          <li><strong className="text-gray-300">Dane techniczne:</strong> logi dostępu, adresy IP żądań (wyłącznie dla bezpieczeństwa).</li>
        </ul>
      </Section>

      <Section title="3. Cel i podstawa prawna przetwarzania">
        <ul>
          <li>Realizacja umowy (art. 6 ust. 1 lit. b RODO) — obsługa konta i subskrypcji.</li>
          <li>Uzasadniony interes (art. 6 ust. 1 lit. f RODO) — bezpieczeństwo, fraud prevention, logi.</li>
          <li>Obowiązek prawny (art. 6 ust. 1 lit. c RODO) — przechowywanie danych płatności dla celów księgowych.</li>
        </ul>
      </Section>

      <Section title="4. Podmioty trzecie">
        <ul>
          <li><strong className="text-gray-300">Stripe</strong> — obsługa płatności (własna polityka prywatności).</li>
          <li><strong className="text-gray-300">Resend</strong> — wysyłka e-maili transakcyjnych (weryfikacja, 2FA).</li>
          <li>Dane nie są sprzedawane ani udostępniane podmiotom trzecim w celach marketingowych.</li>
        </ul>
      </Section>

      <Section title="5. Twoje prawa">
        <p>Przysługuje Ci prawo dostępu, sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia danych oraz wniesienia sprzeciwu. Wniosek złóż przez panel lub e-mail kontaktowy.</p>
      </Section>

      <Section title="6. Okres przechowywania">
        <p>Dane konta są przechowywane przez czas trwania umowy + 30 dni po usunięciu konta. Dane płatności przez 5 lat (wymóg prawny). Logi techniczne przez 90 dni.</p>
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
