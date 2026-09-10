"""Conhecimento e cálculos do chatbot de corrida — puro, sem I/O.

Port do protótipo chatbot_corrida.py (CLI, estado em arquivo/pickle, sem
isolamento por usuário) para funções testáveis. Correções feitas na
portagem, em relação ao script original:

- `analisar_zona_por_pace` sempre dizia "está na Zona 4", pra qualquer pace
  informado — porque as 5 zonas são calculadas como offsets fixos em cima
  do pace dado, e esse pace *é*, por construção, o pace de Zona 4 (limiar)
  do próprio cálculo. Aqui isso fica explícito no texto (pace de referência
  = limiar), em vez de soar como uma conclusão da análise.
- Extração de pace por regex exigia só `\\d+[:.]\\d+`, o que casava horários
  ("6:30 da manhã") e qualquer decimal. Agora só extrai pace se a mensagem
  contém uma palavra de contexto ("pace", "ritmo", "min/km" etc).
- Uma única função de extração de pace/distância, em vez de 3 cópias
  divergentes (script original: linhas ~123, ~684, ~882).
- Código morto removido: `padroes_perguntas` (nunca lido),
  `preferencias_usuario`, `base_conhecimento_dinamica`, `historico_paces`,
  campo `'resposta': None` em intenções.
"""

from __future__ import annotations

import random
import re

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
        "curta": "Pace é o tempo por quilômetro. Pace 6 significa 6 minutos por km.",
        "detalhada": "Pace é o tempo que você leva para percorrer um quilômetro. Pace 6 significa 6 minutos por quilômetro.",
    },
    "calculo_pace": {
        "curta": "Divida o tempo em minutos pela distância em km. Ex: 30min ÷ 5km = pace 6.",
        "detalhada": "Para calcular o pace: divida o tempo total em minutos pela distância em quilômetros.",
    },
    "paces_por_nivel": {
        "curta": "Iniciantes: pace 7-8. Intermediários: 5:30-6:30. Avançados: abaixo de 5.",
        "detalhada": "Iniciantes: pace 7-8. Intermediários: 5:30-6:30. Avançados: abaixo de 5.",
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

# palavra-chave -> tópico em CONHECIMENTO
MAPEAMENTO_CONHECIMENTO_CURTO: dict[str, str] = {
    "técnica": "tecnica_corrida",
    "postura": "postura",
    "passada": "passada",
    "braço": "braco",
    "intervalado": "treino_intervalado",
    "fartlek": "treino_fartlek",
    "longo": "treino_longo",
    "tiro": "treino_tiro",
    "recuperação": "treino_recuperacao",
    "contínuo": "treino_continuo",
    "ritmo": "treino_ritmo",
    "antes de correr": "pre_treino",
    "depois de correr": "pos_treino",
    "hidratação": "hidratacao",
    "água": "hidratacao",
    "suplemento": "suplementos",
    "emagrecer": "emagrecimento",
    "lesão": "lesoes_comuns",
    "prevenção": "prevencao",
    "respiração": "respirar",
    "tênis": "tenis",
    "roupa": "roupa",
    "acessório": "acessorios",
    "iniciante": "iniciante",
    "intermediário": "intermediario",
    "avançado": "avancado",
    "maratona": "maratona",
    "5k": "5k",
    "10k": "10k",
    "meia": "meia_maratona",
    "frequência cardíaca": "frequencia_cardiaca",
    "vo2": "vo2max",
    "limiar": "limiar",
    "pace": "conceito_pace",
    "recorde": "batendo_recordes",
    "periodização": "periodizacao",
    "cross training": "cross_training",
    "fortalecimento": "fortalecimento",
    "alongamento": "alongamento",
    "aquecimento": "aquecimento",
    "desaquecimento": "desaquecimento",
}

# nome da zona -> (delta_min, delta_max) em relação ao pace de referência
# (Zona 4 / limiar). deltas negativos = mais rápido que o pace de referência.
ZONAS_DELTAS: dict[str, tuple[float, float]] = {
    "zona1": (1.5, 2.5),
    "zona2": (0.75, 1.5),
    "zona3": (0.25, 0.5),
    "zona4": (-0.25, 0.1),
    "zona5": (-0.5, -0.15),
}

CONHECIMENTO_ZONAS: dict[str, dict[str, str]] = {
    "zona1": {
        "nome": "Zona 1 - Recuperação",
        "fc_percentual": "50-60% da FC máxima",
        "descricao": "Ritmo muito leve para recuperação ativa e aquecimento",
        "duracao": "20-40 minutos",
        "beneficios": "Recuperação, melhora circulação, remove ácido lático",
    },
    "zona2": {
        "nome": "Zona 2 - Resistência Aeróbica",
        "fc_percentual": "60-70% da FC máxima",
        "descricao": "Ritmo confortável para base aeróbica, consegue conversar",
        "duracao": "30-90 minutos",
        "beneficios": "Base aeróbica, queima de gordura, resistência",
    },
    "zona3": {
        "nome": "Zona 3 - Ritmo de Prova",
        "fc_percentual": "70-80% da FC máxima",
        "descricao": "Ritmo moderado para provas longas",
        "duracao": "20-60 minutos",
        "beneficios": "Melhora cardiovascular, ritmo de prova",
    },
    "zona4": {
        "nome": "Zona 4 - Limiar Anaeróbico",
        "fc_percentual": "80-90% da FC máxima",
        "descricao": "Ritmo forte que você sustenta por cerca de 1 hora",
        "duracao": "15-40 minutos",
        "beneficios": "Eleva limiar, melhora tolerância ao lactato",
    },
    "zona5": {
        "nome": "Zona 5 - Velocidade Máxima",
        "fc_percentual": "90-100% da FC máxima",
        "descricao": "Ritmo máximo para tiros e sprints",
        "duracao": "10-20 minutos (em tiros)",
        "beneficios": "Velocidade, potência, VO2 máximo",
    },
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

DISTANCIAS_PROVA = {
    "maratona": 42.195,
    "meia": 21.0975,
    "10k": 10.0,
    "5k": 5.0,
}

# Contexto exigido perto do número para aceitar como pace — sem isso,
# "6:30" em "treino às 6:30 da manhã" não deveria virar pace 6.5.
_PACE_CONTEXT = re.compile(r"pace|ritmo|min/km|por km|/km")
# Segundos com 2 dígitos (00-59): pace de corrida é sempre min:seg, nunca
# minutos decimais. Exigir 2 dígitos também evita capturar dias/valores de
# data por engano.
_PACE_NUM = re.compile(r"(\d{1,2})[:.]([0-5]\d)")
_DISTANCIA_NUM = re.compile(r"(\d+(?:[.,]\d+)?)\s*(?:km|quilômetros|quilometros)\b")


def formatar_pace(pace: float) -> str:
    minutos = int(pace)
    segundos = int(round((pace - minutos) * 60))
    if segundos == 60:
        minutos += 1
        segundos = 0
    return f"{minutos}:{segundos:02d}"


def extrair_pace_e_distancia(mensagem_lower: str) -> tuple[float | None, float | None]:
    """Única fonte de verdade pra extração de pace/distância da mensagem.

    Substitui as 3 cópias divergentes do script original. Pace só é
    aceito se houver uma palavra de contexto na mensagem (evita casar
    horários e outros decimais soltos).
    """
    pace = None
    if _PACE_CONTEXT.search(mensagem_lower):
        match = _PACE_NUM.search(mensagem_lower)
        if match:
            # min:seg -> minutos decimais (ex.: 4:25 -> 4 + 25/60), nunca
            # "4.25" tratado como fração decimal — ver comentário no regex.
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


def detectar_objetivo(mensagem_lower: str) -> str | None:
    if any(p in mensagem_lower for p in ["maratona", "42k", "42km"]):
        return "maratona"
    if any(p in mensagem_lower for p in ["meia maratona", "21k", "21km"]):
        return "meia_maratona"
    if any(p in mensagem_lower for p in ["10k", "10km"]):
        return "10k"
    if any(p in mensagem_lower for p in ["5k", "5km"]):
        return "5k"
    return None


def detectar_nivel(mensagem_lower: str) -> str | None:
    if any(p in mensagem_lower for p in ["iniciante", "começar", "primeira vez", "novato"]):
        return "iniciante"
    if any(p in mensagem_lower for p in ["avançado", "experiente", "elite"]):
        return "avancado"
    if any(p in mensagem_lower for p in ["intermediário", "intermediario"]):
        return "intermediario"
    return None


def calcular_zonas_treino(pace_referencia: float) -> dict[str, tuple[float, float]]:
    """Zonas calculadas como offsets em torno do pace de referência
    (tratado como o pace de limiar/Zona 4 do usuário)."""
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


def texto_zona_especifica(pace_referencia: float, zona_texto: str) -> str | None:
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


def calcular_tempo_estimado_texto(pace: float, distancia: float) -> tuple[str, str]:
    """Retorna (texto_resposta, tempo_formatado)."""
    tempo_formatado = _formatar_tempo(pace * distancia)
    template = random.choice(RESPOSTAS_TREINADAS["tempo_estimado"])
    texto = template.format(pace_fmt=formatar_pace(pace), distancia=distancia, tempo_formatado=tempo_formatado)
    return texto, tempo_formatado


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


def texto_preparacao_maratona() -> str:
    return random.choice(RESPOSTAS_TREINADAS["preparacao_maratona"])


def responder_pergunta_direta(mensagem_lower: str) -> str | None:
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


def identificar_intencao(mensagem_lower: str) -> str | None:
    for intencao, padroes in INTENCOES.items():
        for padrao in padroes:
            if re.search(padrao, mensagem_lower):
                return intencao
    return None


def texto_intencao(intencao: str, nome_usuario: str | None, objetivo_principal: str | None) -> str:
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


def buscar_conhecimento_curto(mensagem_lower: str) -> tuple[str, str] | None:
    """Retorna (topico, texto_curto) da primeira palavra-chave que bater."""
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
    intersecao = palavras1 & palavras2
    uniao = palavras1 | palavras2
    return len(intersecao) / len(uniao)


def gerar_resposta_generica(nome_usuario: str | None, pace_atual: float | None, distancia_frequente: float | None) -> str:
    nome = f", {nome_usuario}" if nome_usuario else ""
    if pace_atual and distancia_frequente:
        return (
            f"Entendi{nome}. Você mencionou pace de {formatar_pace(pace_atual)} e distância de "
            f"{distancia_frequente:.0f}km anteriormente. Pode me dar mais detalhes sobre sua dúvida?"
        )
    return random.choice(
        [
            f"Entendi{nome}. Pode me dar mais detalhes? Sobre qual aspecto específico você quer saber?",
            f"Pode reformular{nome}? Quero entender melhor sua dúvida para ajudar.",
            f"Me conta mais{nome}. Qual seu pace, distância, objetivo?",
        ]
    )
