document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ===== SURVEY SORTING SYSTEM =====
  class SurveySortManager {
    constructor() {
      this.sortSelect = document.getElementById('sortSelect');
      this.surveysContainer = document.getElementById('surveysContainer');
      this.surveys = [];
      this.currentSort = 'date_desc';

      this.init();
    }

    init() {
      if (!this.sortSelect || !this.surveysContainer) return;

      this.currentSort = localStorage.getItem('surveySort') || 'date_desc';
      this.sortSelect.value = this.currentSort;

      this.loadSurveysFromDOM();

      this.sortSelect.addEventListener('change', (e) => this.onSortChange(e));

      this.applySorting(this.currentSort);
    }

    loadSurveysFromDOM() {
      const surveyElements = this.surveysContainer.querySelectorAll('[id^="survey-"]');

      this.surveys = Array.from(surveyElements).map(el => {
        const surveyId = el.id.replace('survey-', '');
        const nameEl = el.querySelector('h3');
        const dateEl = el.querySelector('p.text-sm.text-gray-500');

        const name = nameEl ? nameEl.textContent.trim() : 'Без имени';
        const dateText = dateEl ? dateEl.textContent.replace('Создано:', '').trim() : '';

        const dateObj = this.parseDate(dateText);

        return {
          id: surveyId,
          name: name,
          dateText: dateText,
          date: dateObj,
          element: el
        };
      });
    }

    parseDate(dateStr) {
      if (!dateStr) return new Date(0);
      const match = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+в\s+(\d{1,2}):(\d{2})/);
      if (!match) return new Date(0);
      const [, day, month, year, hours, minutes] = match;
      return new Date(year, month - 1, day, hours, minutes);
    }

    applySorting(sortType) {
      const sortedSurveys = this.getSortedSurveys(sortType);
      this.surveysContainer.innerHTML = '';
      sortedSurveys.forEach(survey => {
        this.surveysContainer.appendChild(survey.element);
      });
    }

    getSortedSurveys(sortType) {
      const surveys = [...this.surveys];
      switch (sortType) {
        case 'date_desc': return surveys.sort((a, b) => b.date - a.date);
        case 'date_asc': return surveys.sort((a, b) => a.date - b.date);
        case 'alpha_asc': return surveys.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        case 'alpha_desc': return surveys.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
        default: return surveys;
      }
    }

    onSortChange(e) {
      this.currentSort = e.target.value;
      localStorage.setItem('surveySort', this.currentSort);
      this.applySorting(this.currentSort);
    }

    refreshSurveys() {
      this.loadSurveysFromDOM();
      this.applySorting(this.currentSort);
    }
  }

  // ===== MODAL MANAGEMENT SYSTEM =====
  class ModalManager {
    constructor() {
      this.initElements();
      this.attachEventListeners();
    }

    initElements() {
      this.openModalBtn = document.getElementById('openModal');
      this.closeModalBtn = document.getElementById('closeModal');
      this.closeNameModalBtn = document.getElementById('closeNameModal');
      this.backButton = document.getElementById('backButton');
      this.openCustomSurveyBtn = document.getElementById('openCustomSurvey');
      this.openTemplateSurveyBtn = document.getElementById('openTemplateSurvey');
      this.modalOverlay = document.getElementById('modalOverlay');
      this.nameModalOverlay = document.getElementById('nameModalOverlay');
      this.surveyNameForm = document.getElementById('surveyNameForm');
      this.hiddenSurveyType = document.getElementById('hiddenSurveyType');
      this.hiddenTemplateId = document.getElementById('hiddenTemplateId');
      this.templatePicker = document.getElementById('templatePicker');
      this.templateSelect = document.getElementById('template_select');
    }

    attachEventListeners() {
      this.openModalBtn?.addEventListener('click', () => this.openFirstModal());
      this.closeModalBtn?.addEventListener('click', () => this.closeFirstModal());
      this.modalOverlay?.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) this.closeFirstModal();
      });
      this.openCustomSurveyBtn?.addEventListener('click', () => this.selectSurveyType('custom'));
      this.openTemplateSurveyBtn?.addEventListener('click', () => this.selectSurveyType('template'));
      this.templateSelect?.addEventListener('change', () => this.syncTemplateIdFromSelect());
      this.closeNameModalBtn?.addEventListener('click', () => this.closeSecondModal());
      this.nameModalOverlay?.addEventListener('click', (e) => {
        if (e.target === this.nameModalOverlay) this.closeSecondModal();
      });
      this.backButton?.addEventListener('click', () => this.goBack());
      document.addEventListener('keydown', (e) => this.handleEscKey(e));
    }

    openFirstModal() {
      this.modalOverlay?.classList.remove('hidden');
      this.lockScroll();
    }

    closeFirstModal() {
      this.modalOverlay?.classList.add('hidden');
      this.unlockScroll();
    }

    openSecondModal() {
      this.nameModalOverlay?.classList.remove('hidden');
      const nameInput = document.getElementById('survey_name');
      if (nameInput) setTimeout(() => nameInput.focus(), 100);
    }

    closeSecondModal() {
      this.nameModalOverlay?.classList.add('hidden');
      this.unlockScroll();
    }

    selectSurveyType(type) {
      if (this.hiddenSurveyType) this.hiddenSurveyType.value = type;
      if (type === 'template') {
        this.templatePicker?.classList.remove('hidden');
        this.syncTemplateIdFromSelect();
      } else {
        this.templatePicker?.classList.add('hidden');
        if (this.hiddenTemplateId) this.hiddenTemplateId.value = '';
      }
      this.closeFirstModal();
      this.openSecondModal();
    }

    syncTemplateIdFromSelect() {
      if (!this.hiddenTemplateId) return;
      this.hiddenTemplateId.value = this.templateSelect?.value || '';
    }

    goBack() {
      this.closeSecondModal();
      this.openFirstModal();
    }

    handleEscKey(e) {
      if (e.key === 'Escape') {
        if (!this.nameModalOverlay?.classList.contains('hidden')) this.closeSecondModal();
        else if (!this.modalOverlay?.classList.contains('hidden')) this.closeFirstModal();
      }
    }

    lockScroll() { document.body.style.overflow = 'hidden'; }
    unlockScroll() { document.body.style.overflow = 'auto'; }
  }

  // ===== COPY LINK SYSTEM (DELEGATION) =====
  const surveysContainer = document.getElementById('surveysContainer');
  if (surveysContainer) {
    surveysContainer.addEventListener('click', async (e) => {
      // Ищем кнопку копирования по атрибуту title или классу
      const btn = e.target.closest('[title="Копировать ссылку"]');
      if (!btn) return;

      e.preventDefault();
      const url = btn.getAttribute('data-url');
      if (!url) return;

      try {
        await navigator.clipboard.writeText(url);

        // Визуальный отклик
        const originalSVG = btn.innerHTML;
        btn.innerHTML = `
          <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>`;
        btn.classList.add('bg-green-50');

        setTimeout(() => {
          btn.innerHTML = originalSVG;
          btn.classList.remove('bg-green-50');
        }, 1500);
      } catch (err) {
        alert('Не удалось скопировать ссылку');
      }
    });
  }

  // Initialize managers
  new SurveySortManager();
  new ModalManager();
});