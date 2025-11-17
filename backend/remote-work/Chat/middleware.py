from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from asgiref.sync import sync_to_async
from api.auth.models import User  # MongoEngine User

@sync_to_async
def get_user_from_token(token):
    """
    Validate JWT token and return MongoEngine User.
    Uses User.validate_token() which handles JWT validation.
    """
    try:
        if not token:
            return AnonymousUser()
        
        # Use MongoEngine User's validate_token method
        user = User.validate_token(token)
        if user:
            return user
        else:
            print(f"JWT Authentication failed: Invalid or expired token")
            return AnonymousUser()
    except Exception as e:
        print(f"JWT Authentication error: {e}")
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
