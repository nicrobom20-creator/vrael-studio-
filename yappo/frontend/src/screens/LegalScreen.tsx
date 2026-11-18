import type { ReactNode } from "react";

const SUPPORT = "https://t.me/vraelstudio";

export function PrivacyPage() {
  return (
    <LegalShell title="Политика конфиденциальности">
      <p>Редакция от 18 ноября 2026 года. Оператор — Даниил Мешихин. Сервис — бот @YappoLang_Bot и Mini App Yappo.</p>
      <Section title="1. Общие положения">
        <p>Политика объясняет, какие данные собирает Yappo, зачем и как долго они хранятся. Пользуясь ботом или Mini App, ты подтверждаешь, что прочитал её. Если условия не подходят — просто не пользуйся сервисом.</p>
        <p>Обработка идёт по этой Политике и применимому законодательству.</p>
      </Section>
      <Section title="2. Какие данные обрабатываются">
        <ul>
          <li>идентификатор Telegram, имя пользователя и имя, которые передаёт Telegram;</li>
          <li>выбранный язык, спутник, цель и время напоминания, часовой пояс;</li>
          <li>прогресс: пройденные сцены и испытания, опыт, серия;</li>
          <li>сообщения, которые ты отправляешь собеседнику в чате, чтобы ответить и подсказать;</li>
          <li>статус платежа, который сообщает RollyPay: заказ, сумма, тариф, оплачен или нет.</li>
        </ul>
        <p>Номер карты, срок действия и код Yappo не получает и не хранит. Карту обрабатывает RollyPay.</p>
      </Section>
      <Section title="3. Зачем">
        <p>Чтобы открыть обучение, помнить прогресс, присылать напоминание, отвечать в чате, открывать Premium после оплаты и отвечать на обращение в поддержку. Ещё — чтобы защищать сервис от злоупотреблений и выполнять требования закона.</p>
      </Section>
      <Section title="4. Кому передаются">
        <p>Данные не продаются. Платёжный статус приходит от RollyPay. Текст сообщения в чате может уйти провайдеру модели, если включён ИИ, только чтобы составить ответ. Госорганам — только когда этого требует закон.</p>
      </Section>
      <Section title="5. Хранение и удаление">
        <p>Данные хранятся, пока ты пользуешься Yappo и пока они нужны для этих целей, либо пока закон требует их держать. По запросу в поддержку @vraelstudio аккаунт и связанные данные удаляются, если хранение больше не обязательно по закону.</p>
      </Section>
      <Section title="6. Контакты">
        <p>Поддержка: <a href={SUPPORT}>@vraelstudio</a>.</p>
      </Section>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Пользовательское соглашение">
      <p>Публичная оферта. Редакция от 18 ноября 2026 года. Исполнитель — Даниил Мешихин. Заказчик — пользователь бота и Mini App.</p>
      <Section title="1. О чём договор">
        <p>Yappo — это Telegram-бот @YappoLang_Bot и Mini App для изучения языка: сцены, испытания и разговор. Открывая бота, пользуясь приложением или оплачивая Premium, ты принимаешь эти условия. Если не согласен — не пользуйся сервисом.</p>
      </Section>
      <Section title="2. Что входит">
        <p>Бесплатно: 3 испытания и 5 сообщений ИИ-собеседнику в день. Premium: без этих дневных лимитов. Срок и цена указаны до оплаты: 199 ₽ за 30 дней или 1999 ₽ за 365 дней. Оплата через RollyPay. Автопродления нет: это разовая оплата выбранного периода, без списания в следующем месяце или году, пока ты сам не оплатишь снова.</p>
      </Section>
      <Section title="3. Доступ">
        <p>После подтверждённой оплаты Premium открывается на оплаченный срок. Интернет и Telegram ты обеспечиваешь сам. Сервис может ненадолго останавливаться на обновление.</p>
      </Section>
      <Section title="4. Возврат">
        <p>Если деньги списались, а Premium не открылся из-за сбоя, напиши в поддержку: доступ откроют или деньги вернут. Если доступ уже был и сервис работал, оплата за начатый период не возвращается, кроме случаев, когда возврат прямо требует закон.</p>
      </Section>
      <Section title="5. Как пользоваться">
        <p>Нельзя ломать сервис, обходить оплату, рассылать спам и нарушать закон. Материалы уроков нельзя перепродавать. Оплата не передаёт тебе права на тексты и программу Yappo.</p>
      </Section>
      <Section title="6. Ответственность">
        <p>Yappo помогает практиковать язык и не обещает конкретный уровень или экзамен. За сбои Telegram, банка или связи исполнитель отвечает в пределах, которые оставляет закон.</p>
      </Section>
      <Section title="7. Контакты">
        <p>Поддержка: <a href={SUPPORT}>@vraelstudio</a>. Политика конфиденциальности опубликована рядом, на странице «Политика».</p>
      </Section>
    </LegalShell>
  );
}

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-[720px] bg-ink px-5 py-8 text-cream">
      <p className="text-xs uppercase tracking-[0.16em] text-gold2">Yappo</p>
      <h1 className="mt-2 font-display text-4xl leading-tight">{title}</h1>
      <article className="mt-6 space-y-4 text-sm leading-relaxed text-cream/85 [&_a]:text-gold2 [&_a]:underline [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-cream [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function openLegal(path: string) {
  const url = `${window.location.origin}${path}`;
  if (window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(url);
    return;
  }
  window.open(url, "_blank", "noopener");
}

export function ConsentLine() {
  return (
    <p className="mt-3 text-center text-[11px] leading-relaxed text-cream/70">
      Нажимая «Оплатить», ты принимаешь{" "}
      <button type="button" className="text-gold2 underline" onClick={() => openLegal("/terms")}>
        Пользовательское соглашение
      </button>{" "}
      и{" "}
      <button type="button" className="text-gold2 underline" onClick={() => openLegal("/privacy")}>
        Политику конфиденциальности
      </button>
      .
    </p>
  );
}
