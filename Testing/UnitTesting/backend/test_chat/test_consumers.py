from unittest.mock import AsyncMock
from django.test import SimpleTestCase
from Chat.consumers import ChatConsumer

class ConsumerTests(SimpleTestCase):

    async def test_connect_no_user(self):
        consumer = ChatConsumer()
        consumer.channel_layer = AsyncMock()
        consumer.channel_name = "test-channel"
        consumer.scope = {
            "url_route": {"kwargs": {"room": "test-room"}},
            "user": None
        }
        consumer.close = AsyncMock()

        await consumer.connect()
        consumer.close.assert_called_once()
