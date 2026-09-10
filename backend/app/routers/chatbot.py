"""Chatbot especialista em corrida.

Port do protótipo standalone chatbot_corrida.py: mesma base de conhecimento
e cálculos (chatbot_logic.py), mas com estado em Postgres e escopado por
usuário autenticado — o script original guardava tudo em arquivos locais
(dados_corrida.json, memoria_{nome}.json, modelo_corrida.pkl via pickle)
sem isolamento entre usuários, o que não é seguro nem funciona com mais de
um usuário simultâneo.
"""

import random
import re
import traceback

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import chatbot_logic
from app.auth import FirebaseUser, require_verified_email
from app.database import get_db
from app.models import ChatbotProfile, ChatLearnedAnswer, ChatMeta, ChatTreino, User
from app.routers.users import get_or_create_user
from app.schemas_chatbot import ChatMessageIn, ChatMessageOut, ChatStatsOut
from app.time_utils import utcnow

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

_AGRADECIMENTOS = [
    "De nada! Qualquer dúvida sobre corrida, é só perguntar.",
    "Sempre às ordens! Bons treinos!",
    "Por nada! Continue correndo!",
]

_REGISTRAR_RE = re.compile(r"^\s*([\d.,]+)\s*,\s*(\d+)\s*(?:,\s*(.+))?$")
_META_RE = re.compile(r"^\s*([\d.,]+)\s*(?:,\s*(.+))?$")

_RECORDE_BUCKETS = [
    ("melhor_pace_5k", 4.5, 5.5),
    ("melhor_pace_10k", 9.0, 11.0),
    ("melhor_pace_21k", 20.0, 22.5),
    ("melhor_pace_42k", 40.0, 44.0),
]


def _get_or_create_profile(db: Session, user_id: str) -> ChatbotProfile:
    profile = db.get(ChatbotProfile, user_id)
    if not profile:
        profile = ChatbotProfile(user_id=user_id)
        db.add(profile)
        db.flush()
    return profile


def _atualizar_recorde_distancia(profile: ChatbotProfile, distancia: float, ritmo: float) -> None:
    for campo, minimo, maximo in _RECORDE_BUCKETS:
        if minimo <= distancia <= maximo:
            atual = getattr(profile, campo)
            if atual is None or ritmo < atual:
                setattr(profile, campo, ritmo)


def _registrar_treino(db: Session, user_id: str, profile: ChatbotProfile, corpo: str) -> str:
    match = _REGISTRAR_RE.match(corpo)
    if not match:
        return "Formato inválido. Use: 'registrar: distância_km, tempo_minutos[, data]' — ex: 'registrar: 5, 30'"

    try:
        distancia = float(match.group(1).replace(",", "."))
    except ValueError:
        return "Distância inválida. Use um número, ex: 'registrar: 5, 30'"
    tempo = int(match.group(2))

    if distancia <= 0 or tempo <= 0:
        return "Distância e tempo devem ser positivos."

    ritmo = tempo / distancia
    calorias = distancia * 60
    data = (match.group(3) or utcnow().strftime("%d/%m/%Y")).strip()

    db.add(ChatTreino(user_id=user_id, distancia_km=distancia, tempo_min=tempo, ritmo=ritmo, calorias=calorias, data=data))

    profile.distancia_total += distancia
    profile.tempo_total += tempo
    profile.treinos_realizados += 1
    profile.calorias_total += calorias

    mensagem_extra = ""
    if profile.melhor_ritmo is None or ritmo < profile.melhor_ritmo:
        profile.melhor_ritmo = ritmo
        mensagem_extra = " Novo recorde pessoal de pace!"
    if distancia > profile.maior_distancia:
        profile.maior_distancia = distancia

    _atualizar_recorde_distancia(profile, distancia, ritmo)

    resposta = f"Treino registrado: {distancia:.1f}km em {tempo}min, pace {chatbot_logic.formatar_pace(ritmo)}."
    return resposta + mensagem_extra


def _processar_meta(db: Session, user_id: str, corpo: str) -> str:
    match = _META_RE.match(corpo)
    if not match:
        return "Formato inválido. Use: 'meta: distância_km, data_limite'"

    try:
        distancia = float(match.group(1).replace(",", "."))
    except ValueError:
        return "Distância inválida. Use: 'meta: distância_km, data_limite'"
    data_limite = (match.group(2) or utcnow().strftime("%d/%m/%Y")).strip()

    meta = db.get(ChatMeta, user_id)
    if meta:
        meta.distancia = distancia
        meta.data_limite = data_limite
        meta.definida_em = utcnow()
    else:
        db.add(ChatMeta(user_id=user_id, distancia=distancia, data_limite=data_limite))

    return f"Meta definida: {distancia:.1f}km até {data_limite}."


def _aprender(db: Session, user_id: str, corpo: str) -> str:
    partes = corpo.split("|")
    if len(partes) != 2:
        return "Formato incorreto. Use: 'aprender: pergunta | resposta'"

    pergunta = partes[0].strip()
    resposta = partes[1].strip()
    if not pergunta or not resposta:
        return "Formato incorreto. Use: 'aprender: pergunta | resposta'"

    pergunta_normalizada = chatbot_logic.normalizar_texto(pergunta)
    existente = (
        db.query(ChatLearnedAnswer)
        .filter(ChatLearnedAnswer.user_id == user_id, ChatLearnedAnswer.pergunta_normalizada == pergunta_normalizada)
        .first()
    )
    if existente:
        existente.resposta = resposta
        existente.frequencia += 1
    else:
        db.add(
            ChatLearnedAnswer(
                user_id=user_id, pergunta_normalizada=pergunta_normalizada, resposta=resposta, frequencia=1
            )
        )

    return f"Aprendi! Agora sei responder sobre '{pergunta}'"


def _encontrar_resposta_similar(db: Session, user_id: str, pergunta_lower: str) -> str | None:
    pergunta_normalizada = chatbot_logic.normalizar_texto(pergunta_lower)

    exata = (
        db.query(ChatLearnedAnswer)
        .filter(ChatLearnedAnswer.user_id == user_id, ChatLearnedAnswer.pergunta_normalizada == pergunta_normalizada)
        .first()
    )
    if exata:
        exata.frequencia += 1
        return exata.resposta

    melhor_similaridade = 0.0
    melhor = None
    for candidata in db.query(ChatLearnedAnswer).filter(ChatLearnedAnswer.user_id == user_id).all():
        similaridade = chatbot_logic.calcular_similaridade(pergunta_normalizada, candidata.pergunta_normalizada)
        if similaridade > melhor_similaridade:
            melhor_similaridade = similaridade
            melhor = candidata

    if melhor_similaridade > 0.5 and melhor:
        melhor.frequencia += 1
        return melhor.resposta
    return None


def _mostrar_estatisticas(profile: ChatbotProfile) -> str:
    if profile.treinos_realizados == 0:
        return "Você ainda não tem treinos registrados."

    distancia_media = profile.distancia_total / profile.treinos_realizados
    ritmo_medio = profile.tempo_total / profile.distancia_total

    linhas = [
        "Suas estatísticas:",
        "",
        f"Treinos realizados: {profile.treinos_realizados}",
        f"Distância total: {profile.distancia_total:.1f} km",
        f"Tempo total: {profile.tempo_total} min",
        f"Calorias queimadas: {profile.calorias_total:.0f} kcal",
        f"Distância média: {distancia_media:.1f} km/treino",
        f"Ritmo médio: {chatbot_logic.formatar_pace(ritmo_medio)} min/km",
        f"Melhor pace: {chatbot_logic.formatar_pace(profile.melhor_ritmo)} min/km",
        f"Maior distância: {profile.maior_distancia:.1f} km",
    ]

    recordes = []
    for label, campo in [("5km", profile.melhor_pace_5k), ("10km", profile.melhor_pace_10k),
                          ("21km", profile.melhor_pace_21k), ("42km", profile.melhor_pace_42k)]:
        if campo is not None:
            recordes.append(f"{label}: {chatbot_logic.formatar_pace(campo)} min/km")
    if recordes:
        linhas.append("")
        linhas.append("Recordes por distância: " + " | ".join(recordes))

    return "\n".join(linhas)


def _mostrar_treinos_recentes(db: Session, user_id: str) -> str:
    treinos = (
        db.query(ChatTreino)
        .filter(ChatTreino.user_id == user_id)
        .order_by(ChatTreino.id.desc())
        .limit(5)
        .all()
    )
    if not treinos:
        return "Você ainda não tem treinos registrados."

    linhas = ["Últimos treinos:"]
    for treino in reversed(treinos):
        linhas.append(
            f"{treino.data}: {treino.distancia_km:.1f}km em {treino.tempo_min}min "
            f"(pace {chatbot_logic.formatar_pace(treino.ritmo)})"
        )
    return "\n".join(linhas)


def _mostrar_metas(db: Session, user_id: str) -> str:
    meta = db.get(ChatMeta, user_id)
    if not meta:
        return "Você ainda não definiu metas."
    return f"Meta: {meta.distancia:.1f}km até {meta.data_limite}"


def _mostrar_recordes(db: Session, user_id: str) -> str:
    melhor = (
        db.query(ChatTreino)
        .filter(ChatTreino.user_id == user_id)
        .order_by(ChatTreino.ritmo.asc())
        .first()
    )
    if not melhor:
        return "Você ainda não tem recordes."
    maior = (
        db.query(ChatTreino)
        .filter(ChatTreino.user_id == user_id)
        .order_by(ChatTreino.distancia_km.desc())
        .first()
    )
    return f"Melhor pace: {chatbot_logic.formatar_pace(melhor.ritmo)} min/km | Maior distância: {maior.distancia_km:.1f}km"


def _analisar_pergunta_complexa(
    profile: ChatbotProfile, mensagem_lower: str, pace_extraido: float | None, distancia_extraida: float | None
) -> str | None:
    if any(p in mensagem_lower for p in
           ["zona", "zonas", "zona de treino", "zona de treinamento", "qual zona", "minha zona", "zona principal"]):
        pace_usar = pace_extraido or profile.pace_atual
        if pace_usar and 1 < pace_usar < 15:
            for zona_nome in chatbot_logic.ZONAS_TREINO:
                if zona_nome in mensagem_lower:
                    texto = chatbot_logic.texto_zona_especifica(pace_usar, zona_nome)
                    if texto:
                        return texto
            return chatbot_logic.texto_zonas_treino(pace_usar)
        return "Me diga seu pace para eu calcular suas zonas de treinamento. Exemplo: 'pace 4:25' ou 'corro a 4:25 por km'"

    tempo_keywords = [
        "quanto tempo", "tempo estimado", "tempo total", "tempo previsto", "qual tempo", "que tempo",
        "quanto levaria", "quanto leva", "quanto demora", "faria", "levaria", "completaria", "terminaria",
        "tempo de percurso", "tempo do percurso",
    ]
    if any(p in mensagem_lower for p in tempo_keywords):
        pace_usar = pace_extraido or profile.pace_atual
        distancia_usar = distancia_extraida or profile.distancia_frequente
        if not pace_usar:
            return "Me diga seu pace para eu calcular o tempo. Exemplo: 'pace 4:25' ou 'corro a 4:25 por km'"
        if not distancia_usar:
            return "Me diga a distância para eu calcular o tempo. Exemplo: '42km' ou 'maratona'"
        texto, _ = chatbot_logic.calcular_tempo_estimado_texto(pace_usar, distancia_usar)
        return texto

    if pace_extraido and any(p in mensagem_lower for p in ["maratona", "42k", "42km"]):
        return chatbot_logic.texto_pace_maratona(pace_extraido, mensagem_lower)

    if (any(p in mensagem_lower for p in ["preparar", "treinar", "plano", "manter"])
            and any(p in mensagem_lower for p in ["maratona", "42k", "42km"])):
        return chatbot_logic.texto_preparacao_maratona()

    if (any(p in mensagem_lower for p in ["melhorar", "evoluir", "abaixar"])
            and any(p in mensagem_lower for p in ["pace", "ritmo"])):
        pace_usar = pace_extraido or profile.pace_atual
        if pace_usar:
            return chatbot_logic.texto_melhoria_pace(pace_usar)
        return chatbot_logic.CONHECIMENTO["como_melhorar_pace"]["curta"]

    if any(p in mensagem_lower for p in ["o que é", "o que significa", "explique", "me explica", "como funciona"]):
        direta = chatbot_logic.responder_pergunta_direta(mensagem_lower)
        if direta:
            return direta

    return None


def _processar_mensagem(db: Session, user_id: str, nome_usuario: str | None, mensagem_original: str) -> str:
    mensagem_lower = mensagem_original.lower().strip()
    profile = _get_or_create_profile(db, user_id)

    if profile.aguardando_aprofundamento and any(
        p in mensagem_lower for p in ["mais", "detalhe", "explica", "continua", "aprofundar", "quero saber mais"]
    ):
        profile.aguardando_aprofundamento = False
        topico = profile.ultimo_topico_explicado
        if topico and topico in chatbot_logic.CONHECIMENTO:
            return chatbot_logic.CONHECIMENTO[topico]["detalhada"]

    pace, distancia = chatbot_logic.extrair_pace_e_distancia(mensagem_lower)
    if pace is not None:
        profile.pace_atual = pace
    if distancia is not None:
        profile.distancia_frequente = distancia

    objetivo = chatbot_logic.detectar_objetivo(mensagem_lower)
    if objetivo:
        profile.objetivo_principal = objetivo
    nivel = chatbot_logic.detectar_nivel(mensagem_lower)
    if nivel:
        profile.nivel = nivel

    if mensagem_lower.startswith("registrar:"):
        return _registrar_treino(db, user_id, profile, mensagem_original.strip()[len("registrar:"):])
    if mensagem_lower.startswith("meta:"):
        return _processar_meta(db, user_id, mensagem_original.strip()[len("meta:"):])
    if mensagem_lower.startswith("aprender:"):
        return _aprender(db, user_id, mensagem_original.strip()[len("aprender:"):])

    aprendida = _encontrar_resposta_similar(db, user_id, mensagem_lower)
    if aprendida:
        return aprendida

    complexa = _analisar_pergunta_complexa(profile, mensagem_lower, pace, distancia)
    if complexa:
        return complexa

    intencao = chatbot_logic.identificar_intencao(mensagem_lower)
    if intencao:
        return chatbot_logic.texto_intencao(intencao, nome_usuario, profile.objetivo_principal)

    curto = chatbot_logic.buscar_conhecimento_curto(mensagem_lower)
    if curto:
        topico, texto = curto
        profile.ultimo_topico_explicado = topico
        profile.aguardando_aprofundamento = True
        return texto

    if any(p in mensagem_lower for p in ["estatísticas", "estatisticas", "stats", "desempenho"]):
        return _mostrar_estatisticas(profile)
    if any(p in mensagem_lower for p in ["últimos treinos", "ultimos treinos", "histórico", "historico"]):
        return _mostrar_treinos_recentes(db, user_id)
    if "metas" in mensagem_lower or "objetivos" in mensagem_lower:
        return _mostrar_metas(db, user_id)
    if any(p in mensagem_lower for p in ["record", "melhor tempo", "pb"]):
        return _mostrar_recordes(db, user_id)
    if "obrigado" in mensagem_lower or "valeu" in mensagem_lower:
        return random.choice(_AGRADECIMENTOS)

    return chatbot_logic.gerar_resposta_generica(nome_usuario, profile.pace_atual, profile.distancia_frequente)


@router.post("/message", response_model=ChatMessageOut)
def send_message(
    payload: ChatMessageIn,
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(require_verified_email),
):
    user = db.get(User, current_user.uid)
    if not user:
        fallback_name = current_user.email.split("@")[0] if current_user.email else "Corredor"
        user = get_or_create_user(db, current_user.uid, fallback_name, None)

    try:
        resposta = _processar_mensagem(db, current_user.uid, user.display_name, payload.message)
        db.commit()
    except Exception:
        db.rollback()
        print("ERRO NO CHATBOT:")
        print(traceback.format_exc(), flush=True)
        raise HTTPException(status_code=500, detail="Erro ao processar mensagem do chatbot.")

    return ChatMessageOut(reply=resposta)


@router.get("/stats", response_model=ChatStatsOut)
def get_stats(
    db: Session = Depends(get_db),
    current_user: FirebaseUser = Depends(require_verified_email),
):
    profile = db.get(ChatbotProfile, current_user.uid)
    if not profile:
        profile = ChatbotProfile(user_id=current_user.uid)
    return profile
