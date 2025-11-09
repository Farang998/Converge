from django.db import models
from django.contrib.auth.models import User
from django.db.models import Prefetch 

# Create your models here.
class ConversationManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().prefetch_related(
            Prefetch('participants', queryset=User.objects.only('id', 'username'))
        )

class Chat(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True 

class IndividualChat(Chat):
    participants = models.ManyToManyField(User, related_name='individual_chats')
    objects = ConversationManager()

    def __str__(self):
        participant_names = ", ".join([user.username for user in self.participants.all()])
        return f'Conversation with {participant_names}'

class GroupChat(Chat):
    name = models.CharField(max_length=100)
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_groups')
    participants = models.ManyToManyField(User, related_name='group_chats')
    objects = ConversationManager()

    def __str__(self):
        participant_names = " ,".join([user.username for user in self.participants.all()])
        return f"GroupChat: {self.name}"

class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True

class IndividualMessage(Message):
    chat = models.ForeignKey('IndividualChat', on_delete=models.CASCADE, related_name='messages')

    def __str__(self):
        return f"{self.sender.username}: {self.content[:20]}"
    
class GroupMessage(Message):
    chat = models.ForeignKey('GroupChat', on_delete=models.CASCADE, related_name='messages')

    def __str__(self):
        return f"[{self.chat.name}] {self.sender.username}: {self.content[:20]}"