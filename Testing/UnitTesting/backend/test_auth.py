from unittest.mock import patch, MagicMock
import json
import os
import django

# Ensure Django is initialized before importing DRF test utilities.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")
django.setup()

from django.test import TestCase
from django.test import override_settings
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status
from rest_framework.response import Response

from api.auth import views as auth_views
from mongoengine.errors import ValidationError as MongoValidationError
from django.core.exceptions import ValidationError as DjangoValidationError


class BaseAuthTestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()


class UtilsTests(BaseAuthTestCase):
    @patch("api.auth.views.User")
    def test_get_authenticated_user_missing_header(self, MockUser):
        request = self.factory.get("/dummy")
        user, error = auth_views.get_authenticated_user(request)
        self.assertIsNone(user)
        self.assertEqual(error.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("api.auth.views.User")
    def test_get_authenticated_user_invalid_authorization_format(self, MockUser):
        request = self.factory.get(
            "/dummy", HTTP_AUTHORIZATION="BearerNoSpaceToken"
        )
        user, error = auth_views.get_authenticated_user(request)
        self.assertIsNone(user)
        self.assertEqual(error.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("api.auth.views.User")
    def test_get_authenticated_user_invalid_token_type(self, MockUser):
        request = self.factory.get(
            "/dummy", HTTP_AUTHORIZATION="Basic sometoken"
        )
        user, error = auth_views.get_authenticated_user(request)
        self.assertIsNone(user)
        self.assertEqual(error.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("api.auth.views.User")
    def test_get_authenticated_user_invalid_or_expired_token(self, MockUser):
        MockUser.validate_token.return_value = None
        request = self.factory.get(
            "/dummy", HTTP_AUTHORIZATION="Bearer badtoken"
        )
        user, error = auth_views.get_authenticated_user(request)
        self.assertIsNone(user)
        self.assertEqual(error.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("api.auth.views.User")
    def test_get_authenticated_user_success(self, MockUser):
        mock_user = MagicMock()
        MockUser.validate_token.return_value = mock_user
        request = self.factory.get(
            "/dummy", HTTP_AUTHORIZATION="Bearer goodtoken"
        )
        user, error = auth_views.get_authenticated_user(request)
        self.assertIs(user, mock_user)
        self.assertIsNone(error)

    def test_contain_all_numbers_true_and_false(self):
        self.assertTrue(auth_views.contain_all_numbers("12345"))
        self.assertFalse(auth_views.contain_all_numbers("12a45"))


class RegisterUserViewTests(BaseAuthTestCase):
    def _call_view(self, data):
        view = auth_views.RegisterUserView.as_view()
        request = self.factory.post("/register/", data, format="json")
        return view(request)

    def test_missing_fields(self):
        response = self._call_view({})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_types(self):
        data = {"username": 123, "password": [], "email": {}}
        response = self._call_view(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_strings(self):
        data = {"username": " ", "password": "  ", "email": " "}
        response = self._call_view(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_username_starts_with_number(self):
        data = {"username": "1abc", "password": "password1", "email": "a@b.com"}
        response = self._call_view(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_username_all_numbers(self):
        data = {"username": "12345", "password": "password1", "email": "a@b.com"}
        response = self._call_view(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.User")
    def test_username_already_exists(self, MockUser):
        MockUser.objects.return_value.first.return_value = True
        data = {
            "username": "john",
            "password": "password1",
            "email": "john@example.com",
        }
        response = self._call_view(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Username already exists", response.data["error"])

    @patch("api.auth.views.User")
    def test_email_already_exists(self, MockUser):
        # First call for username => None, second for email => True
        MockUser.objects.side_effect = [
            MagicMock(first=MagicMock(return_value=None)),
            MagicMock(first=MagicMock(return_value=True)),
        ]
        data = {
            "username": "john",
            "password": "password1",
            "email": "john@example.com",
        }
        response = self._call_view(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Email already exists", response.data["error"])

    @patch("api.auth.views.User")
    def test_password_too_short(self, MockUser):
        MockUser.objects.return_value.first.return_value = None
        data = {
            "username": "john",
            "password": "short",
            "email": "john@example.com",
        }
        response = self._call_view(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.validate_email", side_effect=DjangoValidationError("bad"))
    @patch("api.auth.views.User")
    def test_invalid_email(self, MockUser, mock_validate):
        MockUser.objects.return_value.first.return_value = None
        data = {
            "username": "john",
            "password": "password1",
            "email": "bad-email",
        }
        response = self._call_view(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid email address", response.data["error"])

    @patch("api.auth.views.User")
    def test_mongo_validation_error(self, MockUser):
        # username & email unique
        MockUser.objects.return_value.first.return_value = None
        MockUser.create_user.side_effect = MongoValidationError("mongo error")

        data = {
            "username": "john",
            "password": "password1",
            "email": "john@example.com",
        }
        response = self._call_view(data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("mongo error", response.data["error"])

    @patch("api.auth.views.User")
    def test_server_error(self, MockUser):
        MockUser.objects.return_value.first.return_value = None
        MockUser.create_user.side_effect = Exception("boom")

        data = {
            "username": "john",
            "password": "password1",
            "email": "john@example.com",
        }
        response = self._call_view(data)
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    @patch("api.auth.views.User")
    def test_register_success(self, MockUser):
        MockUser.objects.return_value.first.return_value = None
        MockUser.create_user.return_value = MagicMock()
        data = {
            "username": "john",
            "password": "password1",
            "email": "john@example.com",
            "firstName": "John",
            "lastName": "Doe",
        }
        response = self._call_view(data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("User registered successfully", response.data["message"])


class LoginUserViewTests(BaseAuthTestCase):
    def _call_view(self, data):
        view = auth_views.LoginUserView.as_view()
        request = self.factory.post("/login/", data, format="json")
        return view(request)

    def test_missing_fields(self):
        response = self._call_view({})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.User")
    def test_login_success_username(self, MockUser):
        mock_user = MagicMock()
        MockUser.authenticate.return_value = mock_user
        MockUser.generate_token.return_value = "tok123"
        response = self._call_view({"username": "john", "password": "pass12345"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["token"], "tok123")

    @patch("api.auth.views.User")
    def test_login_success_email_path(self, MockUser):
        # First authenticate as username -> None, then email -> user
        mock_user = MagicMock()
        MockUser.authenticate.side_effect = [None, mock_user]
        MockUser.generate_token.return_value = "tok456"

        response = self._call_view({"username": "john", "password": "pass12345"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["token"], "tok456")

    @patch("api.auth.views.User")
    def test_login_invalid_credentials(self, MockUser):
        MockUser.authenticate.return_value = None
        response = self._call_view({"username": "john", "password": "wrong"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class LogoutUserViewTests(BaseAuthTestCase):
    def _call_view(self, data):
        view = auth_views.LogoutUserView.as_view()
        request = self.factory.post("/logout/", data, format="json")
        return view(request)

    def test_missing_token(self):
        response = self._call_view({})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.User")
    def test_logout_success(self, MockUser):
        response = self._call_view({"token": "abc"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class SendOtpTests(BaseAuthTestCase):
    def test_invalid_method(self):
        request = self.factory.get("/send-otp/")
        response = auth_views.send_otp(request)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content.decode())
        self.assertFalse(data["success"])

    @patch("api.auth.views.send_otp_email")
    def test_send_otp_success_json_body(self, mock_send):
        payload = {"email": "user@example.com", "purpose": "register"}
        request = self.factory.post(
            "/send-otp/", json.dumps(payload), content_type="application/json"
        )
        response = auth_views.send_otp(request)
        data = json.loads(response.content.decode())
        self.assertTrue(data["success"])
        mock_send.assert_called_once_with("user@example.com", "register")

    @patch("api.auth.views.send_otp_email")
    def test_send_otp_missing_email(self, mock_send):
        payload = {"purpose": "register"}
        request = self.factory.post(
            "/send-otp/", json.dumps(payload), content_type="application/json"
        )
        response = auth_views.send_otp(request)
        data = json.loads(response.content.decode())
        self.assertFalse(data["success"])


class ValidateOtpTests(BaseAuthTestCase):
    def test_invalid_method(self):
        request = self.factory.get("/validate-otp/")
        response = auth_views.validate_otp(request)
        data = json.loads(response.content.decode())
        self.assertFalse(data["success"])

    def test_missing_fields(self):
        payload = {"email": "x@y.com"}
        request = self.factory.post(
            "/validate-otp/", json.dumps(payload), content_type="application/json"
        )
        response = auth_views.validate_otp(request)
        data = json.loads(response.content.decode())
        self.assertFalse(data["success"])

    @patch("api.auth.views.EmailOTP")
    def test_no_otp_record(self, MockOTP):
        MockOTP.objects.return_value.first.return_value = None
        payload = {"email": "x@y.com", "otp": "1234", "purpose": "register"}
        request = self.factory.post(
            "/validate-otp/", json.dumps(payload), content_type="application/json"
        )
        response = auth_views.validate_otp(request)
        data = json.loads(response.content.decode())
        self.assertFalse(data["success"])
        self.assertIn("No OTP found", data["message"])

    @patch("api.auth.views.EmailOTP")
    def test_invalid_otp(self, MockOTP):
        record = MagicMock()
        record.otp = "9999"
        MockOTP.objects.return_value.first.return_value = record

        payload = {"email": "x@y.com", "otp": "1234", "purpose": "register"}
        request = self.factory.post(
            "/validate-otp/", json.dumps(payload), content_type="application/json"
        )
        response = auth_views.validate_otp(request)
        data = json.loads(response.content.decode())
        self.assertFalse(data["success"])
        self.assertIn("Invalid OTP", data["message"])

    @patch("api.auth.views.EmailOTP")
    def test_valid_otp_success(self, MockOTP):
        record = MagicMock()
        record.otp = "1234"
        MockOTP.objects.return_value.first.return_value = record

        payload = {"email": "x@y.com", "otp": "1234", "purpose": "register"}
        request = self.factory.post(
            "/validate-otp/", json.dumps(payload), content_type="application/json"
        )
        response = auth_views.validate_otp(request)
        data = json.loads(response.content.decode())
        self.assertTrue(data["success"])
        self.assertIn("OTP validated successfully", data["message"])


class ValidateUserTests(BaseAuthTestCase):
    def _call_view(self, data):
        view = auth_views.validate_user
        request = self.factory.post("/validate-user/", data, format="json")
        return view(request)

    def test_missing_fields(self):
        response = self._call_view({"username": "x"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.User")
    def test_username_exists(self, MockUser):
        # For username check -> first() returns True
        def objects_side_effect(*args, **kwargs):
            if "username" in kwargs:
                return MagicMock(first=MagicMock(return_value=True))
            return MagicMock(first=MagicMock(return_value=None))

        MockUser.objects.side_effect = objects_side_effect

        response = self._call_view(
            {"username": "existing", "email": "new@example.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.User")
    def test_email_exists(self, MockUser):
        def objects_side_effect(*args, **kwargs):
            if "username" in kwargs:
                return MagicMock(first=MagicMock(return_value=None))
            if "email" in kwargs:
                return MagicMock(first=MagicMock(return_value=True))
            return MagicMock(first=MagicMock(return_value=None))

        MockUser.objects.side_effect = objects_side_effect

        response = self._call_view(
            {"username": "new", "email": "existing@example.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.User")
    def test_user_available(self, MockUser):
        MockUser.objects.return_value.first.return_value = None
        response = self._call_view(
            {"username": "new", "email": "new@example.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])


class ForgotPasswordRequestViewTests(BaseAuthTestCase):
    def _call_view(self, data):
        view = auth_views.ForgotPasswordRequestView.as_view()
        request = self.factory.post("/forgot-password/", data, format="json")
        return view(request)

    def test_missing_email(self):
        response = self._call_view({})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.User")
    def test_user_not_found(self, MockUser):
        MockUser.objects.return_value.first.return_value = None
        response = self._call_view({"email": "x@y.com"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("api.auth.views.send_otp_email", side_effect=Exception("fail"))
    @patch("api.auth.views.User")
    def test_send_otp_failure(self, MockUser, mock_send):
        MockUser.objects.return_value.first.return_value = MagicMock()
        response = self._call_view({"email": "x@y.com"})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    @patch("api.auth.views.send_otp_email")
    @patch("api.auth.views.User")
    def test_forgot_password_success(self, MockUser, mock_send):
        MockUser.objects.return_value.first.return_value = MagicMock()
        response = self._call_view({"email": "x@y.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_send.assert_called_once()


class ResetPasswordViewTests(BaseAuthTestCase):
    def _call_view(self, data):
        view = auth_views.ResetPasswordView.as_view()
        request = self.factory.post("/reset-password/", data, format="json")
        return view(request)

    def test_missing_fields(self):
        response = self._call_view({"email": "x@y.com"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.EmailOTP")
    def test_no_otp_record(self, MockOTP):
        MockOTP.objects.return_value.first.return_value = None
        response = self._call_view(
            {"email": "x@y.com", "new_password": "pass12345"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.EmailOTP")
    @patch("api.auth.views.User")
    def test_no_user_for_email(self, MockUser, MockOTP):
        MockOTP.objects.return_value.first.return_value = MagicMock()
        MockUser.objects.return_value.first.return_value = None

        response = self._call_view(
            {"email": "x@y.com", "new_password": "pass12345"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.EmailOTP")
    @patch("api.auth.views.User")
    def test_reset_password_success(self, MockUser, MockOTP):
        otp_record = MagicMock()
        MockOTP.objects.return_value.first.return_value = otp_record
        user = MagicMock()
        MockUser.objects.return_value.first.return_value = user

        response = self._call_view(
            {"email": "x@y.com", "new_password": "pass12345"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Password reset successful", response.data["message"])

    @patch("api.auth.views.EmailOTP")
    @patch("api.auth.views.User")
    def test_reset_password_server_error(self, MockUser, MockOTP):
        otp_record = MagicMock()
        MockOTP.objects.return_value.first.return_value = otp_record
        user = MagicMock()
        user.save.side_effect = Exception("fail")
        MockUser.objects.return_value.first.return_value = user

        response = self._call_view(
            {"email": "x@y.com", "new_password": "pass12345"}
        )
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)


class IdentifyUserViewTests(BaseAuthTestCase):
    def _call_view(self):
        view = auth_views.IdentifyUserView.as_view()
        request = self.factory.get("/identify/")
        return view(request)

    @patch("api.auth.views.get_authenticated_user")
    def test_unauthorized(self, mock_auth):
        mock_auth.return_value = (None, Response({"error": "unauth"}, status=401))
        response = self._call_view()
        self.assertEqual(response.status_code, 401)

    @patch("api.auth.views.get_authenticated_user")
    def test_success(self, mock_auth):
        user = MagicMock()
        user.id = "123"
        user.username = "john"
        user.email = "john@example.com"
        user.firstName = "John"
        user.lastName = "Doe"
        user.date_joined = None

        mock_auth.return_value = (user, None)
        response = self._call_view()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["username"], "john")


class UserListViewTests(BaseAuthTestCase):
    def _call_view(self, params=None):
        view = auth_views.UserListView.as_view()
        request = self.factory.get("/users/", params or {})
        return view(request)

    @patch("api.auth.views.get_authenticated_user")
    def test_unauthorized(self, mock_auth):
        mock_auth.return_value = (None, Response({"error": "unauth"}, status=401))
        response = self._call_view()
        self.assertEqual(response.status_code, 401)

    @patch("api.auth.views.User")
    @patch("api.auth.views.get_authenticated_user")
    def test_success_with_query_and_limit(self, mock_auth, MockUser):
        mock_auth.return_value = (MagicMock(), None)

        user1 = MagicMock()
        user1.id = "1"
        user1.username = "alice"
        user1.email = "alice@example.com"
        user1.firstName = "Alice"
        user1.lastName = "A"

        qs = MagicMock()
        qs.filter.return_value = qs
        qs.order_by.return_value = qs
        qs.__getitem__.return_value = [user1]

        MockUser.objects = qs

        response = self._call_view({"q": "ali", "limit": "10"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["users"]), 1)

    @patch("api.auth.views.User")
    @patch("api.auth.views.get_authenticated_user")
    def test_invalid_limit(self, mock_auth, MockUser):
        mock_auth.return_value = (MagicMock(), None)

        user1 = MagicMock()
        user1.id = "1"
        user1.username = "bob"
        user1.email = "bob@example.com"
        user1.firstName = "Bob"
        user1.lastName = "B"

        qs = MagicMock()
        qs.filter.return_value = qs
        qs.order_by.return_value = qs
        qs.__getitem__.return_value = [user1]

        MockUser.objects = qs

        response = self._call_view({"limit": "not-a-number"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class UserByUsernameViewTests(BaseAuthTestCase):
    def _call_view(self, params=None):
        view = auth_views.UserByUsernameView.as_view()
        request = self.factory.get("/user-by-username/", params or {})
        return view(request)

    @patch("api.auth.views.get_authenticated_user")
    def test_unauthorized(self, mock_auth):
        mock_auth.return_value = (None, Response({"error": "unauth"}, status=401))
        response = self._call_view()
        self.assertEqual(response.status_code, 401)

    @patch("api.auth.views.get_authenticated_user")
    def test_missing_username_param(self, mock_auth):
        mock_auth.return_value = (MagicMock(), None)
        response = self._call_view({})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.User")
    @patch("api.auth.views.get_authenticated_user")
    def test_user_not_found(self, mock_auth, MockUser):
        mock_auth.return_value = (MagicMock(), None)
        MockUser.objects.return_value.first.return_value = None
        response = self._call_view({"username": "unknown"})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("api.auth.views.User")
    @patch("api.auth.views.get_authenticated_user")
    def test_success(self, mock_auth, MockUser):
        mock_auth.return_value = (MagicMock(), None)
        user = MagicMock()
        user.id = "1"
        user.username = "john"
        user.email = "john@example.com"
        user.firstName = "John"
        user.lastName = "Doe"
        MockUser.objects.return_value.first.return_value = user

        response = self._call_view({"username": "john"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["username"], "john")

    @patch("api.auth.views.User")
    @patch("api.auth.views.get_authenticated_user")
    def test_server_error(self, mock_auth, MockUser):
        mock_auth.return_value = (MagicMock(), None)
        MockUser.objects.side_effect = Exception("boom")
        response = self._call_view({"username": "john"})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)


class GoogleAuthViewTests(BaseAuthTestCase):
    def _call_view(self, data):
        view = auth_views.GoogleAuthView.as_view()
        request = self.factory.post("/google-auth/", data, format="json")
        return view(request)

    def test_missing_id_token(self):
        response = self._call_view({})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="dummy-client-id")
    @patch("api.auth.views.User")
    @patch("api.auth.views.id_token.verify_oauth2_token")
    def test_new_user_success(self, mock_verify, MockUser):
        mock_verify.return_value = {
            "iss": "accounts.google.com",
            "email": "user@example.com",
            "email_verified": True,
            "given_name": "John",
            "family_name": "Doe",
            "picture": "http://example.com/pic.jpg",
        }

        MockUser.objects.return_value.first.return_value = None
        mock_user = MagicMock()
        mock_user.id = "1"
        mock_user.username = "john"
        mock_user.email = "user@example.com"
        mock_user.firstName = "John"
        mock_user.lastName = "Doe"

        MockUser.create_user.return_value = mock_user
        MockUser.generate_token.return_value = "tok123"

        response = self._call_view({"id_token": "valid-token"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_new_user"])

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="dummy-client-id")
    @patch("api.auth.views.User")
    @patch("api.auth.views.id_token.verify_oauth2_token")
    def test_existing_user_success(self, mock_verify, MockUser):
        mock_verify.return_value = {
            "iss": "accounts.google.com",
            "email": "user@example.com",
            "email_verified": True,
        }
        mock_user = MagicMock()
        mock_user.id = "1"
        mock_user.username = "john"
        mock_user.email = "user@example.com"
        mock_user.firstName = "John"
        mock_user.lastName = "Doe"

        MockUser.objects.return_value.first.return_value = mock_user
        MockUser.generate_token.return_value = "tok123"

        response = self._call_view({"id_token": "valid-token"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_new_user"])

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="dummy-client-id")
    @patch("api.auth.views.id_token.verify_oauth2_token")
    def test_invalid_issuer(self, mock_verify):
        mock_verify.return_value = {
            "iss": "not-google",
            "email": "user@example.com",
            "email_verified": True,
        }
        response = self._call_view({"id_token": "valid-token"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="dummy-client-id")
    @patch("api.auth.views.id_token.verify_oauth2_token", side_effect=ValueError("bad"))
    def test_invalid_token_value_error(self, mock_verify):
        response = self._call_view({"id_token": "invalid"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="dummy-client-id")
    @patch("api.auth.views.id_token.verify_oauth2_token", side_effect=Exception("boom"))
    def test_google_auth_server_error(self, mock_verify):
        response = self._call_view({"id_token": "whatever"})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)


class UpdateProfileViewTests(BaseAuthTestCase):
    def _call_view(self, data):
        view = auth_views.UpdateProfileView.as_view()
        request = self.factory.put("/update-profile/", data, format="json")
        # satisfy IsAuthenticated permission
        force_authenticate(request, user=MagicMock())
        return view(request)

    @patch("api.auth.views.get_authenticated_user")
    def test_unauthorized(self, mock_auth):
        mock_auth.return_value = (None, Response({"error": "unauth"}, status=401))
        response = self._call_view({})
        self.assertEqual(response.status_code, 401)

    @patch("api.auth.views.validate_email", side_effect=DjangoValidationError("bad"))
    @patch("api.auth.views.get_authenticated_user")
    def test_invalid_email(self, mock_auth, mock_validate):
        user = MagicMock()
        mock_auth.return_value = (user, None)
        response = self._call_view({"email": "not-an-email"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.User")
    @patch("api.auth.views.validate_email")
    @patch("api.auth.views.get_authenticated_user")
    def test_email_in_use(self, mock_auth, mock_validate, MockUser):
        user = MagicMock()
        user.id = "1"
        mock_auth.return_value = (user, None)
        MockUser.objects.return_value.exclude.return_value.first.return_value = True

        response = self._call_view({"email": "used@example.com"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.User")
    @patch("api.auth.views.validate_email")
    @patch("api.auth.views.get_authenticated_user")
    def test_update_profile_success(self, mock_auth, mock_validate, MockUser):
        user = MagicMock()
        user.id = "1"
        user.firstName = "Old"
        user.lastName = "Name"
        user.email = "old@example.com"
        mock_auth.return_value = (user, None)
        MockUser.objects.return_value.exclude.return_value.first.return_value = None

        data = {
            "first_name": "New",
            "last_name": "Name",
            "email": "new@example.com",
        }
        response = self._call_view(data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["first_name"], "New")

    @patch("api.auth.views.get_authenticated_user")
    def test_update_profile_server_error(self, mock_auth):
        user = MagicMock()
        user.save.side_effect = Exception("fail")
        mock_auth.return_value = (user, None)

        response = self._call_view({"first_name": "X"})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)


class DeleteAccountViewTests(BaseAuthTestCase):
    def _call_view(self):
        view = auth_views.DeleteAccountView.as_view()
        request = self.factory.delete("/delete-account/")
        return view(request)

    @patch("api.auth.views.get_authenticated_user")
    def test_unauthorized_error_response(self, mock_auth):
        mock_auth.return_value = (None, Response({"error": "unauth"}, status=401))
        response = self._call_view()
        self.assertEqual(response.status_code, 401)

    @patch("api.auth.views.get_authenticated_user")
    def test_no_user(self, mock_auth):
        mock_auth.return_value = (None, None)
        response = self._call_view()
        self.assertEqual(response.status_code, 401)

    @patch("api.auth.views.handle_user_account_deleted")
    @patch("api.auth.views.get_authenticated_user")
    def test_delete_success(self, mock_auth, mock_handler):
        user = MagicMock()
        user.id = "1"
        mock_auth.return_value = (user, None)

        response = self._call_view()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_handler.assert_called_once_with("1")
        user.delete.assert_called_once()


class ChangePasswordViewTests(BaseAuthTestCase):
    def _call_view(self, data):
        view = auth_views.ChangePasswordView.as_view()
        request = self.factory.post("/change-password/", data, format="json")
        return view(request)

    @patch("api.auth.views.get_authenticated_user")
    def test_unauthorized(self, mock_auth):
        mock_auth.return_value = (None, Response({"error": "unauth"}, status=401))
        response = self._call_view({})
        self.assertEqual(response.status_code, 401)

    @patch("api.auth.views.get_authenticated_user")
    def test_missing_fields(self, mock_auth):
        mock_auth.return_value = (MagicMock(), None)
        response = self._call_view({})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.check_password", return_value=False)
    @patch("api.auth.views.get_authenticated_user")
    def test_old_password_incorrect(self, mock_auth, mock_check):
        user = MagicMock()
        mock_auth.return_value = (user, None)
        response = self._call_view(
            {"old_password": "wrong", "new_password": "newpass123"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.check_password", return_value=True)
    @patch("api.auth.views.get_authenticated_user")
    def test_new_password_too_short(self, mock_auth, mock_check):
        user = MagicMock()
        mock_auth.return_value = (user, None)
        response = self._call_view(
            {"old_password": "oldpass", "new_password": "short"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("api.auth.views.make_password")
    @patch("api.auth.views.check_password", return_value=True)
    @patch("api.auth.views.get_authenticated_user")
    def test_change_password_success(self, mock_auth, mock_check, mock_make):
        user = MagicMock()
        mock_auth.return_value = (user, None)
        response = self._call_view(
            {"old_password": "oldpass", "new_password": "longenough"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Password changed successfully", response.data["message"])

    @patch("api.auth.views.make_password")
    @patch("api.auth.views.check_password", return_value=True)
    @patch("api.auth.views.get_authenticated_user")
    def test_change_password_server_error(self, mock_auth, mock_check, mock_make):
        user = MagicMock()
        user.save.side_effect = Exception("fail")
        mock_auth.return_value = (user, None)
        response = self._call_view(
            {"old_password": "oldpass", "new_password": "longenough"}
        )
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)


class AuthAppSmokeTests(BaseAuthTestCase):
    """Basic import smoke test to keep your original check."""

    def test_import_models_and_views(self):
        __import__("api.auth.models")
        __import__("api.auth.views")
