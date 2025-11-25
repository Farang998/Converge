from django.urls import path, include
from .views import hello_world, ai_query, ingest_proxy
from . import ai_views

urlpatterns = [
    path('hello/', hello_world),
    path('ai/query/', ai_query),
    path('ingest/', ingest_proxy),
    path('ai/chats/', ai_views.ai_chats),
    path('ai/chats/<str:chat_id>/messages/', ai_views.ai_chat_messages),
    path('ai/chats/<str:chat_id>/messages/create/', ai_views.ai_chat_create_message),
    path('auth/', include('api.auth.urls')),
    path('projects/', include('api.projects.urls')),
    path('notifications/', include('api.notifications.urls')),
    path('tasks/', include('api.tasks.urls')),
    path('calendar/', include('api.calendar.urls')),
    path('file_sharing/', include('api.file_sharing.urls')),
    path('meetings/', include('api.meetings.urls')),
]