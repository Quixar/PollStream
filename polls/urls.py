from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),      # главная
    path('create-survey/', views.create_survey, name='create_survey'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('profile/', views.profile, name='profile'),
    
    # Dashboard routes
    path('dashboard/', views.dashboard_home, name='dashboard_home'),
    path('dashboard/profile/', views.dashboard_profile, name='dashboard_profile'),
    path('dashboard/team/', views.dashboard_team, name='dashboard_team'),
    path('dashboard/forms/', views.dashboard_forms, name='dashboard_forms'),
    path('dashboard/activity/', views.dashboard_activity, name='dashboard_activity'),
    path('dashboard/settings/', views.dashboard_settings, name='dashboard_settings'),

]
