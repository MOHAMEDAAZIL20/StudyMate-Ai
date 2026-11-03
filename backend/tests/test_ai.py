import pytest
from fastapi import HTTPException
from app.ai import chunks, vector
from test_documents import library, upload
from test_academics import workspace_client


def test_no_context_does_not_call_model(library, monkeypatch):
    client, _, _, subject, _ = library
    monkeypatch.setattr('app.ai.ollama', lambda *args: pytest.fail('Model should not be called'))
    response = client.post('/api/ai/ask', json={'subject_id': subject['id'], 'question': 'Explain normalization'})
    assert response.status_code == 200
    assert response.json()['sources'] == []


def test_citations_and_subject_filter(library, monkeypatch):
    from app.ai import CHAT_MODEL, EMBED_MODEL
    client, _, _, subject, unit = library
    doc = upload(client, subject, unit).json()
    monkeypatch.setattr('app.ai.embed', lambda *args: [1.0, 0.0])
    def model(endpoint, body=None):
        if endpoint == 'tags':
            return {'models': [{'name': CHAT_MODEL}, {'name': EMBED_MODEL, 'digest': 'test'}]}
        return {'message': {'content': '{"supported":true,"answer":"Reduces redundancy [1]","citations":[1]}'}}
    monkeypatch.setattr('app.ai.ollama', model)
    result = client.post('/api/ai/ask', json={'subject_id': subject['id'], 'question': 'What is normalization?'}).json()
    assert result['sources'][0]['document_id'] == doc['id']
    assert result['sources'][0]['name'] == 'notes.txt'
    other = client.post('/api/subjects', json={'semester_id': subject['semester_id'], 'name': 'Other'}).json()
    assert client.post('/api/ai/ask', json={'subject_id': other['id'], 'question': 'Explain normalization'}).json()['sources'] == []
    client.delete(f"/api/documents/{doc['id']}")
    assert client.post('/api/ai/ask', json={'subject_id': subject['id'], 'question': 'Explain normalization'}).json()['sources'] == []


def test_invalid_vectors():
    for value in [[], [0, 0], [float('nan')], ['bad']]:
        with pytest.raises(HTTPException):
            vector(value)


def test_embedding_cache_closes_file_and_reuses_vector(tmp_path, monkeypatch):
    from app import ai
    path = tmp_path / 'cache.sqlite3'
    monkeypatch.setattr(ai, 'CACHE', path)
    calls = []
    def model(*args):
        calls.append(args)
        return {'embeddings': [[3.0, 4.0]]}
    monkeypatch.setattr(ai, 'ollama', model)
    assert ai.embed('test', 'model:digest') == [0.6, 0.8]
    assert ai.embed('test', 'model:digest') == [0.6, 0.8]
    assert len(calls) == 1
    path.rename(tmp_path / 'closed.sqlite3')
