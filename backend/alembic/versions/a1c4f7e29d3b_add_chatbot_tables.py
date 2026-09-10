"""add chatbot tables

Revision ID: a1c4f7e29d3b
Revises: 68827ca895b0
Create Date: 2026-09-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1c4f7e29d3b'
down_revision: Union[str, None] = '68827ca895b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'chatbot_profiles',
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('pace_atual', sa.Float(), nullable=True),
        sa.Column('distancia_frequente', sa.Float(), nullable=True),
        sa.Column('objetivo_principal', sa.String(), nullable=True),
        sa.Column('nivel', sa.String(), nullable=True),
        sa.Column('aguardando_aprofundamento', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('ultimo_topico_explicado', sa.String(), nullable=True),
        sa.Column('distancia_total', sa.Float(), nullable=False, server_default='0'),
        sa.Column('tempo_total', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('treinos_realizados', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('calorias_total', sa.Float(), nullable=False, server_default='0'),
        sa.Column('melhor_ritmo', sa.Float(), nullable=True),
        sa.Column('maior_distancia', sa.Float(), nullable=False, server_default='0'),
        sa.Column('melhor_pace_5k', sa.Float(), nullable=True),
        sa.Column('melhor_pace_10k', sa.Float(), nullable=True),
        sa.Column('melhor_pace_21k', sa.Float(), nullable=True),
        sa.Column('melhor_pace_42k', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_updated', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.uid'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id'),
    )

    op.create_table(
        'chatbot_treinos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('distancia_km', sa.Float(), nullable=False),
        sa.Column('tempo_min', sa.Integer(), nullable=False),
        sa.Column('ritmo', sa.Float(), nullable=False),
        sa.Column('calorias', sa.Float(), nullable=False),
        sa.Column('data', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.uid'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_chatbot_treinos_user_id', 'chatbot_treinos', ['user_id'])

    op.create_table(
        'chatbot_metas',
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('distancia', sa.Float(), nullable=False),
        sa.Column('data_limite', sa.String(), nullable=False),
        sa.Column('definida_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.uid'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id'),
    )

    op.create_table(
        'chatbot_respostas_aprendidas',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('pergunta_normalizada', sa.String(), nullable=False),
        sa.Column('resposta', sa.String(), nullable=False),
        sa.Column('frequencia', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.uid'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_chatbot_respostas_aprendidas_user_id', 'chatbot_respostas_aprendidas', ['user_id'])
    op.create_index(
        'ix_chatbot_respostas_aprendidas_pergunta_normalizada',
        'chatbot_respostas_aprendidas',
        ['pergunta_normalizada'],
    )


def downgrade() -> None:
    op.drop_index('ix_chatbot_respostas_aprendidas_pergunta_normalizada', table_name='chatbot_respostas_aprendidas')
    op.drop_index('ix_chatbot_respostas_aprendidas_user_id', table_name='chatbot_respostas_aprendidas')
    op.drop_table('chatbot_respostas_aprendidas')
    op.drop_table('chatbot_metas')
    op.drop_index('ix_chatbot_treinos_user_id', table_name='chatbot_treinos')
    op.drop_table('chatbot_treinos')
    op.drop_table('chatbot_profiles')
