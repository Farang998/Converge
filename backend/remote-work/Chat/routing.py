from django.urls import re_path
from .consumers import ChatConsumer, ProjectChatConsumer, IndividualChatConsumer

websocket_urlpatterns = [
    re_path(r"^ws/chat/project/(?P<project_id>[^/]+)/$", ProjectChatConsumer.as_asgi()),
    re_path(r"^ws/chat/individual/(?P<chat_id>[^/]+)/$", IndividualChatConsumer.as_asgi()),
    re_path(r"^ws/chat/(?P<room>[^/]+)/$", ChatConsumer.as_asgi()),
]
