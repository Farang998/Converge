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
    import datetime as _dt
    
    def _as_utc_z(dt):
        if not dt:
            return None
        try:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=_dt.timezone.utc)
            return dt.astimezone(_dt.timezone.utc).isoformat().replace('+00:00', 'Z')
        except Exception:
            try:
                return dt.isoformat()
            except Exception:
                return None
    
    sender = users_by_id.get(msg.sender)
    result = {
        "id": str(msg.id),
        "content": msg.content,
        "timestamp": _as_utc_z(msg.timestamp),
        "created_at": _as_utc_z(msg.timestamp),  # Alias for frontend compatibility
        "sender": {"id": msg.sender, "username": sender.username if sender else "Unknown"},
        #thread info
        "thread_id": None,
        "replies_count": 0,
    }
    try: 
        from .models import Thread, ThreadMessage
        t = Thread.objects(parent_message=msg).first()
        if t:
            result["thread_id"] = str(t.id)
            result["replies_count"] = ThreadMessage.objects(thread=t).count()
    except Exception:
        pass

    # Add media fields if present
    if msg.file_url:
        result["file_url"] = msg.file_url
        result["file_type"] = msg.file_type
        result["file_name"] = msg.file_name
        result["file_size"] = msg.file_size
    return result

def thread_public(thread):
    return {
        "id": str(thread.id),
        "parent_message_id": str(thread.parent_message.id) if getattr(thread, "parent_message", None) else None,
        "chat_id": str(thread.chat.id) if getattr(thread, "chat", None) else None,
        "created_by": thread.created_by,
        "created_at": thread.created_at.isoformat() if thread.created_at else None,
    }

def thread_message_public(tmsg, users_by_id):
    sender = users_by_id.get(tmsg.sender)
    result = {
        "id" : str(tmsg.id),
        "thread_id": str(tmsg.thread.id),
        "content": tmsg.content,
        "timestamp": tmsg.timestamp.isoformat() if tmsg.timestamp else None,
        "created_at": tmsg.timestamp.isoformat() if tmsg.timestamp else None,
        "sender": {"id": tmsg.sender, "username": sender.username if sender else "Unknown"},
    }

    # adding media files if present
    if getattr(tmsg, "file_url", None):
        result["file_url"] = tmsg.file_url
        result["file_type"] = tmsg.file_type
        result["file_name"] = tmsg.file_name
        result["file_size"] = tmsg.file_size
    return result

def individual_message_public(msg, users_by_id):
    import datetime as _dt
    
    def _as_utc_z(dt):
        if not dt:
            return None
        try:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=_dt.timezone.utc)
            return dt.astimezone(_dt.timezone.utc).isoformat().replace('+00:00', 'Z')
        except Exception:
            try:
                return dt.isoformat()
            except Exception:
                return None
    
    sender = users_by_id.get(msg.sender)
    result = {
        "id": str(msg.id),
        "content": msg.content,
        "timestamp": _as_utc_z(msg.timestamp),
        "created_at": _as_utc_z(msg.timestamp),
        "sender": {"id": msg.sender, "username": sender.username if sender else "Unknown"},
    }
    # Add media fields if present
    if msg.file_url:
        result["file_url"] = msg.file_url
        result["file_type"] = msg.file_type
        result["file_name"] = msg.file_name
        result["file_size"] = msg.file_size
    return result
