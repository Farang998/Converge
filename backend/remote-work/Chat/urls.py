from django.urls import path
from .views import ChatList, ChatMessages, CreateGroup, DirectChat

urlpatterns = [
    path('chats/', ChatList.as_view()),
    path('chats/<str:chatroom_name>/messages/', ChatMessages.as_view()),
    path('chats/create/', CreateGroup.as_view()),
    path('chats/direct/<str:username>/', DirectChat.as_view()),
]