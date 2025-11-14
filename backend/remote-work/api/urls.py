from django.urls import path, include
from .views import hello_world

urlpatterns = [
    path('hello/', hello_world),
    path('auth/', include('api.auth.urls')),
    path('projects/', include('api.projects.urls')),

    # path('notifications/', include('api.notifications.urls')),  # TODO: Implement notifications app

]