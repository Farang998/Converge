def user_public(u):
    # u is your MongoEngine User document
    return {"id": str(u.id), "username": u.username}

def group_chat_public(chat):
    return {
        "id": str(chat.id),
        "name": chat.name,
        "participants": chat.participants,  # list of user ids (strings)
    }

def group_message_public(msg, users_by_id):
    sender = users_by_id.get(msg.sender)
    result = {
        "id": str(msg.id),
        "content": msg.content,
        "timestamp": msg.timestamp.isoformat(),
        "sender": {"id": msg.sender, "username": sender.username if sender else "Unknown"},
    }
    # Add media fields if present
    if msg.file_url:
        result["file_url"] = msg.file_url
        result["file_type"] = msg.file_type
        result["file_name"] = msg.file_name
        result["file_size"] = msg.file_size
    return result

def individual_message_public(msg, users_by_id):
    sender = users_by_id.get(msg.sender)
    result = {
        "id": str(msg.id),
        "content": msg.content,
        "timestamp": msg.timestamp.isoformat() if msg.timestamp else None,
        "created_at": msg.timestamp.isoformat() if msg.timestamp else None,
        "sender": {"id": msg.sender, "username": sender.username if sender else "Unknown"},
    }
    # Add media fields if present
    if msg.file_url:
        result["file_url"] = msg.file_url
        result["file_type"] = msg.file_type
        result["file_name"] = msg.file_name
        result["file_size"] = msg.file_size
    return result
