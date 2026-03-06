from django.db import models
from django.contrib.auth.models import User
from uuid import uuid4

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.user.username

class Survey(models.Model):
    VISIBILITY_CHOICES = [
        ('private', 'Приватная'),
        ('link', 'По ссылке'),
        ('public', 'Публичная'),
    ]

    RESPONSE_CHOICES = [
        ('unlimited', 'Неограниченное'),
        ('limited', 'Ограниченное количество'),
        ('date_limit', 'До определённой даты'),
    ]

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="surveys")

    name = models.CharField(max_length=255, verbose_name="Название анкеты")
    description = models.TextField(blank=True, null=True, verbose_name="Описание анкеты")
    survey_type = models.CharField(max_length=50, default='custom', verbose_name="Тип анкеты")

    # Здесь хранится вся структура, которую собирает JS-конструктор
    state_json = models.JSONField(blank=True, null=True, verbose_name="Структура анкеты")

    # Настройки доступа
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='link', verbose_name="Видимость")
    
    # Настройки ответов
    response_type = models.CharField(max_length=20, choices=RESPONSE_CHOICES, default='unlimited', verbose_name="Ограничение ответов")
    response_limit = models.IntegerField(blank=True, null=True, verbose_name="Максимум ответов")
    response_deadline = models.DateTimeField(blank=True, null=True, verbose_name="Крайний срок")
    
    # Настройки
    show_progress_bar = models.BooleanField(default=True, verbose_name="Показывать прогресс")
    show_question_numbers = models.BooleanField(default=True, verbose_name="Показывать номера вопросов")
    shuffle_questions = models.BooleanField(default=False, verbose_name="Перемешивать вопросы")
    allow_edit_after_submit = models.BooleanField(default=False, verbose_name="Разрешить изменения после отправки")

    # Статус
    is_active = models.BooleanField(default=True, verbose_name="Активна")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")

    class Meta:
        verbose_name = "Анкета"
        verbose_name_plural = "Анкеты"
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def response_count(self):
        return self.responses.count()

    @property
    def completion_rate(self):
        if self.response_limit and self.response_limit > 0:
            return min(100, int((self.response_count / self.response_limit) * 100))
        return 0


class SurveyLink(models.Model):
    """Модель для ссылок на опросы."""
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='links', verbose_name="Анкета")
    token = models.CharField(max_length=32, unique=True, verbose_name="Токен ссылки")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    is_active = models.BooleanField(default=True, verbose_name="Активна")

    class Meta:
        verbose_name = "Ссылка на анкету"
        verbose_name_plural = "Ссылки на анкеты"

    def __str__(self):
        return f"Ссылка на '{self.survey.name}'"


class SurveyResponse(models.Model):
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name='responses', verbose_name="Анкета")

    # Здесь будут храниться ответы пользователя в виде словаря: {"id_вопроса": "ответ", ...}
    answers_json = models.JSONField(verbose_name="Ответы пользователя")

    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата прохождения")

    class Meta:
        verbose_name = "Ответ на анкету"
        verbose_name_plural = "Ответы на анкеты"
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Ответ на '{self.survey.name}' ({self.submitted_at.strftime('%d.%m.%Y %H:%M')})"
