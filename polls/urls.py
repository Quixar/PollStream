from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),      # главная
    path('create-survey/', views.create_survey, name='create_survey'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('profile/', views.profile, name='profile'),
    path('logout/', views.logout_view, name='logout'),
    
    # Dashboard routes
    path('dashboard/', views.dashboard_home, name='dashboard_home'),
    path('dashboard/profile/', views.dashboard_profile, name='dashboard_profile'),
    path('dashboard/team/', views.dashboard_team, name='dashboard_team'),
    path('dashboard/forms/', views.dashboard_forms, name='dashboard_forms'),
    path('dashboard/activity/', views.dashboard_activity, name='dashboard_activity'),
    path('dashboard/settings/', views.dashboard_settings, name='dashboard_settings'),
    
    # Survey operations
    path('save-survey/', views.save_survey, name='save_survey'),
    # Backward-compatible editor URL (older links)
    path('edit-survey/<int:survey_id>/', views.edit_survey, name='edit_survey'),
    # Wizard editor URL (required by workflow)
    path('survey/<int:survey_id>/edit/', views.edit_survey, name='survey_edit'),
    path('survey/<int:survey_id>/', views.survey_detail, name='survey_detail'),
    
    # Survey workflow - new pages
    path('survey/<int:survey_id>/settings/', views.survey_settings, name='survey_settings'),
    path('survey/<int:survey_id>/responses/', views.survey_responses, name='survey_responses'),
    path('survey/<int:survey_id>/results/', views.survey_results, name='survey_results'),
]

# URL для перенаправления неавторизованных пользователей
LOGIN_URL = 'login'  # имя вашего path() для логина

# URL куда редиректить после успешного логина
LOGIN_REDIRECT_URL = 'dashboard_home'
