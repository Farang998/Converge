from rest_framework.exceptions import AuthenticationFailed
from .auth.models import User

ERROR_AUTH_HEADER_MISSING = 'Authorization header missing'
ERROR_INVALID_AUTH_HEADER = 'Invalid authorization header format'
ERROR_INVALID_TOKEN = 'Invalid or expired token'

# -------------------------------------------------------
# Authentication Helper
# -------------------------------------------------------
def authenticate_user_from_request(request):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        raise AuthenticationFailed(ERROR_AUTH_HEADER_MISSING)

    try:
        token = auth_header.split(" ")[1]
    except IndexError:
        raise AuthenticationFailed(ERROR_INVALID_AUTH_HEADER)

    user = User.validate_token(token)
    if not user:
        raise AuthenticationFailed(ERROR_INVALID_TOKEN)

    return user