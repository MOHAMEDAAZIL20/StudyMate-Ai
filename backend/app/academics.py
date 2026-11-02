"""Validated academic CRUD, without cascading deletes or moving child records."""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .database import get_session
from .models import Semester, Subject, Unit, Topic, Document
from .schemas import (NamedInput, SubjectInput, UnitInput, TopicInput, TopicUpdate,
                      SemesterRead, SubjectRead, UnitRead, TopicRead, Workspace, SyllabusInput)

router = APIRouter(prefix="/api", tags=["Academic workspace"])


def require(session, model, item_id):
    item = session.get(model, item_id)
    if item is None:
        raise HTTPException(404, "Record not found")
    return item


def save(session, item):
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, "That name already exists in this location, or a related record changed. Refresh and try again.") from None
    session.refresh(item)
    return item


@router.get("/workspace", response_model=Workspace)
def workspace(session: Session = Depends(get_session)):
    return {key: session.scalars(select(model).order_by(model.id)).all()
            for key, model in [("semesters", Semester), ("subjects", Subject), ("units", Unit), ("topics", Topic)]}


def register_resource(path, model, input_schema, output_schema, parent=None, parent_key=None, child=None, child_key=None):
    # FastAPI resolves the concrete input model assigned before route registration.
    def create(payload, session: Session = Depends(get_session)):
        values = payload.model_dump()
        if parent:
            require(session, parent, values[parent_key])
        item = model(**values)
        session.add(item)
        return save(session, item)
    create.__annotations__["payload"] = input_schema

    def update(item_id: int, payload: NamedInput, session: Session = Depends(get_session)):
        item = require(session, model, item_id)
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
        return save(session, item)
    if model is Topic:
        update.__annotations__["payload"] = TopicUpdate

    def remove(item_id: int, session: Session = Depends(get_session)):
        item = require(session, model, item_id)
        if model in (Subject, Unit):
            category = Document.subject_id if model is Subject else Document.unit_id
            if session.scalar(select(Document.id).where(category == item_id).limit(1)) is not None:
                raise HTTPException(409, "Move or remove the study materials in this category first.")
        if child and session.scalar(select(child.id).where(getattr(child, child_key) == item_id).limit(1)) is not None:
            raise HTTPException(409, "Remove the child items first. This action never deletes a whole hierarchy.")
        session.delete(item)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            raise HTTPException(409, "Related records exist. Refresh and remove child items first.") from None
        return Response(status_code=204)

    router.add_api_route(f"/{path}", create, methods=["POST"], response_model=output_schema, status_code=201, name=f"create_{path}")
    router.add_api_route(f"/{path}/{{item_id}}", update, methods=["PUT"], response_model=output_schema, name=f"update_{path}")
    router.add_api_route(f"/{path}/{{item_id}}", remove, methods=["DELETE"], status_code=204, name=f"delete_{path}")


register_resource("semesters", Semester, NamedInput, SemesterRead, child=Subject, child_key="semester_id")
register_resource("subjects", Subject, SubjectInput, SubjectRead, Semester, "semester_id", Unit, "subject_id")
register_resource("units", Unit, UnitInput, UnitRead, Subject, "subject_id", Topic, "unit_id")
register_resource("topics", Topic, TopicInput, TopicRead, Unit, "unit_id")


@router.post("/units/{unit_id}/syllabus", response_model=list[TopicRead], status_code=201)
def import_syllabus(unit_id: int, payload: SyllabusInput, session: Session = Depends(get_session)):
    require(session, Unit, unit_id)
    existing = {name.casefold() for name in session.scalars(select(Topic.name).where(Topic.unit_id == unit_id))}
    created = []
    for name in payload.topics:
        if name.casefold() not in existing:
            topic = Topic(unit_id=unit_id, name=name)
            session.add(topic)
            created.append(topic)
            existing.add(name.casefold())
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, "Syllabus changed during import. Refresh and try again.") from None
    for topic in created:
        session.refresh(topic)
    return created
