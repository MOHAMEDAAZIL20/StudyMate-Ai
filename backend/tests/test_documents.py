from io import BytesIO
import pytest
import pymupdf
from pptx import Presentation
from pptx.util import Inches
from sqlalchemy.exc import OperationalError
from app.extraction import extract, ExtractionError
from test_academics import workspace_client, hierarchy


@pytest.fixture
def library(workspace_client, tmp_path, monkeypatch):
    client, engine = workspace_client
    storage = tmp_path / 'originals'
    monkeypatch.setattr('app.documents.UPLOAD_DIR', storage)
    semester, subject, unit, topic = hierarchy(client)
    return client, engine, storage, subject, unit


def upload(client, subject, unit=None, name='notes.txt', content=b'Normalization reduces redundancy.'):
    fields = {'subject_id': str(subject['id'])}
    if unit:
        fields['unit_id'] = str(unit['id'])
    return client.post('/api/documents', data=fields, files={'file': (name, content, 'application/octet-stream')})


def pdf_bytes(blank=False, encrypted=False):
    with pymupdf.open() as pdf:
        page = pdf.new_page()
        if not blank:
            page.insert_text((72, 72), 'Normalization reduces redundancy.')
        pdf.new_page()
        if encrypted:
            return pdf.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, owner_pw='owner', user_pw='secret')
        return pdf.tobytes()


def pptx_bytes():
    presentation = Presentation()
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])
    slide.shapes.add_textbox(Inches(1), Inches(1), Inches(5), Inches(1)).text = 'Relational databases'
    table = slide.shapes.add_table(1, 2, Inches(1), Inches(3), Inches(5), Inches(1)).table
    table.cell(0, 0).text, table.cell(0, 1).text = 'Primary key', 'Unique identifier'
    presentation.slides.add_slide(presentation.slide_layouts[6])
    result = BytesIO()
    presentation.save(result)
    return result.getvalue()


def test_original_text_search_and_persistence(library):
    client, engine, storage, subject, unit = library
    content = 'Normalization — café\nSecond line'.encode('utf-8')
    result = upload(client, subject, unit, '../../notes.txt', content)
    assert result.status_code == 201, result.text
    document = result.json()
    assert document['name'] == 'notes.txt'
    assert document['status'] == 'ready'
    assert 'storage_key' not in document and 'text' not in document
    files = list(storage.iterdir())
    assert len(files) == 1 and files[0].parent == storage
    assert files[0].read_bytes() == content
    engine.dispose()
    detail = client.get(f"/api/documents/{document['id']}").json()
    assert detail['text'] == content.decode('utf-8')
    assert detail['sections'][0]['label'] == 'Text'
    assert len(client.get('/api/documents?q=caf').json()) == 1
    assert client.get('/api/documents?q=notpresent').json() == []
    assert client.get('/api/documents?q=%25').json() == []  # Literal SQL wildcard.
    original = client.get(f"/api/documents/{document['id']}/original")
    assert original.content == content
    assert original.headers['x-content-type-options'] == 'nosniff'
    assert original.headers['cache-control'] == 'no-store'
    assert client.delete(f"/api/units/{unit['id']}").status_code == 409
    assert client.delete(f"/api/subjects/{subject['id']}").status_code == 409


@pytest.mark.parametrize('name,content,label,expected', [
    ('lecture.pdf', lambda: pdf_bytes(), 'Page 1', 'Normalization'),
    ('slides.pptx', pptx_bytes, 'Slide 1', 'Primary key'),
])
def test_pdf_pptx_sections(library, name, content, label, expected):
    client, _, _, subject, unit = library
    result = upload(client, subject, unit, name, content())
    assert result.status_code == 201, result.text
    detail = client.get(f"/api/documents/{result.json()['id']}").json()
    assert len(detail['sections']) == 2
    assert detail['sections'][0]['label'] == label
    assert expected in detail['sections'][0]['text']
    assert detail['sections'][1]['number'] == 2
    assert detail['warning']


def test_scanned_and_no_text_states(library):
    client, _, _, subject, _ = library
    pdf = upload(client, subject, name='scan.pdf', content=pdf_bytes(blank=True))
    assert pdf.status_code == 201
    assert pdf.json()['status'] == 'needs_ocr'
    assert 'OCR' in pdf.json()['warning']
    txt = upload(client, subject, content=b' \n ')
    assert txt.status_code == 201 and txt.json()['status'] == 'no_text'


def test_validation_and_failure_cleanup(library, monkeypatch):
    client, _, storage, subject, unit = library
    for name, content, status in [('file.exe', b'bad', 415), ('bad.pdf', b'fake pdf', 422), ('bad.pptx', b'not a zip', 422), ('binary.txt', b'\x00\xff', 422), ('empty.txt', b'', 422), ('locked.pdf', pdf_bytes(encrypted=True), 422)]:
        assert upload(client, subject, unit, name, content).status_code == status
    monkeypatch.setattr('app.documents.MAX_UPLOAD_BYTES', 8)
    assert upload(client, subject, content=b'123456789').status_code == 413
    assert client.get('/api/documents').json() == []
    assert not storage.exists() or not list(storage.iterdir())
    assert upload(client, {'id': 999}, content=b'ok').status_code == 404
    other = client.post('/api/subjects', json={'name': 'Other subject', 'semester_id': subject['semester_id']}).json()
    assert upload(client, other, unit, content=b'ok').status_code == 422


def test_categorization_and_deletion(library):
    client, _, storage, subject, unit = library
    document = upload(client, subject, unit).json()
    url = f"/api/documents/{document['id']}"
    other = client.post('/api/subjects', json={'name': 'Another subject', 'semester_id': subject['semester_id']}).json()
    assert client.put(url, json={'subject_id': other['id'], 'unit_id': unit['id']}).status_code == 422
    assert client.put(url, json={'subject_id': other['id'], 'unit_id': None}).status_code == 200
    assert client.get(f"/api/documents?subject_id={subject['id']}").json() == []
    assert len(client.get(f"/api/documents?subject_id={other['id']}").json()) == 1
    assert client.delete(url).status_code == 204
    assert not list(storage.iterdir())
    assert client.get(url).status_code == 404
    assert client.get(url + '/original').status_code == 404
    assert client.delete(url).status_code == 404


def test_missing_original_keeps_extracted_text(library):
    client, _, storage, subject, _ = library
    document = upload(client, subject).json()
    next(storage.iterdir()).unlink()  # Disposable test fixture only.
    assert client.get(f"/api/documents/{document['id']}/original").status_code == 404
    assert client.get(f"/api/documents/{document['id']}").json()['text']
    assert client.delete(f"/api/documents/{document['id']}").status_code == 204


def test_failed_commit_does_not_leave_an_original(library, monkeypatch):
    client, _, storage, subject, _ = library
    def fail_commit(self):
        raise OperationalError('INSERT', {}, Exception('database path is private'))
    monkeypatch.setattr('sqlalchemy.orm.Session.commit', fail_commit)
    result = upload(client, subject)
    assert result.status_code == 503
    assert 'private' not in result.text
    assert not list(storage.iterdir())
    assert client.get('/api/documents').json() == []


def test_extraction_limits(monkeypatch):
    monkeypatch.setattr('app.extraction.MAX_TEXT', 3)
    with pytest.raises(ExtractionError):
        extract(b'abcd', 'txt')


def test_failed_delete_restores_original(library, monkeypatch):
    client, _, storage, subject, _ = library
    document = upload(client, subject).json()
    original = next(storage.iterdir())
    content = original.read_bytes()
    def fail_commit(self):
        raise OperationalError('DELETE', {}, Exception('private'))
    monkeypatch.setattr('sqlalchemy.orm.Session.commit', fail_commit)
    assert client.delete(f"/api/documents/{document['id']}").status_code == 503
    assert original.read_bytes() == content
    assert len(list(storage.iterdir())) == 1
    assert client.get(f"/api/documents/{document['id']}").status_code == 200


def test_request_body_limit(library, monkeypatch):
    client, _, storage, subject, _ = library
    monkeypatch.setattr('app.documents.MAX_REQUEST_BYTES', 100)
    assert upload(client, subject).status_code == 413
    assert not storage.exists()
    streamed = client.post('/api/documents', content=iter([b'x' * 101]), headers={'Content-Type': 'multipart/form-data; boundary=test'})
    assert streamed.status_code == 413
