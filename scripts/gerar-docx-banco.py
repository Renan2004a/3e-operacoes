#!/usr/bin/env python3
"""Gera o DOCX técnico do banco 3E para envio ao professor.

Uso: python scripts/gerar-docx-banco.py
Saída: docs/banco-3e-operacoes-2026-11-04.docx
"""
from __future__ import annotations

import re
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

RAIZ = Path(__file__).resolve().parents[1]
DOCS = RAIZ / "docs"
SAIDA = DOCS / "banco-3e-operacoes-2026-11-04.docx"
SQL = RAIZ / "prisma" / "migrations" / "20261031000000_banco_pt_v2" / "migration.sql"
MARKDOWN = DOCS / "banco-tabelas-relacionamentos.md"

AZUL = RGBColor(0x1F, 0x38, 0x64)
TEAL = RGBColor(0x0E, 0x74, 0x90)
CINZA = RGBColor(0x5B, 0x6B, 0x7A)
PRETO = RGBColor(0x0F, 0x17, 0x2A)
VERDE = RGBColor(0x16, 0x65, 0x34)
BRANCO = RGBColor(0xFF, 0xFF, 0xFF)


# --------------------------------------------------------------------------- #
# Helpers de formatação
# --------------------------------------------------------------------------- #
def definir_fonte(run, nome: str, tamanho: float, cor: RGBColor | None = None, negrito=False, italico=False):
    run.font.name = nome
    run._element.rPr.rFonts.set(qn("w:eastAsia"), nome)
    run.font.size = Pt(tamanho)
    if cor is not None:
        run.font.color.rgb = cor
    run.bold = negrito
    run.italic = italico


def sombrear(celula, cor: str):
    tcPr = celula._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), cor)
    tcPr.append(shd)


def borda_celula(celula, lados: dict):
    tcPr = celula._tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for lado, props in lados.items():
        el = OxmlElement(f"w:{lado}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), str(props.get("sz", 8)))
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), props.get("color", "0E7490"))
        tcBorders.append(el)
    tcPr.append(tcBorders)


def borda_paragrafo_inferior(paragrafo, cor="0E7490", sz=10):
    pPr = paragrafo._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(sz))
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), cor)
    pBdr.append(bottom)
    pPr.append(pBdr)


def adicionar_campo(paragrafo, instrucao: str):
    run = paragrafo.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = instrucao
    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    texto = OxmlElement("w:t")
    texto.text = "1"
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_sep)
    run._r.append(texto)
    run._r.append(fld_end)


def configurar_pagina(section, paisagem=False):
    section.orientation = WD_ORIENT.LANDSCAPE if paisagem else WD_ORIENT.PORTRAIT
    if paisagem:
        section.page_width = Cm(29.7)
        section.page_height = Cm(21.0)
        section.left_margin = Cm(1.8)
        section.right_margin = Cm(1.8)
        section.top_margin = Cm(1.4)
        section.bottom_margin = Cm(1.2)
    else:
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
        section.left_margin = Cm(2.2)
        section.right_margin = Cm(2.2)
        section.top_margin = Cm(2.0)
        section.bottom_margin = Cm(1.8)


def configurar_cabecalho_rodape(section):
    section.different_first_page_header_footer = True
    header = section.header
    p = header.paragraphs[0]
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run("3E OPERAÇÕES · DOCUMENTO DO BANCO DE DADOS")
    definir_fonte(run, "Calibri", 7.5, CINZA)
    borda_paragrafo_inferior(p, "D7E0E7", 4)

    footer = section.footer
    p = footer.paragraphs[0]
    p.text = ""
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("Página ")
    definir_fonte(run, "Calibri", 8, CINZA)
    adicionar_campo(p, "PAGE")
    run = p.add_run(" de ")
    definir_fonte(run, "Calibri", 8, CINZA)
    adicionar_campo(p, "NUMPAGES")


def h1(doc, texto, quebra=True):
    if quebra:
        doc.add_page_break()
    p = doc.add_heading(texto, level=1)
    borda_paragrafo_inferior(p)
    return p


def h2(doc, texto):
    return doc.add_heading(texto, level=2)


def h3(doc, texto):
    return doc.add_heading(texto, level=3)


def _adicionar_inline(paragrafo, texto: str, tamanho: float, cor: RGBColor | None, negrito: bool):
    tokens = re.split(r"(\*\*.+?\*\*|`[^`]+`)", texto)
    for token in tokens:
        if not token:
            continue
        if token.startswith("**") and token.endswith("**"):
            _adicionar_inline(paragrafo, token[2:-2], tamanho, cor, True)
        elif token.startswith("`") and token.endswith("`"):
            run = paragrafo.add_run(token[1:-1])
            definir_fonte(
                run,
                "Consolas",
                max(7.5, tamanho - 1.2),
                RGBColor(0x33, 0x41, 0x55),
                negrito=negrito,
            )
        else:
            run = paragrafo.add_run(token)
            definir_fonte(run, "Calibri", tamanho, cor, negrito=negrito)


def add_runs(paragrafo, texto: str, tamanho: float = 10.5, cor: RGBColor | None = PRETO):
    """Suporta **negrito**, `código` e [texto](url), inclusive aninhados."""
    texto = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", texto)
    _adicionar_inline(paragrafo, texto, tamanho, cor, False)


def add_paragrafo(doc, texto: str, tamanho: float = 10.5, espaco_depois: float = 5, italico=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(espaco_depois)
    p.paragraph_format.line_spacing = 1.12
    add_runs(p, texto, tamanho)
    if italico:
        for run in p.runs:
            run.italic = True
    return p


def add_bullet(doc, texto: str, nivel: int = 0):
    estilo = "List Bullet" if nivel == 0 else "List Bullet 2"
    p = doc.add_paragraph(style=estilo)
    p.paragraph_format.space_after = Pt(2)
    add_runs(p, texto, 10.2)
    return p


def add_tabela(doc, cabecalhos, linhas, tamanho=8.5, larguras=None):
    tabela = doc.add_table(rows=1, cols=len(cabecalhos))
    tabela.style = "Table Grid"
    tabela.alignment = WD_TABLE_ALIGNMENT.CENTER
    tabela.autofit = True

    for i, cabecalho in enumerate(cabecalhos):
        celula = tabela.rows[0].cells[i]
        celula.text = ""
        p = celula.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(cabecalho.replace("`", "").replace("**", ""))
        definir_fonte(run, "Calibri", tamanho, BRANCO, negrito=True)
        sombrear(celula, "1F3864")

    for r_idx, linha in enumerate(linhas):
        celulas = tabela.add_row().cells
        for i, valor in enumerate(linha):
            celula = celulas[i]
            celula.text = ""
            p = celula.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            add_runs(p, str(valor), tamanho)
            if r_idx % 2 == 1:
                sombrear(celula, "F2F6FA")

    if larguras:
        for linha in tabela.rows:
            for i, largura in enumerate(larguras):
                linha.cells[i].width = Cm(largura)

    tr = tabela.rows[0]._tr
    trPr = tr.get_or_add_trPr()
    repetir = OxmlElement("w:tblHeader")
    repetir.set(qn("w:val"), "true")
    trPr.append(repetir)
    for linha in tabela.rows:
        trPr = linha._tr.get_or_add_trPr()
        nao_quebrar = OxmlElement("w:cantSplit")
        trPr.append(nao_quebrar)
    return tabela


def add_caixa(doc, texto, fundo="E8F1F8", borda="0E7490", tamanho=10.5):
    tabela = doc.add_table(rows=1, cols=1)
    tabela.alignment = WD_TABLE_ALIGNMENT.CENTER
    tabela.autofit = True
    celula = tabela.cell(0, 0)
    sombrear(celula, fundo)
    borda_celula(celula, {"left": {"sz": 24, "color": borda}})
    p = celula.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    add_runs(p, texto, tamanho)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def add_codigo(doc, texto: str, tamanho=7.3):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(7)
    p.paragraph_format.line_spacing = 1.0
    p.paragraph_format.left_indent = Cm(0.15)
    pPr = p._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), "F4F6F8")
    pPr.append(shd)
    linhas = texto.split("\n")
    for idx, linha in enumerate(linhas):
        run = p.add_run(linha)
        cor = VERDE if linha.strip().startswith("--") else RGBColor(0x1E, 0x29, 0x3B)
        definir_fonte(run, "Consolas", tamanho, cor)
        if idx < len(linhas) - 1:
            run.add_break()


# --------------------------------------------------------------------------- #
# Conteúdo programático
# --------------------------------------------------------------------------- #
def capa(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(40)
    run = p.add_run("3E FERRO E AÇO  ·  PROJETO 3E OPERAÇÕES")
    definir_fonte(run, "Calibri", 10, TEAL, negrito=True)

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    run = p.add_run("Banco de Dados do\n3E Operações")
    definir_fonte(run, "Calibri", 32, AZUL, negrito=True)

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(18)
    run = p.add_run(
        "Modelo atual, relações, decisões de projeto e justificativa do número de tabelas"
    )
    definir_fonte(run, "Calibri", 14, CINZA)

    p = doc.add_paragraph()
    borda_paragrafo_inferior(p, "0E7490", 14)
    doc.add_paragraph()

    metadados = [
        ("Versão", "1.0"),
        ("Data", "04/11/2026"),
        ("Banco", "3e_operacoes_v2"),
        ("SGBD", "MySQL 8.4 (InnoDB / utf8mb4)"),
        ("Estrutura", "14 tabelas + 5 views"),
        ("Público-alvo", "Avaliação acadêmica do projeto"),
    ]
    tabela = doc.add_table(rows=0, cols=2)
    tabela.autofit = False
    for chave, valor in metadados:
        celulas = tabela.add_row().cells
        celulas[0].width = Cm(4.2)
        celulas[1].width = Cm(11.8)
        p = celulas[0].paragraphs[0]
        run = p.add_run(chave)
        definir_fonte(run, "Calibri", 9, CINZA, negrito=True)
        p = celulas[1].paragraphs[0]
        run = p.add_run(valor)
        definir_fonte(run, "Calibri", 9, PRETO)

    doc.add_paragraph()
    add_caixa(
        doc,
        "**14 tabelas** — o mínimo necessário para preservar a operação, o histórico, "
        "a integridade e a rastreabilidade do sistema.",
        fundo="E8F1F8",
        borda="0E7490",
        tamanho=11,
    )

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(26)
    run = p.add_run(
        "Documento técnico gerado a partir do banco em produção, com diagramas, "
        "dicionário de dados, relações, DDL de criação e evidências de validação."
    )
    definir_fonte(run, "Calibri", 9, CINZA, italico=True)


def sumario(doc):
    h1(doc, "Sumário", quebra=True)
    add_tabela(
        doc,
        ["Seção", "Conteúdo"],
        [
            ("1", "Justificativa em uma página"),
            ("2", "Contexto: o que o professor apontou e o que foi feito"),
            ("3", "Visão geral do banco atual"),
            ("4", "Por que 14 tabelas? (e por que não 17 ou 19)"),
            ("5", "Diagramas: MER, DER e classes"),
            ("6", "Dicionário de tabelas, relações e propósito"),
            ("7", "Validação e evidências"),
            ("8", "Como o banco garante as regras de negócio"),
            ("9", "Conclusão e checklist para a avaliação"),
            ("A", "SQL completo de criação (DDL)"),
            ("B", "Referências e arquivos do projeto"),
        ],
        tamanho=9.5,
        larguras=[1.6, 14.9],
    )
    add_paragrafo(
        doc,
        "Os diagramas estão na seção 5. O dicionário detalhado (seção 6) foi escrito para ser lido "
        "em conjunto com o DER: cada tabela traz o motivo, as colunas, as relações e o uso real na aplicação.",
        tamanho=9.5,
    )


def justificativa(doc):
    h1(doc, "1. Justificativa em uma página")
    add_paragrafo(
        doc,
        "O banco atual tem **14 tabelas**. Esse número não foi escolhido como meta: ele é a consequência "
        "de três consolidações e de uma decisão de não criar catálogos que o sistema ainda não precisa. "
        "O critério foi **preservar todas as funcionalidades e o histórico**, reduzindo duplicidade e "
        "deixando cada tabela com uma responsabilidade clara.",
    )

    add_tabela(
        doc,
        ["Consolidação", "Antes", "Depois", "Ganho"],
        [
            (
                "Atividade 1:1 com o item",
                "`pedidos_itens` + `atividades`",
                "`pedidos_itens` (setor, situação, prioridade, prazos)",
                "−1 tabela; elimina o JOIN obrigatório e a duplicidade de status",
            ),
            (
                "Regras de classificação",
                "`mapeamentos_categoria_setor` + `regras_produto_setor`",
                "`regras_classificacao`",
                "−1 tabela; um único conceito de regra",
            ),
            (
                "Eventos de job",
                "`eventos_job_integracao`",
                "`logs_auditoria` + `vw_eventos_job_integracao`",
                "−1 tabela; evento de job é auditoria",
            ),
        ],
        tamanho=8.5,
        larguras=[3.6, 4.2, 4.2, 4.5],
    )

    add_paragrafo(
        doc,
        "**Resultado**: 17 tabelas → **14 tabelas** (−3), **0 tabelas novas**, **5 views** de leitura. "
        "Todos os nomes físicos (tabelas, colunas, índices, constraints e views) estão em português.",
    )

    h2(doc, "Por que não 19?")
    add_paragrafo(
        doc,
        "O modelo proposto em `banco_novo_marcelo` tem 19 tabelas. A diferença de 5 tabelas está em "
        "catálogos e fluxos que não são necessários para preservar o comportamento atual. Eles podem "
        "entrar depois, um a um, sem retrabalho:",
    )
    add_tabela(
        doc,
        ["Tabela do modelo de 19", "No banco atual", "Justificativa"],
        [
            ("`perfil`", "Não existe", "O catálogo é o enum `RoleCode`; `usuarios_perfis` já normaliza o N:N. Uma tabela `perfis` é opcional (+1)."),
            ("`unidade_medida`", "Não existe", "A unidade é texto validado pela aplicação; um catálogo é opcional (+1)."),
            ("`produto`", "Não existe", "O item guarda o snapshot do ERP (código/descrição); um cadastro local é opcional (+1)."),
            ("`divergencia`", "Não existe", "As divergências atuais são registradas em `logs_auditoria`; uma tabela dedicada é opcional (+1)."),
            ("`evento_job_integracao`", "Absorvida", "Evento de job é auditoria; `logs_auditoria` + view evita uma tabela extra."),
        ],
        tamanho=8.3,
        larguras=[4.0, 2.8, 9.7],
    )
    add_paragrafo(
        doc,
        "**19 − 5 = 14.** O banco atual é a versão enxuta: mantém as 14 entidades que participam do fluxo "
        "real e deixa os catálogos opcionais para quando o negócio decidir. Isso justifica o número sem "
        "esconder que o modelo pode crescer.",
    )

    h2(doc, "O que se preserva")
    for item in [
        "Login, perfis e permissões; escopo por setor do Operador.",
        "Importação e reimportação idempotente do Top Gerente.",
        "Classificação, correção de setor e sugestão por categoria/código/descrição.",
        "Fila, execução parcial, ocorrências, entregas, remessas e prazos.",
        "Histórico de prazos, correção de setor, exceção de entrega e auditoria.",
        "Painel, indicadores, impressão da ordem, administração e tela do Técnico.",
    ]:
        add_bullet(doc, item)

    h2(doc, "O que muda para o usuário")
    add_bullet(doc, "**Remessa**: “Excluir” virou “Anular”, com motivo opcional e preservação do registro.")
    add_bullet(doc, "**ID da atividade**: agora é o ID do item; links antigos salvos no navegador podem não abrir.")
    add_paragrafo(doc, "Fora isso, a interface e os fluxos permanecem os mesmos.")


def contexto(doc):
    h1(doc, "2. Contexto: o que o professor apontou e o que foi feito")
    add_paragrafo(
        doc,
        "A avaliação apontou mistura de nomes, IDs CUID, `usuarios_perfis` sem tabela `perfis`, "
        "`remessas_programadas` desnecessária, `execucoes` sem início/fim e regras de classificação "
        "pouco claras. A tabela abaixo liga cada apontamento à decisão tomada.",
    )
    add_tabela(
        doc,
        ["Apontamento", "Decisão", "Evidência no banco atual"],
        [
            ("Nomes misturados (PT/EN)", "Nomes físicos em português", "Colunas como `quantidade_solicitada`, `prazo_entrega`, `situacao`, `excecao_autorizada`"),
            ("IDs CUID", "Mantidos nesta etapa, com justificativa", "CUID é opaco e seguro em URL; BIGINT fica como fase futura"),
            ("`usuarios_perfis` sem `perfis`", "N:N mantido; catálogo no enum", "`usuarios_perfis(usuario_id, perfil)`; tabela `perfis` é opcional (+1)"),
            ("`remessas_programadas`", "Renomeada e enriquecida", "`entregas_previstas` com quantidade, autores e anulação"),
            ("`execucoes` sem início/fim", "Evoluída para apontamentos", "`apontamentos` com `iniciado_em`, `finalizado_em`, `observacao`, `situacao`"),
            ("`managerOverride` confuso", "Renomeado", "`excecao_autorizada`, `motivo_excecao`, `autorizado_por`, `disponivel_antes`"),
            ("Regras de classificação", "Unificadas", "`regras_classificacao` com tipo, operador, prioridade e vigência"),
            ("Relações pouco claras", "Item é a unidade operacional", "`atividades` absorvida; `pedidos_itens` tem setor, situação e prazos"),
        ],
        tamanho=8.2,
        larguras=[3.6, 4.2, 8.7],
    )

    h2(doc, "Decisões e trade-offs")
    add_tabela(
        doc,
        ["Decisão", "Escolha", "Por quê", "Custo de mudar"],
        [
            ("ID", "CUID", "Não quebra URLs, 269 respostas JSON, logs e testes; é opaco e seguro.", "Alto: ETL, contratos e testes"),
            ("Perfil", "Enum `RoleCode` + N:N", "Menos uma tabela; a matriz de permissões já é a fonte única.", "Baixo/médio: +1 tabela `perfis`"),
            ("Unidade", "Texto validado", "A regra atual (metro com 2 casas; demais inteiras) já funciona.", "Baixo: +1 tabela `unidades_medida`"),
            ("Produto", "Snapshot no item", "O ERP é a fonte; o app não gerencia catálogo local.", "Baixo: +1 tabela `produto`"),
            ("Divergência", "Auditoria", "As divergências atuais já viram `logs_auditoria`.", "Baixo: +1 tabela `divergencia`"),
        ],
        tamanho=8.2,
        larguras=[2.4, 3.8, 6.4, 3.9],
    )
    add_paragrafo(
        doc,
        "A justificativa para manter CUID é de engenharia: a troca para BIGINT é possível, mas mexe em "
        "identificadores de URL, respostas JSON, logs históricos, testes e ETL. Como o foco desta etapa "
        "foi **organizar o modelo sem perder funcionalidades**, a troca ficou como fase separada. Se a "
        "avaliação exigir BIGINT, o caminho está documentado e os adaptadores isolam a mudança.",
        tamanho=9.5,
    )


def visao_geral(doc):
    h1(doc, "3. Visão geral do banco atual")
    add_paragrafo(
        doc,
        "O banco `3e_operacoes_v2` tem **14 tabelas de aplicação** e **5 views**. As contagens abaixo "
        "são do ambiente de produção em 31/10/2026.",
    )
    add_tabela(
        doc,
        ["#", "Tabela", "Categoria", "Registros", "Responsabilidade"],
        [
            ("1", "`usuarios`", "Identidade", "8", "Quem é a pessoa, credencial e situação"),
            ("2", "`usuarios_perfis`", "Identidade", "8", "O que a pessoa pode fazer (N:N)"),
            ("3", "`usuarios_setores`", "Identidade", "9", "Onde a pessoa atua (N:N)"),
            ("4", "`setores`", "Cadastro", "3", "Corte e Dobra, Telhas, Revenda"),
            ("5", "`regras_classificacao`", "Cadastro", "29", "Categoria/código/descrição → setor"),
            ("6", "`pedidos`", "Comercial", "10", "Cabeçalho do pedido importado"),
            ("7", "`pedidos_itens`", "Comercial + operação", "63", "Item, setor, situação, prioridade, prazos"),
            ("8", "`apontamentos`", "Operação", "16", "Execução/separação parcial"),
            ("9", "`ocorrencias`", "Operação", "14", "Perda, refugo, indisponibilidade, pausa, parada"),
            ("10", "`motivos_ocorrencia`", "Cadastro", "9", "Catálogo de motivos"),
            ("11", "`entregas`", "Operação", "9", "Entrega realizada"),
            ("12", "`entregas_previstas`", "Operação", "3", "Previsão/remessa"),
            ("13", "`jobs_integracao`", "Integração", "15", "Importação do Top Gerente"),
            ("14", "`logs_auditoria`", "Auditoria", "120", "Quem alterou o quê, quando e por quê"),
        ],
        tamanho=8.2,
        larguras=[0.8, 3.6, 3.2, 1.6, 7.3],
    )

    h2(doc, "Views")
    add_tabela(
        doc,
        ["View", "Tabelas de origem", "Para que serve"],
        [
            ("`vw_atividades`", "`pedidos_itens`", "Compatibilidade: expõe a “atividade” com id = item"),
            ("`vw_item_saldos`", "`pedidos_itens`, `apontamentos`, `entregas`, `setores`", "Solicitado, executado, entregue, disponível e pendente"),
            ("`vw_fila_setor`", "`pedidos_itens`, `pedidos`, `setores`", "Fila por setor, sem itens concluídos"),
            ("`vw_pedido_resumo`", "`pedidos`, `pedidos_itens`", "Contagens por pedido, sem somar unidades diferentes"),
            ("`vw_eventos_job_integracao`", "`logs_auditoria`", "Linha do tempo do job a partir da auditoria"),
        ],
        tamanho=8.2,
        larguras=[4.4, 5.4, 6.7],
    )

    h2(doc, "Como ler as relações")
    add_tabela(
        doc,
        ["Conceito", "Significado no 3E"],
        [
            ("1:1", "Um item tem uma única operação; ela foi absorvida em `pedidos_itens`."),
            ("1:N", "Um pedido tem vários itens; um item tem vários apontamentos/ocorrências/entregas."),
            ("N:N", "Usuário × perfil e usuário × setor, via tabelas de associação."),
            ("PK / FK / UK", "Chave primária / estrangeira / única."),
            ("NULL", "Relação opcional; ex.: item ainda sem setor."),
            ("RESTRICT", "Impede excluir o pai com filhos; protege histórico."),
            ("CASCADE", "Exclui os filhos junto com o pai; usado em vínculos dependentes."),
            ("SET NULL", "Mantém o filho e apaga a referência; usado em autoria opcional."),
        ],
        tamanho=8.5,
        larguras=[3.2, 13.3],
    )


def por_que_14(doc):
    h1(doc, "4. Por que 14 tabelas? (e por que não 17 ou 19)")
    add_paragrafo(
        doc,
        "O número 14 vem de duas contas simples e de uma decisão de escopo. A primeira conta mostra a "
        "redução em relação ao banco anterior; a segunda mostra a diferença em relação ao modelo de 19.",
    )
    add_caixa(
        doc,
        "**17 − 3 = 14**  ·  **19 − 5 = 14**\n"
        "Três consolidações no banco atual; cinco tabelas do modelo de 19 que não são necessárias para "
        "preservar o comportamento (uma delas foi absorvida).",
        fundo="F0F9FF",
        borda="0E7490",
        tamanho=10,
    )

    h2(doc, "O que foi consolidado")
    add_tabela(
        doc,
        ["Tabela antiga", "Destino", "Por que"],
        [
            ("`atividades`", "`pedidos_itens`", "Relação 1:1; o item é a unidade da fila. Evita JOIN e duplicidade de status."),
            ("`mapeamentos_categoria_setor`", "`regras_classificacao`", "Categoria é um tipo de regra; unificar reduz conceitos."),
            ("`regras_produto_setor`", "`regras_classificacao`", "Código/descrição são outros tipos de regra."),
            ("`eventos_job_integracao`", "`logs_auditoria`", "Evento de job é evento de auditoria; a view preserva a leitura."),
        ],
        tamanho=8.3,
        larguras=[4.3, 4.0, 8.2],
    )

    h2(doc, "O que não foi fundido (e por quê)")
    add_tabela(
        doc,
        ["Não fundir", "Motivo"],
        [
            ("`entregas` + `entregas_previstas`", "Previsto × realizado; juntar criaria uma tabela com muitos campos nulos e perderia clareza."),
            ("`usuarios_perfis` + `usuarios_setores`", "Viraria tabela polimórfica sem FK real; perfil e setor são dimensões diferentes."),
            ("`motivos_ocorrencia` + outros cadastros", "Catálogo genérico piora a clareza e enfraquece as FKs."),
            ("`apontamentos` + `ocorrencias`", "Fatos distintos: produção × evento; juntar prejudica regras e relatórios."),
            ("`pedidos` + `pedidos_itens`", "Relação 1:N; o cabeçalho e o item têm ciclos de vida diferentes."),
        ],
        tamanho=8.3,
        larguras=[5.2, 11.3],
    )

    h2(doc, "O que cada tabela resolve em uma frase")
    add_tabela(
        doc,
        ["Tabela", "Resolve"],
        [
            ("`usuarios`", "Identidade, credencial e situação; autoria de tudo."),
            ("`usuarios_perfis`", "O que a pessoa pode fazer (autorização N:N)."),
            ("`usuarios_setores`", "Onde a pessoa atua (escopo N:N)."),
            ("`setores`", "Destino operacional do item e eixo da fila."),
            ("`regras_classificacao`", "Classificação automática e sugestão por categoria/código/descrição."),
            ("`pedidos`", "Cabeçalho comercial importado do ERP."),
            ("`pedidos_itens`", "Item + operação (setor, situação, prioridade, prazos)."),
            ("`apontamentos`", "Execução/separação parcial com autoria e histórico."),
            ("`ocorrencias`", "Perda, refugo, indisponibilidade, pausa, parada e defeito."),
            ("`motivos_ocorrencia`", "Catálogo de motivos por tipo."),
            ("`entregas`", "Entrega realizada, exceção e anulação."),
            ("`entregas_previstas`", "Previsão/remessa, confirmação e anulação."),
            ("`jobs_integracao`", "Importação assíncrona, retry e diagnóstico."),
            ("`logs_auditoria`", "Histórico de alterações e eventos de job."),
        ],
        tamanho=8.3,
        larguras=[4.6, 11.9],
    )


def diagramas(doc):
    h1(doc, "5. Diagramas: MER, DER e classes")
    add_paragrafo(
        doc,
        "As três visões a seguir foram geradas a partir do banco real. O MER mostra o conceito; o DER "
        "mostra a implementação física; o diagrama de classes mostra a visão de persistência com "
        "atributos e multiplicidades.",
    )
    add_bullet(doc, "**MER**: entidades e cardinalidades. Comece por `USUARIO`, `PEDIDO` e `PEDIDO_ITEM`.")
    add_bullet(doc, "**DER**: tabelas, colunas, PK, FK e UK. É o mapa para implementação e manutenção.")
    add_bullet(doc, "**Classes**: classes `<<tabela>>`, atributos = colunas, relações com multiplicidade.")
    add_paragrafo(
        doc,
        "Legenda: PK = chave primária; FK = chave estrangeira; UK = chave única; 1:N = um para muitos; "
        "N:N = muitos para muitos.",
        tamanho=9,
    )

    # Seção paisagem para os diagramas
    section = doc.add_section(WD_SECTION.NEW_PAGE)
    configurar_pagina(section, paisagem=True)

    # MER
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("Figura 1 — MER: modelo entidade-relacionamento")
    definir_fonte(run, "Calibri", 9, CINZA, negrito=True)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(DOCS / "diagramas" / "mer-banco-pt-v2.png"), width=Cm(25.0))
    add_paragrafo(
        doc,
        "**Como ler**: cada caixa é uma entidade; as linhas mostram as cardinalidades. "
        "O item (`PEDIDO_ITEM`) é o centro da operação: recebe apontamentos, ocorrências, entregas e previsões.",
        tamanho=9,
    )

    doc.add_page_break()
    # DER
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("Figura 2 — DER: diagrama entidade-relacionamento físico")
    definir_fonte(run, "Calibri", 9, CINZA, negrito=True)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(DOCS / "diagramas" / "der-banco-pt-v2.png"), width=Cm(25.0))
    add_paragrafo(
        doc,
        "**Como ler**: as colunas marcadas com PK/FK/UK são as chaves; as linhas ligam as FKs. "
        "As tabelas de associação (`usuarios_perfis`, `usuarios_setores`) implementam os N:N.",
        tamanho=9,
    )

    doc.add_page_break()
    # Classes
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("Figura 3 — Diagrama de classes de persistência")
    definir_fonte(run, "Calibri", 9, CINZA, negrito=True)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(
        str(DOCS / "diagramas" / "classes-banco-pt-v2.png"), width=Cm(19.0)
    )
    add_paragrafo(
        doc,
        "**Como ler**: cada classe representa uma tabela; os atributos são as colunas; as multiplicidades "
        "mostram as relações. O diagrama é a ponte entre o modelo físico e o código (Prisma/TypeScript).",
        tamanho=9,
    )

    # Volta para retrato
    section = doc.add_section(WD_SECTION.NEW_PAGE)
    configurar_pagina(section, paisagem=False)


# --------------------------------------------------------------------------- #
# Parser do Markdown detalhado
# --------------------------------------------------------------------------- #
def limpar_titulo(texto: str) -> str:
    texto = texto.replace("`", "").strip()
    texto = re.sub(r"^\d+(?:\.\d+)*\.?\s+", "", texto)
    return texto.strip()


def adicionar_markdown(doc, caminho: Path):
    linhas = caminho.read_text(encoding="utf-8").splitlines()
    # Começa no primeiro H2 (a partir de "Como ler as relações")
    inicio = next(
        (i for i, linha in enumerate(linhas) if linha.startswith("## 1. Como ler")),
        0,
    )
    linhas = linhas[inicio:]

    i = 0
    pular_secao = False
    while i < len(linhas):
        linha = linhas[i].rstrip()

        if linha.startswith("## "):
            titulo = limpar_titulo(linha[3:])
            # A visão geral, o “como ler” e as views já estão na seção 3.
            if (
                titulo.lower().startswith("visão geral")
                or titulo.lower().startswith("como ler")
                or titulo.lower().startswith("views")
            ):
                pular_secao = True
                i += 1
                continue
            pular_secao = False
            h2(doc, titulo)
            i += 1
            continue

        if pular_secao:
            i += 1
            continue

        if linha.startswith("### "):
            h3(doc, limpar_titulo(linha[4:]))
            i += 1
            continue

        if linha.startswith("```"):
            i += 1
            bloco = []
            while i < len(linhas) and not linhas[i].startswith("```"):
                bloco.append(linhas[i])
                i += 1
            i += 1
            if bloco:
                add_codigo(doc, "\n".join(bloco))
            continue

        if linha.startswith("|"):
            bloco = []
            while i < len(linhas) and linhas[i].lstrip().startswith("|"):
                bloco.append(linhas[i].strip())
                i += 1
            if len(bloco) >= 2:
                cabecalho = [c.strip() for c in bloco[0].strip("|").split("|")]
                corpo = []
                for bruta in bloco[1:]:
                    celulas = [c.strip() for c in bruta.strip("|").split("|")]
                    if all(re.fullmatch(r":?-{3,}:?", c) for c in celulas):
                        continue
                    corpo.append(celulas)
                cabecalho_limpo = [c.replace("`", "").replace("**", "").strip() for c in cabecalho]
                if (
                    len(cabecalho_limpo) >= 8
                    and cabecalho_limpo[0] == "#"
                    and "Origem" in cabecalho_limpo
                    and "Coluna" in cabecalho_limpo
                    and "ON DELETE" in cabecalho_limpo
                ):
                    novos_cabecalhos = [
                        "Origem (coluna)",
                        "Destino",
                        "Cardinalidade",
                        "Obrigatória?",
                        "ON DELETE",
                        "Por quê",
                    ]
                    novas_linhas = [
                        [f"{r[1]}.{r[2]}", r[3], r[4], r[5], r[6], r[7]]
                        for r in corpo
                        if len(r) >= 8
                    ]
                    add_tabela(
                        doc,
                        novos_cabecalhos,
                        novas_linhas,
                        tamanho=7.4,
                        larguras=[4.2, 3.2, 1.8, 1.4, 2.2, 3.7],
                    )
                else:
                    add_tabela(doc, cabecalho, corpo, tamanho=7.8)
            continue

        if linha.startswith("- ") or linha.startswith("* "):
            add_bullet(doc, linha[2:].strip())
            i += 1
            continue

        if re.match(r"^\d+\.\s+", linha):
            p = doc.add_paragraph(style="List Number")
            p.paragraph_format.space_after = Pt(2)
            add_runs(p, re.sub(r"^\d+\.\s+", "", linha), 10.2)
            i += 1
            continue

        if linha.startswith(">"):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.6)
            p.paragraph_format.space_after = Pt(4)
            run = p.add_run(linha.lstrip("> ").strip())
            definir_fonte(run, "Calibri", 9.5, CINZA, italico=True)
            i += 1
            continue

        if linha.strip() in ("", "---"):
            i += 1
            continue

        # Remove escapes de markdown
        texto = linha.replace("\\*", "*")
        add_paragrafo(doc, texto, tamanho=10.2)
        i += 1


def validacao(doc):
    h1(doc, "7. Validação e evidências")
    add_paragrafo(
        doc,
        "A evolução foi aplicada em um banco novo e validada contra o banco antigo. O sistema continuou "
        "funcionando; os números abaixo são a evidência objetiva.",
    )
    add_tabela(
        doc,
        ["Gate", "Resultado"],
        [
            ("Testes automatizados", "1.182 verdes + 40 ignorados"),
            ("Typecheck", "OK"),
            ("Lint", "0 erros (10 avisos)"),
            ("Build", "OK"),
            ("UI em produção", "15/15 e 16/16"),
            ("ETL", "Contagens e somas conferidas; 0 órfãos"),
            ("Smoke de API", "Login, lista, detalhe, classificação, execução, ocorrência, entrega e remessa"),
            ("Healthcheck", "200 em produção"),
        ],
        tamanho=9,
        larguras=[5.0, 11.5],
    )

    h2(doc, "Conferência do ETL")
    add_tabela(
        doc,
        ["Item", "Antes", "Depois"],
        [
            ("Pedidos", "10", "10"),
            ("Itens", "63", "63"),
            ("Itens com setor", "14 atividades", "14 itens"),
            ("Apontamentos", "16 execuções", "16"),
            ("Soma executada", "206", "206"),
            ("Ocorrências", "14", "14"),
            ("Entregas", "9", "9"),
            ("Soma entregue", "145", "145"),
            ("Remessas", "3", "3"),
            ("Jobs", "15", "15"),
            ("Eventos + logs", "120", "120"),
            ("Usuários", "8", "8"),
            ("Motivos", "9", "9"),
            ("Perfis", "8", "8"),
            ("Vínculos usuário-setor", "9", "9"),
            ("Órfãos de FK", "—", "0"),
        ],
        tamanho=8.5,
        larguras=[6.0, 4.8, 4.8],
    )

    h2(doc, "Limitações registradas")
    add_bullet(doc, "A suíte completa de integração de paginação (25 pedidos por teste) não foi executada em sua totalidade no RDS por latência; os testes unitários e o smoke de API cobrem o comportamento.")
    add_bullet(doc, "A importação em produção depende do conector local + Cloudflare Tunnel; o fluxo foi testado ponta a ponta contra o banco novo.")
    add_bullet(doc, "Links antigos de atividade salvos no navegador podem retornar 404; os links gerados pela aplicação funcionam.")


def regras(doc):
    h1(doc, "8. Como o banco garante as regras de negócio")
    add_paragrafo(
        doc,
        "O banco não tenta substituir o domínio: ele garante integridade, unicidade, histórico e "
        "idempotência. As regras de decisão ficam nos casos de uso. A tabela abaixo mostra onde cada "
        "regra é sustentada.",
    )
    add_tabela(
        doc,
        ["Regra", "Como o banco sustenta", "Onde no código"],
        [
            ("Pendente = solicitado − executado", "`vw_item_saldos.saldo_executar`; somas separadas por fato", "`producao/saldo.ts`"),
            ("Disponível = executado − entregue", "`vw_item_saldos.disponivel_entrega`; entregas anuladas não somam", "`expedicao/disponibilidade.ts`"),
            ("Status da atividade", "`pedidos_itens.situacao`; atualizado na transação da execução", "`producao/registrar-execucao.ts`"),
            ("Entrega acima do disponível", "`excecao_autorizada`, `motivo_excecao`, `autorizado_por`, `disponivel_antes`", "`expedicao/registrar-entrega.ts`"),
            ("Remessa não baixa saldo", "`entregas_previstas` é separada de `entregas`", "`expedicao/remessas.ts`"),
            ("Histórico de prazos", "`logs_auditoria` com `antes_json`/`depois_json`", "`prazos/adapters/prisma-prazos-repository.ts`"),
            ("Correção de setor", "`logs_auditoria` `SECTOR_CORRECTION`; regra de “sem registro operacional”", "`setores/corrigir-setor.ts`"),
            ("Idempotência", "`chave_idempotencia` única em apontamentos, entregas, ocorrências e jobs", "adaptadores de produção/expedição/integração"),
            ("Permissões", "`usuarios_perfis` + matriz no servidor", "`usuarios/permissoes.ts`"),
            ("Escopo do Operador", "`usuarios_setores`", "`producao/adapters/prisma-producao-repository.ts`"),
        ],
        tamanho=7.9,
        larguras=[4.3, 7.2, 5.0],
    )


def conclusao(doc):
    h1(doc, "9. Conclusão e checklist para a avaliação")
    add_paragrafo(
        doc,
        "O banco tem **14 tabelas** porque cada uma tem uma responsabilidade distinta e porque três "
        "tabelas do modelo anterior eram duplicações ou projeções 1:1. O número não é uma simplificação "
        "cosmética: é o resultado de consolidar o que era redundante, preservar o que é histórico e "
        "deixar catálogos opcionais para depois.",
    )
    add_caixa(
        doc,
        "**Em uma frase**: 14 tabelas, 26 FKs, 5 views e 0 órfãos — o mínimo necessário para a operação, "
        "o histórico e a integridade do 3E Operações.",
        fundo="F0FDF4",
        borda="166534",
        tamanho=10.5,
    )

    add_tabela(
        doc,
        ["Pergunta do professor", "Resposta curta"],
        [
            ("Por que 14 e não 17?", "Três consolidações: atividade 1:1, regras de classificação e eventos de job."),
            ("Por que não 19?", "Cinco tabelas do modelo de 19 são catálogos/fluxos opcionais; uma foi absorvida."),
            ("Os nomes estão organizados?", "Sim: tabelas, colunas, índices, constraints e views em português."),
            ("As relações estão claras?", "Sim: 26 FKs documentadas, com cardinalidade e regra de exclusão."),
            ("O histórico é preservado?", "Sim: anulação lógica, `logs_auditoria` e ETL com contagens conferidas."),
            ("A aplicação continua funcionando?", "Sim: 1.182 testes, UI 15/15 e 16/16, smoke de API e importação."),
        ],
        tamanho=8.6,
        larguras=[5.2, 11.3],
    )

    add_paragrafo(
        doc,
        "Se a avaliação exigir a tabela `perfis`, `unidades_medida`, `produto` ou `divergencia`, o modelo "
        "suporta a inclusão de cada uma como **+1 tabela**, sem alterar as 14 atuais. O banco é enxuto, "
        "mas não é fechado: ele foi desenhado para crescer por adição, não por reescrita.",
    )


def anexo_sql(doc):
    h1(doc, "Anexo A — SQL completo de criação (DDL)")
    add_paragrafo(
        doc,
        "Script aplicado no banco `3e_operacoes_v2`. Ele cria as 14 tabelas, as chaves estrangeiras, "
        "as constraints de integridade e as 5 views. O arquivo original está em "
        "`prisma/migrations/20261031000000_banco_pt_v2/migration.sql`.",
        tamanho=9.5,
    )
    sql = SQL.read_text(encoding="utf-8")
    marcador_fk = "-- AddForeignKey"
    marcador_checks = "-- ============================================================================\n-- Regras de integridade"
    idx_fk = sql.find(marcador_fk)
    idx_checks = sql.find(marcador_checks)
    if idx_fk < 0 or idx_checks < 0:
        add_codigo(doc, sql)
        return
    parte_tabelas = sql[:idx_fk].strip()
    parte_fks = sql[idx_fk:idx_checks].strip()
    parte_checks = sql[idx_checks:].strip()

    h2(doc, "A.1 Tabelas")
    add_codigo(doc, parte_tabelas)

    h2(doc, "A.2 Chaves estrangeiras")
    add_codigo(doc, parte_fks)

    h2(doc, "A.3 Integridade e views")
    add_codigo(doc, parte_checks)


def referencias(doc):
    h1(doc, "Anexo B — Referências e arquivos do projeto")
    add_tabela(
        doc,
        ["Arquivo", "Conteúdo"],
        [
            ("`prisma/schema.prisma`", "Modelo Prisma mapeado para as tabelas/colunas em português"),
            ("`prisma/migrations/20261031000000_banco_pt_v2/migration.sql`", "DDL completo aplicado"),
            ("`scripts/etl-banco-pt.mjs`", "ETL do banco antigo para o novo"),
            ("`docs/banco-evolucao-2026-10-31.md`", "Relatório da evolução, ETL, validação e deploy"),
            ("`docs/banco-tabelas-relacionamentos.md`", "Dicionário detalhado de tabelas e relações"),
            ("`docs/diagramas/der-banco-pt-v2.png`", "DER físico"),
            ("`docs/diagramas/mer-banco-pt-v2.png`", "MER conceitual"),
            ("`docs/diagramas/classes-banco-pt-v2.png`", "Diagrama de classes"),
            ("`docs/revisao-banco-professor.md`", "Diagnóstico original e plano de migração"),
            ("`docs/decisoes.md`", "Decisões vigentes do projeto"),
        ],
        tamanho=8.5,
        larguras=[7.4, 9.1],
    )

    h2(doc, "Como reproduzir")
    add_codigo(
        doc,
        """# aplicar as migrations no banco novo
DATABASE_URL="mysql://.../3e_operacoes_v2" npx prisma migrate deploy

# ETL do banco antigo para o novo
ORIGEM_URL="mysql://.../3e_operacoes" \
DESTINO_URL="mysql://.../3e_operacoes_v2" \
node scripts/etl-banco-pt.mjs

# gates
npm run typecheck
npm run lint
npm run test
npm run build

# regerar os diagramas
node scripts/render-diagramas-banco.mjs""",
        tamanho=7.8,
    )


# --------------------------------------------------------------------------- #
# Montagem
# --------------------------------------------------------------------------- #
def principal():
    doc = Document()

    # Estilos
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = PRETO
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.12

    for nome, tamanho, cor, antes, depois in [
        ("Heading 1", 17, AZUL, 16, 8),
        ("Heading 2", 13, TEAL, 12, 5),
        ("Heading 3", 11, AZUL, 9, 3),
    ]:
        estilo = doc.styles[nome]
        estilo.font.name = "Calibri"
        estilo._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
        estilo.font.size = Pt(tamanho)
        estilo.font.bold = True
        estilo.font.color.rgb = cor
        estilo.paragraph_format.space_before = Pt(antes)
        estilo.paragraph_format.space_after = Pt(depois)
        estilo.paragraph_format.keep_with_next = True

    section = doc.sections[0]
    configurar_pagina(section)
    configurar_cabecalho_rodape(section)

    capa(doc)
    sumario(doc)
    justificativa(doc)
    contexto(doc)
    visao_geral(doc)
    por_que_14(doc)
    diagramas(doc)

    h1(doc, "6. Dicionário de tabelas, relações e propósito", quebra=False)
    add_paragrafo(
        doc,
        "Esta seção explica cada tabela e cada relação em detalhe. Ela foi escrita para ser lida em "
        "conjunto com o DER (Figura 2) e o MER (Figura 1).",
        tamanho=9.5,
    )
    adicionar_markdown(doc, MARKDOWN)

    validacao(doc)
    regras(doc)
    conclusao(doc)
    anexo_sql(doc)
    referencias(doc)

    doc.core_properties.title = "Banco de Dados do 3E Operações — Modelo, Relações e Justificativa"
    doc.core_properties.subject = "Documento técnico para avaliação acadêmica"
    doc.core_properties.author = "Equipe 3E Operações"
    doc.core_properties.keywords = "banco de dados, MySQL, DER, MER, UML, 3E Operações"
    doc.core_properties.comments = "Gerado em 04/11/2026 a partir do banco 3e_operacoes_v2."

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    doc.save(SAIDA)
    print("DOCX gerado:", SAIDA)
    print("Tabelas:", len(doc.tables), "| Parágrafos:", len(doc.paragraphs), "| Imagens:", len(doc.inline_shapes))


if __name__ == "__main__":
    principal()
