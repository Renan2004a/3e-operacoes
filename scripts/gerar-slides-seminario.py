#!/usr/bin/env python3
"""Gera o PowerPoint do seminário técnico do 3E Operações.

Uso: python scripts/gerar-slides-seminario.py
Saída: docs/seminario/seminario-3e-operacoes-2026-11-12.pptx
"""
from __future__ import annotations

import re
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt
from pptx.oxml.xmlchemy import OxmlElement

RAIZ = Path(__file__).resolve().parents[1]
SAIDA = RAIZ / "docs" / "seminario" / "seminario-3e-operacoes-2026-11-12.pptx"
MER = RAIZ / "docs" / "diagramas" / "mer-banco-pt-v2.png"
SHOT = RAIZ / "docs" / "seminario" / "frames" / "app-pedido.png"

# --------------------------------------------------------------------------- #
# Identidade visual
# --------------------------------------------------------------------------- #
NAVY = "0B1526"
NAVY2 = "142B4A"
NAVY3 = "1E3A5F"
INK = "101B2D"
TEAL = "0E7490"
TEAL2 = "0891B2"
CYAN = "22D3EE"
AMBER = "B45309"
GREEN = "15803D"
GRAY = "5B6B7A"
GRAY2 = "8A99A8"
LIGHT = "F4F7FA"
BORDER = "DCE5EC"
WHITE = "FFFFFF"

FONT = "Segoe UI"
MONO = "Consolas"

W = 13.333
H = 7.5
M = 0.72
CW = W - 2 * M

prs = Presentation()
prs.slide_width = Inches(W)
prs.slide_height = Inches(H)
BLANK = prs.slide_layouts[6]

PAGINA = {"n": 0}


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def rgb(hexcor: str) -> RGBColor:
    return RGBColor.from_string(hexcor)


def slide_novo(fundo: str = WHITE):
    s = prs.slides.add_slide(BLANK)
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = rgb(fundo)
    bg.line.fill.background()
    bg.shadow.inherit = False
    return s


def gradiente(s, cor1: str, cor2: str, angulo: int = 45):
    bg = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.line.fill.background()
    bg.shadow.inherit = False
    bg.fill.gradient()
    bg.fill.gradient_angle = angulo
    stops = bg.fill.gradient_stops
    stops[0].color.rgb = rgb(cor1)
    stops[0].position = 0.0
    stops[1].color.rgb = rgb(cor2)
    stops[1].position = 1.0
    return bg


def alfa(shape, valor: int):
    """Transparência de preenchimento: 0-100000."""
    try:
        solid = shape.fill._xPr.find(qn("a:solidFill"))
        if solid is None:
            return
        srgb = solid.find(qn("a:srgbClr"))
        if srgb is None:
            return
        a = OxmlElement("a:alpha")
        a.set("val", str(valor))
        srgb.append(a)
    except Exception:
        pass


def alfa_linha(shape, valor: int):
    try:
        ln = shape.line._get_or_add_ln()
        solid = ln.find(qn("a:solidFill"))
        if solid is None:
            return
        srgb = solid.find(qn("a:srgbClr"))
        if srgb is None:
            return
        a = OxmlElement("a:alpha")
        a.set("val", str(valor))
        srgb.append(a)
    except Exception:
        pass


def retangulo(s, x, y, w, h, fill=None, linha=None, largura=1.0, raio=0.0, forma=MSO_SHAPE.RECTANGLE):
    shp = s.shapes.add_shape(forma, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.shadow.inherit = False
    if raio and forma == MSO_SHAPE.ROUNDED_RECTANGLE:
        try:
            shp.adjustments[0] = raio
        except Exception:
            pass
    if fill:
        shp.fill.solid()
        shp.fill.fore_color.rgb = rgb(fill)
    else:
        shp.fill.background()
    if linha:
        shp.line.color.rgb = rgb(linha)
        shp.line.width = Pt(largura)
    else:
        shp.line.fill.background()
    return shp


def card(s, x, y, w, h, fill=LIGHT, linha=BORDER, raio=0.05, accent=None):
    shp = retangulo(s, x, y, w, h, fill, linha, 0.75, raio, MSO_SHAPE.ROUNDED_RECTANGLE)
    if accent:
        retangulo(s, x, y + 0.16, 0.045, h - 0.32, accent)
    return shp


def texto(s, x, y, w, h, conteudo, tamanho=12, cor=INK, negrito=False,
          fonte=FONT, alinhamento=PP_ALIGN.LEFT, ancora=MSO_ANCHOR.TOP,
          espaco=1.0, margem=0.0, espaco_depois=0):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.margin_left = Inches(margem)
    tf.margin_right = Inches(margem)
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = ancora
    linhas = conteudo.split("\n")
    for i, linha_txt in enumerate(linhas):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = alinhamento
        p.line_spacing = espaco
        p.space_after = Pt(espaco_depois)
        add_runs(p, linha_txt, tamanho, cor, negrito, fonte)
    return tb


def add_runs(p, conteudo, tamanho, cor, negrito=False, fonte=FONT):
    tokens = re.split(r"(\*\*.+?\*\*|`[^`]+`)", conteudo)
    for tok in tokens:
        if not tok:
            continue
        r = p.add_run()
        if tok.startswith("**") and tok.endswith("**"):
            r.text = tok[2:-2]
            r.font.bold = True
            r.font.name = fonte
            r.font.size = Pt(tamanho)
        elif tok.startswith("`") and tok.endswith("`"):
            r.text = tok[1:-1]
            r.font.bold = negrito
            r.font.name = MONO
            r.font.size = Pt(max(tamanho - 1.2, 7.5))
        else:
            r.text = tok
            r.font.bold = negrito
            r.font.name = fonte
            r.font.size = Pt(tamanho)
        r.font.color.rgb = rgb(cor)


def bullets(s, x, y, w, h, itens, tamanho=13, cor=INK, espaco_entre=7, marcador=TEAL, linha=1.12):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    for i, item in enumerate(itens):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.line_spacing = linha
        p.space_after = Pt(espaco_entre)
        pPr = p._p.get_or_add_pPr()
        pPr.set("marL", str(int(Inches(0.26))))
        pPr.set("indent", str(int(-Inches(0.26))))
        buFont = OxmlElement("a:buFont")
        buFont.set("typeface", "Arial")
        buChar = OxmlElement("a:buChar")
        buChar.set("char", "▪")
        pPr.append(buFont)
        pPr.append(buChar)
        add_runs(p, item, tamanho, cor)
    return tb


def kicker(s, txt, cor=TEAL, y=0.46):
    texto(s, M, y, CW, 0.26, txt.upper(), 9, cor, True)


def titulo(s, txt, tamanho=28, cor=INK, y=0.72, w=CW):
    texto(s, M, y, w, 0.8, txt, tamanho, cor, True, espaco=0.95)


def regra(s, y=1.52, largura=0.9, cor=TEAL):
    retangulo(s, M, y, largura, 0.05, cor)


def rodape(s, rotulo="3E Operações · Seminário técnico · 2026"):
    PAGINA["n"] += 1
    retangulo(s, M, 7.05, CW, 0.008, BORDER)
    texto(s, M, 7.12, 7.0, 0.22, rotulo, 7.5, GRAY2)
    texto(s, W - M - 0.8, 7.1, 0.8, 0.24, f"{PAGINA['n']:02d}", 8, GRAY2,
          alinhamento=PP_ALIGN.RIGHT)


def notas(s, txt):
    s.notes_slide.notes_text_frame.text = txt


def imagem_contain(s, caminho, x, y, w, h):
    from PIL import Image
    iw, ih = Image.open(caminho).size
    escala = min(w / iw, h / ih)
    nw, nh = iw * escala, ih * escala
    s.shapes.add_picture(str(caminho), Inches(x + (w - nw) / 2), Inches(y + (h - nh) / 2),
                         Inches(nw), Inches(nh))


def tabela(s, x, y, w, cols, cabecalhos, linhas, altura_cab=0.42, altura_linha=0.5,
           tamanho=10, tamanho_cab=8.5, alturas=None, zebra=True,
           col_negrito=(0,), alinhamentos=None):
    total = sum(cols)
    larguras = [w * c / total for c in cols]
    retangulo(s, x, y, w, altura_cab, NAVY2)
    cx = x
    for i, cab in enumerate(cabecalhos):
        texto(s, cx + 0.14, y, larguras[i] - 0.28, altura_cab, cab, tamanho_cab, WHITE,
              True, ancora=MSO_ANCHOR.MIDDLE)
        cx += larguras[i]
    cy = y + altura_cab
    for ri, linha in enumerate(linhas):
        h = alturas[ri] if alturas else altura_linha
        if zebra and ri % 2 == 1:
            retangulo(s, x, cy, w, h, LIGHT)
        retangulo(s, x, cy + h - 0.008, w, 0.008, BORDER)
        cx = x
        for ci, cel in enumerate(linha):
            alinhamento = alinhamentos[ci] if alinhamentos else PP_ALIGN.LEFT
            negrito = ci in col_negrito
            texto(s, cx + 0.14, cy, larguras[ci] - 0.28, h, cel, tamanho, INK,
                  negrito, ancora=MSO_ANCHOR.MIDDLE, alinhamento=alinhamento,
                  espaco=1.02)
            cx += larguras[ci]
        cy += h
    return cy


def numero_grande(s, x, y, txt, tamanho=54, cor=TEAL, w=1.6, h=0.9, fonte=FONT):
    texto(s, x, y, w, h, txt, tamanho, cor, True, fonte=fonte, espaco=0.9)


# --------------------------------------------------------------------------- #
# Slides
# --------------------------------------------------------------------------- #
def capa():
    s = prs.slides.add_slide(BLANK)
    gradiente(s, "08101F", "0F2A3D", 135)

    c1 = retangulo(s, 9.1, -1.6, 6.2, 6.2, None, TEAL, 1.0, 0.5, MSO_SHAPE.OVAL)
    alfa_linha(c1, 35000)
    c2 = retangulo(s, 11.6, 4.9, 2.6, 2.6, TEAL, None, 0, 0.5, MSO_SHAPE.OVAL)
    alfa(c2, 12000)
    c3 = retangulo(s, 8.6, 5.5, 1.1, 1.1, CYAN, None, 0, 0.5, MSO_SHAPE.OVAL)
    alfa(c3, 9000)

    texto(s, 0.9, 0.85, 8.0, 0.3, "3E FERRO E AÇO   ·   NCT027   ·   2026", 10, CYAN, True)
    texto(s, 0.9, 1.35, 9.4, 1.9,
          "Como construímos o\n3E Operações com um agente de IA", 39, WHITE, True,
          espaco=1.02)
    texto(s, 0.9, 3.42, 9.0, 0.9,
          "Levantamento de requisitos, modelagem de banco, ferramentas, tasks e skills — com evidência.",
          14, "B9C6D4", espaco=1.2)
    retangulo(s, 0.9, 4.28, 1.4, 0.05, TEAL)

    texto(s, 0.9, 4.55, 8.6, 0.3,
          "Renan Alves Tavares   ·   Marcelo Fiuza   ·   Vanusa Oliveira   ·   Vanessa Rodrigues",
          11, WHITE, True)
    texto(s, 0.9, 4.9, 8.6, 0.3, "Seminário técnico · 50 min de apresentação + perguntas", 9.5, GRAY2)

    texto(s, 0.9, 6.55, 6.0, 0.3, "12 de novembro de 2026", 9, GRAY2)
    texto(s, 8.2, 6.55, 4.2, 0.3, "github.com/Renan2004a/3e-operacoes", 9, GRAY2,
          alinhamento=PP_ALIGN.RIGHT)

    notas(s, "ABERTURA — 2 min (Renan).\n\n"
             "O professor já aprovou o banco e o vídeo. Hoje não vamos mostrar de novo o resultado: "
             "vamos mostrar o caminho que produziu o resultado. A tese é simples: não usamos IA como "
             "autocomplete. Usamos como uma equipe com contrato, spec e evidência.\n\n"
             "Diga: 'Vou começar pelo problema, porque foi ele que definiu tudo o que veio depois.'")


def tese():
    s = slide_novo()
    kicker(s, "A tese da apresentação")
    titulo(s, "O agente acelera a execução.\nO processo garante o resultado.", 27)
    regra(s, 1.95)

    texto(s, M, 2.2, 11.2, 0.5,
          "Três coisas tornaram o trabalho verificável — e nenhuma delas é o modelo.", 13, GRAY)

    dados = [
        ("CONTRATO", "AGENTS.md + skills", "O agente recebe contexto, limites e o que não pode decidir.", TEAL),
        ("RASTRO", "spec → design → tasks → validation", "Cada feature deixa o caminho do requisito até a evidência.", TEAL2),
        ("PROVA", "testes, PRs e vídeo", "O que não tem evidência não é considerado pronto.", GREEN),
    ]
    x = M
    for i, (tag, tit, desc, cor) in enumerate(dados):
        card(s, x, 2.95, 3.75, 2.55, LIGHT, BORDER, accent=cor)
        texto(s, x + 0.35, 3.2, 3.2, 0.25, tag, 9, cor, True)
        texto(s, x + 0.35, 3.55, 3.15, 0.75, tit, 15, INK, True, espaco=1.0)
        texto(s, x + 0.35, 4.35, 3.05, 0.95, desc, 11, GRAY, espaco=1.15)
        x += 3.95

    card(s, M, 5.85, CW, 0.85, "EAF4F7", "BFE3EC", accent=TEAL)
    texto(s, M + 0.35, 5.85, CW - 0.7, 0.85,
          "**A pergunta que o seminário responde:** o que o time sabe que o agente não sabe?",
          13, NAVY3, ancora=MSO_ANCHOR.MIDDLE)

    notas(s, "3 min. Fixe a tese antes de qualquer detalhe técnico. As três palavras — contrato, rastro, "
             "prova — vão reaparecer em todos os atos. Se o professor perguntar 'mas a IA não faz tudo?', "
             "a resposta é: ela não sabe o que é regra de negócio, nem o que é evidência suficiente.")


def linha_tempo():
    s = slide_novo()
    kicker(s, "A história em seis estações")
    titulo(s, "Do papel ao sistema, sem pular etapas", 28)
    regra(s)

    estacoes = [
        ("01", "Papel e entrevista", "o problema real"),
        ("02", "AGENTS.md", "contexto e limites"),
        ("03", "18 perguntas", "o que faltava saber"),
        ("04", "Modelo de dados", "14 tabelas"),
        ("05", "Backlog e trilhas", "tasks paralelas"),
        ("06", "PRs, testes, vídeo", "evidência"),
    ]
    y_linha = 3.1
    retangulo(s, M + 0.55, y_linha - 0.02, CW - 1.1, 0.04, BORDER)
    passo = CW / len(estacoes)
    for i, (num, tit, desc) in enumerate(estacoes):
        cx = M + passo * i + passo / 2
        circ = retangulo(s, cx - 0.32, y_linha - 0.32, 0.64, 0.64, WHITE, TEAL, 1.5, 0.5, MSO_SHAPE.OVAL)
        texto(s, cx - 0.32, y_linha - 0.31, 0.64, 0.62, num, 9.5, TEAL, True,
              alinhamento=PP_ALIGN.CENTER, ancora=MSO_ANCHOR.MIDDLE)
        texto(s, cx - passo / 2 + 0.12, 2.25, passo - 0.24, 0.7, tit, 12.5, INK, True,
              alinhamento=PP_ALIGN.CENTER, espaco=1.0)
        texto(s, cx - passo / 2 + 0.12, 3.55, passo - 0.24, 0.45, desc, 9.5, GRAY,
              alinhamento=PP_ALIGN.CENTER)

    card(s, M, 4.6, 5.7, 1.3, LIGHT, BORDER, accent=TEAL)
    texto(s, M + 0.3, 4.78, 5.2, 0.3, "O fio condutor", 9, TEAL, True)
    texto(s, M + 0.3, 5.05, 5.1, 0.7,
          "Um pedido percorre o sistema inteiro: importação → setor → produção → entrega.",
          11.5, INK, espaco=1.1)

    card(s, 6.6, 4.6, 6.0, 1.3, "FEF7EC", "F3DFC0", accent=AMBER)
    texto(s, 6.9, 4.78, 5.5, 0.3, "O que o professor vai poder cobrar", 9, AMBER, True)
    texto(s, 6.9, 5.05, 5.4, 0.7,
          "Cada decisão tem um artefato; cada afirmação tem uma evidência.",
          11.5, INK, espaco=1.1)

    notas(s, "3 min. Esta linha é o mapa. Volte a ela nos handoffs: 'estamos na estação 3'. "
             "Deixe claro que a ordem é cronológica e que nada foi pulado — inclusive a etapa em que "
             "descobrimos que não sabíamos a resposta.")


def roteiro():
    s = slide_novo()
    kicker(s, "Como o seminário está dividido")
    titulo(s, "Quatro pessoas, seis atos, uma narrativa", 28)
    regra(s)

    linhas = [
        ("0", "Abertura e tese", "Renan", "2 min"),
        ("1", "Levantamento de requisitos", "Renan", "8 min"),
        ("2", "Modelagem de banco de dados", "Marcelo", "10 min"),
        ("3", "Escolha de ferramentas", "Vanessa", "6 min"),
        ("4", "Tasks e execução", "Vanusa", "13 min"),
        ("5", "Skills, agentes e prompts", "Renan + todos", "10 min"),
        ("6", "Fechamento e perguntas", "Todos", "2 + 10 min"),
    ]
    tabela(s, M, 1.95, 8.4, [0.5, 4.2, 2.4, 1.5],
           ["#", "Disciplina", "Quem", "Tempo"], linhas,
           altura_linha=0.5, tamanho=11, tamanho_cab=8.5,
           alturas=[0.5] * 7,
           alinhamentos=[PP_ALIGN.CENTER, PP_ALIGN.LEFT, PP_ALIGN.LEFT, PP_ALIGN.RIGHT],
           col_negrito=())

    card(s, 9.45, 1.95, 3.2, 4.15, NAVY, None, accent=TEAL)
    texto(s, 9.75, 2.2, 2.7, 0.3, "REGRA DE OURO", 9, CYAN, True)
    texto(s, 9.75, 2.55, 2.65, 1.2,
          "Ninguém apresenta uma pasta.\nCada bloco defende uma decisão.", 13, WHITE, True, espaco=1.15)
    texto(s, 9.75, 3.85, 2.65, 1.9,
          "Se a pergunta for de outro domínio, quem domina responde. Se ninguém souber, "
          "a resposta é: 'não validamos; está registrado como ponto aberto'.",
          9.5, "C3D0DE", espaco=1.2)

    texto(s, M, 6.02, CW, 0.4,
          "**Tempo total:** ~50 minutos + 10 de perguntas  ·  **Formato:** slides, diagramas e trechos reais do sistema",
          10, GRAY)

    notas(s, "2 min. Explique a divisão e a regra de ouro. Deixe combinado que perguntas fora do domínio "
             "são redirecionadas — isso evita silêncio e 'não sei'. Se o professor perguntar por que Renan "
             "aparece duas vezes, a resposta é: porque requisitos e skills são o mesmo fio: o que o agente "
             "precisa saber e o que ele não pode decidir.")


def divisor(num, tit, desc, topicos, quem):
    s = prs.slides.add_slide(BLANK)
    gradiente(s, "08101F", "0E2A3D", 135)
    texto(s, 0.55, 0.35, 4.0, 1.7, num, 110, "173A5E", True, espaco=0.85)
    texto(s, 0.78, 2.42, 5.0, 0.3, f"ATO {num}", 10, CYAN, True)
    texto(s, 0.78, 2.72, 7.2, 1.15, tit, 34, WHITE, True, espaco=1.0)
    texto(s, 0.78, 4.12, 6.6, 1.25, desc, 13, "B9C6D4", espaco=1.25)

    y = 2.75
    for top in topicos:
        retangulo(s, 8.6, y + 0.12, 0.22, 0.035, TEAL)
        texto(s, 8.95, y, 3.7, 0.4, top, 11.5, "D6E0EA", espaco=1.0)
        y += 0.55

    retangulo(s, 0.78, 6.35, 1.2, 0.04, TEAL)
    texto(s, 0.78, 6.5, 8.0, 0.3, quem, 10, GRAY2)

    notas(s, f"Transição. Anuncie o ato e o apresentador. Não leia os tópicos: eles são o mapa do bloco. "
             f"{quem}.")


def problema():
    s = slide_novo()
    kicker(s, "Ato 1 · Levantamento de requisitos")
    titulo(s, "O problema não era falta de software.\nEra falta de rastro.", 26)
    regra(s, 1.88)

    bullets(s, M, 2.15, 6.9, 3.1, [
        "O pedido chega pelo Top Gerente e precisa ser **desmembrado por setor**.",
        "O acompanhamento é feito em **papel**: ordem impressa, anotação manual, comunicação verbal.",
        "Faltam **execução, perdas, entregas parciais, atrasos e saldo**.",
        "O legado é **somente leitura** — o novo sistema não pode escrever nele.",
    ], tamanho=12.5, espaco_entre=10)

    stats = [
        ("~7", "operadores simultâneos"),
        ("3", "setores produtivos"),
        ("1", "legado somente leitura"),
    ]
    y = 2.15
    for num, desc in stats:
        card(s, 7.95, y, 4.65, 1.0, LIGHT, BORDER, accent=TEAL)
        texto(s, 8.2, y + 0.12, 1.1, 0.7, num, 30, TEAL, True, ancora=MSO_ANCHOR.MIDDLE)
        texto(s, 9.35, y + 0.12, 3.1, 0.7, desc, 11, INK, ancora=MSO_ANCHOR.MIDDLE)
        y += 1.15

    card(s, M, 4.35, 6.9, 0.95, "F7FAFC", BORDER, accent=TEAL2)
    texto(s, M + 0.32, 4.35, 6.25, 0.95,
          "“Como está o pedido 123?” não tinha resposta sem perguntar a alguém.",
          12, INK, ancora=MSO_ANCHOR.MIDDLE)

    card(s, M, 5.55, CW, 1.05, "FEF7EC", "F3DFC0", accent=AMBER)
    texto(s, M + 0.32, 5.55, CW - 0.64, 1.05,
          "**O recorte:** três setores — Corte e Dobra, Telhas e Revenda. A empresa tem 15 setores "
          "produtivos; o time decidiu não inventar o quarto grupo nem o mapeamento que a documentação não tinha.",
          11.5, INK, ancora=MSO_ANCHOR.MIDDLE, espaco=1.15)

    notas(s, "2 min. Conte o problema em linguagem de operação, não de sistema. A frase que fica: "
             "'o gerente não sabia responder como está o pedido 123 sem perguntar para alguém'. "
             "Explique o recorte de 3 setores como decisão consciente, não como esquecimento — foi uma "
             "resposta do time a uma pergunta registrada.")


def fontes():
    s = slide_novo()
    kicker(s, "Ato 1 · De onde vieram os requisitos")
    titulo(s, "Requisito não nasce no chat. Nasce da fonte.", 27)
    regra(s)

    itens = [
        ("Marco Problema", "HU01–HU06 · RF001–RF018 · RFN001–RFN009", "o escopo funcional"),
        ("Regras de Negócio", "RN001–RN005 + 9 regras por setor", "os cálculos e bloqueios"),
        ("Entrevista", "processo atual e limites da integração", "a realidade da operação"),
        ("Personas", "6 perfis e o conceito de item operacional", "quem usa e o que vê"),
        ("Unidades de medida", "UN, KG, L, M, CX · casas decimais", "como medir sem misturar"),
        ("Produtos do legado", "278 mil linhas · 2.300 itens · 19 categorias", "como classificar"),
    ]
    x0, y0 = M, 1.95
    larg, alt, gap = 3.78, 1.95, 0.22
    for i, (tit, num, desc) in enumerate(itens):
        col, lin = i % 3, i // 3
        x = x0 + col * (larg + gap)
        y = y0 + lin * (alt + gap)
        card(s, x, y, larg, alt, LIGHT, BORDER, accent=TEAL if col == 0 else TEAL2 if col == 1 else GREEN)
        texto(s, x + 0.28, y + 0.22, larg - 0.56, 0.35, tit, 12.5, INK, True)
        texto(s, x + 0.28, y + 0.62, larg - 0.56, 0.75, num, 9.5, TEAL, True, espaco=1.1)
        texto(s, x + 0.28, y + 1.35, larg - 0.56, 0.45, desc, 9, GRAY)

    texto(s, M, 6.35, CW, 0.4,
          "O agente leu as fontes — mas **não decidiu o que era verdade**. Quem decidiu foi o time.",
          11, GRAY)

    notas(s, "2 min. Mostre que o trabalho de requisito foi anterior ao agente. Cada card é uma fonte real. "
             "Destaque o estudo de unidades: ele explica por que metro tem 2 casas e peça é inteiro — "
             "e isso vai reaparecer no banco. Não cite números que você não consiga defender.")


def agents_draft():
    s = slide_novo()
    kicker(s, "Ato 1 · O contrato do agente")
    titulo(s, "O AGENTS.md nasceu como rascunho — e assumia o que não sabia", 25)
    regra(s, 1.95)

    card(s, M, 2.2, 6.7, 2.35, LIGHT, BORDER, accent=TEAL)
    texto(s, M + 0.35, 2.4, 6.0, 0.3, "TRECHO DO DOCUMENTO", 8.5, TEAL, True)
    texto(s, M + 0.35, 2.72, 6.0, 1.55,
          "“Status: rascunho para revisão do time. O que ainda não foi decidido está marcado "
          "como ‘em aberto’ e listado na seção 10.”",
          13, INK, espaco=1.25)

    stats = [("11", "seções"), ("14", "pontos em aberto"), ("18", "perguntas ao time")]
    y = 2.2
    for num, desc in stats:
        card(s, 7.75, y, 4.85, 0.68, WHITE, BORDER)
        texto(s, 7.95, y, 1.0, 0.68, num, 22, TEAL, True, ancora=MSO_ANCHOR.MIDDLE)
        texto(s, 8.95, y, 3.4, 0.68, desc, 10.5, INK, ancora=MSO_ANCHOR.MIDDLE)
        y += 0.8

    bullets(s, M, 4.85, 11.4, 1.0, [
        "Em vez de o agente **inventar** o quarto setor, o mapeamento de produtos ou a regra de perda, o documento marcou a lacuna.",
        "Cada lacuna virou **pergunta com dono e data** — e cada resposta virou uma linha no código.",
    ], tamanho=12, espaco_entre=8)

    card(s, M, 5.95, CW, 0.62, "FEF7EC", "F3DFC0", accent=AMBER)
    texto(s, M + 0.32, 5.95, CW - 0.64, 0.62,
          "**Risco evitado:** um sistema que parece pronto e erra a regra de negócio com confiança.",
          10.5, INK, ancora=MSO_ANCHOR.MIDDLE)

    notas(s, "2 min. Este é o slide mais importante do ato. Leia a citação em voz alta. Explique que um "
             "AGENTS.md que finge saber tudo produz código confiante e errado. O rascunho honesto foi o "
             "que permitiu avançar sem retrabalho. Se perguntarem 'o agente não deveria descobrir sozinho?', "
             "responda: ele não tem como validar uma decisão de negócio.")


def respostas():
    s = slide_novo()
    kicker(s, "Ato 1 · O que o time respondeu")
    titulo(s, "Sete respostas que destravaram o projeto", 27)
    regra(s)

    linhas = [
        ("Quantos setores?", "3: Corte e Dobra, Telhas, Revenda", "escopo do modelo"),
        ("Quem altera o status?", "operador e gerente", "matriz de permissões"),
        ("O vendedor altera algo?", "não: só consulta e prazo", "RBAC no servidor"),
        ("De onde vem a categoria?", "definida na venda", "classificação do item"),
        ("Linguagem e ORM?", "TypeScript + Prisma", "stack e schema-first"),
        ("Onde hospedar?", "Railway", "deploy e banco"),
        ("Como acessar o legado?", "Cloudflare Tunnel", "integração segura"),
    ]
    tabela(s, M, 1.9, 11.9, [3.0, 4.6, 3.2],
           ["Pergunta", "Resposta registrada", "O que destravou"], linhas,
           altura_linha=0.54, tamanho=10.5, tamanho_cab=8.5,
           alturas=[0.54] * 7,
           col_negrito=(0,))

    texto(s, M, 6.35, CW, 0.4,
          "Fonte: página **“Perguntas para o time”**, no Notion do projeto. As respostas foram dadas antes da implementação.",
          9.5, GRAY)

    notas(s, "1,5 min. Não leia a tabela inteira: escolha três linhas e conte o impacto. A melhor é "
             "'quantos setores' — porque mudou o escopo do banco. A segunda é 'vendedor só consulta' — "
             "porque virou regra de autorização no servidor. A terceira é 'Railway' — porque eliminou "
             "a discussão Vercel/AWS. Encerre: requisito respondido é requisito que não volta como bug.")


def conceito():
    s = slide_novo()
    kicker(s, "Ato 1 · A ponte para o modelo")
    titulo(s, "A frase que gerou o banco de dados", 28)
    regra(s, 1.7)

    card(s, M, 1.95, CW, 1.35, NAVY, None, accent=TEAL)
    texto(s, M + 0.4, 1.95, CW - 0.8, 0.75,
          "PEDIDO  ≠  PRODUÇÃO  ≠  ENTREGA", 26, WHITE, True, ancora=MSO_ANCHOR.MIDDLE)
    texto(s, M + 0.4, 2.62, CW - 0.8, 0.45,
          "Solicitado  →  Executado  →  Entregue", 13, CYAN, True, ancora=MSO_ANCHOR.MIDDLE)

    setores = [
        ("Corte e Dobra", "peças produzidas", "peça · inteiro"),
        ("Telhas", "metros produzidos", "metro · 2 casas"),
        ("Revenda", "itens separados", "unidade · inteiro"),
    ]
    x = M
    for nome, execucao, unidade in setores:
        card(s, x, 3.6, 3.75, 1.75, LIGHT, BORDER, accent=TEAL2)
        texto(s, x + 0.3, 3.82, 3.15, 0.35, nome, 14, INK, True)
        texto(s, x + 0.3, 4.2, 3.15, 0.4, f"“executado” = {execucao}", 10.5, GRAY)
        texto(s, x + 0.3, 4.68, 3.15, 0.35, unidade, 10, TEAL, True)
        x += 3.95

    texto(s, M, 5.65, CW, 1.1,
          "Foi essa separação que permitiu calcular **pendente** (solicitado − executado) e "
          "**disponível** (executado − entregue) sem misturar unidades nem sobrescrever histórico.\n"
          "Cada item passou a carregar setor, situação, prioridade e prazos.",
          12, INK, espaco=1.25)

    notas(s, "1,5 min. Este é o handoff para o Marcelo. A frase 'pedido ≠ produção ≠ entrega' veio do "
             "estudo de personas e é a chave de leitura do banco. Sem ela, o schema vira um monte de "
             "tabelas. Com ela, cada tabela tem um papel. Termine: 'com esse conceito, o Marcelo "
             "mostra como isso virou 14 tabelas'.")


def banco_item():
    s = slide_novo()
    kicker(s, "Ato 2 · Modelagem de banco de dados")
    titulo(s, "Cada setor especializa o que significa “executado”", 26)
    regra(s)

    setores = [
        ("CORTE E DOBRA", "peças produzidas", "peça", "inteiro", "perda exige motivo"),
        ("TELHAS", "metros produzidos", "metro", "2 casas", "refugo exige motivo"),
        ("REVENDA", "itens separados", "unidade", "inteiro", "indisponibilidade exige motivo"),
    ]
    x = M
    for nome, execucao, unidade, casas, regra_txt in setores:
        card(s, x, 1.95, 3.78, 2.55, LIGHT, BORDER, accent=TEAL)
        texto(s, x + 0.3, 2.15, 3.2, 0.3, nome, 9, TEAL, True)
        texto(s, x + 0.3, 2.48, 3.2, 0.45, execucao, 14, INK, True)
        texto(s, x + 0.3, 3.0, 3.2, 0.3, unidade, 10.5, GRAY)
        texto(s, x + 0.3, 3.3, 3.2, 0.3, casas, 10.5, GRAY)
        retangulo(s, x + 0.3, 3.75, 2.9, 0.008, BORDER)
        texto(s, x + 0.3, 3.9, 3.15, 0.45, regra_txt, 9.5, AMBER)
        x += 3.95

    card(s, M, 4.75, CW, 0.95, "EAF4F7", "BFE3EC", accent=TEAL)
    texto(s, M + 0.32, 4.75, CW - 0.64, 0.95,
          "**O item é a unidade operacional.** A antiga tabela `atividades` era 1:1 com o item: "
          "foi absorvida para evitar JOIN obrigatório e status duplicado.",
          11.5, INK, ancora=MSO_ANCHOR.MIDDLE, espaco=1.15)

    bullets(s, M, 5.95, 11.4, 1.0, [
        "Unidade e casas decimais são **regra de negócio**, não formatação: 1,5 m ≠ 1 m.",
        "O mesmo item atravessa fila, apontamento, ocorrência, entrega e saldo.",
    ], tamanho=10.5, espaco_entre=4)

    notas(s, "3 min. Comece pela regra, não pela tabela: 'o que é executado em cada setor?'. "
             "Só depois mostre o schema. Explique a absorção de atividades como decisão de simplicidade: "
             "1:1 não merece tabela própria. Se o professor gosta de normalização, diga que a forma "
             "normal não é a que tem mais tabelas, é a que evita anomalia com o menor custo de leitura.")


def por_que_14():
    s = slide_novo()
    kicker(s, "Ato 2 · A conta do número de tabelas")
    titulo(s, "17 − 3 = 14   ·   19 − 5 = 14", 28)
    regra(s)

    linhas = [
        ("`atividades`", "`pedidos_itens`", "1:1 — evita JOIN e status duplicado"),
        ("2 tabelas de regras", "`regras_classificacao`", "um único conceito de regra"),
        ("`eventos_job_integracao`", "`logs_auditoria` + view", "evento de job é auditoria"),
    ]
    tabela(s, M, 1.95, 7.25, [2.4, 2.4, 3.6],
           ["Antes", "Depois", "Por quê"], linhas,
           altura_linha=0.85, tamanho=9.5, tamanho_cab=8,
           alturas=[0.85, 0.85, 0.85], col_negrito=())

    card(s, 8.3, 1.95, 4.3, 1.55, NAVY, None, accent=TEAL)
    texto(s, 8.55, 2.12, 3.8, 0.4, "DO BANCO ANTERIOR", 8.5, CYAN, True)
    texto(s, 8.55, 2.45, 3.8, 0.55, "17 − 3 = 14", 26, WHITE, True)
    texto(s, 8.55, 3.0, 3.8, 0.35, "três consolidações, zero tabela nova", 8.5, "B9C6D4")

    card(s, 8.3, 3.65, 4.3, 1.55, WHITE, BORDER, accent=AMBER)
    texto(s, 8.55, 3.82, 3.8, 0.4, "DO MODELO DE 19", 8.5, AMBER, True)
    texto(s, 8.55, 4.15, 3.8, 0.55, "19 − 5 = 14", 26, INK, True)
    texto(s, 8.55, 4.7, 3.8, 0.35, "catálogos opcionais, +1 cada", 8.5, GRAY)

    texto(s, M, 5.0, CW, 0.9,
          "**Não são 14 por meta.** São 14 porque três tabelas eram duplicação ou projeção 1:1, "
          "e cinco do modelo maior não são necessárias para preservar o comportamento atual.",
          12, INK, espaco=1.2)

    card(s, M, 5.9, CW, 0.75, "F0FDF4", "C7E5CF", accent=GREEN)
    texto(s, M + 0.32, 5.9, CW - 0.64, 0.75,
          "O banco cresce por adição: `perfis`, `produto`, `unidade_medida` e `divergencia` entram como +1, sem reescrever as 14.",
          10, INK, ancora=MSO_ANCHOR.MIDDLE)

    notas(s, "3 min. Este é o slide que responde à pergunta do professor. Diga a conta em voz alta. "
             "Depois explique o critério: preservar 100% do comportamento. Se ele perguntar por que não 19, "
             "a resposta é 'porque cinco são catálogos que o sistema ainda não precisa; quando precisar, "
             "entram um a um'. Evite dizer que 14 é 'mais correto' — é o mínimo necessário para este escopo.")


def nao_fundir():
    s = slide_novo()
    kicker(s, "Ato 2 · O que ficou separado de propósito")
    titulo(s, "Fundir nem sempre simplifica", 28)
    regra(s)

    linhas = [
        ("`entregas` + `entregas_previstas`", "previsto × realizado: juntar criaria muitos campos nulos"),
        ("`usuarios_perfis` + `usuarios_setores`", "perfil e setor são dimensões diferentes"),
        ("`motivos_ocorrencia` + cadastros", "catálogo genérico enfraquece as FKs"),
        ("`apontamentos` + `ocorrencias`", "fato produtivo × evento; regras e relatórios distintos"),
        ("`pedidos` + `pedidos_itens`", "cabeçalho e item têm ciclos de vida diferentes"),
    ]
    tabela(s, M, 1.95, 11.9, [4.6, 7.3],
           ["O que não fundimos", "Por quê"], linhas,
           altura_linha=0.72, tamanho=10.5, tamanho_cab=8.5,
           alturas=[0.72] * 5, col_negrito=())

    texto(s, M, 6.18, CW, 0.5,
          "**Critério:** se juntar cria campo nulo, tabela polimórfica sem FK ou perda de clareza, não junta.",
          11.5, GRAY)

    notas(s, "2 min. A pergunta implícita é 'por que não tem menos tabelas?'. Este slide mostra que "
             "simplificar não é fundir tudo. Use o exemplo previsto × realizado: são dois fatos com "
             "tempos diferentes. Termine com o critério — ele vale para qualquer decisão futura.")


def mer_slide():
    s = slide_novo()
    kicker(s, "Ato 2 · O modelo em uma imagem")
    titulo(s, "MER: entidades, relações e cardinalidades", 27)
    regra(s)

    card(s, M, 1.85, 11.9, 4.35, WHITE, BORDER)
    imagem_contain(s, MER, M + 0.12, 1.95, 11.66, 4.15)

    chips = [("26", "chaves estrangeiras"), ("5", "views de leitura"), ("0", "órfãos no ETL")]
    x = M
    for num, desc in chips:
        card(s, x, 6.28, 3.75, 0.62, LIGHT, BORDER)
        texto(s, x + 0.2, 6.28, 0.7, 0.62, num, 17, TEAL, True, ancora=MSO_ANCHOR.MIDDLE)
        texto(s, x + 0.9, 6.28, 2.7, 0.62, desc, 9.5, INK, ancora=MSO_ANCHOR.MIDDLE)
        x += 3.95

    notas(s, "1 min. Não leia o diagrama. Aponte três caminhos: usuário → perfil/setor; pedido → item; "
             "item → apontamento/ocorrência/entrega. Diga que o DER completo está no DOCX entregue. "
             "Se a projeção estiver pequena, use o zoom do PowerPoint — mas evite navegar durante a fala.")


def etl():
    s = slide_novo()
    kicker(s, "Ato 2 · Como provamos que nada se perdeu")
    titulo(s, "ETL conferido linha a linha", 28)
    regra(s)

    linhas = [
        ("Pedidos", "10", "10"),
        ("Itens", "63", "63"),
        ("Apontamentos", "16", "16"),
        ("Soma executada", "206", "206"),
        ("Entregas", "9", "9"),
        ("Soma entregue", "145", "145"),
        ("Órfãos de FK", "—", "0"),
    ]
    tabela(s, M, 1.95, 5.9, [2.8, 1.6, 1.6],
           ["Item", "Antes", "Depois"], linhas,
           altura_linha=0.52, tamanho=10.5, tamanho_cab=8.5,
           alturas=[0.52] * 7,
           alinhamentos=[PP_ALIGN.LEFT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT],
           col_negrito=(0,))

    card(s, 6.95, 1.95, 5.65, 2.55, LIGHT, BORDER, accent=GREEN)
    texto(s, 7.2, 2.12, 5.1, 0.3, "GATES DE VALIDAÇÃO", 8.5, GREEN, True)
    itens = ["1.182 testes verdes + 40 ignorados", "typecheck, lint e build OK",
             "UI 15/15 e 16/16", "health 200 em produção"]
    y = 2.5
    for item in itens:
        texto(s, 7.2, y, 0.32, 0.3, "OK", 7.5, GREEN, True)
        texto(s, 7.55, y, 4.85, 0.3, item, 10.5, INK)
        y += 0.45

    card(s, 6.95, 4.7, 5.65, 1.35, "FEF7EC", "F3DFC0", accent=AMBER)
    texto(s, 7.2, 4.86, 5.1, 0.3, "O QUE NÃO ESCONDEMOS", 8.5, AMBER, True)
    texto(s, 7.2, 5.16, 5.1, 0.8,
          "O banco antigo foi preservado; o backup `3e_operacoes_backup_20261031` continua disponível. "
          "A troca foi reversível.", 9.5, INK, espaco=1.12)

    texto(s, M, 6.25, 11.4, 0.5,
          "**Contagem igual não é opinião.** Foi o critério para liberar o deploy.",
          11.5, GRAY)

    notas(s, "1 min. Explique o método: contar antes, contar depois, somar quantidades e verificar órfãos. "
             "Não é sobre 'rodou sem erro', é sobre 'o resultado é o mesmo'. Mencione o backup como "
             "segurança, não como detalhe. Transição: 'com o modelo validado, faltava escolher onde ele roda'.")


def ferramentas():
    s = slide_novo()
    kicker(s, "Ato 3 · Escolha de ferramentas")
    titulo(s, "Cada ferramenta foi escolhida por restrição — não por moda", 25)
    regra(s)

    linhas = [
        ("Next.js + TypeScript", "fullstack e regra de domínio tipada", "JavaScript puro"),
        ("Prisma + MySQL", "schema-first, casa com a modelagem", "SQL manual"),
        ("Railway", "job de sincronização e pool de conexão", "Vercel serverless"),
        ("Cloudflare Tunnel", "legado somente leitura, sem expor 3306", "ngrok"),
        ("Playwright", "fluxo real de chão de fábrica", "só teste unitário"),
        ("Git + PRs pequenos", "revisão e reversão baratas", "commit direto na main"),
    ]
    tabela(s, M, 1.95, 11.9, [3.5, 5.3, 3.1],
           ["Decisão", "Restrição que mandou", "Descartado"], linhas,
           altura_linha=0.58, tamanho=10, tamanho_cab=8.5,
           alturas=[0.58] * 6, col_negrito=(0,))

    texto(s, M, 6.2, CW, 0.5,
          "**Critério:** o que o cliente tem, o que o time consegue manter e o que o prazo permite.",
          11.5, GRAY)

    notas(s, "4 min. Não defenda tecnologia por gosto. Para cada linha, diga a restrição em uma frase. "
             "A mais importante é Railway × Vercel: serverless tem limite de tempo e cada função abre "
             "conexão; a sincronização com o legado precisa de processo. A segunda é o túnel: o banco do "
             "cliente nunca fica exposto.")


def dois_casos():
    s = slide_novo()
    kicker(s, "Ato 3 · Duas decisões que evitaram retrabalho")
    titulo(s, "O caso Railway e o caso Cloudflare", 27)
    regra(s)

    card(s, M, 1.95, 5.8, 2.55, LIGHT, BORDER, accent=TEAL)
    texto(s, M + 0.35, 2.15, 5.1, 0.3, "HOSPEDAGEM", 8.5, TEAL, True)
    texto(s, M + 0.35, 2.48, 5.1, 0.45, "Vercel → Railway", 20, INK, True)
    bullets(s, M + 0.35, 3.05, 5.05, 1.3, [
        "Serverless tem **limite de tempo** por requisição.",
        "Cada função abre **sua própria conexão** com o MySQL.",
        "A sincronização precisa de **job** — não de request curto.",
    ], tamanho=10.5, espaco_entre=8)

    card(s, 6.8, 1.95, 5.8, 2.55, LIGHT, BORDER, accent=AMBER)
    texto(s, 7.15, 2.15, 5.1, 0.3, "ACESSO AO LEGADO", 8.5, AMBER, True)
    texto(s, 7.15, 2.48, 5.1, 0.45, "Cloudflare Tunnel + SELECT", 20, INK, True)
    bullets(s, 7.15, 3.05, 5.05, 1.3, [
        "O Top Gerente é **somente leitura** — nunca recebe escrita.",
        "Usuário MySQL restrito a **SELECT** nas tabelas mapeadas.",
        "Nada de expor a porta **3306** para a internet.",
    ], tamanho=10.5, espaco_entre=8)

    card(s, M, 4.7, CW, 1.0, "F7FAFC", BORDER, accent=TEAL2)
    texto(s, M + 0.32, 4.7, CW - 0.64, 1.0,
          "**A mesma lógica nos dois casos:** a decisão foi tomada antes de codar, com a restrição real do cliente na mesa.",
          11.5, INK, ancora=MSO_ANCHOR.MIDDLE)

    card(s, M, 5.95, CW, 0.78, "EAF4F7", "BFE3EC", accent=TEAL)
    texto(s, M + 0.32, 5.95, CW - 0.64, 0.78,
          "**A decisão de arquitetura virou requisito de segurança:** o navegador nunca fala com o banco do legado.",
          11, INK, ancora=MSO_ANCHOR.MIDDLE)

    notas(s, "2 min. Conte como a decisão foi tomada, não só o resultado. Vercel era a escolha óbvia; "
             "deixou de ser quando o job entrou no escopo. O túnel não é conveniência: é o que permite "
             "ler o legado sem abrir o banco do cliente. Se perguntarem sobre custo, diga que Railway "
             "resolveu o plano gratuito para o projeto.")


def backlog():
    s = slide_novo()
    kicker(s, "Ato 4 · Tasks e execução")
    titulo(s, "12 fases, uma ordem: cada task com requisito e revisor", 24)
    regra(s)

    fases = [
        ("00", "Descoberta", "schema, categorias, acessos"),
        ("02", "Integração", "conector, callback, upsert"),
        ("03", "Setores", "classificação e regras"),
        ("04", "Produção", "fila, execução, saldo"),
        ("06", "Expedição", "disponibilidade, entrega"),
        ("07", "Permissões", "auth e RBAC"),
        ("10", "Frontend", "design system e telas"),
        ("11", "Qualidade", "testes e verificação"),
    ]
    x0, y0 = M, 1.95
    larg, alt, gx, gy = 2.82, 1.55, 0.19, 0.2
    for i, (num, nome, desc) in enumerate(fases):
        col, lin = i % 4, i // 4
        x = x0 + col * (larg + gx)
        y = y0 + lin * (alt + gy)
        destaque = num in ("00", "04", "06")
        card(s, x, y, larg, alt, NAVY if destaque else LIGHT,
              None if destaque else BORDER, accent=TEAL if destaque else None)
        texto(s, x + 0.25, y + 0.18, 0.9, 0.3, f"FASE {num}", 8, CYAN if destaque else TEAL, True)
        texto(s, x + 0.25, y + 0.48, larg - 0.5, 0.4, nome, 13, WHITE if destaque else INK, True)
        texto(s, x + 0.25, y + 0.95, larg - 0.5, 0.45, desc, 8.5, "C3D0DE" if destaque else GRAY)

    texto(s, M, 5.55, CW, 0.55,
          "Cada task cita o **RF/RN de origem** e o **subagente revisor**. Nada entra sem lint, typecheck, teste e build.",
          11.5, INK, espaco=1.15)

    card(s, M, 6.15, CW, 0.7, "FEF7EC", "F3DFC0", accent=AMBER)
    texto(s, M + 0.32, 6.15, CW - 0.64, 0.7,
          "Fase 0 não é código: é descobrir o que falta saber antes de implementar.",
          10.5, INK, ancora=MSO_ANCHOR.MIDDLE)

    notas(s, "3 min. Mostre que o backlog não é uma lista de desejos: cada task tem origem e revisor. "
             "Destaque a Fase 0 — foi ela que produziu o mapeamento do legado e as perguntas. "
             "Diga que a ordem não foi rígida: as fases 3–9 foram paralelizadas depois do contrato.")


def prompt_real():
    s = prs.slides.add_slide(BLANK)
    gradiente(s, "08101F", "102A3B", 135)
    texto(s, 0.85, 0.8, 6.0, 0.3, "ATO 4 · O PROMPT QUE MUDOU A DIVISÃO", 9.5, CYAN, True)

    texto(s, 0.85, 1.35, 11.4, 1.1,
          "“Como dividir essas tasks em uma equipe de 4 pessoas\nque usam spec driven e querem trabalhar de forma paralela?”",
          27, WHITE, True, espaco=1.15)

    retangulo(s, 0.85, 2.55, 1.4, 0.05, TEAL)
    texto(s, 0.85, 2.7, 8.0, 0.3, "PROMPT REGISTRADO NO NOTION, ANTES DE DIVIDIR O TRABALHO", 8.5, GRAY2)

    card(s, 0.85, 3.2, 11.6, 2.35, "0F2133", "1E3A5F", accent=TEAL)
    texto(s, 1.2, 3.38, 10.9, 0.35, "A RESPOSTA QUE ADOTAMOS", 8.5, CYAN, True)
    texto(s, 1.2, 3.72, 10.9, 0.6,
          "“Dividiria por trilhas de domínio, não por fase.”", 23, WHITE, True)
    texto(s, 1.2, 4.42, 10.9, 0.5,
          "“A dependência deve ser de contrato aprovado, não de código pronto.”", 13, "C3D0DE")
    texto(s, 1.2, 4.9, 10.9, 0.4,
          "Contrato aprovado  >  código pronto", 11, CYAN, True)

    texto(s, 0.85, 6.05, 11.4, 0.4,
          "Isso não é sobre o agente ser criativo. É sobre **usar o agente para pensar a organização do trabalho**.",
          11, "B9C6D4")

    notas(s, "3 min. Este é o momento 'uau' do seminário. Leia o prompt devagar. Explique o contexto: "
             "o backlog tinha 12 fases e parecia sequencial. A resposta propôs trilhas paralelas com "
             "contrato. Diga que a equipe adotou e que isso aparece nas 4 trilhas do próximo slide. "
             "É a prova de que o agente foi usado para decidir o processo, não só para escrever código.")


def trilhas():
    s = slide_novo()
    kicker(s, "Ato 4 · Como o trabalho foi dividido")
    titulo(s, "Quatro trilhas, contrato no lugar de dependência", 26)
    regra(s)

    trilhas = [
        ("P1", "Legado e importação", "schema, contrato, conector, upsert", TEAL),
        ("P2", "Produção e chão de fábrica", "setores, fila, execução, ocorrências", TEAL2),
        ("P3", "Entregas, prazos e indicadores", "disponibilidade, exceções, dashboards", GREEN),
        ("P4", "Plataforma e frontend", "auth, RBAC, design system, telas", AMBER),
    ]
    x = M
    for cod, nome, desc, cor in trilhas:
        card(s, x, 1.95, 2.88, 1.75, LIGHT, BORDER, accent=cor)
        texto(s, x + 0.25, 2.12, 2.4, 0.3, cod, 8.5, cor, True)
        texto(s, x + 0.25, 2.42, 2.45, 0.7, nome, 12.5, INK, True, espaco=1.05)
        texto(s, x + 0.25, 3.05, 2.45, 0.5, desc, 8.5, GRAY, espaco=1.1)
        x += 3.0

    texto(s, M, 3.92, CW, 0.35, "O CICLO QUE DESTRAVOU O PARALELISMO", 8.5, TEAL, True)

    etapas = ["contrato", "mock", "implementação", "integração", "vertical slice"]
    x = M
    for i, etapa in enumerate(etapas):
        cor = TEAL if i < 3 else GREEN
        card(s, x, 4.22, 2.14, 0.68, WHITE, cor, accent=cor)
        texto(s, x + 0.18, 4.22, 1.8, 0.68, etapa, 9.5, INK, True, ancora=MSO_ANCHOR.MIDDLE)
        x += 2.32

    texto(s, M, 5.1, CW, 0.85,
          "Primeiro um fluxo **vertical completo**: pedido importado → item classificado → produção → "
          "entrega → saldo. Só depois impressão, ocorrências completas, atrasos e dashboards.",
          11.5, INK, espaco=1.2)

    card(s, M, 6.0, CW, 0.6, "EAF4F7", "BFE3EC", accent=TEAL)
    texto(s, M + 0.3, 6.0, CW - 0.6, 0.6,
          "Ninguém esperou código pronto de outra pessoa: esperou **contrato aprovado**.",
          10, INK, ancora=MSO_ANCHOR.MIDDLE)

    notas(s, "3 min. Explique as trilhas e o mecanismo: contrato + mock. P2 não esperou a importação real; "
             "trabalhou com pedidos simulados conforme a spec. Quando a integração ficou pronta, trocou a "
             "fonte. Diga que isso é o que permite 4 pessoas em paralelo sem caos. A vertical slice "
             "é o antídoto para 'tudo 80% pronto e nada funcionando'.")


def spec_driven():
    s = slide_novo()
    kicker(s, "Ato 4 · Spec-driven na prática")
    titulo(s, "Nenhuma feature sem os quatro arquivos", 27)
    regra(s)

    etapas = [
        ("spec.md", "problema e critérios testáveis", "o que precisa ser verdade"),
        ("design.md", "modelo, contratos e decisões", "como vamos construir"),
        ("tasks.md", "fatias pequenas e revisáveis", "em que ordem"),
        ("validation.md", "evidência `arquivo:linha`", "como provamos"),
    ]
    x = M
    for i, (arq, desc, fim) in enumerate(etapas):
        card(s, x, 1.95, 2.72, 1.95, LIGHT, BORDER, accent=TEAL)
        texto(s, x + 0.25, 2.12, 2.3, 0.3, f"{i+1:02d}", 8.5, TEAL, True)
        texto(s, x + 0.25, 2.42, 2.3, 0.4, arq, 12, INK, True, fonte=MONO)
        texto(s, x + 0.25, 2.9, 2.3, 0.6, desc, 9.5, GRAY, espaco=1.1)
        texto(s, x + 0.25, 3.5, 2.3, 0.3, fim, 8, TEAL, True)
        x += 2.95

    card(s, M, 4.2, 5.8, 1.9, NAVY, None, accent=TEAL)
    texto(s, M + 0.35, 4.4, 5.1, 0.3, "O NÚMERO QUE IMPORTA", 8.5, CYAN, True)
    texto(s, M + 0.35, 4.72, 5.1, 0.75, "15 features", 26, WHITE, True)
    texto(s, M + 0.35, 5.45, 5.1, 0.45, "cada uma com spec, design, tasks e validation", 9.5, "C3D0DE")

    card(s, 6.8, 4.2, 5.8, 1.9, LIGHT, BORDER, accent=GREEN)
    texto(s, 7.15, 4.4, 5.1, 0.3, "COMO A VALIDAÇÃO É ESCRITA", 8.5, GREEN, True)
    texto(s, 7.15, 4.72, 5.1, 1.1,
          "`producao/saldo.ts:42`\n“pendente = solicitado − executado; 1.182 testes verdes”",
          10, INK, espaco=1.3)

    texto(s, M, 6.35, CW, 0.4,
          "O `validation.md` não diz “funciona”. Diz **onde** e **como** foi verificado.",
          11, GRAY)

    notas(s, "2 min. Este slide explica o método que o professor quer ver. A ordem importa: primeiro o "
             "problema, depois o desenho, depois as fatias, por último a prova. O detalhe decisivo é o "
             "validation.md com arquivo:linha — é o que diferencia 'acredite em mim' de 'verifique'. "
             "Se perguntarem quem escreve, diga: o agente propõe, o time revisa e assina.")


def execucao():
    s = slide_novo()
    kicker(s, "Ato 4 · Execução e evidência")
    titulo(s, "O que saiu do backlog e chegou em produção", 27)
    regra(s)

    metricas = [
        ("1.182", "testes verdes", "+ 40 ignorados"),
        ("15/15", "UI · fluxo principal", "e 16/16 no segundo"),
        ("3", "PRs da Expedição", "#32, #33 e #34"),
        ("200", "health em produção", "Railway"),
    ]
    x = M
    for num, desc, extra in metricas:
        card(s, x, 1.95, 2.88, 1.55, LIGHT, BORDER, accent=TEAL)
        texto(s, x + 0.25, 2.1, 2.4, 0.55, num, 25, TEAL, True)
        texto(s, x + 0.25, 2.7, 2.45, 0.35, desc, 9.5, INK, True)
        texto(s, x + 0.25, 3.05, 2.45, 0.3, extra, 8, GRAY)
        x += 3.0

    texto(s, M, 3.85, 6.0, 0.35, "O QUE CADA PR LEVOU", 8.5, TEAL, True)
    bullets(s, M, 4.2, 6.2, 2.2, [
        "Spec e critérios de aceitação antes do código.",
        "Testes de regra e de integração no mesmo PR.",
        "Revisão por subagente + revisão humana.",
        "Merge só com `main` verde.",
    ], tamanho=10.5, espaco_entre=8)

    card(s, 7.35, 3.85, 5.25, 2.55, NAVY, None, accent=CYAN)
    texto(s, 7.65, 4.05, 4.7, 0.3, "GATES ANTES DO MERGE", 8.5, CYAN, True)
    gates = ["typecheck", "lint", "test", "build", "deploy", "smoke"]
    y = 4.42
    for g in gates:
        texto(s, 7.65, y, 0.32, 0.3, "OK", 7.5, CYAN, True)
        texto(s, 8.05, y, 2.9, 0.3, g, 10.5, WHITE, fonte=MONO)
        y += 0.31

    texto(s, M, 6.55, CW, 0.35,
          "**Nada foi considerado pronto por parecer pronto.**",
          11.5, GRAY)

    notas(s, "1 min. Não transforme isso em vaidade de números. Explique o que cada gate impede: "
             "typecheck impede contrato quebrado; lint impede padrão divergente; teste impede regressão; "
             "build impede deploy quebrado; smoke impede 'funciona local'. Os PRs da Expedição são o "
             "exemplo concreto de feature que atravessou tudo.")


def produto():
    s = slide_novo()
    kicker(s, "Ato 4 · O sistema em produção")
    titulo(s, "O que o operador vê", 28)
    regra(s)

    bullets(s, M, 2.0, 3.85, 3.4, [
        "Fila por setor, com o que falta produzir.",
        "Saldo por item: solicitado, executado, disponível e pendente.",
        "Prazo e remessas **sem baixar saldo**.",
        "A mesma tela serve ao gerente e ao vendedor, com permissões diferentes.",
    ], tamanho=10.5, espaco_entre=9)

    card(s, 4.75, 1.85, 7.85, 4.55, WHITE, BORDER)
    imagem_contain(s, SHOT, 4.86, 1.96, 7.63, 4.33)
    texto(s, 4.75, 6.5, 7.85, 0.3, "Pedido 70435 · captura real da demonstração", 8.5, GRAY,
          alinhamento=PP_ALIGN.RIGHT)

    notas(s, "1 min. Use a captura para ancorar a conversa no produto, não no código. Aponte três coisas: "
             "a barra de execução, o saldo por item e o alerta de prazo. Diga que a tela é a mesma para "
             "perfis diferentes, mas o que cada um vê é decidido no servidor. Não navegue ao vivo aqui — "
             "o vídeo já cobre o fluxo.")


def modelo():
    s = slide_novo()
    kicker(s, "Ato 5 · O modelo")
    titulo(s, "O modelo é bom de padrão.\nNão é bom de verdade.", 27)
    regra(s, 1.95)

    card(s, M, 2.2, 5.75, 2.55, LIGHT, BORDER, accent=GREEN)
    texto(s, M + 0.32, 2.4, 5.1, 0.3, "ONDE ELE AJUDA", 8.5, GREEN, True)
    bullets(s, M + 0.32, 2.78, 5.05, 1.4, [
        "Gerar e comparar alternativas.",
        "Resumir documentação longa.",
        "Revisar diff e apontar risco.",
        "Transformar requisito em teste.",
    ], tamanho=10.5, espaco_entre=7)
    texto(s, M + 0.32, 4.15, 5.05, 0.4,
          "Ex.: comparar duas propostas de schema.", 9, GRAY, espaco=1.1)

    card(s, 6.9, 2.2, 5.75, 2.55, LIGHT, BORDER, accent=AMBER)
    texto(s, 7.22, 2.4, 5.1, 0.3, "ONDE ELE ERRA", 8.5, AMBER, True)
    bullets(s, 7.22, 2.78, 5.05, 1.4, [
        "Inferir regra que não está escrita.",
        "Saber o que conta como evidência.",
        "Admitir que não sabe.",
        "Garantir que o usuário consegue usar.",
    ], tamanho=10.5, espaco_entre=7)
    texto(s, 7.22, 4.15, 5.05, 0.4,
          "Ex.: afirmar que o 4º setor existe.", 9, GRAY, espaco=1.1)

    card(s, M, 5.0, CW, 1.15, NAVY, None, accent=TEAL)
    texto(s, M + 0.4, 5.0, CW - 0.8, 1.15,
          "O modelo não sabe o que é “perda” no Corte e Dobra.\n"
          "Isso está no documento — e foi o time que decidiu.",
          14, WHITE, True, ancora=MSO_ANCHOR.MIDDLE, espaco=1.25)

    texto(s, M, 6.35, CW, 0.4,
          "Trocar de modelo muda custo e qualidade da proposta. **Não muda o processo.**",
          10.5, GRAY)

    notas(s, "2 min. Este slide responde diretamente ao pedido do professor sobre 'modelo'. "
             "Não trate o modelo como oráculo nem como enfeite: ele é bom em padrão e linguagem, "
             "ruim em verdade de negócio. Se perguntarem qual modelo vocês usaram, diga o nome e a versão "
             "e acrescente: o que garantiu o resultado foi o contrato, não a marca do modelo.")


def skills_historia():
    s = slide_novo()
    kicker(s, "Ato 5 · Skills, agentes e prompts")
    titulo(s, "As skills mudaram quando o time entendeu o problema", 25)
    regra(s)

    colunas = [
        ("COMEÇOU COM 6", TEAL, [
            "especificações", "domínio", "legado", "TDD", "segurança", "commits",
        ], "skills escritas à mão no início"),
        ("TROCAMOS 2", AMBER, [
            "spec-driven", "TDD",
        ], "pelo `tlc-spec-driven` de terceiros, mais maduro"),
        ("HOJE: 7 LOCAIS", GREEN, [
            "especificacoes-3e", "dominio-3e", "tdd-3e", "integracao-top-gerente",
            "seguranca-3e", "metricas-software-3e", "commits-convencionais",
        ], "regra do projeto injetada no momento certo"),
    ]
    x = M
    for tit, cor, itens, rodape_txt in colunas:
        card(s, x, 1.95, 3.78, 3.35, LIGHT, BORDER, accent=cor)
        texto(s, x + 0.3, 2.15, 3.2, 0.3, tit, 8.5, cor, True)
        y = 2.5
        for item in itens:
            texto(s, x + 0.3, y, 0.25, 0.28, "·", 13, cor, True)
            texto(s, x + 0.55, y, 3.0, 0.28, item, 10 if len(itens) > 3 else 11.5, INK,
                  fonte=MONO if len(itens) > 3 else FONT)
            y += 0.3 if len(itens) > 3 else 0.42
        texto(s, x + 0.3, 4.85, 3.2, 0.35, rodape_txt, 8, GRAY)
        x += 3.95

    texto(s, M + 3.95 + 0.3, 3.25, 3.15, 1.4,
          "O que mudou: critérios de aceitação, validação e rastreabilidade passaram a vir do framework.",
          9, GRAY, espaco=1.15)

    card(s, M, 5.6, CW, 0.9, NAVY, None, accent=CYAN)
    texto(s, M + 0.35, 5.6, CW - 0.7, 0.9,
          "Skill não deixa o agente mais inteligente. **Deixa o resultado mais previsível.**",
          12.5, WHITE, ancora=MSO_ANCHOR.MIDDLE)

    notas(s, "2 min. Conte a história honesta: começamos com 6 skills, percebemos que duas eram "
             "inferiores ao que existia pronto, trocamos. Isso é maturidade, não fracasso. "
             "Explique o que uma skill faz: injeta regra do projeto no momento da tarefa. "
             "Exemplo: a skill de TDD obriga teste antes; a de segurança obriga revisar credenciais.")


def subagentes():
    s = slide_novo()
    kicker(s, "Ato 5 · Subagentes")
    titulo(s, "Seis revisores que não podem editar nada", 27)
    regra(s)

    texto(s, M, 1.95, 5.3, 0.35, "O agente principal integra e decide. Os subagentes só leem e apontam.",
          11, GRAY)

    chips = [
        ("domain-reviewer", "regras e entidades"),
        ("test-reviewer", "lacunas de teste"),
        ("security-reviewer", "auth, segredos, entradas"),
        ("integration-reviewer", "legado e jobs"),
        ("frontend-reviewer", "UI e acessibilidade"),
        ("verifier", "veredito final com evidência"),
    ]
    x0, y0 = 6.2, 1.95
    larg, alt, gx, gy = 3.0, 1.12, 0.2, 0.2
    for i, (nome, desc) in enumerate(chips):
        col, lin = i % 2, i // 2
        x = x0 + col * (larg + gx)
        y = y0 + lin * (alt + gy)
        card(s, x, y, larg, alt, LIGHT, BORDER, accent=TEAL2)
        texto(s, x + 0.22, y + 0.2, larg - 0.44, 0.3, nome, 10, INK, True, fonte=MONO)
        texto(s, x + 0.22, y + 0.58, larg - 0.44, 0.4, desc, 8.5, GRAY)

    bullets(s, M, 2.45, 5.2, 3.2, [
        "**Somente leitura:** nenhum subagente altera arquivo.",
        "**Independência:** quem escreve não aprova o próprio trabalho.",
        "**Evidência:** o veredito cita arquivo, linha e teste.",
        "**Custo controlado:** cada um tem um escopo estreito.",
    ], tamanho=10.5, espaco_entre=10)

    card(s, M, 5.85, CW, 0.7, "EAF4F7", "BFE3EC", accent=TEAL)
    texto(s, M + 0.32, 5.85, CW - 0.64, 0.7,
          "Isso resolve o problema clássico de IA: **o mesmo agente que escreve também se avalia.**",
          11, INK, ancora=MSO_ANCHOR.MIDDLE)

    notas(s, "2 min. Explique a separação de papéis. O subagente é como um revisor de código que não tem "
             "permissão de commit. O verifier é o último: se não houver evidência, ele reprova. "
             "Se perguntarem 'não é burocracia?', responda: é mais barato que descobrir em produção.")


def prompts_rodada():
    s = slide_novo()
    kicker(s, "Ato 5 · Rodada de prompts")
    titulo(s, "Cada pessoa mostra um prompt do seu bloco — e o artefato que ele produziu", 22)
    regra(s)

    linhas = [
        ("Renan", "“Leia `AGENTS.md` e `STATE.md`. Escreva a spec antes de codar.”", "`AGENTS.md`"),
        ("Marcelo", "“Só proponha consolidação que preserve 100% do comportamento.”", "DER / MER"),
        ("Vanusa", "“Implemente só a task 3. Rode os gates e cole a saída.”", "PRs #32–#34"),
        ("Vanessa", "“Liste problemas por severidade antes de alterar a tela.”", "validação Playwright"),
    ]
    tabela(s, M, 1.95, 11.9, [1.4, 7.3, 3.2],
           ["Quem", "Prompt", "Artefato"], linhas,
           altura_linha=0.92, tamanho=10.5, tamanho_cab=8.5,
           alturas=[0.92] * 4, col_negrito=(0,))

    texto(s, M, 6.25, CW, 0.7,
          "**1 minuto cada.** O objetivo não é mostrar que o prompt é bonito: é mostrar que ele tem restrição, "
          "escopo e critério de saída.\n"
          "Padrões usados no projeto; o prompt literal da divisão está registrado no Notion.",
          9.5, GRAY, espaco=1.2)

    notas(s, "4 min no total (1 min por pessoa). Combine antes: cada um fala de pé ou sentado, mas "
             "aponta para o artefato na tela. Renan cronometra. Se alguém passar de 1 min, corte com "
             "'e o artefato está no repositório'. O valor está na variedade: quatro usos diferentes do "
             "mesmo agente.")


def fechamento():
    s = slide_novo()
    kicker(s, "Fechamento")
    titulo(s, "O que a IA não decide", 30)
    regra(s)

    itens = [
        ("Regra de negócio", "O que é perda, refugo, disponibilidade e exceção."),
        ("Escopo", "O que entra agora e o que fica para depois."),
        ("Evidência", "O que conta como prova suficiente para liberar."),
        ("Uso real", "O que o operador consegue fazer no chão de fábrica."),
    ]
    x = M
    for tit, desc in itens:
        card(s, x, 1.95, 2.88, 1.75, LIGHT, BORDER, accent=AMBER)
        texto(s, x + 0.25, 2.15, 2.45, 0.6, tit, 13, INK, True)
        texto(s, x + 0.25, 2.75, 2.4, 0.8, desc, 9.5, GRAY, espaco=1.1)
        x += 3.0

    card(s, M, 4.0, CW, 1.35, NAVY, None, accent=TEAL)
    texto(s, M + 0.4, 4.0, CW - 0.8, 1.35,
          "“O agente acelera a execução. Requisito, modelo, teste e revisão são o que garantem "
          "que o resultado é nosso — e que sabemos defendê-lo.”",
          16, WHITE, True, ancora=MSO_ANCHOR.MIDDLE, espaco=1.2)

    texto(s, M, 5.65, CW, 1.1,
          "O que fica para a próxima etapa: **modo offline**, **catálogos opcionais** e **BIGINT** — "
          "todos documentados como fase separada, não como dívida escondida.",
          11, GRAY, espaco=1.2)

    notas(s, "2 min. Feche com humildade e domínio. As quatro coisas que a IA não decide são o resumo "
             "de tudo. A frase final deve ser dita devagar. Depois abra para perguntas. Se o professor "
             "elogiar, não relaxe: a próxima pergunta provavelmente vai testar um número.")


def perguntas():
    s = slide_novo()
    kicker(s, "Perguntas")
    titulo(s, "Quem responde o quê", 28)
    regra(s)

    dados = [
        ("Renan", "Requisitos, AGENTS.md, skills, subagentes, Git", TEAL),
        ("Marcelo", "Banco, DER/MER, ETL, unidades, normalização", TEAL2),
        ("Vanusa", "Backlog, trilhas, PRs, testes, integração", GREEN),
        ("Vanessa", "Stack, Railway, Cloudflare, frontend, Playwright", AMBER),
    ]
    x = M
    for nome, temas, cor in dados:
        card(s, x, 1.95, 2.88, 1.3, LIGHT, BORDER, accent=cor)
        texto(s, x + 0.25, 2.1, 2.4, 0.4, nome, 15, INK, True)
        texto(s, x + 0.25, 2.52, 2.4, 0.65, temas, 9, GRAY, espaco=1.15)
        x += 3.0

    card(s, M, 3.5, CW, 1.0, "FEF7EC", "F3DFC0", accent=AMBER)
    texto(s, M + 0.35, 3.5, CW - 0.7, 1.0,
          "**Se ninguém souber:** “não validamos isso; está registrado como ponto aberto no STATE.md”. "
          "Isso vale mais do que improvisar.",
          12, INK, ancora=MSO_ANCHOR.MIDDLE, espaco=1.2)

    texto(s, M, 4.72, CW, 0.4, "Perguntas prováveis — e a resposta curta", 9, GRAY, True)

    linhas = [
        ("Por que não 19 tabelas?", "5 catálogos/fluxos opcionais; 1 foi absorvida."),
        ("A IA escreveu tudo?", "Ela executou; o time definiu requisito, modelo, critério e evidência."),
        ("Como evitam regressão?", "1.182 testes, gates no PR e verifier independente."),
    ]
    tabela(s, M, 5.0, 11.9, [4.2, 7.6],
           ["Pergunta", "Resposta curta"], linhas,
           altura_linha=0.38, tamanho=9.5, tamanho_cab=7.5,
           alturas=[0.38] * 3, col_negrito=(0,))

    notas(s, "10 min de perguntas. Use a tabela de domínio para redirecionar sem constrangimento. "
             "As três perguntas prováveis estão na tela; se vierem outras, responda com estrutura: "
             "contexto → decisão → evidência. Nunca invente um número.")


def backup():
    s = slide_novo()
    kicker(s, "Backup · para consulta durante as perguntas")
    titulo(s, "Números, links e o que faríamos diferente", 25)
    regra(s)

    texto(s, M, 1.95, 3.75, 0.3, "NÚMEROS", 8.5, TEAL, True)
    numeros = [
        ("14", "tabelas + 5 views"), ("26", "chaves estrangeiras"),
        ("15", "features especificadas"), ("7", "skills locais"),
        ("6", "subagentes"), ("1.182", "testes verdes"),
    ]
    y = 2.3
    for num, desc in numeros:
        texto(s, M, y, 0.9, 0.3, num, 14, TEAL, True)
        texto(s, M + 0.95, y + 0.03, 2.7, 0.3, desc, 9.5, INK)
        y += 0.45

    texto(s, 4.65, 1.95, 4.0, 0.3, "O QUE FARÍAMOS DIFERENTE", 8.5, AMBER, True)
    bullets(s, 4.65, 2.3, 4.0, 3.2, [
        "Nunca deixar credenciais em página compartilhada.",
        "Validar a UI antes do fim, não só no fechamento.",
        "Medir tempo por task para calibrar o backlog.",
        "Documentar o quarto setor antes de crescer.",
    ], tamanho=9.5, espaco_entre=9)

    texto(s, 8.95, 1.95, 3.7, 0.3, "LINKS", 8.5, GREEN, True)
    links = [
        ("Repositório", "github.com/Renan2004a/3e-operacoes"),
        ("Documento do banco", "docs/banco-3e-operacoes-2026-11-04.docx"),
        ("Vídeo", "docs/video-demo-2026-10-29/"),
        ("Specs", ".specs/features/"),
        ("Governança", "docs/governanca-agentes.md"),
    ]
    y = 2.3
    for tit, link in links:
        texto(s, 8.95, y, 3.7, 0.28, tit, 8.5, GRAY, True)
        texto(s, 8.95, y + 0.23, 3.7, 0.28, link, 8, INK, fonte=MONO)
        y += 0.58

    texto(s, M, 5.75, CW, 0.85,
          "Distribuição de commits: **302 / 57 / 15 / 13** (Renan, Marcelo, Vanusa, Vanessa). "
          "Número não é critério de mérito — é pista de quem revisou o quê.",
          9.5, GRAY, espaco=1.2)

    notas(s, "Slide de apoio, não apresentar. Use se o professor pedir números ou links. "
             "A parte de 'o que faríamos diferente' é a mais valiosa: mostra maturidade. "
             "Se ele perguntar sobre as credenciais do Notion, seja direto: identificamos, "
             "rotacionamos e removemos.")


def encerramento():
    s = prs.slides.add_slide(BLANK)
    gradiente(s, "08101F", "0F2A3D", 135)
    c = retangulo(s, 9.2, 3.6, 5.6, 5.6, None, TEAL, 1.0, 0.5, MSO_SHAPE.OVAL)
    alfa_linha(c, 30000)
    c2 = retangulo(s, 10.9, 5.2, 1.8, 1.8, TEAL, None, 0, 0.5, MSO_SHAPE.OVAL)
    alfa(c2, 12000)

    texto(s, 1.0, 1.6, 8.0, 0.3, "OBRIGADO", 10, CYAN, True)
    texto(s, 1.0, 2.0, 9.0, 1.2, "Perguntas?", 48, WHITE, True)
    texto(s, 1.0, 3.35, 8.5, 0.8,
          "O sistema está em produção; o banco, o vídeo e as specs estão no repositório.",
          12.5, "B9C6D4", espaco=1.2)

    retangulo(s, 1.0, 4.35, 1.4, 0.05, TEAL)
    texto(s, 1.0, 4.6, 8.5, 0.3,
          "Renan Alves Tavares · Marcelo Fiuza · Vanusa Oliveira · Vanessa Rodrigues",
          10, WHITE, True)
    texto(s, 1.0, 5.0, 8.5, 0.3, "github.com/Renan2004a/3e-operacoes", 9.5, GRAY2)

    notas(s, "Encerramento. Não leia o slide. Faça a pergunta 'o que vocês querem entender melhor?' "
             "e devolva para o time. Se houver silêncio, use a pergunta provável do slide anterior.")


# --------------------------------------------------------------------------- #
# Montagem
# --------------------------------------------------------------------------- #
def principal():
    capa()
    tese()
    linha_tempo()
    roteiro()

    divisor("01", "Levantamento\nde requisitos", "Do problema de papel ao requisito testável — e às perguntas que o time precisou responder.", ["O problema real", "As fontes de requisito", "O AGENTS.md como rascunho", "As 7 respostas que destravaram"], "Renan · 8 min")
    problema()
    fontes()
    agents_draft()
    respostas()
    conceito()

    divisor("02", "Modelagem de\nbanco de dados", "Do item operacional às 14 tabelas — e às decisões que o número esconde.", ["17 → 14 e 19 → 14", "O que não foi fundido", "MER e relações", "ETL com 0 órfãos"], "Marcelo · 10 min")
    banco_item()
    por_que_14()
    nao_fundir()
    mer_slide()
    etl()

    divisor("03", "Escolha de\nferramentas", "Por que essas ferramentas, e não as óbvias — restrição, risco e tempo.", ["Stack e banco", "Hospedagem", "Acesso ao legado", "Validação visual"], "Vanessa · 6 min")
    ferramentas()
    dois_casos()

    divisor("04", "Tasks e\nexecução", "Como 12 fases viraram 4 trilhas paralelas — e como cada entrega foi provada.", ["O backlog", "O prompt que dividiu o time", "As 4 trilhas", "Spec-driven e evidência"], "Vanusa · 13 min")
    backlog()
    prompt_real()
    trilhas()
    spec_driven()
    execucao()
    produto()

    divisor("05", "Skills, agentes\ne prompts", "O que o agente precisa saber, o que ele não pode decidir e como isso é contido.", ["O modelo", "Skills: 6 → 7", "Subagentes somente leitura", "Rodada de prompts"], "Renan + todos · 10 min")
    modelo()
    skills_historia()
    subagentes()
    prompts_rodada()

    fechamento()
    perguntas()
    backup()
    encerramento()

    prs.core_properties.title = "Como construímos o 3E Operações com um agente de IA"
    prs.core_properties.subject = "Seminário técnico — requisitos, modelagem, ferramentas, tasks e skills"
    prs.core_properties.author = "Renan Alves Tavares, Marcelo Fiuza, Vanusa Oliveira, Vanessa Rodrigues"
    prs.core_properties.keywords = "OpenCode, IA, spec-driven, banco de dados, engenharia de software"
    prs.core_properties.comments = "Gerado em 12/11/2026."

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    prs.save(SAIDA)
    print("PPTX gerado:", SAIDA)
    print("Slides:", len(prs.slides))


if __name__ == "__main__":
    principal()
