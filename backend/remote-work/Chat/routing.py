from django.urls import re_path
from .consumers import ChatConsumer, ProjectChatConsumer

websocket_urlpatterns = [
    re_path(r"^ws/chat/(?P<room>[^/]+)/$", ChatConsumer.as_asgi()),
    re_path(r"^ws/chat/project/(?P<project_id>[^/]+)/$", ProjectChatConsumer.as_asgi()),
]
