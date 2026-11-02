"""Bounded text extraction without OCR, model inference, or external services."""
from io import BytesIO
from zipfile import ZipFile
import pymupdf
from pptx import Presentation

MAX_SECTIONS = 1000
MAX_TEXT = 2_000_000


class ExtractionError(ValueError):
    pass


def shape_text(shapes):
    parts = []
    for shape in shapes:
        if shape.has_text_frame:
            parts.append(shape.text)
        if shape.has_table:
            parts.extend(" | ".join(cell.text for cell in row.cells) for row in shape.table.rows)
        if shape.shape_type == 6:  # Grouped shapes.
            parts.extend(shape_text(shape.shapes))
    return parts


def extract(content: bytes, kind: str):
    sections = []
    try:
        if kind == 'pdf':
            if not content.startswith(b'%PDF-'):
                raise ExtractionError('The file is not a valid PDF.')
            with pymupdf.open(stream=content, filetype='pdf') as document:
                if document.needs_pass:
                    raise ExtractionError('Password-protected PDFs are not supported. Upload an unlocked copy.')
                if len(document) > MAX_SECTIONS:
                    raise ExtractionError('PDFs are limited to 1,000 pages.')
                total = 0
                for index, page in enumerate(document):
                    text = page.get_text(sort=True).strip()
                    total += len(text)
                    if total > MAX_TEXT:
                        raise ExtractionError('Extracted text exceeds the 2 million character limit.')
                    sections.append({'number': index + 1, 'label': f'Page {index + 1}', 'text': text})
        elif kind == 'pptx':
            with ZipFile(BytesIO(content)) as archive:
                members = archive.infolist()
                if len(members) > 10000 or sum(m.file_size for m in members) > 100 * 1024 * 1024:
                    raise ExtractionError('The presentation expands beyond the supported size limit.')
                if 'ppt/presentation.xml' not in archive.namelist():
                    raise ExtractionError('The file is not a valid PPTX presentation.')
            presentation = Presentation(BytesIO(content))
            if len(presentation.slides) > MAX_SECTIONS:
                raise ExtractionError('Presentations are limited to 1,000 slides.')
            total = 0
            for index, slide in enumerate(presentation.slides):
                text = '\n'.join(shape_text(slide.shapes)).strip()
                total += len(text)
                if total > MAX_TEXT:
                    raise ExtractionError('Extracted text exceeds the 2 million character limit.')
                sections.append({'number': index + 1, 'label': f'Slide {index + 1}', 'text': text})
        else:
            text = content.decode('utf-8-sig')
            if '\x00' in text or any(ord(c) < 32 and c not in '\n\r\t\f' for c in text):
                raise ExtractionError('TXT files must contain UTF-8 text, not binary content.')
            if len(text) > MAX_TEXT:
                raise ExtractionError('Extracted text exceeds the 2 million character limit.')
            sections = [{'number': 1, 'label': 'Text', 'text': text.strip()}]
    except ExtractionError:
        raise
    except Exception as error:
        raise ExtractionError('Unable to extract this file. It may be corrupt, encrypted, or not in the selected format. TXT files must use UTF-8.') from error
    text = '\n\n'.join(section['text'] for section in sections)
    empty = sum(not section['text'].strip() for section in sections)
    if not text.strip():
        status = 'needs_ocr' if kind == 'pdf' else 'no_text'
        warning = 'No selectable text found. Scanned or image-only PDFs need an additional OCR pipeline.' if kind == 'pdf' else 'No readable text found. Text inside images is not extracted.'
    else:
        status = 'ready'
        warning = f'{empty} page(s) or slide(s) contain no extractable text. Image text needs OCR.' if empty else None
    return text, sections, status, warning
