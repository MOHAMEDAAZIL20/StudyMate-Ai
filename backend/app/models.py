"""Phase 2 academic hierarchy. Parents cannot be deleted while children exist."""
from datetime import datetime, timezone
from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base


class Semester(Base):
    __tablename__ = "semesters"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)


class Subject(Base):
    __tablename__ = "subjects"
    __table_args__ = (UniqueConstraint("semester_id", "name"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    semester_id: Mapped[int] = mapped_column(ForeignKey("semesters.id", ondelete="RESTRICT"))
    name: Mapped[str] = mapped_column(String(120))


class Unit(Base):
    __tablename__ = "units"
    __table_args__ = (UniqueConstraint("subject_id", "name"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="RESTRICT"))
    name: Mapped[str] = mapped_column(String(120))


class Topic(Base):
    __tablename__ = "topics"
    __table_args__ = (UniqueConstraint("unit_id", "name"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id", ondelete="RESTRICT"))
    name: Mapped[str] = mapped_column(String(120))
    completed: Mapped[bool] = mapped_column(Boolean, default=False)


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="RESTRICT"), index=True)
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id", ondelete="RESTRICT"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    storage_key: Mapped[str] = mapped_column(String(64), unique=True)
    file_type: Mapped[str] = mapped_column(String(8))
    size_bytes: Mapped[int]
    status: Mapped[str] = mapped_column(String(24))
    warning: Mapped[str | None] = mapped_column(Text, nullable=True)
    text: Mapped[str] = mapped_column(Text)
    sections: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
