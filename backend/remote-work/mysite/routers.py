# routers.py

class DatabaseRouter:
    """
    A router to control all database operations on models.
    - Core Django/PostgreSQL models go to 'default' (PostgreSQL).
    - Models in your 'mongo_app' go to 'mongodb'.
    """
    
    # 1. List the app names that should use MongoDB
    mongo_apps = ['my_mongo_app', 'another_mongo_app'] # <<< CHANGE THIS LIST

    def db_for_read(self, model, **hints):
        # Read operations: If model is in a MongoDB app, route to 'mongodb'
        if model._meta.app_label in self.mongo_apps:
            return 'mongodb'
        # Otherwise, route to the default (PostgreSQL)
        return 'default'

    def db_for_write(self, model, **hints):
        # Write operations: Same logic as reads
        if model._meta.app_label in self.mongo_apps:
            return 'mongodb'
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        # Prevent relationships between models in different databases
        if obj1._state.db != obj2._state.db:
            return False
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # Ensure only apps that belong to a database can be migrated there
        if app_label in self.mongo_apps:
            return db == 'mongodb'
        return db == 'default' # All other apps migrate to PostgreSQL