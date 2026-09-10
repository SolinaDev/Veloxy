from pydantic import BaseModel, ConfigDict, Field


class ChatMessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class ChatMessageOut(BaseModel):
    reply: str


class ChatStatsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    treinos_realizados: int
    distancia_total: float
    tempo_total: int
    calorias_total: float
    melhor_ritmo: float | None
    maior_distancia: float
    melhor_pace_5k: float | None
    melhor_pace_10k: float | None
    melhor_pace_21k: float | None
    melhor_pace_42k: float | None
