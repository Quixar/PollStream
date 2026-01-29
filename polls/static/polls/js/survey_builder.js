document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // --- Survey builder: local state + localStorage persistence (MVP) ---

  // Get survey name from data attribute or window variable
  const surveyNameEl = document.querySelector('[data-survey-name]');
  const surveyName = surveyNameEl
    ? surveyNameEl.getAttribute('data-survey-name')
    : (window.SURVEY_NAME || 'Новый опрос');

  const templateStateRaw = surveyNameEl ? surveyNameEl.getAttribute('data-template-state') : '';

  const storageKey = `pollstream:builder:${surveyName}`;

  const addElementBtn = document.getElementById('addElementBtn');
  const startHereBtn = document.getElementById('startHereBtn');
  const emptyState = document.getElementById('emptyState');
  const questionsContainer = document.getElementById('questionsContainer');
  const pagesList = document.getElementById('pagesList');
  const addPageBtn = document.getElementById('addPageBtn');

  const addQuestionOverlay = document.getElementById('addQuestionOverlay');
  const closeAddQuestionBtn = document.getElementById('closeAddQuestion');

  function uid() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function getDefaultQuestion(type) {
    const base = {
      id: uid(),
      type,
      title: "Новый вопрос",
      required: false,
    };

    if (type === 'single_choice' || type === 'multiple_choice' || type === 'dropdown') {
      return { ...base, options: ["Вариант 1", "Вариант 2"] };
    }
    if (type === 'matrix') {
      return { ...base, rows: ["Строка 1", "Строка 2"], cols: ["Колонка 1", "Колонка 2"] };
    }
    if (type === 'ranking') {
      return { ...base, options: ["Пункт 1", "Пункт 2", "Пункт 3"] };
    }
    if (type === 'image_choice') {
      return { ...base, options: ["Изображение 1", "Изображение 2"] };
    }
    return base;
  }

  function typeLabel(type) {
    const map = {
      single_choice: "Одиночный выбор",
      multiple_choice: "Множественный выбор",
      image_choice: "Выбор изображения",
      text: "Текстовый ответ",
      email: "Ответ электронной почты",
      number: "Числовой ответ",
      date: "Ответ с датой",
      matrix: "Матрица",
      ranking: "Ранжирование",
      dropdown: "Выпадающий список",
    };
    return map[type] || type;
  }

  let state = {
    pages: [],
    currentPageId: null,
  };

  function getCurrentPage() {
    return state.pages.find(p => p.id === state.currentPageId);
  }

  function getCurrentPageQuestions() {
    const page = getCurrentPage();
    return page ? page.questions : [];
  }

  function saveState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  }

  function bootstrapFromTemplateIfNeeded() {
    // Предзаполняем только если state ещё не сохранён для этого surveyName
    // (не ломаем существующее поведение восстановления из localStorage).
    if (!templateStateRaw) return;
    try {
      const alreadySaved = localStorage.getItem(storageKey);
      if (alreadySaved) return;
    } catch (e) {
      // если localStorage недоступен — просто не бустрепаем
      return;
    }

    try {
      const parsed = JSON.parse(templateStateRaw);
      if (parsed && Array.isArray(parsed.pages)) {
        state = parsed;
        if (!state.currentPageId && state.pages.length > 0) {
          state.currentPageId = state.pages[0].id;
        }
        saveState();
      }
    } catch (e) {
      // ignore invalid template JSON
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        // Initialize with first page
        addPage('Главная страница', true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.pages)) {
        state = parsed;
        if (state.pages.length === 0) {
          addPage('Главная страница', true);
        } else if (!state.currentPageId && state.pages.length > 0) {
          state.currentPageId = state.pages[0].id;
        }
      } else {
        // Migrate old format
        if (parsed && Array.isArray(parsed.questions)) {
          const firstPage = {
            id: uid(),
            title: 'Главная страница',
            questions: parsed.questions
          };
          state = {
            pages: [firstPage],
            currentPageId: firstPage.id
          };
          saveState();
        } else {
          addPage('Главная страница', true);
        }
      }
    } catch (e) {
      addPage('Главная страница', true);
    }
  }

  function addPage(title, setAsCurrent = false) {
    const page = {
      id: uid(),
      title: title || `Страница ${state.pages.length + 1}`,
      questions: []
    };
    state.pages.push(page);
    if (setAsCurrent || state.pages.length === 1) {
      state.currentPageId = page.id;
    }
    saveState();
    renderPages();
    renderQuestions();
  }

  function deletePage(pageId) {
    if (state.pages.length <= 1) {
      alert('Нельзя удалить последнюю страницу');
      return;
    }
    const index = state.pages.findIndex(p => p.id === pageId);
    if (index === -1) return;
    state.pages.splice(index, 1);
    if (state.currentPageId === pageId) {
      state.currentPageId = state.pages[0].id;
    }
    saveState();
    renderPages();
    renderQuestions();
  }

  function switchPage(pageId) {
    state.currentPageId = pageId;
    saveState();
    renderPages();
    renderQuestions();
  }

  function updatePageTitle(pageId, newTitle) {
    const page = state.pages.find(p => p.id === pageId);
    if (page) {
      page.title = newTitle;
      saveState();
      renderPages();
    }
  }

  function renderPages() {
    if (!pagesList) return;
    pagesList.innerHTML = '';
    state.pages.forEach((page, idx) => {
      const isActive = page.id === state.currentPageId;
      const pageEl = document.createElement('div');
      pageEl.className = `border-2 rounded-lg p-4 bg-white cursor-pointer transition ${isActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`;
      pageEl.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <input 
            class="page-title-input text-base font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full"
            value="${escHtml(page.title)}"
            data-page-id="${page.id}"
            ${!isActive ? 'readonly' : ''}
          />
          <div class="flex items-center gap-2">
            <button class="page-menu-btn text-gray-400 hover:text-gray-600 p-1" data-page-id="${page.id}">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
              </svg>
            </button>
            ${state.pages.length > 1 ? `
              <button class="delete-page-btn text-red-500 hover:text-red-700 p-1" data-page-id="${page.id}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
        <div class="text-sm text-gray-500">${page.questions.length} вопросов</div>
      `;
      pageEl.addEventListener('click', (e) => {
        if (!e.target.closest('button') && !e.target.closest('input')) {
          switchPage(page.id);
        }
      });
      pagesList.appendChild(pageEl);
    });
  }

  function updateEmptyState() {
    if (!emptyState) return;
    const questions = getCurrentPageQuestions();
    if (questions.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
    }
  }

  function escHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function renderQuestions() {
    if (!questionsContainer) return;
    questionsContainer.innerHTML = '';
    const questions = getCurrentPageQuestions();
    questions.forEach((q, idx) => {
      const el = document.createElement('div');
      el.className = "bg-white border rounded-2xl p-6 shadow-sm";
      el.dataset.qid = q.id;

      el.innerHTML = `
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="text-sm text-gray-500 mb-2">Вопрос ${idx + 1} • ${escHtml(typeLabel(q.type))}</div>
            <input class="question-title w-full text-xl font-semibold text-gray-900 border border-transparent focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 rounded-xl px-3 py-2 outline-none"
                   value="${escHtml(q.title)}" />
          </div>
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-2 text-sm text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-50">
              <input type="checkbox" class="question-required w-4 h-4" ${q.required ? 'checked' : ''} />
              Обязательный
            </label>
            <button class="delete-question px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition">Удалить</button>
          </div>
        </div>

        <div class="mt-4 question-body"></div>
      `;

      const body = el.querySelector('.question-body');
      if (q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'dropdown' || q.type === 'ranking' || q.type === 'image_choice') {
        const items = (q.options || []).map((opt, i) => `
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded-full border border-gray-300 ${q.type === 'multiple_choice' ? 'rounded-md' : ''}"></div>
            <input class="option-input flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                   data-opt-index="${i}" value="${escHtml(opt)}" />
            <button class="remove-option px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl" data-opt-index="${i}">Удалить</button>
          </div>
        `).join('');

        body.innerHTML = `
          <div class="space-y-2">${items}</div>
          <button class="add-option mt-3 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition">
            + Добавить вариант
          </button>
        `;
      } else if (q.type === 'matrix') {
        const rows = (q.rows || []).map((r, i) => `
          <div class="flex items-center gap-3">
            <input class="matrix-row flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                   data-row-index="${i}" value="${escHtml(r)}" />
            <button class="remove-row px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl" data-row-index="${i}">Удалить</button>
          </div>
        `).join('');

        const cols = (q.cols || []).map((c, i) => `
          <div class="flex items-center gap-3">
            <input class="matrix-col flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                   data-col-index="${i}" value="${escHtml(c)}" />
            <button class="remove-col px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl" data-col-index="${i}">Удалить</button>
          </div>
        `).join('');

        body.innerHTML = `
          <div class="grid grid-cols-2 gap-6">
            <div>
              <div class="text-sm font-semibold text-gray-700 mb-2">Строки</div>
              <div class="space-y-2">${rows}</div>
              <button class="add-row mt-3 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition">+ Добавить строку</button>
            </div>
            <div>
              <div class="text-sm font-semibold text-gray-700 mb-2">Колонки</div>
              <div class="space-y-2">${cols}</div>
              <button class="add-col mt-3 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition">+ Добавить колонку</button>
            </div>
          </div>
        `;
      } else if (q.type === 'email') {
        body.innerHTML = `<div class="text-gray-500 text-sm">Ответ будет проверяться как email.</div>`;
      } else if (q.type === 'number') {
        body.innerHTML = `<div class="text-gray-500 text-sm">Ответ будет числом.</div>`;
      } else if (q.type === 'date') {
        body.innerHTML = `<div class="text-gray-500 text-sm">Ответ будет датой.</div>`;
      } else {
        body.innerHTML = `
          <textarea class="w-full min-h-[96px] px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Текстовый ответ..."></textarea>
        `;
      }

      questionsContainer.appendChild(el);
    });

    updateEmptyState();
  }

  function openAddQuestionModal() {
    if (!addQuestionOverlay) return;
    addQuestionOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeAddQuestionModal() {
    if (!addQuestionOverlay) return;
    addQuestionOverlay.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  function addQuestion(type) {
    const page = getCurrentPage();
    if (!page) {
      addPage('Главная страница', true);
      return addQuestion(type);
    }
    const q = getDefaultQuestion(type);
    page.questions.push(q);
    saveState();
    renderQuestions();
    renderPages();
  }

  // Initialize
  function init() {
    if (!addElementBtn || !startHereBtn || !questionsContainer || !pagesList || !addPageBtn) {
      console.warn('Survey builder elements not found, skipping initialization');
      return;
    }

    // Modal open from both buttons
    addElementBtn.addEventListener('click', openAddQuestionModal);
    startHereBtn.addEventListener('click', openAddQuestionModal);

    // Modal close
    if (closeAddQuestionBtn) {
      closeAddQuestionBtn.addEventListener('click', closeAddQuestionModal);
    }
    if (addQuestionOverlay) {
      addQuestionOverlay.addEventListener('click', (e) => {
        if (e.target === addQuestionOverlay) closeAddQuestionModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && addQuestionOverlay && !addQuestionOverlay.classList.contains('hidden')) {
        closeAddQuestionModal();
      }
    });

    // Type selection
    document.querySelectorAll('.question-type-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        addQuestion(type);
        closeAddQuestionModal();
      });
    });

    // Page handlers
    pagesList.addEventListener('input', (e) => {
      if (e.target.classList.contains('page-title-input')) {
        const pageId = e.target.getAttribute('data-page-id');
        updatePageTitle(pageId, e.target.value);
      }
    });

    pagesList.addEventListener('click', (e) => {
      if (e.target.closest('.delete-page-btn')) {
        const pageId = e.target.closest('.delete-page-btn')?.getAttribute('data-page-id');
        if (pageId && confirm('Удалить эту страницу?')) {
          deletePage(pageId);
        }
        e.stopPropagation();
      }
    });

    addPageBtn.addEventListener('click', () => {
      const pageNum = state.pages.length + 1;
      addPage(`Страница ${pageNum}`, true);
    });

    // Delegated handlers inside questions list
    questionsContainer.addEventListener('input', (e) => {
      const root = e.target.closest('[data-qid]');
      if (!root) return;
      const qid = root.dataset.qid;
      const questions = getCurrentPageQuestions();
      const q = questions.find((x) => x.id === qid);
      if (!q) return;

      if (e.target.classList.contains('question-title')) {
        q.title = e.target.value;
        saveState();
      }

      if (e.target.classList.contains('option-input')) {
        const i = Number(e.target.getAttribute('data-opt-index'));
        if (!Number.isNaN(i) && Array.isArray(q.options)) {
          q.options[i] = e.target.value;
          saveState();
        }
      }

      if (e.target.classList.contains('matrix-row')) {
        const i = Number(e.target.getAttribute('data-row-index'));
        if (!Number.isNaN(i) && Array.isArray(q.rows)) {
          q.rows[i] = e.target.value;
          saveState();
        }
      }

      if (e.target.classList.contains('matrix-col')) {
        const i = Number(e.target.getAttribute('data-col-index'));
        if (!Number.isNaN(i) && Array.isArray(q.cols)) {
          q.cols[i] = e.target.value;
          saveState();
        }
      }
    });

    questionsContainer.addEventListener('change', (e) => {
      const root = e.target.closest('[data-qid]');
      if (!root) return;
      const qid = root.dataset.qid;
      const questions = getCurrentPageQuestions();
      const q = questions.find((x) => x.id === qid);
      if (!q) return;

      if (e.target.classList.contains('question-required')) {
        q.required = !!e.target.checked;
        saveState();
      }
    });

    questionsContainer.addEventListener('click', (e) => {
      const root = e.target.closest('[data-qid]');
      const qid = root?.dataset?.qid;
      const questions = getCurrentPageQuestions();
      const qIndex = questions.findIndex((x) => x.id === qid);
      if (qIndex === -1) return;
      const q = questions[qIndex];

      if (e.target.classList.contains('delete-question')) {
        const page = getCurrentPage();
        if (page) {
          page.questions.splice(qIndex, 1);
          saveState();
          renderQuestions();
          renderPages();
        }
        return;
      }

      if (e.target.classList.contains('add-option')) {
        q.options = Array.isArray(q.options) ? q.options : [];
        q.options.push(`Вариант ${q.options.length + 1}`);
        saveState();
        renderQuestions();
        return;
      }

      if (e.target.classList.contains('remove-option')) {
        const i = Number(e.target.getAttribute('data-opt-index'));
        if (Array.isArray(q.options) && !Number.isNaN(i)) {
          q.options.splice(i, 1);
          saveState();
          renderQuestions();
        }
        return;
      }

      if (e.target.classList.contains('add-row')) {
        q.rows = Array.isArray(q.rows) ? q.rows : [];
        q.rows.push(`Строка ${q.rows.length + 1}`);
        saveState();
        renderQuestions();
        return;
      }

      if (e.target.classList.contains('remove-row')) {
        const i = Number(e.target.getAttribute('data-row-index'));
        if (Array.isArray(q.rows) && !Number.isNaN(i)) {
          q.rows.splice(i, 1);
          saveState();
          renderQuestions();
        }
        return;
      }

      if (e.target.classList.contains('add-col')) {
        q.cols = Array.isArray(q.cols) ? q.cols : [];
        q.cols.push(`Колонка ${q.cols.length + 1}`);
        saveState();
        renderQuestions();
        return;
      }

      if (e.target.classList.contains('remove-col')) {
        const i = Number(e.target.getAttribute('data-col-index'));
        if (Array.isArray(q.cols) && !Number.isNaN(i)) {
          q.cols.splice(i, 1);
          saveState();
          renderQuestions();
        }
        return;
      }
    });

    // Bootstrap from template (if any) then load and render initial state
    bootstrapFromTemplateIfNeeded();
    loadState();
    renderPages();
    renderQuestions();
  }

  init();
});

