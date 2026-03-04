from django.contrib import admin
from .models import Survey, SurveyResponse

@admin.register(Survey)
class SurveyAdmin(admin.ModelAdmin):
    list_display = ('name', 'survey_type', 'created_at')
    list_filter = ('survey_type', 'created_at')
    search_fields = ('name',)

@admin.register(SurveyResponse)
class SurveyResponseAdmin(admin.ModelAdmin):
    list_display = ('survey', 'submitted_at')
    list_filter = ('survey', 'submitted_at')