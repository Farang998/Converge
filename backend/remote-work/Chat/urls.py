from django.urls import path
from .views import (
    ChatList, ChatMessages, CreateGroup, DirectChat, 
    ProjectChatMessages, SendProjectMessage, DeleteMessage,
    ProjectTeamMembers, GetOrCreateIndividualChat,
    IndividualChatMessages, SendIndividualMessage,
    SearchGroupChatMessages, SearchIndividualChatMessages,
    ListProjectThreads, GetThreadMessages, ReplyToThread,
    ChatSummarizer
)

urlpatterns = [
    # MOST SPECIFIC patterns FIRST - this is critical!
    path("project/<str:project_id>/threads/", ListProjectThreads.as_view(), name="project_threads"), # /api/chats/project/<project_id>/threads/
    path("project/<str:project_id>/threads/<str:thread_id>/", GetThreadMessages.as_view(), name="project_thread_messages"), # /api/chats/project/<project_id>/threads/<thread_id>/
    path("project/<str:project_id>/threads/<str:thread_id>/reply/", ReplyToThread.as_view(), name="project_thread_reply"), # /api/chats/project/<project_id>/threads/<thread_id>/reply
    path('project/<str:project_id>/team-members/', ProjectTeamMembers.as_view()),  # /api/chats/project/<project_id>/team-members/
    path('project/<str:project_id>/individual-chat/', GetOrCreateIndividualChat.as_view()),  # /api/chats/project/<project_id>/individual-chat/
    path('project/<str:project_id>/search/', SearchGroupChatMessages.as_view()),  # /api/chats/project/<project_id>/search/?q=<term>
    path('project/<str:project_id>/messages/', ProjectChatMessages.as_view()),  # /api/chats/project/<project_id>/messages/
    path('project/<str:project_id>/send/', SendProjectMessage.as_view()),  # /api/chats/project/<project_id>/send/
    path('summarize/', ChatSummarizer.as_view()), 
    path('individual/<str:chat_id>/search/', SearchIndividualChatMessages.as_view()),  # /api/chats/individual/<chat_id>/search/?q=<term>
    path('individual/<str:chat_id>/messages/', IndividualChatMessages.as_view()),  # /api/chats/individual/<chat_id>/messages/
    path('individual/<str:chat_id>/send/', SendIndividualMessage.as_view()),  # /api/chats/individual/<chat_id>/send/
    path('message/<str:message_id>/', DeleteMessage.as_view()),  # /api/chats/message/<message_id>/
    path('create/', CreateGroup.as_view()),  # /api/chats/create/
    path('direct/<str:username>/', DirectChat.as_view()),  # /api/chats/direct/<username>/
    # Generic patterns LAST
    path('<str:chatroom_name>/messages/', ChatMessages.as_view()),  # /api/chats/<chatroom_name>/messages/
    path('', ChatList.as_view()),  # /api/chats/ - empty pattern last
]