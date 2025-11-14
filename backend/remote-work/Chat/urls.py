from django.urls import path
from .views import ChatList, ChatMessages, CreateGroup, DirectChat, ProjectChatMessages, SendProjectMessage

urlpatterns = [
    # MOST SPECIFIC patterns FIRST - this is critical!
    path('project/<str:project_id>/messages/', ProjectChatMessages.as_view()),  # /api/chats/project/<project_id>/messages/
    path('project/<str:project_id>/send/', SendProjectMessage.as_view()),  # /api/chats/project/<project_id>/send/
    path('create/', CreateGroup.as_view()),  # /api/chats/create/
    path('direct/<str:username>/', DirectChat.as_view()),  # /api/chats/direct/<username>/
    # Generic patterns LAST
    path('<str:chatroom_name>/messages/', ChatMessages.as_view()),  # /api/chats/<chatroom_name>/messages/
    path('', ChatList.as_view()),  # /api/chats/ - empty pattern last
]