import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
import Chat.routing 
from Chat.middleware import JWTAuthMiddleware

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,  
    "websocket": JWTAuthMiddleware(
        URLRouter(
            Chat.routing.websocket_urlpatterns  
        )
    ),
})