from django.urls import path, include
from .views import hello_world

urlpatterns = [
    path('hello/', hello_world),
    path('auth/', include('api.auth.urls')),
]