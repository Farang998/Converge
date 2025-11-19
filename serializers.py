def user_public(u):
    # u is your MongoEngine User document
    return {"id": str(u.id), "username": u.username}

def group_chat_public(chat):
    return {
        "id": str(chat.id),
        "name": chat.name,
        "participants": chat.participants,  # list of user ids (strings)
    }

from django.utils import timezone as dj_timezone
import datetime as _dt


def _as_utc_z(dt):
    if not dt:
        return None
    try:
        # ensure aware and convert to UTC
        if dt.tzinfo is None:
            # assume it's in UTC if naive
            dt = dt.replace(tzinfo=_dt.timezone.utc)
        utc_dt = dt.astimezone(_dt.timezone.utc)
        # Return ISO string ending with Z
        return utc_dt.replace(tzinfo=_dt.timezone.utc).isoformat().replace('+00:00', 'Z')
    except Exception:
        try:
            return dt.isoformat()
        except Exception:
            return None


def group_message_public(msg, users_by_id):
    sender = users_by_id.get(msg.sender)
    result = {
        "id": str(msg.id),
        "content": msg.content,
        "timestamp": _as_utc_z(msg.timestamp),
        "created_at": _as_utc_z(msg.timestamp),  # Alias for frontend compatibility
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
