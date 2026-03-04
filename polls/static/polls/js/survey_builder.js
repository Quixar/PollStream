document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const surveyDataEl = document.querySelector('[data-survey-name]');
  const surveyName = surveyDataEl
    ? surveyDataEl.getAttribute('data-survey-name')
    : 'Новый опрос';

  const templateStateRaw = surveyDataEl ? surveyDataEl.getAttribute('data-template-state') : '';
  const surveyId = surveyDataEl ? surveyDataEl.getAttribute('data-survey-id') : null;

  const storageKey = `pollstream:builder:${surveyName}`;

  const addElementBtn = document.getElementById('addElementBtn');
  const startHereBtn = document.getElementById('startHereBtn');
  const emptyState = document.getElementById('emptyState');
  const questionsContainer = document.getElementById('questionsContainer');
  const pagesList = document.getElementById('pagesList');
  const addPageBtn = document.getElementById('addPageBtn');

  const addQuestionOverlay = document.getElementById('addQuestionOverlay');
  const closeAddQuestionBtn = document.getElementById('closeAddQuestion');

  const saveBtn = document.getElementById('saveSurveyBtn');
  const saveBtnText = document.getElementById('saveBtnText');

  // Вспомогательные функции
  function uid() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function escHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getDefaultQuestion(type) {
    const base = { id: uid(), type, title: "Новый вопрос", required: false };
    if (['single_choice', 'multiple_choice', 'dropdown'].includes(type)) {
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

  window.state = {
    pages: [],
    currentPageId: null,
  };

  function getCurrentPage() {
    return window.state.pages.find(p => p.id === window.state.currentPageId);
  }

  function getCurrentPageQuestions() {
    const page = getCurrentPage();
    return page ? page.questions : [];
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(window.state));
    } catch (e) {}
  }

  function initSurveyState() {
const surveyContainer = document.getElementById('survey-data-container');
    const rawData = surveyContainer ? surveyContainer.getAttribute('data-template-state') : '';

    console.log("Raw data from HTML:", rawData); // Для отладки в консоли F12

    if (rawData && rawData !== '{}' && rawData !== '""') {
      try {
        const parsed = JSON.parse(rawData);
        if (parsed && Array.isArray(parsed.pages)) {
          window.state = parsed;
          if (!window.state.currentPageId && window.state.pages.length > 0) {
            window.state.currentPageId = window.state.pages[0].id;
          }
          console.log("Успешно загружено из БД");
          return;
        }
      } catch (e) {
        console.error("Ошибка парсинга JSON из БД:", e);
      }
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.pages)) {
          window.state = parsed;
          console.log("Данные загружены из LocalStorage");
          return;
        }
      }
    } catch (e) {}

    // 3. Если везде пусто — создаем новую страницу
    console.log("Создание новой пустой анкеты");
    addPage('Главная страница', true);
  }

  function renderPages() {
    if (!pagesList) return;
    pagesList.innerHTML = '';
    window.state.pages.forEach((page) => {
      const isActive = page.id === window.state.currentPageId;
      const pageEl = document.createElement('div');
      pageEl.className = `border-2 rounded-lg p-4 bg-white cursor-pointer transition ${isActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`;
      pageEl.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <input class="page-title-input text-base font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full"
            value="${escHtml(page.title)}" data-page-id="${page.id}" ${!isActive ? 'readonly' : ''} />
          <div class="flex items-center gap-2">
            ${window.state.pages.length > 1 ? `
              <button class="delete-page-btn text-red-500 hover:text-red-700 p-1" data-page-id="${page.id}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>` : ''}
          </div>
        </div>
        <div class="text-sm text-gray-500">${page.questions.length} вопросов</div>
      `;
      pageEl.addEventListener('click', (e) => {
        if (!e.target.closest('button') && !e.target.closest('input')) switchPage(page.id);
      });
      pagesList.appendChild(pageEl);
    });
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
            <input class="question-title w-full text-xl font-semibold text-gray-900 border border-transparent focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 rounded-xl px-3 py-2 outline-none" value="${escHtml(q.title)}" />
          </div>
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-2 text-sm text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" class="question-required w-4 h-4" ${q.required ? 'checked' : ''} /> Обязательный
            </label>
            <button class="delete-question px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition">Удалить</button>
          </div>
        </div>
        <div class="mt-4 question-body"></div>
      `;

      const body = el.querySelector('.question-body');
      if (['single_choice', 'multiple_choice', 'dropdown', 'ranking', 'image_choice'].includes(q.type)) {
        const items = (q.options || []).map((opt, i) => `
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded-full border border-gray-300 ${q.type === 'multiple_choice' ? 'rounded-md' : ''}"></div>
            <input class="option-input flex-1 px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200" data-opt-index="${i}" value="${escHtml(opt)}" />
            <button class="remove-option px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl" data-opt-index="${i}">Удалить</button>
          </div>`).join('');
        body.innerHTML = `<div class="space-y-2">${items}</div><button class="add-option mt-3 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl">+ Добавить вариант</button>`;
      } else if (q.type === 'matrix') {
        const rows = (q.rows || []).map((r, i) => `<div class="flex items-center gap-3"><input class="matrix-row flex-1 px-3 py-2 border border-gray-200 rounded-xl outline-none" data-row-index="${i}" value="${escHtml(r)}" /><button class="remove-row px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl" data-row-index="${i}">Удалить</button></div>`).join('');
        const cols = (q.cols || []).map((c, i) => `<div class="flex items-center gap-3"><input class="matrix-col flex-1 px-3 py-2 border border-gray-200 rounded-xl outline-none" data-col-index="${i}" value="${escHtml(c)}" /><button class="remove-col px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl" data-col-index="${i}">Удалить</button></div>`).join('');
        body.innerHTML = `<div class="grid grid-cols-2 gap-6"><div><div class="text-sm font-semibold mb-2">Строки</div><div class="space-y-2">${rows}</div><button class="add-row mt-3 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-xl">+ Добавить строку</button></div><div><div class="text-sm font-semibold mb-2">Колонки</div><div class="space-y-2">${cols}</div><button class="add-col mt-3 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-xl">+ Добавить колонку</button></div></div>`;
      } else {
        body.innerHTML = `<textarea class="w-full min-h-[96px] px-4 py-3 border border-gray-200 rounded-2xl outline-none" placeholder="Текстовый ответ..." disabled></textarea>`;
      }
      questionsContainer.appendChild(el);
    });

    if (questions.length > 0) {
      const addMoreDiv = document.createElement('div');
      addMoreDiv.className = "flex justify-center mt-6 mb-4";
      addMoreDiv.innerHTML = `<button type="button" class="persistent-add-btn flex items-center gap-2 px-6 py-3 bg-white border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:border-indigo-500 hover:text-indigo-600 font-medium transition shadow-sm">Добавить еще вопрос</button>`;
      addMoreDiv.querySelector('.persistent-add-btn').addEventListener('click', openAddQuestionModal);
      questionsContainer.appendChild(addMoreDiv);
    }
    updateEmptyState();
  }

  function addPage(title, setAsCurrent = false) {
    const page = { id: uid(), title: title || `Страница ${window.state.pages.length + 1}`, questions: [] };
    window.state.pages.push(page);
    if (setAsCurrent || window.state.pages.length === 1) window.state.currentPageId = page.id;
    saveToLocalStorage();
    renderPages();
    renderQuestions();
  }

  function switchPage(pageId) {
    window.state.currentPageId = pageId;
    saveToLocalStorage();
    renderPages();
    renderQuestions();
  }

  function updateEmptyState() {
    if (!emptyState) return;
    getCurrentPageQuestions().length === 0 ? emptyState.classList.remove('hidden') : emptyState.classList.add('hidden');
  }

  function openAddQuestionModal() {
    addQuestionOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeAddQuestionModal() {
    addQuestionOverlay.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  function addQuestion(type) {
    const page = getCurrentPage();
    if (!page) return;
    page.questions.push(getDefaultQuestion(type));
    saveToLocalStorage();
    renderQuestions();
    renderPages();
  }

  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
  }

  function saveSurveyToDB() {
    if (!saveBtn || !saveBtnText) return;

      const dataContainer = document.querySelector('[data-survey-name]');
      const sId = dataContainer ? dataContainer.getAttribute('data-survey-id') : null;

      const originalText = saveBtnText.textContent;
      saveBtnText.textContent = 'Сохраняем...';
      saveBtn.disabled = true;

      const sType = dataContainer ? dataContainer.getAttribute('data-survey-type') : "custom";

      const surveyData = {
          survey_id: sId,
          survey_name: surveyName,
          survey_type: sType,
          state_json: window.state
      };

      console.log("Отправка данных на сервер:", surveyData);

      fetch('/save-survey/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
          body: JSON.stringify(surveyData)
      })
      .then(r => r.json())
      .then(data => {
          if (data.status === 'success') {
              localStorage.removeItem(storageKey);
              window.location.href = '/';
          } else {
              alert('Ошибка: ' + data.message);
              saveBtnText.textContent = originalText;
              saveBtn.disabled = false;
          }
      })
      .catch(() => {
          alert('Ошибка подключения');
          saveBtnText.textContent = originalText;
          saveBtn.disabled = false;
      });
  }

  function init() {
    if (saveBtn) saveBtn.addEventListener('click', saveSurveyToDB);
    if (!addElementBtn || !startHereBtn) return;

    addElementBtn.addEventListener('click', openAddQuestionModal);
    startHereBtn.addEventListener('click', openAddQuestionModal);
    if (closeAddQuestionBtn) closeAddQuestionBtn.addEventListener('click', closeAddQuestionModal);

    document.querySelectorAll('.question-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        addQuestion(btn.getAttribute('data-type'));
        closeAddQuestionModal();
      });
    });

    questionsContainer.addEventListener('input', (e) => {
      const root = e.target.closest('[data-qid]');
      if (!root) return;
      const q = getCurrentPageQuestions().find(x => x.id === root.dataset.qid);
      if (!q) return;

      if (e.target.classList.contains('question-title')) q.title = e.target.value;
      if (e.target.classList.contains('option-input')) q.options[e.target.dataset.optIndex] = e.target.value;
      if (e.target.classList.contains('matrix-row')) q.rows[e.target.dataset.rowIndex] = e.target.value;
      if (e.target.classList.contains('matrix-col')) q.cols[e.target.dataset.colIndex] = e.target.value;
      saveToLocalStorage();
    });

    questionsContainer.addEventListener('click', (e) => {
        const root = e.target.closest('[data-qid]');
        if (!root) return;
        const q = getCurrentPageQuestions().find(x => x.id === root.dataset.qid);

        if (e.target.classList.contains('delete-question')) {
            const p = getCurrentPage();
            p.questions = p.questions.filter(x => x.id !== root.dataset.qid);
            renderQuestions(); renderPages();
        }
        if (e.target.classList.contains('add-option')) { q.options.push(`Вариант ${q.options.length + 1}`); renderQuestions(); }
        if (e.target.classList.contains('remove-option')) { q.options.splice(e.target.dataset.optIndex, 1); renderQuestions(); }
        saveToLocalStorage();
    });

    initSurveyState();
    renderPages();
    renderQuestions();
  }

  init();
});