from urllib.parse import parse_qs
from rest_framework_simplejwt.tokens import AccessToken
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser, User
from asgiref.sync import sync_to_async

@sync_to_async
def get_user_from_token(token):
    try:
        valid_token = AccessToken(token)
        user_id = valid_token['user_id']
        return User.objects.get(id=user_id)
    except Exception as e:
        print(f"JWT Authentication failed: {e}")
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope['query_string'].decode())
        token = query_string.get('token', [None])[0]

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
