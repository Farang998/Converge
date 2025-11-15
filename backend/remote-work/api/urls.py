from django.urls import path, include
from .views import hello_world

urlpatterns = [
    path('hello/', hello_world),
    path('auth/', include('api.auth.urls')),
    path('projects/', include('api.projects.urls')),
    path('notifications/', include('api.notifications.urls')),
    path('tasks/', include('api.tasks.urls')),
    path('calendar/', include('api.calendar.urls')),
]