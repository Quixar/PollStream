document.addEventListener('DOMContentLoaded', () => {
  // ===== SURVEY SORTING SYSTEM =====
  class SurveySortManager {
    constructor() {
      this.sortSelect = document.getElementById('sortSelect');
      this.surveysContainer = document.getElementById('surveysContainer');
      this.surveys = [];
      this.currentSort = 'date_desc'; // default
      
      this.init();
    }

    init() {
      if (!this.sortSelect || !this.surveysContainer) return;
      
      // Загружаем сохранённую сортировку
      this.currentSort = localStorage.getItem('surveySort') || 'date_desc';
      this.sortSelect.value = this.currentSort;
      
      // Читаем опросы из DOM
      this.loadSurveysFromDOM();
      
      // Привязываем обработчик выбора
      this.sortSelect.addEventListener('change', (e) => this.onSortChange(e));
      
      // Применяем сохранённую сортировку
      this.applySorting(this.currentSort);
      
      console.log('SurveySortManager initialized with', this.surveys.length, 'surveys');
    }

    loadSurveysFromDOM() {
      // Читаем все опросы из контейнера
      const surveyElements = this.surveysContainer.querySelectorAll('[id^="survey-"]');
      
      this.surveys = Array.from(surveyElements).map(el => {
        const surveyId = el.id.replace('survey-', '');
        const nameEl = el.querySelector('h3');
        const dateEl = el.querySelector('p.text-sm.text-gray-500');
        
        const name = nameEl ? nameEl.textContent.trim() : 'Безимённый';
        const dateText = dateEl ? dateEl.textContent.replace('Создано:', '').trim() : '';
        
        // Парсим дату в формате "d.m.Y в H:i"
        const dateObj = this.parseDate(dateText);
        
        return {
          id: surveyId,
          name: name,
          dateText: dateText,
          date: dateObj,
          element: el
        };
      });
      
      console.log('Loaded surveys:', this.surveys);
    }

    parseDate(dateStr) {
      // Формат: "d.m.Y в H:i" (например: "6.03.2026 в 15:30")
      if (!dateStr) return new Date(0);
      
      const match = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+в\s+(\d{1,2}):(\d{2})/);
      if (!match) return new Date(0);
      
      const [, day, month, year, hours, minutes] = match;
      return new Date(year, month - 1, day, hours, minutes);
    }

    applySorting(sortType) {
      const sortedSurveys = this.getSortedSurveys(sortType);
      
      // Очищаем контейнер и добавляем отсортированные элементы
      this.surveysContainer.innerHTML = '';
      sortedSurveys.forEach(survey => {
        this.surveysContainer.appendChild(survey.element);
      });
      
      console.log('Applied sorting:', sortType);
    }

    getSortedSurveys(sortType) {
      const surveys = [...this.surveys];
      
      switch (sortType) {
        case 'date_desc':
          return surveys.sort((a, b) => b.date - a.date); // Новые первыми
        case 'date_asc':
          return surveys.sort((a, b) => a.date - b.date); // Старые первыми
        case 'alpha_asc':
          return surveys.sort((a, b) => a.name.localeCompare(b.name, 'ru')); // А-Я
        case 'alpha_desc':
          return surveys.sort((a, b) => b.name.localeCompare(a.name, 'ru')); // Я-А
        default:
          return surveys;
      }
    }

    onSortChange(e) {
      this.currentSort = e.target.value;
      localStorage.setItem('surveySort', this.currentSort);
      this.applySorting(this.currentSort);
      console.log('Sort changed to:', this.currentSort);
    }

    // Метод для обновления при добавлении нового опроса
    refreshSurveys() {
      console.log('Refreshing surveys...');
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
    // Buttons
    this.openModalBtn = document.getElementById('openModal');
    this.closeModalBtn = document.getElementById('closeModal');
    this.closeNameModalBtn = document.getElementById('closeNameModal');
    this.backButton = document.getElementById('backButton');
    
    // Survey type buttons
    this.openCustomSurveyBtn = document.getElementById('openCustomSurvey');
    this.openTemplateSurveyBtn = document.getElementById('openTemplateSurvey');
    
    // Overlays
    this.modalOverlay = document.getElementById('modalOverlay');
    this.nameModalOverlay = document.getElementById('nameModalOverlay');
    
    // Form elements
    this.surveyNameForm = document.getElementById('surveyNameForm');
    this.hiddenSurveyType = document.getElementById('hiddenSurveyType');
    this.hiddenTemplateId = document.getElementById('hiddenTemplateId');

    // Template picker
    this.templatePicker = document.getElementById('templatePicker');
    this.templateSelect = document.getElementById('template_select');
  }

  attachEventListeners() {
    // Open first modal
    this.openModalBtn?.addEventListener('click', () => this.openFirstModal());

    // Close first modal
    this.closeModalBtn?.addEventListener('click', () => this.closeFirstModal());
    this.modalOverlay?.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.closeFirstModal();
      }
    });

    // Survey type selection
    this.openCustomSurveyBtn?.addEventListener('click', () => this.selectSurveyType('custom'));
    this.openTemplateSurveyBtn?.addEventListener('click', () => this.selectSurveyType('template'));

    // Template selection
    this.templateSelect?.addEventListener('change', () => this.syncTemplateIdFromSelect());

    // Close second modal
    this.closeNameModalBtn?.addEventListener('click', () => this.closeSecondModal());
    this.nameModalOverlay?.addEventListener('click', (e) => {
      if (e.target === this.nameModalOverlay) {
        this.closeSecondModal();
      }
    });

    // Back button
    this.backButton?.addEventListener('click', () => this.goBack());

    // ESC key handling
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
    // Focus on input field for better UX
    const nameInput = document.getElementById('survey_name');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 100);
    }
  }

  closeSecondModal() {
    this.nameModalOverlay?.classList.add('hidden');
    this.unlockScroll();
  }

  selectSurveyType(type) {
    if (this.hiddenSurveyType) {
      this.hiddenSurveyType.value = type;
    }

    // Toggle template UI and template_id
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
    const val = this.templateSelect?.value || '';
    this.hiddenTemplateId.value = val;
  }

  goBack() {
    this.closeSecondModal();
    this.openFirstModal();
  }

  handleEscKey(e) {
    if (e.key === 'Escape') {
      if (!this.nameModalOverlay?.classList.contains('hidden')) {
        this.closeSecondModal();
      } else if (!this.modalOverlay?.classList.contains('hidden')) {
        this.closeFirstModal();
      }
    }
  }

  lockScroll() {
    document.body.style.overflow = 'hidden';
  }

  unlockScroll() {
    document.body.style.overflow = 'auto';
  }
  }

  // Initialize survey sort manager (for sorting surveys on index page)
  new SurveySortManager();
  
  // Initialize modal manager when DOM is ready
  new ModalManager();
});