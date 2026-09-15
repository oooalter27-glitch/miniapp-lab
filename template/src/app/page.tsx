import SectionTitle from "@/components/SectionTitle";
import LeadForm from "@/components/LeadForm";

/**
 * Стартовый экран шаблона. Его полагается заменить содержимым по брифу —
 * он оставлен рабочим, чтобы сразу после scripts/new.sh проект собирался
 * и открывался, а не встречал пустотой.
 */
export default function Home() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-screen-sm mx-auto">
      <SectionTitle
        title="Новый мини-апп"
        subtitle="Замените этот экран содержимым из брифа"
        align="center"
      />
      <section className="mt-10">
        <SectionTitle title="Оставить заявку" />
        <div className="mt-4">
          <LeadForm
            service="Проверка шаблона"
            buttonText="Отправить"
            fields={[
              { name: "name", label: "Имя", placeholder: "Как к вам обращаться" },
              { name: "contact", label: "Телефон или @ник", placeholder: "+7…" },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
