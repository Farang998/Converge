import os
import sys
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# 1. Set settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

# 2. Initialize Django BEFORE importing Chat.*
django.setup()

# 3. Now safe to import
import Chat.routing
from Chat.middleware import JWTAuthMiddleware

# 4. Get ASGI application
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(
            Chat.routing.websocket_urlpatterns
        )
    ),
})
