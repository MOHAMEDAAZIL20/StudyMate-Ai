from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
ParentId = Annotated[int, Field(gt=0)]


class NamedInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Name


class SubjectInput(NamedInput):
    semester_id: ParentId


class UnitInput(NamedInput):
    subject_id: ParentId


class TopicInput(NamedInput):
    unit_id: ParentId


class TopicUpdate(NamedInput):
    completed: bool = Field(strict=True)


class SemesterRead(NamedInput):
    model_config = ConfigDict(from_attributes=True)
    id: int


class SubjectRead(SemesterRead):
    semester_id: int


class UnitRead(SemesterRead):
    subject_id: int


class TopicRead(SemesterRead):
    unit_id: int
    completed: bool


class Workspace(BaseModel):
    semesters: list[SemesterRead]
    subjects: list[SubjectRead]
    units: list[UnitRead]
    topics: list[TopicRead]


class SyllabusInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    topics: list[Name] = Field(min_length=1, max_length=200)
