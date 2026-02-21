document.addEventListener('DOMContentLoaded', () => {
  // Modal Management System
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

  // Initialize modal manager when DOM is ready
  new ModalManager();
});