MongoDB-backed authentication setup
=================================

This project uses MongoDB (via `mongoengine`) for user authentication. The Django
project is configured to use a `mongoengine` Document `User` defined in
`api/models.py` and a custom authentication backend `api/auth_backend.py`.

Quick start
-----------

1. Install Python dependencies (preferably in a virtualenv):

   pip install -r ../../requirements.txt

2. Start a MongoDB instance on the host network (port 27017). For development
   you can use the official Docker image. The Django settings default the
   MongoDB host to `0.0.0.0` and port `27017`, but you can override them using
   `MONGO_HOST` and `MONGO_PORT` environment variables.

   docker run --rm -p 27017:27017 -v mongodb_data:/data/db mongo:7

3. Run the Django development server from `backend/remote-work`:

   python manage.py runserver

4. Test the API endpoints:

   - POST /api/register/  -> {username, email, password}
   - POST /api/login/     -> {username, password}

Notes and limitations
---------------------

- Sessions are stored in signed cookies (see `SESSION_ENGINE`) to avoid
  depending on Django's default DB-backed session store (the project does not
  configure a SQL database).
- The provided `User` is a `mongoengine.Document` not a Django `AbstractUser`.
  The `MongoEngineBackend` returns a lightweight proxy object compatible with
  Django's auth APIs.
