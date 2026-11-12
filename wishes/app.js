const STORAGE_KEY = "ispolni-mechta-v1";

const CATEGORIES = {
  children: "Дети",
  health: "Здоровье",
  study: "Учёба",
  everyday: "Быт",
  dream: "Мечта",
};

const COST_FILTERS = [
  { id: "all", label: "Любая сумма" },
  { id: "0-5000", label: "До 5 000 ₽", min: 0, max: 5000 },
  { id: "5001-15000", label: "5 000–15 000 ₽", min: 5001, max: 15000 },
  { id: "15001-30000", label: "15 000–30 000 ₽", min: 15001, max: 30000 },
  { id: "30001+", label: "Свыше 30 000 ₽", min: 30001, max: Infinity },
];

const SEED = [
  {
    id: "w1",
    name: "Анна К.",
    city: "Кострома",
    category: "children",
    story:
      "Сыну семь лет, он вырос из зимней обуви. Чтобы спокойно ходить в школу в холода, нужны тёплые сапоги 32 размера и куртка по сезону.",
    need: "Зимние сапоги 32 размера и тёплая куртка 122–128 см",
    cost: 8500,
    photo: "",
    status: "open",
    example: true,
  },
  {
    id: "w2",
    name: "Марина В.",
    city: "Воронеж",
    category: "health",
    story:
      "Маме 74 года. Старые очки уже не подходят, ей трудно читать и смотреть телевизор. Нужна проверка зрения и новые очки.",
    need: "Приём офтальмолога и изготовление очков",
    cost: 6200,
    photo: "",
    status: "open",
    example: true,
  },
  {
    id: "w3",
    name: "Илья С.",
    city: "Казань",
    category: "study",
    story:
      "Учусь на втором курсе. Ноутбук, которым пользовался несколько лет, больше не справляется с учёбой. Нужен простой рабочий ноутбук для пар, конспектов и курсовых.",
    need: "Рабочий ноутбук для учёбы",
    cost: 28000,
    photo: "",
    status: "open",
    example: true,
  },
  {
    id: "w4",
    name: "Светлана П.",
    city: "Тула",
    category: "everyday",
    story:
      "Сломался холодильник, продукты негде хранить. Нужен недорогой рабочий холодильник или помощь с ремонтом, если его ещё можно починить.",
    need: "Ремонт холодильника или недорогая замена",
    cost: 15000,
    photo: "",
    status: "open",
    example: true,
  },
  {
    id: "w5",
    name: "Дарья М.",
    city: "Ярославль",
    category: "dream",
    story:
      "Рисую уже несколько лет и готовлюсь к поступлению в художественное училище. Сейчас работаю на том, что есть. Нужны нормальные краски, кисти и бумага.",
    need: "Набор красок, кистей и бумаги для поступления",
    cost: 4500,
    photo: "",
    status: "open",
    example: true,
  },
  {
    id: "w6",
    name: "Ольга Н.",
    city: "Новосибирск",
    category: "children",
    story:
      "Жду второго ребёнка, старая коляска сломалась, и чинить её уже нет смысла. Нужна прогулочная коляска, которой хватит на зиму и лето.",
    need: "Прогулочная коляска на все сезоны",
    cost: 12000,
    photo: "",
    status: "in_progress",
    example: true,
    donorName: "Меценат",
    donorMessage: "Готов помочь с выбором и покупкой коляски.",
    reservedAt: "2026-11-08T12:00:00.000Z",
  },
  {
    id: "w7",
    name: "Нина Л.",
    city: "Самара",
    category: "children",
    story:
      "Сыну восемь лет, футбольная секция в соседнем районе. Нужен велосипед, чтобы он добирался сам и не ехал вечером на автобусе.",
    need: "Велосипед 20 дюймов и шлем",
    cost: 9400,
    photo: "",
    status: "fulfilled",
    example: true,
    fulfilledNote:
      "Меценат купил велосипед и шлем. Семья получила их и написала, что сын уже доезжает до секции сам.",
  },
  {
    id: "w8",
    name: "Егор Т.",
    city: "Вологда",
    category: "everyday",
    story:
      "После поломки стиральной машины стирали вручную. Нужна недорогая рабочая машина, желательно с доставкой и установкой.",
    need: "Стиральная машина с доставкой и установкой",
    cost: 11500,
    photo: "",
    status: "fulfilled",
    example: true,
    fulfilledNote:
      "Машину привезли и установили. Семья подтвердила, что всё работает.",
  },
];

const state = {
  wishes: [],
  category: "all",
  cost: "all",
  modalWishId: null,
  showDonorForm: false,
  lastFocus: null,
};

const els = {};

function loadWishes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (err) {
    console.warn("Не удалось прочитать сохранённые желания.", err);
  }
  return SEED.map((item) => ({ ...item }));
}

function saveWishes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.wishes));
}

function formatMoney(value) {
  return `${Number(value).toLocaleString("ru-RU")} ₽`;
}

function categoryLabel(key) {
  return CATEGORIES[key] || key;
}

function statusMeta(status) {
  if (status === "moderation") return { label: "На модерации", cls: "badge--moderation" };
  if (status === "in_progress") return { label: "В процессе исполнения", cls: "badge--progress" };
  if (status === "fulfilled") return { label: "Исполнено", cls: "badge--fulfilled" };
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function excerpt(text, length = 150) {
  const clean = text.trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, length).trim()}…`;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function matchesCost(wish, costId) {
  if (costId === "all") return true;
  const rule = COST_FILTERS.find((item) => item.id === costId);
  if (!rule) return true;
  return wish.cost >= rule.min && wish.cost <= rule.max;
}

function visibleWishes() {
  return state.wishes
    .filter((wish) => wish.status !== "fulfilled")
    .filter((wish) => (state.category === "all" ? true : wish.category === state.category))
    .filter((wish) => matchesCost(wish, state.cost))
    .sort((a, b) => {
      const order = { open: 0, moderation: 1, in_progress: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });
}

function fulfilledWishes() {
  return state.wishes.filter((wish) => wish.status === "fulfilled");
}

function renderPills() {
  const categories = [
    { id: "all", label: "Все темы" },
    ...Object.entries(CATEGORIES).map(([id, label]) => ({ id, label })),
  ];

  els.filterCategory.innerHTML = categories
    .map(
      (item) => `
        <button class="pill${state.category === item.id ? " is-active" : ""}" type="button" data-category="${item.id}">
          ${escapeHtml(item.label)}
        </button>`
    )
    .join("");

  els.filterCost.innerHTML = COST_FILTERS.map(
    (item) => `
      <button class="pill${state.cost === item.id ? " is-active" : ""}" type="button" data-cost="${item.id}">
        ${escapeHtml(item.label)}
      </button>`
  ).join("");
}

function badges(wish) {
  const items = [
    `<span class="badge badge--${escapeHtml(wish.category)}">${escapeHtml(categoryLabel(wish.category))}</span>`,
  ];
  if (wish.example) items.push(`<span class="badge badge--example">Пример</span>`);
  const status = statusMeta(wish.status);
  if (status) items.push(`<span class="badge ${status.cls}">${status.label}</span>`);
  return items.join("");
}

function photoTag(src, className) {
  if (!src || !isValidHttpUrl(src)) return "";
  return `<img class="${className}" src="${escapeHtml(src)}" alt="" loading="lazy">`;
}

function renderFeed() {
  const wishes = visibleWishes();
  const totalOpen = state.wishes.filter((wish) => wish.status !== "fulfilled").length;
  els.feedMeta.textContent = wishes.length
    ? `Показано ${wishes.length} из ${totalOpen}`
    : "По выбранным фильтрам пока ничего нет.";

  if (!wishes.length) {
    els.wishGrid.innerHTML = `<p class="empty">Попробуйте выбрать другую тему или сумму. Новое желание можно добавить через форму ниже.</p>`;
    return;
  }

  els.wishGrid.innerHTML = wishes
    .map(
      (wish) => `
      <button class="wish-card" type="button" data-open="${escapeHtml(wish.id)}">
        ${photoTag(wish.photo, "wish-card__photo")}
        <div class="wish-card__body">
          <div class="card-top">${badges(wish)}</div>
          <h3>${escapeHtml(wish.need)}</h3>
          <p class="wish-card__city">${escapeHtml(wish.city)} · ${escapeHtml(wish.name)}</p>
          <p class="wish-card__story">${escapeHtml(excerpt(wish.story))}</p>
          <div class="wish-card__footer">
            <span class="cost">${formatMoney(wish.cost)}</span>
            <span class="wish-card__open">Открыть</span>
          </div>
        </div>
      </button>`
    )
    .join("");
}

function renderFulfilled() {
  const wishes = fulfilledWishes();
  if (!wishes.length) {
    els.fulfilledGrid.innerHTML = `<p class="empty">Исполненных историй пока нет. Когда помощь будет подтверждена, она появится здесь.</p>`;
    return;
  }

  els.fulfilledGrid.innerHTML = wishes
    .map(
      (wish) => `
      <article class="fulfilled-card">
        <div class="card-top">${badges(wish)}</div>
        <h3>${escapeHtml(wish.need)}</h3>
        <p class="fulfilled-card__meta">${escapeHtml(wish.city)} · ${escapeHtml(wish.name)} · ${formatMoney(wish.cost)}</p>
        <p>${escapeHtml(wish.story)}</p>
        ${wish.fulfilledNote ? `<p class="note">${escapeHtml(wish.fulfilledNote)}</p>` : ""}
      </article>`
    )
    .join("");
}

function modalContent(wish) {
  if (state.showDonorForm && wish.status === "open") {
    return `
      ${photoTag(wish.photo, "modal-photo")}
      <div class="card-top">${badges(wish)}</div>
      <h2 id="modal-title">Исполнить мечту</h2>
      <p class="modal-meta">${escapeHtml(wish.need)} · ${escapeHtml(wish.city)} · ${formatMoney(wish.cost)}</p>
      <p class="modal-story">Оставьте контакт. В рабочей версии площадка передаст его автору желания после проверки отклика. Помощь вы оказываете напрямую: покупаете вещь или оплачиваете услугу. Переводить деньги через сайт не нужно.</p>
      <form class="donor-form" id="donor-form" novalidate>
        <label class="field">
          <span>Ваше имя</span>
          <input type="text" name="donorName" maxlength="80" required placeholder="Алексей">
        </label>
        <label class="field">
          <span>Telegram или почта</span>
          <input type="text" name="donorContact" maxlength="120" required placeholder="@name или name@mail.com">
        </label>
        <label class="field">
          <span>Сообщение</span>
          <textarea name="donorMessage" rows="4" maxlength="500" required placeholder="Коротко напишите, чем готовы помочь и как удобнее связаться."></textarea>
        </label>
        <p class="form-error" id="donor-form-error" hidden></p>
        <div class="modal-actions">
          <button class="btn btn--primary" type="submit">Отправить отклик</button>
          <button class="btn btn--ghost" type="button" data-back>Вернуться к желанию</button>
        </div>
      </form>`;
  }

  if (state.showDonorForm === "success") {
    return `
      <div class="success-box">
        <div class="card-top"><span class="badge badge--progress">В процессе исполнения</span></div>
        <h2 id="modal-title">Спасибо, отклик принят</h2>
        <p>Желание отмечено как «в процессе исполнения». В этой демонстрации контакт никуда не отправляется и остаётся только в вашем браузере. В рабочей версии модератор сначала проверит отклик, а затем поможет аккуратно связать вас с автором желания.</p>
        <p style="margin-top:12px">Дальше помощь передаётся напрямую: покупка нужной вещи или оплата услуги. Сайт не принимает деньги и не устраивает переводы между незнакомыми людьми.</p>
        <div class="modal-actions">
          <button class="btn btn--primary" type="button" data-close>Закрыть</button>
        </div>
      </div>`;
  }

  let statusNote = "";
  if (wish.status === "in_progress") {
    statusNote = `<p class="modal-status-note">Меценат уже откликнулся, желание отмечено как «в процессе исполнения». Новые отклики пока не принимаются.</p>`;
  } else if (wish.status === "fulfilled") {
    statusNote = `<p class="modal-status-note is-done">${escapeHtml(wish.fulfilledNote || "Эта мечта уже исполнена.")}</p>`;
  } else if (wish.status === "moderation") {
    statusNote = `<p class="modal-status-note">Заявка ещё на модерации и ждёт проверки, прежде чем меценаты смогут на неё откликнуться.</p>`;
  }

  const cta =
    wish.status === "open"
      ? `<div class="modal-actions">
           <button class="btn btn--primary" type="button" data-fulfill>Исполнить мечту</button>
         </div>`
      : "";

  return `
    ${photoTag(wish.photo, "modal-photo")}
    <div class="card-top">${badges(wish)}</div>
    <h2 id="modal-title" class="modal-need">${escapeHtml(wish.need)}</h2>
    <p class="modal-meta">${escapeHtml(wish.city)} · ${escapeHtml(wish.name)} · ${formatMoney(wish.cost)}</p>
    <p class="modal-story">${escapeHtml(wish.story)}</p>
    <div class="modal-block">
      <span>Что нужно</span>
      <strong>${escapeHtml(wish.need)}</strong>
    </div>
    <div class="modal-block">
      <span>Примерная стоимость</span>
      <strong>${formatMoney(wish.cost)}</strong>
    </div>
    ${statusNote}
    ${cta}`;
}

function openModal(id, showDonorForm = false) {
  const wish = state.wishes.find((item) => item.id === id);
  if (!wish) return;
  state.modalWishId = id;
  state.showDonorForm = showDonorForm;
  state.lastFocus = document.activeElement;
  els.modalBody.innerHTML = modalContent(wish);
  els.modal.hidden = false;
  document.body.style.overflow = "hidden";
  els.modalPanel.focus();
}

function closeModal() {
  els.modal.hidden = true;
  els.modalBody.innerHTML = "";
  state.modalWishId = null;
  state.showDonorForm = false;
  document.body.style.overflow = "";
  if (state.lastFocus && typeof state.lastFocus.focus === "function") {
    state.lastFocus.focus();
  }
}

function refreshModal() {
  const wish = state.wishes.find((item) => item.id === state.modalWishId);
  if (!wish) return closeModal();
  els.modalBody.innerHTML = modalContent(wish);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.hidden = true;
  }, 4200);
}

function renderAll() {
  renderPills();
  renderFeed();
  renderFulfilled();
}

function handleWishSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const error = els.wishFormError;
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const city = String(data.get("city") || "").trim();
  const category = String(data.get("category") || "");
  const story = String(data.get("story") || "").trim();
  const need = String(data.get("need") || "").trim();
  const cost = Number(data.get("cost"));
  const photo = String(data.get("photo") || "").trim();

  error.hidden = true;

  if (!name || !city || !CATEGORIES[category] || !story || !need || !Number.isFinite(cost)) {
    error.textContent = "Пожалуйста, заполните все обязательные поля.";
    error.hidden = false;
    return;
  }
  if (cost < 1 || cost > 500000) {
    error.textContent = "Укажите примерную стоимость от 1 до 500 000 ₽.";
    error.hidden = false;
    return;
  }
  if (photo && !isValidHttpUrl(photo)) {
    error.textContent = "Ссылка на фото должна начинаться с http:// или https://.";
    error.hidden = false;
    return;
  }

  state.wishes.unshift({
    id: `w-${Date.now()}`,
    name,
    city,
    category,
    story,
    need,
    cost: Math.round(cost),
    photo,
    status: "moderation",
    example: false,
    createdAt: new Date().toISOString(),
  });
  saveWishes();
  renderAll();
  form.reset();
  const counter = form.querySelector("[data-count='story']");
  if (counter) counter.textContent = "0";
  showToast("Желание отправлено на модерацию и сохранено в этом браузере.");
  document.getElementById("lenta").scrollIntoView({ behavior: "smooth" });
}

function handleDonorSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const error = form.querySelector("#donor-form-error");
  const data = new FormData(form);
  const donorName = String(data.get("donorName") || "").trim();
  const donorContact = String(data.get("donorContact") || "").trim();
  const donorMessage = String(data.get("donorMessage") || "").trim();

  if (error) error.hidden = true;

  if (!donorName || !donorContact || !donorMessage) {
    if (error) {
      error.textContent = "Пожалуйста, заполните имя, контакт и сообщение.";
      error.hidden = false;
    }
    return;
  }

  const wish = state.wishes.find((item) => item.id === state.modalWishId);
  if (!wish || wish.status !== "open") return;

  wish.status = "in_progress";
  wish.donorName = donorName;
  wish.donorContact = donorContact;
  wish.donorMessage = donorMessage;
  wish.reservedAt = new Date().toISOString();
  saveWishes();
  state.showDonorForm = "success";
  renderAll();
  refreshModal();
}

function bindEvents() {
  els.navToggle.addEventListener("click", () => {
    const open = !els.nav.classList.contains("is-open");
    els.nav.classList.toggle("is-open", open);
    els.navToggle.setAttribute("aria-expanded", String(open));
    els.navToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  });

  els.nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      els.nav.classList.remove("is-open");
      els.navToggle.setAttribute("aria-expanded", "false");
    }
  });

  els.filterCategory.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    renderAll();
  });

  els.filterCost.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cost]");
    if (!button) return;
    state.cost = button.dataset.cost;
    renderAll();
  });

  els.wishGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open]");
    if (!button) return;
    openModal(button.dataset.open);
  });

  els.modalBody.addEventListener("click", (event) => {
    if (event.target.closest("[data-fulfill]")) {
      state.showDonorForm = true;
      refreshModal();
      const input = els.modalBody.querySelector("input, textarea, button");
      if (input) input.focus();
    }
    if (event.target.closest("[data-back]")) {
      state.showDonorForm = false;
      refreshModal();
    }
    if (event.target.closest("[data-close]")) closeModal();
  });

  els.modalBody.addEventListener("submit", (event) => {
    if (event.target.id === "donor-form") handleDonorSubmit(event);
  });

  els.modalClose.addEventListener("click", closeModal);
  els.modal.addEventListener("click", (event) => {
    if (event.target === els.modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.modal.hidden) closeModal();
  });

  els.wishForm.addEventListener("submit", handleWishSubmit);
  const storyField = els.wishForm.querySelector("[name='story']");
  const counter = els.wishForm.querySelector("[data-count='story']");
  if (storyField && counter) {
    const update = () => {
      counter.textContent = String(storyField.value.length);
    };
    storyField.addEventListener("input", update);
    update();
  }
}

function init() {
  els.filterCategory = document.getElementById("filter-category");
  els.filterCost = document.getElementById("filter-cost");
  els.feedMeta = document.getElementById("feed-meta");
  els.wishGrid = document.getElementById("wish-grid");
  els.fulfilledGrid = document.getElementById("fulfilled-grid");
  els.wishForm = document.getElementById("wish-form");
  els.wishFormError = document.getElementById("wish-form-error");
  els.modal = document.getElementById("modal");
  els.modalPanel = els.modal.querySelector(".modal");
  els.modalBody = document.getElementById("modal-body");
  els.modalClose = els.modal.querySelector(".modal-close");
  els.toast = document.getElementById("toast");
  els.nav = document.getElementById("site-nav");
  els.navToggle = document.querySelector(".nav-toggle");

  state.wishes = loadWishes();
  renderAll();
  bindEvents();
}

document.addEventListener("DOMContentLoaded", init);
