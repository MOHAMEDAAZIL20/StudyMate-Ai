"""Phase 2 academic hierarchy. Parents cannot be deleted while children exist."""
from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
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
