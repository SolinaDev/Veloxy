#!/usr/bin/env python3
"""chatbot_runnex.py — Chatbot especialista em corrida (versão standalone de teste)

Reescrita de chatbot_corrida.py (o protótipo original) com os bugs
encontrados na auditoria já corrigidos. Pensada pra testar rápido no
terminal, com estado salvo em JSON local — não é a versão de produção
(essa vive na branch feature/chatbot-corrida, integrada ao backend
FastAPI/Postgres do Veloxy, com isolamento real por usuário via API).

Uso:
    python3 chatbot_runnex.py

Correções em relação ao script original:
- Pace "4:25" (min:seg) não é mais lido como decimal "4.25" — isso
  corrompia todo cálculo de zona/tempo que dependesse do pace informado
  (4:25 virava 4.25, que reexibia como "4:15").
- Zona de treino não fica mais fixa em "Zona 4" pra qualquer pace — o
  texto agora deixa claro que o pace informado é tratado como referência
  de limiar, em vez de soar como uma conclusão da análise.
- Treinos/metas/estatísticas agora ficam no mesmo arquivo, namespaced por
  usuário — no original só a memória de conversa era namespaced
  (memoria_{nome}.json); treinos e estatísticas ficavam num arquivo
  global (dados_corrida.json) compartilhado por qualquer um que rodasse
  o script na mesma pasta.
- Sem pickle (execução de código arbitrário se o arquivo for adulterado)
  — tudo em JSON.
- Extração de pace/distância consolidada numa função só (o original
  repetia a mesma regex 3x, com validações divergentes entre as cópias).
- Código morto removido: padroes_perguntas (construído mas nunca lido),
  preferencias_usuario e historico_paces (nunca usados).
"""

import json
import os
import random
import re
from datetime import datetime, timezone
from typing import Optional

# ---------------------------------------------------------------------------
# Base de conhecimento
# ---------------------------------------------------------------------------

CONHECIMENTO: dict[str, dict[str, str]] = {
    "tecnica_corrida": {
        "curta": "Mantenha o corpo ereto, olhar para frente, ombros relaxados, braços em 90 graus e pisada com o meio do pé. Passos curtos e rápidos, cadência de 170-180 por minuto.",
        "detalhada": "A técnica correta envolve vários pontos. O corpo fica ereto com leve inclinação para frente. A cabeça fica alinhada com a coluna, olhar no horizonte. Os ombros relaxados. Os braços trabalham em ângulo de 90 graus. A pisada ideal é com o meio do pé. A cadência ideal fica entre 170 e 180 passos por minuto.",
    },
    "postura": {
        "curta": "Coluna ereta, ombros para trás e relaxados, quadril estável, joelhos levemente flexionados.",
        "detalhada": "A postura correta começa pela coluna ereta e alongada. Os ombros ficam para trás e para baixo, relaxados. O quadril deve estar estável. Os joelhos ficam levemente flexionados.",
    },
    "passada": {
        "curta": "Pise com o meio do pé, embaixo do corpo. Cadência ideal de 170-180 passos por minuto.",
        "detalhada": "A passada ideal tem o pé aterrissando embaixo do centro de gravidade. A pisada deve ser com o meio do pé. A cadência deve ficar entre 170 e 180 passos por minuto.",
    },
    "braco": {
        "curta": "Cotovelos em 90 graus, movimento para frente e para trás, mãos relaxadas.",
        "detalhada": "O movimento dos braços ajuda no equilíbrio. Os cotovelos ficam em ângulo de 90 graus. O movimento é para frente e para trás.",
    },
    "treino_continuo": {
        "curta": "Corrida em ritmo constante e confortável por 30-90 minutos.",
        "detalhada": "O treino contínuo é correr em ritmo constante por 30 a 90 minutos, numa intensidade de 60-70% da frequência cardíaca máxima.",
    },
    "treino_intervalado": {
        "curta": "Alterne alta intensidade com recuperação. Exemplo: 30s rápido e 90s caminhando, repetindo 8-12 vezes.",
        "detalhada": "O treino intervalado alterna alta intensidade com recuperação. Exemplo: 30 segundos rápido, 90 segundos caminhando. Repete-se de 8 a 12 vezes.",
    },
    "treino_fartlek": {
        "curta": "Alternância livre de ritmos, sem estrutura fixa.",
        "detalhada": "O fartlek é um treino livre onde você alterna ritmos sem estrutura rígida. Acelere até um ponto, recupere, acelere de novo.",
    },
    "treino_longo": {
        "curta": "A corrida mais longa da semana, em ritmo confortável.",
        "detalhada": "O treino longo é a corrida mais longa da semana. A duração varia de 1 hora até 3 horas para maratona.",
    },
    "treino_tiro": {
        "curta": "Sprints curtos e intensos, como 10x 100m rápido.",
        "detalhada": "O treino de tiro foca em velocidade pura. São sprints curtos e intensos, como 10 repetições de 100 metros.",
    },
    "treino_recuperacao": {
        "curta": "Corrida bem leve de 20-30 minutos para recuperação.",
        "detalhada": "O treino de recuperação é uma corrida bem leve de 20 a 30 minutos. Ajuda na recuperação ativa.",
    },
    "treino_ritmo": {
        "curta": "Corrida de 20-40 minutos no seu limiar anaeróbico.",
        "detalhada": "O treino de ritmo é correr de 20 a 40 minutos no seu limiar anaeróbico. É o pace mais rápido que você sustenta por cerca de uma hora.",
    },
    "pre_treino": {
        "curta": "Refeição completa 2-3h antes, ou lanche leve 30-60min antes.",
        "detalhada": "Refeição completa 2-3 horas antes com carboidratos e proteína magra. Lanche leve 30-60 minutos antes.",
    },
    "pos_treino": {
        "curta": "Coma proteína e carboidrato até 30min após. Hidrate-se bem.",
        "detalhada": "Após o treino, consuma proteína e carboidrato nos primeiros 30 minutos. Duas horas depois, refeição completa.",
    },
    "hidratacao": {
        "curta": "Beba 2-3 litros por dia. Durante o treino: 150-300ml a cada 15-20min.",
        "detalhada": "Beba 2-3 litros de água por dia. Durante o treino, beba 150-300ml a cada 15-20 minutos.",
    },
    "suplementos": {
        "curta": "Whey, creatina e cafeína podem ajudar. Consulte nutricionista.",
        "detalhada": "Whey protein ajuda na recuperação. Creatina ajuda na força. Cafeína melhora performance.",
    },
    "emagrecimento": {
        "curta": "Corrida queima 60-100 calorias por km. Dieta é 70% do resultado.",
        "detalhada": "Corrida queima 60-100 calorias por quilômetro. Dieta é 70% do resultado.",
    },
    "lesoes_comuns": {
        "curta": "Canelite, fascite, joelho de corredor e tendinite são as mais comuns.",
        "detalhada": "As lesões mais comuns: canelite, fascite plantar, joelho de corredor e tendinite de Aquiles.",
    },
    "prevencao": {
        "curta": "Regra dos 10%: não aumente volume mais que 10% por semana.",
        "detalhada": "Não aumente volume em mais de 10% por semana. Fortaleça core, glúteos e panturrilhas.",
    },
    "recuperacao": {
        "curta": "Caminhada leve após, alongamento, hidratação e sono.",
        "detalhada": "Após o treino, faça caminhada leve, alongue, hidrate e durma bem.",
    },
    "respirar": {
        "curta": "Ritmo 3:2 (inspire 3 passos, expire 2). Respire pelo nariz e boca.",
        "detalhada": "Use o ritmo 3:2, inspire por 3 passos e expire por 2. Respire pelo nariz e boca juntos.",
    },
    "tenis": {
        "curta": "Conheça sua pisada. Tamanho com 1 dedo de folga. Troque a cada 500-800km.",
        "detalhada": "Conheça seu tipo de pisada. O tamanho ideal tem um dedo de folga. Troque a cada 500-800km.",
    },
    "roupa": {
        "curta": "Evite algodão, prefira tecidos leves e respiráveis.",
        "detalhada": "Evite algodão. Prefira tecidos leves e respiráveis.",
    },
    "acessorios": {
        "curta": "Relógio GPS é o mais útil. Refletivos para segurança.",
        "detalhada": "O relógio GPS é o acessório mais útil. Para segurança, use refletivos.",
    },
    "iniciante": {
        "curta": "Comece alternando corrida e caminhada. 3x por semana, 20-30min.",
        "detalhada": "Para iniciantes, comece alternando corrida com caminhada. 3x por semana, 20-30 minutos.",
    },
    "intermediario": {
        "curta": "Semana típica: intervalado, corrida leve, ritmo, longão e recuperação.",
        "detalhada": "Para intermediários: intervalado, corrida leve, treino de ritmo, longão e recuperação.",
    },
    "avancado": {
        "curta": "Volume de 60-100km semanais. Dois treinos de qualidade.",
        "detalhada": "Treinamento avançado: volume de 60-100km semanais. Dois treinos de qualidade.",
    },
    "maratona": {
        "curta": "Preparação de 16-20 semanas. Longões até 35km.",
        "detalhada": "Preparar para maratona: 16-20 semanas. Longões progressivos até 35km.",
    },
    "5k": {
        "curta": "Prova ideal para iniciantes. Tempo médio 25-35min.",
        "detalhada": "A prova de 5km é perfeita para iniciantes. Tempo médio entre 25 e 35 minutos.",
    },
    "10k": {
        "curta": "Bom desafio para intermediários. Tempo médio 45-70min.",
        "detalhada": "A prova de 10km é um bom desafio. Tempo médio entre 45 e 70 minutos.",
    },
    "meia_maratona": {
        "curta": "21km exige preparação séria. Mínimo 12 semanas.",
        "detalhada": "A meia maratona exige mínimo de 12 semanas de treino.",
    },
    "maratona_completa": {
        "curta": "42km é o desafio máximo. Cuidado com a parede no km 30-35.",
        "detalhada": "A maratona é o desafio máximo. Cuidado com a parede no km 30-35.",
    },
    "frequencia_cardiaca": {
        "curta": "5 zonas de treino baseadas na FC máxima (220 - idade).",
        "detalhada": "Existem 5 zonas de treinamento baseadas na frequência cardíaca máxima.",
    },
    "vo2max": {
        "curta": "Capacidade máxima de consumo de oxigênio. Melhore com intervalados.",
        "detalhada": "O VO2 máximo é a capacidade máxima de consumir oxigênio. Melhore com intervalados.",
    },
    "limiar": {
        "curta": "Ponto onde o corpo acumula lactato. Treine 1x por semana.",
        "detalhada": "O limiar anaeróbico é o ponto onde o corpo acumula lactato.",
    },
    "conceito_pace": {
        "curta": "Pace é o tempo por quilômetro. Pace 6:00 significa 6 minutos por km.",
        "detalhada": "Pace é o tempo que você leva para percorrer um quilômetro. Pace 6:00 significa 6 minutos por quilômetro.",
    },
    "calculo_pace": {
        "curta": "Divida o tempo em minutos pela distância em km. Ex: 30min ÷ 5km = pace 6:00.",
        "detalhada": "Para calcular o pace: divida o tempo total em minutos pela distância em quilômetros.",
    },
    "paces_por_nivel": {
        "curta": "Iniciantes: pace 7:00-8:00. Intermediários: 5:30-6:30. Avançados: abaixo de 5:00.",
        "detalhada": "Iniciantes: pace 7:00-8:00. Intermediários: 5:30-6:30. Avançados: abaixo de 5:00.",
    },
    "como_melhorar_pace": {
        "curta": "Combine treinos de base, ritmo e intervalados. Consistência é a chave.",
        "detalhada": "Para melhorar o pace, combine treinos de base, ritmo e intervalados.",
    },
    "batendo_recordes": {
        "curta": "Treine no pace alvo, saia conservador, acelere no final.",
        "detalhada": "Para bater recorde, treine no pace alvo. Na prova, saia conservador.",
    },
    "periodizacao_recordes": {
        "curta": "Divida o treino em fases: base, construção, polimento e taper.",
        "detalhada": "Periodização: base, construção, polimento e taper.",
    },
    "treinos_para_recorde": {
        "curta": "Tempo run, intervalados e longões. 80% fácil, 20% intenso.",
        "detalhada": "Para bater recorde: tempo run, intervalados e longões.",
    },
    "psicologia_recordes": {
        "curta": "Confie no treino. Divida a prova em partes. Visualize-se no pace alvo.",
        "detalhada": "Confie no treino. Divida a prova em partes menores.",
    },
    "periodizacao": {
        "curta": "Divida o treino em ciclos: base, construção, polimento e taper.",
        "detalhada": "A periodização divide o treino em ciclos: base, construção, polimento e taper.",
    },
    "cross_training": {
        "curta": "Atividades complementares: natação, ciclismo, musculação.",
        "detalhada": "Cross-training inclui natação, ciclismo e musculação.",
    },
    "fortalecimento": {
        "curta": "Fortaleça core, glúteos e panturrilhas 2-3x por semana.",
        "detalhada": "Fortalecimento muscular é essencial. Foque em core, glúteos e panturrilhas.",
    },
    "alongamento": {
        "curta": "Alongue após o treino, nunca antes. Mantenha 20-30 segundos.",
        "detalhada": "Alongue após o treino. Mantenha cada alongamento por 20-30 segundos.",
    },
    "aquecimento": {
        "curta": "Aqueça 5-10 minutos antes de correr. Caminhada ou trote leve.",
        "detalhada": "Aqueça 5-10 minutos antes de correr.",
    },
    "desaquecimento": {
        "curta": "Caminhe 5-10 minutos após o treino para baixar a FC gradualmente.",
        "detalhada": "Caminhe 5-10 minutos após o treino.",
    },
}

MAPEAMENTO_CONHECIMENTO_CURTO: dict[str, str] = {
    "técnica": "tecnica_corrida", "postura": "postura", "passada": "passada", "braço": "braco",
    "intervalado": "treino_intervalado", "fartlek": "treino_fartlek", "longo": "treino_longo",
    "tiro": "treino_tiro", "recuperação": "treino_recuperacao", "contínuo": "treino_continuo",
    "ritmo": "treino_ritmo", "antes de correr": "pre_treino", "depois de correr": "pos_treino",
    "hidratação": "hidratacao", "água": "hidratacao", "suplemento": "suplementos",
    "emagrecer": "emagrecimento", "lesão": "lesoes_comuns", "prevenção": "prevencao",
    "respiração": "respirar", "tênis": "tenis", "roupa": "roupa", "acessório": "acessorios",
    "iniciante": "iniciante", "intermediário": "intermediario", "avançado": "avancado",
    "maratona": "maratona", "5k": "5k", "10k": "10k", "meia": "meia_maratona",
    "frequência cardíaca": "frequencia_cardiaca", "vo2": "vo2max", "limiar": "limiar",
    "pace": "conceito_pace", "recorde": "batendo_recordes", "periodização": "periodizacao",
    "cross training": "cross_training", "fortalecimento": "fortalecimento",
    "alongamento": "alongamento", "aquecimento": "aquecimento", "desaquecimento": "desaquecimento",
}

# nome da zona -> (delta_min, delta_max) em relação ao pace de referência
# (Zona 4 / limiar). Deltas negativos = mais rápido que o pace de referência.
ZONAS_DELTAS: dict[str, tuple[float, float]] = {
    "zona1": (1.5, 2.5), "zona2": (0.75, 1.5), "zona3": (0.25, 0.5),
    "zona4": (-0.25, 0.1), "zona5": (-0.5, -0.15),
}

CONHECIMENTO_ZONAS: dict[str, dict[str, str]] = {
    "zona1": {"nome": "Zona 1 - Recuperação", "fc_percentual": "50-60% da FC máxima",
              "descricao": "Ritmo muito leve para recuperação ativa e aquecimento",
              "duracao": "20-40 minutos", "beneficios": "Recuperação, melhora circulação, remove ácido lático"},
    "zona2": {"nome": "Zona 2 - Resistência Aeróbica", "fc_percentual": "60-70% da FC máxima",
              "descricao": "Ritmo confortável para base aeróbica, consegue conversar",
              "duracao": "30-90 minutos", "beneficios": "Base aeróbica, queima de gordura, resistência"},
    "zona3": {"nome": "Zona 3 - Ritmo de Prova", "fc_percentual": "70-80% da FC máxima",
              "descricao": "Ritmo moderado para provas longas",
              "duracao": "20-60 minutos", "beneficios": "Melhora cardiovascular, ritmo de prova"},
    "zona4": {"nome": "Zona 4 - Limiar Anaeróbico", "fc_percentual": "80-90% da FC máxima",
              "descricao": "Ritmo forte que você sustenta por cerca de 1 hora",
              "duracao": "15-40 minutos", "beneficios": "Eleva limiar, melhora tolerância ao lactato"},
    "zona5": {"nome": "Zona 5 - Velocidade Máxima", "fc_percentual": "90-100% da FC máxima",
              "descricao": "Ritmo máximo para tiros e sprints",
              "duracao": "10-20 minutos (em tiros)", "beneficios": "Velocidade, potência, VO2 máximo"},
}

ZONAS_TREINO: dict[str, str] = {
    "recuperacao": "zona1", "regenerativo": "zona1", "leve": "zona1", "zona 1": "zona1",
    "base": "zona2", "aerobico": "zona2", "aeróbico": "zona2", "resistencia": "zona2",
    "resistência": "zona2", "zona 2": "zona2",
    "prova": "zona3", "ritmo": "zona3", "moderado": "zona3", "zona 3": "zona3",
    "limiar": "zona4", "anaerobico": "zona4", "anaeróbico": "zona4", "forte": "zona4", "zona 4": "zona4",
    "tiro": "zona5", "velocidade": "zona5", "sprint": "zona5", "maximo": "zona5", "máximo": "zona5", "zona 5": "zona5",
}

RESPOSTAS_TREINADAS: dict[str, list[str]] = {
    "tempo_estimado": [
        "Com pace de {pace_fmt} min/km em {distancia:.1f}km, seu tempo estimado é {tempo_formatado}.",
        "Seu tempo estimado para {distancia:.1f}km com pace de {pace_fmt} min/km é {tempo_formatado}.",
        "Calculando: {distancia:.1f}km a pace {pace_fmt} min/km = {tempo_formatado}.",
    ],
    "tempo_maratona": [
        "Com pace de {pace_fmt} min/km, você completaria a maratona em {tempo_formatado}.",
        "Seu tempo estimado de maratona com pace {pace_fmt} é {tempo_formatado}.",
        "Projetando seu pace de {pace_fmt} para os 42km, o tempo seria {tempo_formatado}.",
    ],
    "preparacao_maratona": [
        "Para maratona com seu pace, foque em: longões progressivos de 25km até 35-38km, treinos de ritmo de 15-20km no pace alvo, e intervalados de 1000m. Inclua trechos de 10-15km no pace de maratona durante os longões.",
        "Seu plano para maratona: 16-20 semanas de preparação, longões semanais progressivos, treinos de ritmo no pace alvo, e simulações de prova com hidratação e nutrição.",
        "Para manter seu pace na maratona: fortaleça resistência muscular, faça longões com trechos no pace alvo, e treine nutrição durante os treinos longos.",
    ],
    "melhoria_pace": [
        "Para melhorar seu pace de {pace_fmt}, inclua: intervalados de 1000m a pace {pace_alvo_fmt}, treinos de ritmo a {pace_alvo_fmt}, e longões progressivos.",
        "Evolução do pace {pace_fmt} para {pace_alvo_fmt}: faça intervalados 2x por semana, treinos de ritmo 1x por semana, e fortalecimento muscular.",
        "Seu pace atual de {pace_fmt} pode evoluir para {pace_alvo_fmt} com: treinos variados, consistência e descanso adequado.",
    ],
}

INTENCOES: dict[str, list[str]] = {
    "saudacao": [r"\b(olá|oi|hey|eae|eai|bom dia|boa tarde|boa noite)\b"],
    "despedida": [r"\b(tchau|até mais|adeus|bye|até logo)\b"],
    "ajuda": [r"\b(ajuda|help|o que você sabe|como funciona)\b"],
}

DISTANCIAS_PROVA = {"maratona": 42.195, "meia": 21.0975, "10k": 10.0, "5k": 5.0}

_AGRADECIMENTOS = [
    "De nada! Qualquer dúvida sobre corrida, é só perguntar.",
    "Sempre às ordens! Bons treinos!",
    "Por nada! Continue correndo!",
]

# Contexto exigido perto do número para aceitar como pace — sem isso,
# "6:30" em "treino às 6:30 da manhã" não deveria virar pace 6:30/km.
_PACE_CONTEXT = re.compile(r"pace|ritmo|min/km|por km|/km")
# Segundos com 2 dígitos (00-59): pace de corrida é sempre min:seg, nunca
# minutos decimais — "4:25" tem que virar 4 + 25/60, nunca float("4.25").
_PACE_NUM = re.compile(r"(\d{1,2})[:.]([0-5]\d)")
_DISTANCIA_NUM = re.compile(r"(\d+(?:[.,]\d+)?)\s*(?:km|quilômetros|quilometros)\b")

_RECORDE_BUCKETS = [
    ("melhor_pace_5k", 4.5, 5.5), ("melhor_pace_10k", 9.0, 11.0),
    ("melhor_pace_21k", 20.0, 22.5), ("melhor_pace_42k", 40.0, 44.0),
]

_REGISTRAR_RE = re.compile(r"^\s*([\d.,]+)\s*,\s*(\d+)\s*(?:,\s*(.+))?$")
_META_RE = re.compile(r"^\s*([\d.,]+)\s*(?:,\s*(.+))?$")


def formatar_pace(pace: float) -> str:
    minutos = int(pace)
    segundos = int(round((pace - minutos) * 60))
    if segundos == 60:
        minutos += 1
        segundos = 0
    return f"{minutos}:{segundos:02d}"


def extrair_pace_e_distancia(mensagem_lower: str) -> tuple[Optional[float], Optional[float]]:
    """Única fonte de verdade pra extração de pace/distância da mensagem."""
    pace = None
    if _PACE_CONTEXT.search(mensagem_lower):
        match = _PACE_NUM.search(mensagem_lower)
        if match:
            # min:seg -> minutos decimais (ex.: 4:25 -> 4 + 25/60), nunca
            # "4.25" tratado como fração decimal.
            candidato = int(match.group(1)) + int(match.group(2)) / 60
            if 1 < candidato < 15:
                pace = candidato

    distancia = None
    gatilhos_prova = {
        "maratona": ["maratona", "42k", "42km"],
        "meia": ["meia maratona", "meia-maratona", "21k", "21km"],
        "10k": ["10k", "10km"],
        "5k": ["5k", "5km"],
    }
    for nome, gatilhos in gatilhos_prova.items():
        if any(t in mensagem_lower for t in gatilhos):
            distancia = DISTANCIAS_PROVA[nome]
            break
    if distancia is None:
        match = _DISTANCIA_NUM.search(mensagem_lower)
        if match:
            candidato = float(match.group(1).replace(",", "."))
            if 1 < candidato < 200:
                distancia = candidato

    return pace, distancia


def detectar_objetivo(mensagem_lower: str) -> Optional[str]:
    if any(p in mensagem_lower for p in ["maratona", "42k", "42km"]):
        return "maratona"
    if any(p in mensagem_lower for p in ["meia maratona", "21k", "21km"]):
        return "meia_maratona"
    if any(p in mensagem_lower for p in ["10k", "10km"]):
        return "10k"
    if any(p in mensagem_lower for p in ["5k", "5km"]):
        return "5k"
    return None


def detectar_nivel(mensagem_lower: str) -> Optional[str]:
    if any(p in mensagem_lower for p in ["iniciante", "começar", "primeira vez", "novato"]):
        return "iniciante"
    if any(p in mensagem_lower for p in ["avançado", "experiente", "elite"]):
        return "avancado"
    if any(p in mensagem_lower for p in ["intermediário", "intermediario"]):
        return "intermediario"
    return None


def calcular_zonas_treino(pace_referencia: float) -> dict[str, tuple[float, float]]:
    return {
        zona: (pace_referencia + delta_min, pace_referencia + delta_max)
        for zona, (delta_min, delta_max) in ZONAS_DELTAS.items()
    }


def texto_zonas_treino(pace_referencia: float) -> str:
    zonas = calcular_zonas_treino(pace_referencia)
    resposta = (
        f"Zonas de treinamento calculadas a partir do pace de referência de "
        f"{formatar_pace(pace_referencia)} min/km (tratado como seu pace de limiar / Zona 4):\n\n"
    )
    for zona in ["zona1", "zona2", "zona3", "zona4", "zona5"]:
        info = CONHECIMENTO_ZONAS[zona]
        pace_min, pace_max = zonas[zona]
        resposta += f"{info['nome']}\n"
        resposta += f"Pace: {formatar_pace(pace_min)} a {formatar_pace(pace_max)} min/km\n"
        resposta += f"{info['descricao']}\n\n"
    resposta += (
        "Se o pace que você me deu não for seu pace de limiar (ex.: era um pace de treino leve "
        "ou de prova), essas faixas vão estar deslocadas — me diga seu pace de limiar "
        "(o mais rápido que você sustenta por ~1h) pra recalcular certo."
    )
    return resposta


def texto_zona_especifica(pace_referencia: float, zona_texto: str) -> Optional[str]:
    zona_chave = ZONAS_TREINO.get(zona_texto.lower())
    if not zona_chave:
        return None
    zonas = calcular_zonas_treino(pace_referencia)
    pace_min, pace_max = zonas[zona_chave]
    info = CONHECIMENTO_ZONAS[zona_chave]
    return (
        f"{info['nome']}\n"
        f"FC: {info['fc_percentual']}\n"
        f"Seu pace nessa zona: {formatar_pace(pace_min)} a {formatar_pace(pace_max)} min/km\n"
        f"Descrição: {info['descricao']}\n"
        f"Duração ideal: {info['duracao']}\n"
        f"Benefícios: {info['beneficios']}\n"
    )


def _formatar_tempo(tempo_minutos: float) -> str:
    horas = int(tempo_minutos // 60)
    minutos = int(tempo_minutos % 60)
    segundos = int(round((tempo_minutos * 60) % 60))
    if horas > 0:
        return f"{horas}h{minutos:02d}min{segundos:02d}s"
    return f"{minutos}min{segundos:02d}s"


def calcular_tempo_estimado_texto(pace: float, distancia: float) -> str:
    tempo_formatado = _formatar_tempo(pace * distancia)
    template = random.choice(RESPOSTAS_TREINADAS["tempo_estimado"])
    return template.format(pace_fmt=formatar_pace(pace), distancia=distancia, tempo_formatado=tempo_formatado)


def texto_pace_maratona(pace: float, mensagem_lower: str) -> str:
    tempo_formatado = _formatar_tempo(pace * 42.195)
    if any(p in mensagem_lower for p in ["preparar", "treinar", "manter", "como"]):
        pace_fmt = formatar_pace(pace)
        return (
            f"Com pace de {pace_fmt} min/km, seu tempo estimado de maratona é {tempo_formatado}. "
            f"Para manter esse pace nos 42km, foque em: longões progressivos até 35-38km com trechos "
            f"no pace alvo, treinos de ritmo de 15-20km a pace {pace_fmt}, e fortalecimento muscular."
        )
    template = random.choice(RESPOSTAS_TREINADAS["tempo_maratona"])
    return template.format(pace_fmt=formatar_pace(pace), tempo_formatado=tempo_formatado)


def texto_melhoria_pace(pace: float) -> str:
    pace_alvo = pace - 0.15
    template = random.choice(RESPOSTAS_TREINADAS["melhoria_pace"])
    return template.format(pace_fmt=formatar_pace(pace), pace_alvo_fmt=formatar_pace(pace_alvo))


def responder_pergunta_direta(mensagem_lower: str) -> Optional[str]:
    if "pace" in mensagem_lower or "ritmo" in mensagem_lower:
        return CONHECIMENTO["conceito_pace"]["curta"]
    if "fartlek" in mensagem_lower:
        return CONHECIMENTO["treino_fartlek"]["curta"]
    if "intervalado" in mensagem_lower:
        return CONHECIMENTO["treino_intervalado"]["curta"]
    if "limiar" in mensagem_lower:
        return CONHECIMENTO["limiar"]["curta"]
    if "vo2" in mensagem_lower:
        return CONHECIMENTO["vo2max"]["curta"]
    return None


def identificar_intencao(mensagem_lower: str) -> Optional[str]:
    for intencao, padroes in INTENCOES.items():
        for padrao in padroes:
            if re.search(padrao, mensagem_lower):
                return intencao
    return None


def texto_intencao(intencao: str, nome_usuario: Optional[str], objetivo_principal: Optional[str]) -> str:
    nome = f", {nome_usuario}" if nome_usuario else ""
    if intencao == "saudacao":
        if objetivo_principal:
            return f"Olá{nome}! Vejo que seu objetivo é {objetivo_principal}. Como posso ajudar?"
        return f"Olá{nome}! Sobre o que você quer conversar? Posso falar de treinos, pace, recordes, maratona..."
    if intencao == "despedida":
        return f"Até mais{nome}! Se tiver mais dúvidas sobre corrida, é só chamar. Bons treinos!"
    if intencao == "ajuda":
        return f"Posso ajudar{nome} com: técnica, treinos, pace, recordes, maratona, nutrição, equipamento, lesões e ciência do treinamento."
    raise ValueError(f"intenção desconhecida: {intencao}")


def buscar_conhecimento_curto(mensagem_lower: str) -> Optional[tuple[str, str]]:
    for palavra, topico in MAPEAMENTO_CONHECIMENTO_CURTO.items():
        if palavra in mensagem_lower and topico in CONHECIMENTO:
            return topico, CONHECIMENTO[topico]["curta"]
    return None


def normalizar_texto(texto: str) -> str:
    texto = texto.lower().strip()
    texto = re.sub(r"[^\w\s]", "", texto)
    texto = re.sub(r"\s+", " ", texto)
    return texto


def calcular_similaridade(texto1: str, texto2: str) -> float:
    palavras1 = set(normalizar_texto(texto1).split())
    palavras2 = set(normalizar_texto(texto2).split())
    if not palavras1 or not palavras2:
        return 0.0
    return len(palavras1 & palavras2) / len(palavras1 | palavras2)


def gerar_resposta_generica(nome_usuario, pace_atual, distancia_frequente) -> str:
    nome = f", {nome_usuario}" if nome_usuario else ""
    if pace_atual and distancia_frequente:
        return (
            f"Entendi{nome}. Você mencionou pace de {formatar_pace(pace_atual)} e distância de "
            f"{distancia_frequente:.0f}km anteriormente. Pode me dar mais detalhes sobre sua dúvida?"
        )
    return random.choice([
        f"Entendi{nome}. Pode me dar mais detalhes? Sobre qual aspecto específico você quer saber?",
        f"Pode reformular{nome}? Quero entender melhor sua dúvida para ajudar.",
        f"Me conta mais{nome}. Qual seu pace, distância, objetivo?",
    ])


def _sanitizar_nome(nome: str) -> str:
    """Nome vira parte do nome do arquivo — mesmo em uso local, evita que
    um nome com "/" ou ".." vire um path acidental."""
    limpo = re.sub(r"[^\w\-]+", "_", nome.strip())
    return limpo or "usuario"


# ---------------------------------------------------------------------------
# Bot com estado local (1 arquivo JSON por usuário — sem pickle)
# ---------------------------------------------------------------------------

class CorridaChatBot:
    """Chatbot especialista em corrida, com estado persistido em
    chatbot_dados_{nome}.json — um arquivo só por usuário (treinos, metas,
    estatísticas, memória de conversa e respostas aprendidas juntos)."""

    def __init__(self, nome_usuario: Optional[str] = None):
        self.nome_usuario = _sanitizar_nome(nome_usuario) if nome_usuario else None
        self.dados = self._estado_padrao()
        self.aguardando_aprofundamento = False
        self.ultimo_topico_explicado = None
        if self.nome_usuario:
            self._carregar()

    def _arquivo(self) -> str:
        return f"chatbot_dados_{self.nome_usuario}.json"

    @staticmethod
    def _estado_padrao() -> dict:
        return {
            "pace_atual": None,
            "distancia_frequente": None,
            "objetivo_principal": None,
            "nivel": None,
            "treinos": [],
            "meta": None,
            "estatisticas": {
                "distancia_total": 0.0,
                "tempo_total": 0,
                "treinos_realizados": 0,
                "calorias_total": 0.0,
                "melhor_ritmo": None,
                "maior_distancia": 0.0,
                "melhor_pace_5k": None,
                "melhor_pace_10k": None,
                "melhor_pace_21k": None,
                "melhor_pace_42k": None,
            },
            "respostas_aprendidas": {},
        }

    def _carregar(self) -> None:
        if not os.path.exists(self._arquivo()):
            return
        try:
            with open(self._arquivo(), "r", encoding="utf-8") as f:
                salvo = json.load(f)
            self.dados.update(salvo)
            self.dados["estatisticas"] = {**self._estado_padrao()["estatisticas"], **salvo.get("estatisticas", {})}
        except (OSError, json.JSONDecodeError) as exc:
            print(f"[aviso] não consegui carregar '{self._arquivo()}' ({exc}) — começando do zero.")

    def salvar(self) -> None:
        if not self.nome_usuario:
            return
        try:
            with open(self._arquivo(), "w", encoding="utf-8") as f:
                json.dump(self.dados, f, ensure_ascii=False, indent=2)
        except OSError as exc:
            print(f"[aviso] não consegui salvar '{self._arquivo()}' ({exc}).")

    # -- comandos especiais --------------------------------------------------

    def _registrar_treino(self, corpo: str) -> str:
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
        data = (match.group(3) or datetime.now(timezone.utc).strftime("%d/%m/%Y")).strip()

        self.dados["treinos"].append({
            "data": data, "distancia_km": distancia, "tempo_min": tempo, "ritmo": ritmo, "calorias": calorias,
        })

        est = self.dados["estatisticas"]
        est["distancia_total"] += distancia
        est["tempo_total"] += tempo
        est["treinos_realizados"] += 1
        est["calorias_total"] += calorias

        mensagem_extra = ""
        if est["melhor_ritmo"] is None or ritmo < est["melhor_ritmo"]:
            est["melhor_ritmo"] = ritmo
            mensagem_extra = " Novo recorde pessoal de pace!"
        if distancia > est["maior_distancia"]:
            est["maior_distancia"] = distancia

        for campo, minimo, maximo in _RECORDE_BUCKETS:
            if minimo <= distancia <= maximo and (est[campo] is None or ritmo < est[campo]):
                est[campo] = ritmo

        return f"Treino registrado: {distancia:.1f}km em {tempo}min, pace {formatar_pace(ritmo)}.{mensagem_extra}"

    def _processar_meta(self, corpo: str) -> str:
        match = _META_RE.match(corpo)
        if not match:
            return "Formato inválido. Use: 'meta: distância_km, data_limite'"
        try:
            distancia = float(match.group(1).replace(",", "."))
        except ValueError:
            return "Distância inválida. Use: 'meta: distância_km, data_limite'"
        data_limite = (match.group(2) or datetime.now(timezone.utc).strftime("%d/%m/%Y")).strip()
        self.dados["meta"] = {"distancia": distancia, "data_limite": data_limite}
        return f"Meta definida: {distancia:.1f}km até {data_limite}."

    def _aprender(self, corpo: str) -> str:
        partes = corpo.split("|")
        if len(partes) != 2:
            return "Formato incorreto. Use: 'aprender: pergunta | resposta'"
        pergunta, resposta = partes[0].strip(), partes[1].strip()
        if not pergunta or not resposta:
            return "Formato incorreto. Use: 'aprender: pergunta | resposta'"
        chave = normalizar_texto(pergunta)
        existente = self.dados["respostas_aprendidas"].get(chave)
        if existente:
            existente["resposta"] = resposta
            existente["frequencia"] += 1
        else:
            self.dados["respostas_aprendidas"][chave] = {"resposta": resposta, "frequencia": 1}
        return f"Aprendi! Agora sei responder sobre '{pergunta}'"

    def _encontrar_resposta_similar(self, pergunta_lower: str) -> Optional[str]:
        aprendidas = self.dados["respostas_aprendidas"]
        chave = normalizar_texto(pergunta_lower)
        if chave in aprendidas:
            aprendidas[chave]["frequencia"] += 1
            return aprendidas[chave]["resposta"]

        melhor_similaridade, melhor_chave = 0.0, None
        for chave_conhecida in aprendidas:
            similaridade = calcular_similaridade(chave, chave_conhecida)
            if similaridade > melhor_similaridade:
                melhor_similaridade, melhor_chave = similaridade, chave_conhecida
        if melhor_similaridade > 0.5 and melhor_chave:
            aprendidas[melhor_chave]["frequencia"] += 1
            return aprendidas[melhor_chave]["resposta"]
        return None

    def _mostrar_estatisticas(self) -> str:
        est = self.dados["estatisticas"]
        if est["treinos_realizados"] == 0:
            return "Você ainda não tem treinos registrados."

        distancia_media = est["distancia_total"] / est["treinos_realizados"]
        ritmo_medio = est["tempo_total"] / est["distancia_total"]
        linhas = [
            "Suas estatísticas:", "",
            f"Treinos realizados: {est['treinos_realizados']}",
            f"Distância total: {est['distancia_total']:.1f} km",
            f"Tempo total: {est['tempo_total']} min",
            f"Calorias queimadas: {est['calorias_total']:.0f} kcal",
            f"Distância média: {distancia_media:.1f} km/treino",
            f"Ritmo médio: {formatar_pace(ritmo_medio)} min/km",
            f"Melhor pace: {formatar_pace(est['melhor_ritmo'])} min/km",
            f"Maior distância: {est['maior_distancia']:.1f} km",
        ]
        recordes = []
        for label, campo in [("5km", "melhor_pace_5k"), ("10km", "melhor_pace_10k"),
                              ("21km", "melhor_pace_21k"), ("42km", "melhor_pace_42k")]:
            if est[campo] is not None:
                recordes.append(f"{label}: {formatar_pace(est[campo])} min/km")
        if recordes:
            linhas += ["", "Recordes por distância: " + " | ".join(recordes)]
        return "\n".join(linhas)

    def _mostrar_treinos_recentes(self) -> str:
        treinos = self.dados["treinos"][-5:]
        if not treinos:
            return "Você ainda não tem treinos registrados."
        linhas = ["Últimos treinos:"]
        for t in treinos:
            linhas.append(f"{t['data']}: {t['distancia_km']:.1f}km em {t['tempo_min']}min (pace {formatar_pace(t['ritmo'])})")
        return "\n".join(linhas)

    def _mostrar_metas(self) -> str:
        meta = self.dados["meta"]
        if not meta:
            return "Você ainda não definiu metas."
        return f"Meta: {meta['distancia']:.1f}km até {meta['data_limite']}"

    def _mostrar_recordes(self) -> str:
        treinos = self.dados["treinos"]
        if not treinos:
            return "Você ainda não tem recordes."
        melhor = min(treinos, key=lambda t: t["ritmo"])
        maior = max(treinos, key=lambda t: t["distancia_km"])
        return f"Melhor pace: {formatar_pace(melhor['ritmo'])} min/km | Maior distância: {maior['distancia_km']:.1f}km"

    # -- perguntas em linguagem natural --------------------------------------

    def _analisar_pergunta_complexa(self, mensagem_lower: str, pace_extraido, distancia_extraida) -> Optional[str]:
        if any(p in mensagem_lower for p in
               ["zona", "zonas", "zona de treino", "zona de treinamento", "qual zona", "minha zona", "zona principal"]):
            pace_usar = pace_extraido or self.dados["pace_atual"]
            if pace_usar and 1 < pace_usar < 15:
                for zona_nome in ZONAS_TREINO:
                    if zona_nome in mensagem_lower:
                        texto = texto_zona_especifica(pace_usar, zona_nome)
                        if texto:
                            return texto
                return texto_zonas_treino(pace_usar)
            return "Me diga seu pace para eu calcular suas zonas de treinamento. Exemplo: 'pace 4:25' ou 'corro a 4:25 por km'"

        tempo_keywords = [
            "quanto tempo", "tempo estimado", "tempo total", "tempo previsto", "qual tempo", "que tempo",
            "quanto levaria", "quanto leva", "quanto demora", "faria", "levaria", "completaria", "terminaria",
            "tempo de percurso", "tempo do percurso",
        ]
        if any(p in mensagem_lower for p in tempo_keywords):
            pace_usar = pace_extraido or self.dados["pace_atual"]
            distancia_usar = distancia_extraida or self.dados["distancia_frequente"]
            if not pace_usar:
                return "Me diga seu pace para eu calcular o tempo. Exemplo: 'pace 4:25' ou 'corro a 4:25 por km'"
            if not distancia_usar:
                return "Me diga a distância para eu calcular o tempo. Exemplo: '42km' ou 'maratona'"
            return calcular_tempo_estimado_texto(pace_usar, distancia_usar)

        if pace_extraido and any(p in mensagem_lower for p in ["maratona", "42k", "42km"]):
            return texto_pace_maratona(pace_extraido, mensagem_lower)

        if (any(p in mensagem_lower for p in ["preparar", "treinar", "plano", "manter"])
                and any(p in mensagem_lower for p in ["maratona", "42k", "42km"])):
            return random.choice(RESPOSTAS_TREINADAS["preparacao_maratona"])

        if (any(p in mensagem_lower for p in ["melhorar", "evoluir", "abaixar"])
                and any(p in mensagem_lower for p in ["pace", "ritmo"])):
            pace_usar = pace_extraido or self.dados["pace_atual"]
            if pace_usar:
                return texto_melhoria_pace(pace_usar)
            return CONHECIMENTO["como_melhorar_pace"]["curta"]

        if any(p in mensagem_lower for p in ["o que é", "o que significa", "explique", "me explica", "como funciona"]):
            direta = responder_pergunta_direta(mensagem_lower)
            if direta:
                return direta

        return None

    # -- ponto de entrada ----------------------------------------------------

    def processar_mensagem(self, mensagem_original: str) -> str:
        mensagem_lower = mensagem_original.lower().strip()

        if self.aguardando_aprofundamento and any(
            p in mensagem_lower for p in ["mais", "detalhe", "explica", "continua", "aprofundar", "quero saber mais"]
        ):
            self.aguardando_aprofundamento = False
            if self.ultimo_topico_explicado and self.ultimo_topico_explicado in CONHECIMENTO:
                return CONHECIMENTO[self.ultimo_topico_explicado]["detalhada"]

        pace, distancia = extrair_pace_e_distancia(mensagem_lower)
        if pace is not None:
            self.dados["pace_atual"] = pace
        if distancia is not None:
            self.dados["distancia_frequente"] = distancia

        objetivo = detectar_objetivo(mensagem_lower)
        if objetivo:
            self.dados["objetivo_principal"] = objetivo
        nivel = detectar_nivel(mensagem_lower)
        if nivel:
            self.dados["nivel"] = nivel

        if mensagem_lower.startswith("registrar:"):
            return self._registrar_treino(mensagem_original.strip()[len("registrar:"):])
        if mensagem_lower.startswith("meta:"):
            return self._processar_meta(mensagem_original.strip()[len("meta:"):])
        if mensagem_lower.startswith("aprender:"):
            return self._aprender(mensagem_original.strip()[len("aprender:"):])

        aprendida = self._encontrar_resposta_similar(mensagem_lower)
        if aprendida:
            return aprendida

        complexa = self._analisar_pergunta_complexa(mensagem_lower, pace, distancia)
        if complexa:
            return complexa

        intencao = identificar_intencao(mensagem_lower)
        if intencao:
            return texto_intencao(intencao, self.nome_usuario, self.dados["objetivo_principal"])

        curto = buscar_conhecimento_curto(mensagem_lower)
        if curto:
            topico, texto = curto
            self.ultimo_topico_explicado = topico
            self.aguardando_aprofundamento = True
            return texto

        if any(p in mensagem_lower for p in ["estatísticas", "estatisticas", "stats", "desempenho"]):
            return self._mostrar_estatisticas()
        if any(p in mensagem_lower for p in ["últimos treinos", "ultimos treinos", "histórico", "historico"]):
            return self._mostrar_treinos_recentes()
        if "metas" in mensagem_lower or "objetivos" in mensagem_lower:
            return self._mostrar_metas()
        if any(p in mensagem_lower for p in ["record", "melhor tempo", "pb"]):
            return self._mostrar_recordes()
        if "obrigado" in mensagem_lower or "valeu" in mensagem_lower:
            return random.choice(_AGRADECIMENTOS)

        return gerar_resposta_generica(self.nome_usuario, self.dados["pace_atual"], self.dados["distancia_frequente"])


def main() -> None:
    print("""
    ==============================================
    CORRIDA ASSISTANT BOT ESPECIALISTA
    Com Zonas Personalizadas por Pace
    ==============================================

    Olá! Sou especialista em corrida.
    Eu lembro de tudo que conversamos!

    Pergunte qualquer coisa sobre corrida!
    """)

    nome = input("Qual é o seu nome? ").strip()
    bot = CorridaChatBot(nome_usuario=nome or None)

    if bot.dados["pace_atual"]:
        print(f"\nBem-vindo de volta, {nome}!")
        print(f"Seu pace atual: {formatar_pace(bot.dados['pace_atual'])} min/km")
        if bot.dados["objetivo_principal"]:
            print(f"Seu objetivo: {bot.dados['objetivo_principal']}")
    else:
        print(f"\nPrazer em conhecer você, {nome}!" if nome else "\nVamos lá!")
        print("Pode perguntar qualquer coisa sobre corrida!")

    while True:
        try:
            mensagem = input("\nVocê: ").strip()
            if not mensagem:
                continue
            if mensagem.lower() in ("sair", "exit", "quit"):
                bot.salvar()
                print("\nAté mais! Suas informações foram salvas. Continue correndo!")
                break

            resposta = bot.processar_mensagem(mensagem)
            print(f"\nBot: {resposta}")
            bot.salvar()
        except KeyboardInterrupt:
            bot.salvar()
            print("\n\nAté mais! Suas informações foram salvas. Continue correndo!")
            break


if __name__ == "__main__":
    main()
