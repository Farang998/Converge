from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .ai_models import AIChat, AIMessage
from .auth.models import Token, User
from django.utils import timezone


def get_user_from_request(request):
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth:
        return None
    parts = auth.split()
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        token = parts[1]
        try:
            t = Token.objects.get(token=token)
            user = User.objects.get(id=t.user)
            return user
        except Exception:
            return None
    return None


@api_view(['GET', 'POST'])
def ai_chats(request):
    user = get_user_from_request(request)
    if user is None:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == 'GET':
        chats = AIChat.objects(user=str(user.id))
        out = []
        for c in chats:
            out.append({
                'id': str(c.id),
                'title': c.title,
                'project_id': c.project_id,
                'created_at': c.created_at.isoformat(),
                'updated_at': c.updated_at.isoformat(),
            })
        return Response({'chats': out})

    title = request.data.get('title') or 'New AI Chat'
    project_id = request.data.get('project_id')
    chat = AIChat(title=title, user=str(user.id), project_id=project_id, created_at=timezone.now(), updated_at=timezone.now())
    chat.save()
    return Response({'id': str(chat.id), 'title': chat.title, 'project_id': chat.project_id}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def ai_chat_messages(request, chat_id):
    user = get_user_from_request(request)
    if user is None:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    # verify chat exists and belongs to user
    try:
        chat = AIChat.objects.get(id=chat_id)
    except Exception:
        return Response({'error': 'Chat not found'}, status=status.HTTP_404_NOT_FOUND)

    if str(chat.user) != str(user.id):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    msgs = AIMessage.objects(chat_id=chat_id)
    out = []
    for m in msgs:
        out.append({
            'id': str(m.id),
            'sender': m.sender,
            'content': m.content,
            'context': m.context,
            'created_at': m.created_at.isoformat(),
        })
    return Response({'messages': out})


@api_view(['POST'])
def ai_chat_create_message(request, chat_id):
    user = get_user_from_request(request)
    if user is None:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        chat = AIChat.objects.get(id=chat_id)
    except Exception:
        return Response({'error': 'Chat not found'}, status=status.HTTP_404_NOT_FOUND)

    if str(chat.user) != str(user.id):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    sender = request.data.get('sender') or 'user'
    content = request.data.get('content') or ''
    context = request.data.get('context') or []

    msg = AIMessage(chat_id=chat_id, sender=sender, content=content, context=context, created_at=timezone.now())
    msg.save()

    # update chat timestamp
    chat.updated_at = timezone.now()
    chat.save()

    return Response({'id': str(msg.id), 'sender': msg.sender, 'content': msg.content, 'created_at': msg.created_at.isoformat()}, status=status.HTTP_201_CREATED)
