from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    manufacturer_id: int
    storage_min_temp: float = Field(..., ge=-100, le=100)
    storage_max_temp: float = Field(..., ge=-100, le=100)

    @field_validator("storage_max_temp")
    @classmethod
    def validate_temperature_range(cls, value: float, info):
        data = info.data
        min_temp = data.get("storage_min_temp")
        if min_temp is not None and value < min_temp:
            raise ValueError("storage_max_temp must be greater than or equal to storage_min_temp")
        return value


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    manufacturer_id: int | None = None
    storage_min_temp: float | None = Field(default=None, ge=-100, le=100)
    storage_max_temp: float | None = Field(default=None, ge=-100, le=100)

    @field_validator("storage_max_temp")
    @classmethod
    def validate_temperature_range(cls, value: float | None, info):
        if value is None:
            return value
        data = info.data
        min_temp = data.get("storage_min_temp")
        if min_temp is not None and value < min_temp:
            raise ValueError("storage_max_temp must be greater than or equal to storage_min_temp")
        return value


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
