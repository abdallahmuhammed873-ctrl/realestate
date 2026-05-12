from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

LanguageCode = Literal["EN", "AR"]
TransactionType = Literal["BUY", "RENT", "VACATION"]
PropertyType = Literal["APARTMENT", "VILLA", "DUPLEX", "PENTHOUSE", "CHALET", "LAND", "COMMERCIAL"]
PaymentType = Literal["CASH", "INSTALLMENTS"]
CompletionStatus = Literal["OFF_PLAN", "READY"]
SortType = Literal["FEATURED", "NEWEST", "PRICE_ASC", "PRICE_DESC", "AREA_DESC", "DISTANCE_ASC"]


class ServiceBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ChatRequest(ServiceBaseModel):
    message: str = Field(min_length=1)
    language: LanguageCode = "EN"

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("message is required")
        return cleaned


class ExtractFiltersResponse(ServiceBaseModel):
    normalized_query: str
    filters: dict[str, Any]
    warnings: list[str] = Field(default_factory=list)


class AiPropertyFilters(ServiceBaseModel):
    q: str | None = None
    transaction: TransactionType | None = None
    type: list[PropertyType] | None = None
    city: str | None = None
    area: str | None = None
    district: str | None = None
    projectName: str | None = None
    minPrice: float | None = Field(default=None, ge=0)
    maxPrice: float | None = Field(default=None, ge=0)
    minArea: float | None = Field(default=None, ge=0)
    maxArea: float | None = Field(default=None, ge=0)
    minBeds: int | None = Field(default=None, ge=0)
    maxBeds: int | None = Field(default=None, ge=0)
    minBaths: int | None = Field(default=None, ge=0)
    maxBaths: int | None = Field(default=None, ge=0)
    paymentType: PaymentType | None = None
    completionStatus: CompletionStatus | None = None
    hasGarden: bool | None = None
    hasRoof: bool | None = None
    downPaymentMax: float | None = Field(default=None, ge=0)
    installmentYearsMax: float | None = Field(default=None, ge=0)
    installmentMonthlyMax: float | None = Field(default=None, ge=0)
    unitCode: str | None = None
    inventoryStatus: str | None = None
    sort: SortType | None = None
    page: int = Field(default=1, ge=1, le=1000)
    pageSize: int = Field(default=10, ge=1, le=50)

    @model_validator(mode="after")
    def validate_ranges(self) -> "AiPropertyFilters":
        range_pairs = [
            ("minPrice", "maxPrice"),
            ("minArea", "maxArea"),
            ("minBeds", "maxBeds"),
            ("minBaths", "maxBaths"),
        ]
        for min_key, max_key in range_pairs:
            minimum = getattr(self, min_key)
            maximum = getattr(self, max_key)
            if minimum is not None and maximum is not None and minimum > maximum:
                raise ValueError(f"{min_key} cannot be greater than {max_key}")
        return self

    def to_payload(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


class ChatResponse(ServiceBaseModel):
    reply: str
    language: LanguageCode
    suggestedFilters: list[str] = Field(default_factory=list)
    extractedFilters: dict[str, Any] = Field(default_factory=dict)
    total: int = 0
    items: list[dict[str, Any]] = Field(default_factory=list)


class HealthResponse(ServiceBaseModel):
    status: Literal["ok", "degraded"]
    llmProvider: str
    platformBaseUrl: str
    platformReachable: bool
