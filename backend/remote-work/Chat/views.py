from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.shortcuts import get_object_or_404
from api.auth.models import User  # your MongoEngine User with validate_token
from .models import GroupChat, GroupMessage, IndividualChat, IndividualMessage
from .serializers import group_chat_public, group_message_public

def _get_user_from_auth(request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, Response({"error": "Authorization header missing"}, status=401)
    token = auth.split(" ", 1)[1]
    user = User.validate_token(token)
    if not user:
        return None, Response({"error": "Invalid or expired token"}, status=401)
    return user, None

class ChatList(APIView):
    def get(self, request):
        user, err = _get_user_from_auth(request)
        if err: return err
        uid = str(user.id)
        chats = GroupChat.objects(participants__in=[uid]).order_by("-created_at")
        return Response([group_chat_public(c) for c in chats])

class ChatMessages(APIView):
    def get(self, request, chatroom_name):   
        user, err = _get_user_from_auth(request)
        if err: return err
        chat = GroupChat.objects(name=chatroom_name).first()
        if not chat: return Response({"error": "Not found"}, status=404)
        uid = str(user.id)
        if uid not in chat.participants:
            return Response({"error": "Forbidden"}, status=403)

        # batch fetch senders for username  
        msgs = GroupMessage.objects(chat=chat).order_by("timestamp")
        sender_ids = list({m.sender for m in msgs})
        users = {str(u.id): u for u in User.objects(id__in=sender_ids)}
        return Response([group_message_public(m, users) for m in msgs])

class CreateGroup(APIView):
    def post(self, request):
        user, err = _get_user_from_auth(request)
        if err: return err
        uid = str(user.id)
        name = request.data.get("name", "").strip()
        if not name: return Response({"error": "Name required"}, status=400)
        if GroupChat.objects(name=name).first():
            return Response({"error": "Group name already exists"}, status=400)
        chat = GroupChat(name=name, admin=uid, participants=[uid])
        chat.save()
        return Response({"message": "created", "name": name}, status=201)

class DirectChat(APIView):
    def post(self, request, username):
        user, err = _get_user_from_auth(request)
        if err: return err
        if username == user.username:
            return Response({"error": "Cannot chat with yourself"}, status=400)
        other = User.objects(username=username).first()
        if not other: return Response({"error": "User not found"}, status=404)
        uid, oid = str(user.id), str(other.id)

        chat = IndividualChat.objects(participants__all=[uid, oid], participants__size=2).first()
        if not chat:
            chat = IndividualChat(participants=[uid, oid])
            chat.save()
        return Response({"chat_id": str(chat.id)})
