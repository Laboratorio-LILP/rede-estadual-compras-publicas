"""Todo link da documentacao aponta para algo que existe.

A documentacao desta frente e' densa em referencias cruzadas, e Markdown
quebrado nao derruba build nenhum: o defeito so aparece quando alguem clica.
Este teste existe para que mover ou renomear um documento deixe de ser uma
operacao de fe — foi escrito para a reorganizacao de 27/08, que criou
`docs/legado/`.

## O que este teste NAO faz, e por que

A primeira versao tambem conferia caminho citado **em crase** — `` `x.md` `` —,
porque e' assim que a maior parte das referencias daqui esta escrita. A ideia
foi medida e descartada: qualquer regra larga o bastante para pegar
`` `MODELO_DE_DADOS.md` `` pega junto dezenas de mencoes legitimas.

Na varredura de 27/08, das citacoes com barra que nao resolviam, **nenhuma era
defeito**: `try/catch` e `wcag2a/aa` nao sao caminho; `dudyfarias/RECPSP` e'
slug de repositorio; `LILP/CLAUDE.md` e `docker/postgres/init/*.sql` moram fora
desta arvore (vault e clone da Biblioteca); `server/forum.db` so existe em
execucao. Um guardiao que nasce pedindo 22 excecoes e' um guardiao que sera'
silenciado, nao mantido.

Entao a fronteira e' esta: **link de Markdown e' promessa de navegacao e vale
como contrato; nome em crase e' prosa.** Mencao em crase se confere por leitura
na hora de mover — que foi o que se fez.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

# backend/tests/ -> backend/ -> raiz do repositorio
RAIZ = Path(__file__).resolve().parents[2]

ALVOS = ["docs", "CLAUDE.md", "README.md"]

# `[texto](caminho)`, descartando URL absoluta, ancora pura e mailto.
LINK = re.compile(r"\[[^\]]*\]\((?!https?://|#|mailto:)([^)\s]+)\)")


def arquivos_markdown() -> list[Path]:
    encontrados: list[Path] = []
    for alvo in ALVOS:
        caminho = RAIZ / alvo
        if caminho.is_file():
            encontrados.append(caminho)
        elif caminho.is_dir():
            encontrados.extend(sorted(caminho.rglob("*.md")))
    return encontrados


def resolve(origem: Path, citado: str) -> bool:
    """Um alvo vale se existe ao lado de quem o cita OU a partir da raiz."""
    limpo = citado.split("#", 1)[0].rstrip("/")
    if not limpo:
        return True  # ancora para o proprio documento
    return (origem.parent / limpo).exists() or (RAIZ / limpo).exists()


DOCUMENTOS = arquivos_markdown()


def test_ha_documentacao_para_verificar() -> None:
    """Guarda contra o pior modo de falha: um teste que passa sem olhar nada."""
    assert len(DOCUMENTOS) >= 10, f"so {len(DOCUMENTOS)} documentos encontrados"


@pytest.mark.parametrize("documento", DOCUMENTOS, ids=lambda p: str(p.relative_to(RAIZ)))
def test_todo_link_aponta_para_algo_que_existe(documento: Path) -> None:
    texto = documento.read_text(encoding="utf-8")
    quebrados = sorted({alvo for alvo in LINK.findall(texto) if not resolve(documento, alvo)})

    assert not quebrados, (
        f"{documento.relative_to(RAIZ)} aponta para caminho inexistente: {quebrados}"
    )
