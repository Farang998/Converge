from Chat.models import GroupChat, IndividualChat, GroupMessage, IndividualMessage
from api.auth.models import User   # where your User Document lives
from mongoengine import Q

def handle_user_removed_from_project(user_id, project_id):
    #removing from Group Chat
    GroupChat.objects(project_id=project_id).update(pull__participants=user_id)

    # Deleting all individual chats involving that user
    IndividualChat.objects(participants=user_id).delete()

    # preserving name and chats for old messages in group
    old_user = User.objects(id=user_id).first()
    preserved_name = f"{old_user.firstName} {old_user.lastName}" if old_user else "Former Member"

    # GroupMessage.objects(sender=str(user_id)).update(set__sender_name=preserved_name)

    GroupMessage(
        chat = None,
        sender = "system",
        content = f"{preserved_name} was removed from the project."
    ).save()

def handle_user_account_deleted(user_id: str):
    """
    when user permanently deletes their account.
    """

    group_chats = GroupChat.objects(participants=user_id)

    for group in group_chats:
        if user_id in group.participants:
            group.participants.remove(user_id)

        if group.admin == user_id:
            group.admin = group.participants[0] if group.participants else None

        group.save()    

    GroupMessage.objects(sender=user_id).update(
        set__sender = "Deleted User"
    )

    direct_chats = IndividualChat.objects(
        Q(user1=user_id) | Q(user2=user_id)
    )

    for chat in direct_chats:
        IndividualMessage.objects(chat=chat.id).delete()
        chat.delete()

    return True