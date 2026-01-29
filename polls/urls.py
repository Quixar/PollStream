from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),      # главная
    path('create-survey/', views.create_survey, name='create_survey'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
]
