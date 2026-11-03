from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .database import get_session, initialize_database
from .academics import router
from .ai import router as ai_router
from .documents import router as documents_router, UploadSizeLimitMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="StudyMate AI", version="0.1.0", lifespan=lifespan)
app.include_router(router)
app.include_router(ai_router)
app.include_router(documents_router)
app.add_middleware(UploadSizeLimitMiddleware)


class HealthResponse(BaseModel):
    status: str
    database: str
    version: str


@app.get("/api/health", response_model=HealthResponse)
def health(session: Session = Depends(get_session)) -> HealthResponse:
    try:
        session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Database unavailable") from None
    return HealthResponse(status="ok", database="connected", version=app.version)
