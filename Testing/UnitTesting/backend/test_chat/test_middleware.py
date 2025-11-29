from django.test import SimpleTestCase
from Chat.middleware import JWTAuthMiddleware
from unittest.mock import AsyncMock

class MiddlewareTests(SimpleTestCase):

    async def test_middleware_without_token(self):
        middleware = JWTAuthMiddleware(AsyncMock())

        scope = {
            "query_string": b"",
        }

        await middleware(scope, None, None)
        self.assertIn("user", scope)
