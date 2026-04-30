import LegalPage from "@/components/legal/LegalPage";

export default function RodoPage() {
  return (
    <LegalPage
      title="RODO / GDPR"
      subtitle="Informacja o przetwarzaniu danych osobowych zgodnie z Rozporządzeniem 2016/679"
      updatedAt="2026-01-01"
    >
      <Section title="Klauzula informacyjna (art. 13 RODO)">
        <p>Zgodnie z art. 13 Rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO) informujemy:</p>
      </Section>

      <Section title="1. Administrator">
        <p>Administratorem Twoich danych osobowych jest Operator serwisu ZiutekShop. W sprawach ochrony danych kontaktuj się przez panel administracyjny.</p>
      </Section>

      <Section title="2. Cele i podstawy prawne przetwarzania">
        <table>
          <thead>
            <tr><th>Cel</th><th>Podstawa</th></tr>
          </thead>
          <tbody>
            <tr><td>Świadczenie usługi (rejestracja, logowanie, subskrypcja)</td><td>Art. 6 ust. 1 lit. b — niezbędność do umowy</td></tr>
            <tr><td>Wysyłka e-maili transakcyjnych (weryfikacja, 2FA)</td><td>Art. 6 ust. 1 lit. b — niezbędność do umowy</td></tr>
            <tr><td>Bezpieczeństwo i ochrona przed nadużyciami</td><td>Art. 6 ust. 1 lit. f — uzasadniony interes</td></tr>
            <tr><td>Archiwizacja danych płatności (wymogi podatkowe)</td><td>Art. 6 ust. 1 lit. c — obowiązek prawny</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="3. Prawa osób, których dane dotyczą">
        <ul>
          <li><strong className="text-gray-300">Prawo dostępu</strong> — możesz zażądać kopii swoich danych (art. 15 RODO).</li>
          <li><strong className="text-gray-300">Prawo do sprostowania</strong> — możesz poprawić nieprawidłowe dane (art. 16 RODO).</li>
          <li><strong className="text-gray-300">Prawo do usunięcia</strong> — „prawo do bycia zapomnianym" (art. 17 RODO), o ile nie koliduje z obowiązkiem prawnym.</li>
          <li><strong className="text-gray-300">Prawo do ograniczenia przetwarzania</strong> — możesz żądać zawieszenia przetwarzania (art. 18 RODO).</li>
          <li><strong className="text-gray-300">Prawo do przenoszenia danych</strong> — dane w formacie maszynowym (art. 20 RODO).</li>
          <li><strong className="text-gray-300">Prawo sprzeciwu</strong> — wobec przetwarzania w oparciu o uzasadniony interes (art. 21 RODO).</li>
        </ul>
        <p className="mt-3">Wnioski składaj przez panel lub e-mail. Odpowiedź w ciągu 30 dni.</p>
      </Section>

      <Section title="4. Skargi">
        <p>Przysługuje Ci prawo wniesienia skargi do organu nadzorczego — w Polsce jest to <strong className="text-gray-300">Prezes Urzędu Ochrony Danych Osobowych (UODO)</strong>, ul. Stawki 2, 00-193 Warszawa.</p>
      </Section>

      <Section title="5. Przekazywanie danych poza EOG">
        <p>Dane mogą być przetwarzane przez podmioty trzecie (Stripe, Resend) z siedzibą w USA. Przekazanie odbywa się na podstawie standardowych klauzul umownych (SCC) zatwierdzonych przez Komisję Europejską.</p>
      </Section>

      <Section title="6. Okres retencji danych">
        <p>Dane konta: czas trwania umowy + 30 dni. Dane płatności: 5 lat (obowiązek podatkowy). Logi bezpieczeństwa: 90 dni.</p>
      </Section>
    </LegalPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-black text-white mb-3">{title}</h2>
      <div className="space-y-2 text-gray-500 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_table]:w-full [&_table]:border-collapse [&_th]:text-left [&_th]:text-gray-400 [&_th]:font-bold [&_th]:text-xs [&_th]:pb-2 [&_th]:border-b [&_th]:border-white/10 [&_td]:py-2 [&_td]:pr-4 [&_td]:text-xs [&_td]:border-b [&_td]:border-white/5">{children}</div>
    </section>
  );
}
