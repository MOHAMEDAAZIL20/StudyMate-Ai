"""Private document originals plus durable extracted text and source positions."""
from datetime import datetime
from pathlib import Path
from uuid import uuid4
import logging
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, Response
from fastapi.responses import FileResponse
from starlette.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from .database import DATA_DIR, get_session
from .academics import require
from .models import Document, Subject, Unit
from .extraction import extract, ExtractionError

router = APIRouter(prefix='/api/documents', tags=['Study materials'])
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 1024 * 1024  # Allow multipart field overhead.
UPLOAD_DIR = DATA_DIR / 'uploads'
MIME_TYPES = {'pdf': 'application/pdf', 'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'txt': 'text/plain'}
logger = logging.getLogger(__name__)


class UploadSizeLimitMiddleware:
    """Bound upload requests before the multipart parser spools all input."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope['method'] != 'POST' or scope['path'].rstrip('/') != '/api/documents':
            return await self.app(scope, receive, send)
        headers = dict(scope.get('headers', []))
        try:
            announced = int(headers.get(b'content-length', b'0'))
        except ValueError:
            announced = 0
        if announced > MAX_REQUEST_BYTES:
            return await JSONResponse({'detail': 'Upload request exceeds the supported size limit.'}, status_code=413)(scope, receive, send)
        total = 0
        async def limited_receive():
            nonlocal total
            message = await receive()
            total += len(message.get('body', b''))
            if total > MAX_REQUEST_BYTES:
                raise HTTPException(413, 'Upload request exceeds the supported size limit.')
            return message
        return await self.app(scope, limited_receive, send)


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    subject_id: int
    unit_id: int | None
    name: str
    file_type: str
    size_bytes: int
    status: str
    warning: str | None
    created_at: datetime


class SectionRead(BaseModel):
    number: int
    label: str
    text: str


class DocumentDetail(DocumentRead):
    text: str
    sections: list[SectionRead]


class Categorization(BaseModel):
    model_config = ConfigDict(extra='forbid')
    subject_id: int = Field(gt=0)
    unit_id: int | None = Field(default=None, gt=0)


def validate_category(session, subject_id, unit_id):
    require(session, Subject, subject_id)
    if unit_id is not None and require(session, Unit, unit_id).subject_id != subject_id:
        raise HTTPException(422, 'The selected unit does not belong to this subject.')


def original_path(document):
    # Never use an uploaded filename as a filesystem path.
    root = UPLOAD_DIR.resolve()
    path = (root / document.storage_key).resolve()
    if path.parent != root:
        raise HTTPException(500, 'Invalid document storage reference.')
    return path


@router.get('', response_model=list[DocumentRead])
def list_documents(q: str = Query('', max_length=200), subject_id: int | None = Query(None, gt=0), unit_id: int | None = Query(None, gt=0), session: Session = Depends(get_session)):
    statement = select(Document)
    if subject_id is not None:
        statement = statement.where(Document.subject_id == subject_id)
    if unit_id is not None:
        statement = statement.where(Document.unit_id == unit_id)
    if q.strip():
        statement = statement.where(or_(Document.name.contains(q.strip(), autoescape=True), Document.text.contains(q.strip(), autoescape=True)))
    return session.scalars(statement.order_by(Document.id.desc())).all()


@router.post('', response_model=DocumentRead, status_code=201)
def upload_document(file: UploadFile = File(...), subject_id: int = Form(..., gt=0), unit_id: int | None = Form(None, gt=0), session: Session = Depends(get_session)):
    validate_category(session, subject_id, unit_id)
    name = (file.filename or '').replace('\\', '/').split('/')[-1].strip()
    kind = Path(name).suffix.lower().lstrip('.')
    if not name or len(name) > 200 or any(ord(c) < 32 for c in name) or kind not in MIME_TYPES:
        raise HTTPException(415, 'Choose a PDF, PPTX, or TXT file with a name up to 200 characters.')
    # Read a bounded buffer; never trust the filename or client MIME type.
    content = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, 'Files must be 20 MB or smaller.')
    if not content:
        raise HTTPException(422, 'The file is empty.')
    try:
        text, sections, status, warning = extract(content, kind)
    except ExtractionError as error:
        raise HTTPException(422, str(error)) from None
    document = Document(subject_id=subject_id, unit_id=unit_id, name=name, storage_key=f'{uuid4().hex}.{kind}', file_type=kind, size_bytes=len(content), text=text, sections=sections, status=status, warning=warning)
    path = original_path(document)
    created = False
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        with path.open('xb') as target:
            created = True
            target.write(content)
        session.add(document)
        session.commit()
    except (OSError, SQLAlchemyError):
        session.rollback()
        # Only the UUID-owned file from this failed upload is eligible for cleanup.
        if created:
            try:
                path.unlink(missing_ok=True)
            except OSError:
                logger.warning('A failed upload left a private orphan file for storage review.')
        raise HTTPException(503, 'Could not store the document. Check storage availability and try again.') from None
    session.refresh(document)
    return document


@router.get('/{document_id}', response_model=DocumentDetail)
def detail(document_id: int, session: Session = Depends(get_session)):
    return require(session, Document, document_id)


@router.get('/{document_id}/original')
def original(document_id: int, session: Session = Depends(get_session)):
    document = require(session, Document, document_id)
    path = original_path(document)
    if not path.is_file():
        raise HTTPException(404, 'Original file is missing. Extracted text is still available.')
    return FileResponse(path, media_type=MIME_TYPES[document.file_type], filename=document.name,
                        headers={'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store'})


@router.put('/{document_id}', response_model=DocumentRead)
def categorize(document_id: int, payload: Categorization, session: Session = Depends(get_session)):
    document = require(session, Document, document_id)
    validate_category(session, payload.subject_id, payload.unit_id)
    document.subject_id, document.unit_id = payload.subject_id, payload.unit_id
    try:
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        raise HTTPException(409, 'The category changed. Refresh and try again.') from None
    session.refresh(document)
    return document


@router.delete('/{document_id}', status_code=204)
def delete_document(document_id: int, session: Session = Depends(get_session)):
    document = require(session, Document, document_id)
    path = original_path(document)
    # Keep a recoverable original if the database commit fails.
    staged = path.with_suffix(path.suffix + '.deleting')
    try:
        if path.exists():
            path.rename(staged)
    except OSError:
        raise HTTPException(503, 'Original file is in use. Close it and try again.') from None
    try:
        session.delete(document)
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        if staged.exists():
            staged.rename(path)
        raise HTTPException(503, 'Could not remove the record. Try again.') from None
    try:
        staged.unlink(missing_ok=True)
    except OSError:
        # Record is deleted; a private pending-delete file remains for manual cleanup.
        logger.warning('A deleted document left a private .deleting file for storage review.')
    return Response(status_code=204)
