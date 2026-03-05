from django.db import models
from django.contrib.auth.models import User

class Survey(models.Model):

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="surveys")

    name = models.CharField(max_length=255, verbose_name="Название анкеты")
    survey_type = models.CharField(max_length=50, default='custom', verbose_name="Тип анкеты")

    # Здесь хранится вся структура, которую собирает JS-конструктор
    state_json = models.JSONField(blank=True, null=True, verbose_name="Структура анкеты")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")

    class Meta:
        verbose_name = "Анкета"
        verbose_name_plural = "Анкеты"
        ordering = ['-created_at']

    def __str__(self):
        return self.name


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