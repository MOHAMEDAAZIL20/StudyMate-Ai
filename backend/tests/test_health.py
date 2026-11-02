from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.database import get_session
from app.main import app


def test_health_and_sqlite_connection(tmp_path):
    database_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{database_path.as_posix()}")

    def session_override():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = session_override
    try:
        with TestClient(app) as client:
            response = client.get("/api/health")
            assert response.status_code == 200
            assert response.json() == {"status": "ok", "database": "connected", "version": "0.1.0"}
            assert client.get("/api/missing").status_code == 404
        assert database_path.exists()
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def test_database_failure_returns_503():
    class BrokenSession:
        def execute(self, statement):
            raise OperationalError("SELECT 1", {}, Exception("private database path"))

    app.dependency_overrides[get_session] = lambda: BrokenSession()
    try:
        with TestClient(app) as client:
            response = client.get("/api/health")
            assert response.status_code == 503
            assert response.json() == {"detail": "Database unavailable"}
    finally:
        app.dependency_overrides.clear()
