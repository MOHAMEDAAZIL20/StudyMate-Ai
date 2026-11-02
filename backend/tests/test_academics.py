import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session
from app.database import Base, enable_foreign_keys, get_session
from app.main import app


@pytest.fixture
def workspace_client(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{(tmp_path / 'workspace.db').as_posix()}")
    event.listen(engine, "connect", enable_foreign_keys)
    monkeypatch.setattr("app.main.initialize_database", lambda: Base.metadata.create_all(engine))
    def sessions():
        with Session(engine) as session:
            yield session
    app.dependency_overrides[get_session] = sessions
    try:
        with TestClient(app) as client:
            yield client, engine
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def hierarchy(client):
    semester = client.post('/api/semesters', json={'name': 'Semester 3'}).json()
    subject = client.post('/api/subjects', json={'name': 'Databases', 'semester_id': semester['id']}).json()
    unit = client.post('/api/units', json={'name': 'Unit 1', 'subject_id': subject['id']}).json()
    topic = client.post('/api/topics', json={'name': 'Relational model', 'unit_id': unit['id']}).json()
    return semester, subject, unit, topic


def test_hierarchy_completion_and_persistence(workspace_client):
    client, engine = workspace_client
    assert client.get('/api/workspace').json() == dict(semesters=[], subjects=[], units=[], topics=[])
    semester, subject, unit, topic = hierarchy(client)
    assert topic['completed'] is False
    response = client.put(f"/api/topics/{topic['id']}", json={'name': 'Relations', 'completed': True})
    assert response.status_code == 200
    engine.dispose()  # Reconnect to the file; no in-memory state should be needed.
    snapshot = client.get('/api/workspace').json()
    assert snapshot['topics'][0]['completed'] is True
    assert snapshot['topics'][0]['name'] == 'Relations'
    assert snapshot['subjects'][0]['semester_id'] == semester['id']
    assert client.put(f"/api/subjects/{subject['id']}", json={'name': 'DBMS'}).status_code == 200
    assert client.put(f"/api/units/{unit['id']}", json={'name': 'Fundamentals'}).status_code == 200
    assert client.put(f"/api/semesters/{semester['id']}", json={'name': 'Year 2'}).status_code == 200
    Base.metadata.create_all(engine)  # Additive initialization must preserve existing records.
    assert client.get('/api/workspace').json()['semesters'][0]['name'] == 'Year 2'
    with engine.connect() as connection:
        assert connection.scalar(text('PRAGMA foreign_keys')) == 1


def test_validation_duplicates_and_missing_parents(workspace_client):
    client, _ = workspace_client
    for name in ['', '   ', 'a' * 121]:
        assert client.post('/api/semesters', json={'name': name}).status_code == 422
    assert client.post('/api/subjects', json={'name': 'DB', 'semester_id': 999}).status_code == 404
    assert client.post('/api/units', json={'name': 'U', 'subject_id': -1}).status_code == 422
    semester, subject, unit, topic = hierarchy(client)
    assert client.post('/api/semesters', json={'name': ' Semester 3 '}).status_code == 409
    assert client.post('/api/subjects', json={'name': 'Databases', 'semester_id': semester['id']}).status_code == 409
    assert client.put(f"/api/topics/{topic['id']}", json={'name': 'Test', 'completed': 'false'}).status_code == 422
    assert client.put('/api/topics/999', json={'name': 'Test', 'completed': False}).status_code == 404
    assert client.put(f"/api/subjects/{subject['id']}", json={'name': 'DB', 'semester_id': 999}).status_code == 422
    assert client.post('/api/topics', json={'name': 'Topic', 'unit_id': unit['id'], 'unknown': 1}).status_code == 422


def test_safe_deletion_and_syllabus_import(workspace_client):
    client, _ = workspace_client
    semester, subject, unit, topic = hierarchy(client)
    for resource, item in [('semesters', semester), ('subjects', subject), ('units', unit)]:
        assert client.delete(f"/api/{resource}/{item['id']}").status_code == 409
    result = client.post(f"/api/units/{unit['id']}/syllabus", json={'topics': ['Normalization', ' normalization ', 'Relational model']})
    assert result.status_code == 201
    assert [t['name'] for t in result.json()] == ['Normalization']
    assert client.post(f"/api/units/{unit['id']}/syllabus", json={'topics': ['Valid', ' ']}).status_code == 422
    assert client.post(f"/api/units/{unit['id']}/syllabus", json={'topics': ['t'] * 201}).status_code == 422
    assert len(client.get('/api/workspace').json()['topics']) == 2
    for t in client.get('/api/workspace').json()['topics']:
        assert client.delete(f"/api/topics/{t['id']}").status_code == 204
    for resource, item in [('units', unit), ('subjects', subject), ('semesters', semester)]:
        assert client.delete(f"/api/{resource}/{item['id']}").status_code == 204
    assert client.delete('/api/topics/999').status_code == 404
