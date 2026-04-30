import LegalPage from "@/components/legal/LegalPage";

export default function RegulaminPlatformyPage() {
  return (
    <LegalPage
      title="Regulamin Platformy"
      subtitle="ZiutekShop — warunki korzystania z usługi"
      updatedAt="2026-01-01"
    >
      <Section title="§1. Postanowienia ogólne">
        <p>Niniejszy regulamin określa zasady korzystania z platformy ZiutekShop (dalej „Platforma") — systemu SaaS umożliwiającego właścicielom serwerów Minecraft tworzenie i zarządzanie wirtualnymi sklepami.</p>
        <p>Operatorem Platformy jest podmiot prowadzący serwis ZiutekShop (dalej „Operator").</p>
        <p>Korzystanie z Platformy jest równoznaczne z akceptacją niniejszego regulaminu.</p>
      </Section>

      <Section title="§2. Rejestracja i konto">
        <p>Korzystanie z panelu administracyjnego wymaga założenia konta przy użyciu adresu e-mail i hasła.</p>
        <p>Użytkownik jest zobowiązany do podania prawdziwych danych. Jedno konto — jedna osoba fizyczna lub podmiot prawny.</p>
        <p>Operator zastrzega prawo do zawieszenia lub usunięcia konta w przypadku naruszenia regulaminu.</p>
      </Section>

      <Section title="§3. Plany subskrypcji">
        <p>Platforma oferuje trzy plany: <strong>FREE</strong> (bezpłatny), <strong>STARTER</strong> (9,99 PLN / miesiąc) i <strong>PRO</strong> (29,99 PLN / miesiąc).</p>
        <p>Subskrypcje są opłacane z góry. Płatności cykliczne obsługuje Stripe.</p>
        <p>Operator nie ponosi odpowiedzialności za treść sklepów prowadzonych przez użytkowników Platformy.</p>
      </Section>

      <Section title="§4. Odpowiedzialność i ograniczenia">
        <p>Zabrania się wykorzystywania Platformy do działalności niezgodnej z prawem, sprzedaży produktów naruszających prawa autorskie lub regulamin usług Mojang.</p>
        <p>Operator dołoży wszelkich starań zapewnienia ciągłości działania Platformy, jednak nie gwarantuje 100% dostępności (SLA).</p>
        <p>Platforma jest dostarczana „as is". Operator nie odpowiada za utracone korzyści wynikające z awarii.</p>
      </Section>

      <Section title="§5. Wypowiedzenie i zwroty">
        <p>Subskrypcję można anulować w dowolnym momencie z poziomu panelu — dostęp do funkcji premium trwa do końca opłaconego okresu.</p>
        <p>Zwrotom nie podlegają opłaty za okresy, w których usługa była aktywnie wykorzystywana.</p>
        <p>Usunięcie konta skutkuje trwałym usunięciem danych i sklepów po 30 dniach karencji.</p>
      </Section>

      <Section title="§6. Zmiany regulaminu">
        <p>Operator zastrzega prawo do zmiany regulaminu z zachowaniem 14-dniowego okresu powiadomienia (e-mail lub komunikat w panelu).</p>
        <p>Dalsze korzystanie z Platformy po wejściu w życie zmian oznacza ich akceptację.</p>
      </Section>
    </LegalPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-black text-white mb-3">{title}</h2>
      <div className="space-y-2 text-gray-500 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
