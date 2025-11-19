from django.urls import re_path
<<<<<<< HEAD
from .consumers import ChatConsumer

websocket_urlpatterns = [
=======
from .consumers import ChatConsumer, ProjectChatConsumer, IndividualChatConsumer

websocket_urlpatterns = [
    re_path(r"^ws/chat/project/(?P<project_id>[^/]+)/$", ProjectChatConsumer.as_asgi()),
    re_path(r"^ws/chat/individual/(?P<chat_id>[^/]+)/$", IndividualChatConsumer.as_asgi()),
>>>>>>> 7a11420 (Add delete option in chat, media sharing and search option, connect for this frontend and backend)
    re_path(r"^ws/chat/(?P<room>[^/]+)/$", ChatConsumer.as_asgi()),
]
