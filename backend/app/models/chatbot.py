from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.time_utils import utcnow


class ChatbotProfile(Base):
    """Estado do chatbot por usuário (pace, objetivo, estatísticas, recordes).

    Substitui memoria_{nome}.json e dados_corrida.json do script original —
    isolado por user_id em vez de compartilhado entre todos os usuários do
    mesmo diretório.
    """

    __tablename__ = "chatbot_profiles"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.uid", ondelete="CASCADE"), primary_key=True)

    pace_atual: Mapped[float | None] = mapped_column(Float, nullable=True)
    distancia_frequente: Mapped[float | None] = mapped_column(Float, nullable=True)
    objetivo_principal: Mapped[str | None] = mapped_column(String, nullable=True)
    nivel: Mapped[str | None] = mapped_column(String, nullable=True)
    aguardando_aprofundamento: Mapped[bool] = mapped_column(Boolean, default=False)
    ultimo_topico_explicado: Mapped[str | None] = mapped_column(String, nullable=True)

    distancia_total: Mapped[float] = mapped_column(Float, default=0)
    tempo_total: Mapped[int] = mapped_column(Integer, default=0)
    treinos_realizados: Mapped[int] = mapped_column(Integer, default=0)
    calorias_total: Mapped[float] = mapped_column(Float, default=0)
    melhor_ritmo: Mapped[float | None] = mapped_column(Float, nullable=True)
    maior_distancia: Mapped[float] = mapped_column(Float, default=0)

    # Recordes por distância-padrão — no script original esses campos
    # existiam em `estatisticas` mas nunca eram escritos (feature morta).
    melhor_pace_5k: Mapped[float | None] = mapped_column(Float, nullable=True)
    melhor_pace_10k: Mapped[float | None] = mapped_column(Float, nullable=True)
    melhor_pace_21k: Mapped[float | None] = mapped_column(Float, nullable=True)
    melhor_pace_42k: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class ChatTreino(Base):
    __tablename__ = "chatbot_treinos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.uid", ondelete="CASCADE"), nullable=False, index=True)

    distancia_km: Mapped[float] = mapped_column(Float, nullable=False)
    tempo_min: Mapped[int] = mapped_column(Integer, nullable=False)
    ritmo: Mapped[float] = mapped_column(Float, nullable=False)
    calorias: Mapped[float] = mapped_column(Float, nullable=False)
    data: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ChatMeta(Base):
    __tablename__ = "chatbot_metas"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.uid", ondelete="CASCADE"), primary_key=True)
    distancia: Mapped[float] = mapped_column(Float, nullable=False)
    data_limite: Mapped[str] = mapped_column(String, nullable=False)
    definida_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ChatLearnedAnswer(Base):
    """`aprender: pergunta | resposta` — escopado por usuário.

    No script original isso era um dict global do processo: um usuário
    ensinando o bot vazava a resposta para todo mundo. Aqui cada linha
    pertence a um user_id.
    """

    __tablename__ = "chatbot_respostas_aprendidas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.uid", ondelete="CASCADE"), nullable=False, index=True)

    pergunta_normalizada: Mapped[str] = mapped_column(String, nullable=False, index=True)
    resposta: Mapped[str] = mapped_column(String, nullable=False)
    frequencia: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
