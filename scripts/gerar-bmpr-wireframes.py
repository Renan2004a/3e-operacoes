#!/usr/bin/env python3
"""Gera um BMPR (SQLite) com os wireframes do 3E Operações para importar no Balsamiq.

Saída: docs/wireframes/3e-operacoes-wireframes.bmpr
"""
import json
import os
import sqlite3
import uuid

W, H = 1312, 820
SIDEBAR_W = 250
MAIN_X = 286
MAIN_W = 1000

WHITE = 16777215
INK = 3355443
MUTED = 6710886
BORDER = 13421772
SOFT = 14737632
PANEL = 15790320
ACCENT = 5009299
ACCENT_BG = 15002612
GREEN = 3959374
GREEN_BG = 15134951
AMBER = 8808216
AMBER_BG = 16314326
RED = 9058874
RED_BG = 16245731
BLUE = 4023667
BLUE_BG = 14872305
HEADER_BG = 15790248

ICONE = {
    "Pedidos": ":square-check-regular:",
    "Ocorrências": ":triangle-exclamation-regular:",
}


def jt(texto, cor=None, negrito=False, link=False):
    no = texto
    if negrito:
        no = {"type": "bold", "children": [no]}
    if link:
        no = {"type": "link", "children": [no]}
    if cor is not None:
        no = {"type": "color", "color": cor, "children": [no]}
    return {"v": 1, "dom": [[no]]}


def jt_icone(icone, texto, cor=INK):
    return {
        "v": 1,
        "dom": [
            [
                {"type": "color", "color": cor, "children": [{"type": "icon", "children": [icone]}]},
                " ",
                {"type": "color", "color": cor, "children": [texto]},
            ]
        ],
    }


class Board:
    def __init__(self, nome, ordem, largura=W, altura=H):
        self.nome = nome
        self.ordem = ordem
        self.largura = largura
        self.altura = altura
        self.controles = []
        self.seq = 0

    def add(self, type_id, x, y, props, w=None, h=None):
        self.seq += 1
        mw = w if w is not None else 40
        mh = h if h is not None else 20
        c = {
            "ID": str(self.seq),
            "typeID": type_id,
            "zOrder": str(self.seq),
            "measuredW": str(max(1, round(mw))),
            "measuredH": str(max(1, round(mh))),
            "x": str(round(x, 1)),
            "y": str(round(y, 1)),
            "properties": props,
        }
        if w is not None:
            c["w"] = str(round(w, 1))
        if h is not None:
            c["h"] = str(round(h, 1))
        self.controles.append(c)
        return c

    def canvas(self):
        self.add("Canvas", 0, 0, {"color": WHITE, "borderColor": 14540253}, self.largura, self.altura)

    def card(self, x, y, w, h, fill=WHITE, border=BORDER):
        return self.add(
            "RoundButton",
            x,
            y,
            {
                "color": fill,
                "borderColor": border,
                "backgroundAlpha": "1",
                "jsonText": jt(""),
                "shape": "rectangle",
                "size": "16",
                "align": "left",
            },
            w,
            h,
        )

    def text(self, x, y, texto, size=14, cor=INK, negrito=False, link=False, icone=None):
        props = {
            "size": str(size),
            "jsonText": jt_icone(icone, texto, cor) if icone else jt(texto, cor, negrito, link),
        }
        largura = max(20, len(texto) * size * 0.56 + (24 if icone else 0))
        return self._add_text(x, y, props, largura, size * 1.35)

    def _add_text(self, x, y, props, mw, mh):
        self.seq += 1
        c = {
            "ID": str(self.seq),
            "typeID": "Text",
            "zOrder": str(self.seq),
            "measuredW": str(round(mw)),
            "measuredH": str(round(mh)),
            "x": str(round(x, 1)),
            "y": str(round(y, 1)),
            "properties": props,
        }
        self.controles.append(c)
        return c

    def button(self, x, y, w, h, texto, primario=False, size=13):
        fill = ACCENT if primario else WHITE
        cor = WHITE if primario else INK
        return self.add(
            "Button",
            x,
            y,
            {"color": fill, "borderColor": INK, "jsonText": jt(texto, cor), "size": str(size)},
            w,
            h,
        )

    def badge(self, x, y, texto, fill=SOFT, border=BORDER, cor=INK, size=11, w=None):
        largura = w if w is not None else max(58, len(texto) * size * 0.62 + 18)
        self.add(
            "RoundButton",
            x,
            y,
            {
                "color": fill,
                "borderColor": border,
                "backgroundAlpha": "1",
                "jsonText": jt(texto, cor),
                "shape": "rectangle",
                "size": str(size),
                "align": "center",
            },
            largura,
            24,
        )
        return largura

    def hrule(self, x, y, w, cor=BORDER):
        self.add("HRule", x, y, {"color": cor}, w, None)

    def vrule(self, x, y, h, cor=BORDER):
        self.add("VRule", x, y, {"color": cor}, None, h)

    def input(self, x, y, w, placeholder, label=None):
        if label:
            self.text(x, y, label, 11, MUTED, negrito=True)
            y += 17
        self.card(x, y, w, 32, WHITE, INK)
        self.text(x + 10, y + 8, placeholder, 12, MUTED)
        return y + 32

    def select(self, x, y, w, valor, label=None):
        if label:
            self.text(x, y, label, 11, MUTED, negrito=True)
            y += 17
        self.card(x, y, w, 32, WHITE, INK)
        self.text(x + 10, y + 8, valor, 12, INK)
        self.text(x + w - 18, y + 8, "▾", 11, MUTED)
        return y + 32

    def textarea(self, x, y, w, h, placeholder, label=None):
        if label:
            self.text(x, y, label, 11, MUTED, negrito=True)
            y += 17
        self.card(x, y, w, h, WHITE, INK)
        self.text(x + 10, y + 8, placeholder, 12, MUTED)
        return y + h

    def metric(self, x, y, w, label, valor, fill=WHITE, helper=None):
        self.card(x, y, w, 74, fill, BORDER)
        self.text(x + 12, y + 9, label.upper(), 10, MUTED, negrito=True)
        self.text(x + 12, y + 25, valor, 22, INK, negrito=True)
        if helper:
            self.text(x + 12, y + 54, helper, 10, MUTED)

    def alert(self, x, y, w, titulo, corpo="", tone="info"):
        fills = {"success": GREEN_BG, "error": RED_BG, "warning": AMBER_BG, "info": BLUE_BG}
        borders = {"success": GREEN, "error": RED, "warning": AMBER, "info": BLUE}
        h = 52 if corpo else 34
        self.card(x, y, w, h, fills[tone], borders[tone])
        self.card(x, y, 6, h, borders[tone], borders[tone])
        self.text(x + 16, y + 8, titulo, 12, INK, negrito=True)
        if corpo:
            self.text(x + 16, y + 26, corpo, 11, MUTED)
        return h

    def progress(self, x, y, w, label, pct, helper=None, cor=ACCENT):
        self.text(x, y, label, 12, INK)
        self.text(x + w - 48, y, f"{pct}%", 12, INK, negrito=True)
        self.card(x, y + 19, w, 12, WHITE, INK)
        self.card(x + 2, y + 21, max(2, (w - 4) * pct / 100), 8, cor, cor)
        if helper:
            self.text(x, y + 35, helper, 10, MUTED)
        return 52

    def check(self, x, y, label, marcado=False):
        self.card(x, y, 16, 16, WHITE, INK)
        if marcado:
            self.text(x + 3, y + 1, "✓", 11, INK, negrito=True)
        self.text(x + 24, y + 1, label, 12, INK)
        return 20

    def table(self, x, y, w, headers, rows, fracoes, row_h=30):
        h = 30 + row_h * len(rows)
        self.card(x, y, w, h, WHITE, BORDER)
        self.card(x, y, w, 30, HEADER_BG, BORDER)
        cx = x
        for header, frac in zip(headers, fracoes):
            self.text(cx + 10, y + 8, header.upper(), 10, MUTED, negrito=True)
            cx += w * frac
        self.hrule(x, y + 30, w)
        cy = y + 30
        for row in rows:
            cx = x
            for i, (cell, frac) in enumerate(zip(row, fracoes)):
                cor = INK if i == 0 else MUTED
                self.text(cx + 10, cy + 8, cell, 12, cor, negrito=(i == 0))
                cx += w * frac
            cy += row_h
            if cy < y + h - 2:
                self.hrule(x, cy, w)
        return h

    def shell(self, titulo, subtitulo, nav, ativo, usuario, papel, crumb="", conteudo_y=205):
        self.canvas()
        self.card(16, 16, SIDEBAR_W, self.altura - 32, PANEL, PANEL)
        self.card(36, 38, 34, 40, ACCENT, ACCENT)
        self.text(47, 48, "3E", 12, WHITE, negrito=True)
        self.text(80, 38, "3E Operações", 16, INK, negrito=True)
        self.text(80, 61, "Gestão integrada", 12, MUTED)
        for i, item in enumerate(nav):
            iy = 110 + 42 * i
            if item == ativo:
                self.card(36, iy - 6, 209, 34, ACCENT_BG, BORDER)
            icone = ICONE.get(item)
            self.text(46, iy, item, 13, INK, negrito=(item == ativo), icone=icone)
        self.hrule(36, 633, 209)
        self.text(36, 650, usuario, 13, INK, negrito=True)
        self.text(36, 673, papel, 11, MUTED)
        self.text(36, 696, "Sair", 11, MUTED, link=True)
        self.vrule(266, 16, self.altura - 32)
        self.card(MAIN_X - 20, 16, MAIN_W + 40, self.altura - 32, WHITE, WHITE)
        self.text(MAIN_X, 44, crumb, 11, INK, negrito=True)
        self.text(1060, 47, "27/10/2026 08:40", 11, MUTED)
        self.button(1214, 36, 62, 34, "Sair", size=11)
        self.hrule(MAIN_X, 89, MAIN_W)
        self.text(MAIN_X, 110, titulo, 24, INK, negrito=True)
        self.text(MAIN_X, 153, subtitulo, 13, MUTED)
        return conteudo_y


# ---------------------------------------------------------------- telas

def wf01():
    b = Board("WF-01 · Login", 1001)
    b.canvas()
    b.card(0, 0, 720, H, 2509633, 2509633)
    b.badge(40, 40, "3E Ferro e Aço", fill=2509633, border=WHITE, cor=WHITE)
    b.text(40, 110, "Pedidos, produção e expedição", 26, WHITE, negrito=True)
    b.text(40, 146, "em uma visão integrada.", 26, WHITE, negrito=True)
    b.text(40, 205, "Interface para reduzir controles em papel,", 13, 14277081)
    b.text(40, 226, "melhorar a rastreabilidade e apoiar o PCP.", 13, 14277081)
    b.card(770, 190, 420, 410, WHITE, BORDER)
    b.card(800, 220, 34, 34, ACCENT, ACCENT)
    b.text(810, 228, "3E", 11, WHITE, negrito=True)
    b.text(846, 218, "3E Operações", 14, INK, negrito=True)
    b.text(846, 238, "Acesso ao sistema", 11, MUTED)
    b.text(800, 278, "Entrar", 24, INK, negrito=True)
    b.text(800, 312, "Use suas credenciais para acessar as funcionalidades do seu perfil.", 12, MUTED)
    b.input(800, 350, 360, "seu.email@3e.com.br", "E-mail *")
    b.input(800, 410, 360, "••••••••", "Senha *")
    b.button(800, 470, 360, 44, "Entrar", primario=True, size=14)
    return b


def wf02():
    b = Board("WF-02 · Redirecionamento", 1002)
    b.canvas()
    b.card(406, 260, 500, 190, WHITE, BORDER)
    b.text(456, 292, "3E FERRO E AÇO", 10, ACCENT, negrito=True)
    b.text(456, 318, "3E Operações", 24, INK, negrito=True)
    b.text(456, 360, "Seu perfil ainda não tem telas disponíveis.", 13, MUTED)
    b.text(456, 382, "Fale com o responsável pelo sistema.", 13, MUTED)
    b.text(456, 410, "Sem sessão → /login  ·  com sessão → rota inicial do perfil", 11, MUTED)
    return b


def wf03():
    b = Board("WF-03 · Vendas", 1003)
    y = b.shell(
        "Vendas",
        "Puxe o pedido do Top Gerente, desmembre os itens por setor e acompanhe o saldo de entrega.",
        ["Vendas"], "Vendas", "Ana Vendedora", "Vendedor", "Vendas",
    )
    b.card(MAIN_X, y, 520, 150, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 12, "Puxar pedido do Top Gerente", 14, INK, negrito=True)
    b.input(MAIN_X + 14, y + 42, 320, "Ex.: 70435", "Número do pedido *")
    b.text(MAIN_X + 14, y + 96, "Somente dígitos, como aparece no Top Gerente.", 10, MUTED)
    b.button(MAIN_X + 350, y + 60, 150, 40, "Importar pedido", primario=True)
    b.card(MAIN_X + 542, y, 468, 150, WHITE, BORDER)
    b.text(MAIN_X + 556, y + 12, "Como funciona", 14, INK, negrito=True)
    for i, passo in enumerate([
        "1. Informe o número do pedido e puxe os dados.",
        "2. Abra o pedido e faça o desmembramento por setor.",
        "3. Defina o prazo e programe as remessas.",
    ]):
        b.text(MAIN_X + 556, y + 42 + i * 30, passo, 12, INK)
    b.text(MAIN_X, y + 170, "Pedidos", 16, INK, negrito=True)
    b.card(MAIN_X, y + 198, MAIN_W, 118, WHITE, BORDER)
    b.input(MAIN_X + 14, y + 210, 300, "Trecho do número", "Pesquisar por número")
    b.input(MAIN_X + 330, y + 210, 300, "Trecho do nome", "Cliente")
    b.select(MAIN_X + 646, y + 210, 160, "Todos", "Setor")
    b.select(MAIN_X + 822, y + 210, 164, "Todos", "Status")
    b.button(MAIN_X + 14, y + 280, 90, 28, "Filtrar", primario=True, size=11)
    b.button(MAIN_X + 112, y + 280, 120, 28, "Limpar filtros", size=11)
    b.text(MAIN_X, y + 330, "128 pedido(s) encontrado(s) — página 1 de 7.", 11, MUTED)
    b.table(
        MAIN_X, y + 352, MAIN_W,
        ["Pedido", "Cliente", "Status", "Ações"],
        [
            ["Pedido 70435", "Metalúrgica Alfa", "Em andamento", "Abrir"],
            ["Pedido 82269", "Construtora Beta", "Pendente", "Abrir"],
            ["Pedido 91004", "Revenda Gama", "Produção concluída", "Abrir"],
        ],
        [0.22, 0.38, 0.25, 0.15],
    )
    b.text(MAIN_X, y + 470, "Anterior", 11, MUTED)
    b.text(MAIN_X + 460, y + 470, "Página 1 de 7", 11, MUTED)
    b.text(MAIN_X + 930, y + 470, "Próxima", 11, MUTED)
    return b


def wf04():
    b = Board("WF-04 · Detalhe do pedido (Vendedor)", 1004)
    y = b.shell(
        "Pedido 70435",
        "Metalúrgica Alfa",
        ["Vendas"], "Vendas", "Ana Vendedora", "Vendedor", "Vendas / Pedido 70435",
    )
    b.text(MAIN_X, y - 24, "← Voltar para os pedidos", 11, ACCENT, link=True)
    b.metric(MAIN_X, y, 320, "Itens", "6", WHITE, "No pedido.")
    b.metric(MAIN_X + 336, y, 320, "Pendentes de desmembramento", "1", AMBER_BG, "Itens sem setor definido.")
    b.metric(MAIN_X + 672, y, 328, "Pendentes de produção", "38 un", WHITE, "A produzir, por unidade.")
    b.card(MAIN_X, y + 84, MAIN_W, 140, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 96, "Resumo do pedido", 14, INK, negrito=True)
    b.progress(MAIN_X + 14, y + 122, 450, "Execução do pedido (un)", 62, "38 de 60 un executadas.")
    b.text(MAIN_X + 520, y + 124, "Corte e Dobra · 3 itens · 20 un · pendente 8", 11, MUTED)
    b.text(MAIN_X + 520, y + 146, "Telhas · 2 itens · 40 un · pendente 20", 11, MUTED)
    b.text(MAIN_X + 520, y + 168, "Não classificado · 1 item · 10 un · pendente 10", 11, MUTED)
    b.card(MAIN_X, y + 240, MAIN_W, 370, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 252, "Telha termoac. eps30 trap 40 980 0,43", 18, INK, negrito=True)
    b.text(MAIN_X + 14, y + 278, "Item 1 · Código TR-980 · un", 11, MUTED)
    b.badge(MAIN_X + 760, y + 252, "un", SOFT, BORDER, INK)
    b.badge(MAIN_X + 820, y + 252, "Desmembrado", GREEN_BG, GREEN, GREEN)
    b.progress(MAIN_X + 14, y + 308, 700, "Execução do item 1", 50, "10 de 20 un executadas.")
    for i, (lab, val) in enumerate([
        ("Solicitado", "20"), ("Executado", "10"), ("Disponível", "6"),
        ("Entregue", "4"), ("Pendente", "10"), ("Unidade", "un"),
    ]):
        col = i % 3
        lin = i // 3
        b.text(MAIN_X + 14 + col * 240, y + 360 + lin * 34, lab, 10, MUTED)
        b.text(MAIN_X + 14 + col * 240, y + 374 + lin * 34, val, 12, INK, negrito=True)
    b.text(MAIN_X + 14, y + 432, "Setor: Telhas · Em andamento  ·  Prazo do setor: 30/10/2026", 11, MUTED)
    b.input(MAIN_X + 14, y + 456, 180, "dd/mm/aaaa", "Prazo do item 1")
    b.button(MAIN_X + 210, y + 473, 110, 32, "Salvar prazo", size=11)
    b.badge(MAIN_X + 14, y + 510, "Prazo de entrega: 05/11/2026", GREEN_BG, GREEN, GREEN)
    b.text(MAIN_X + 14, y + 548, "Desmembramento", 13, INK, negrito=True)
    b.alert(MAIN_X + 14, y + 568, 560, "Item desmembrado", "Setor definido: Telhas. Continue com as remessas abaixo.", "success")
    b.text(MAIN_X + 610, y + 548, "Correção de setor", 13, INK, negrito=True)
    b.button(MAIN_X + 610, y + 570, 130, 30, "Corrigir setor", size=11)
    b.text(MAIN_X + 610, y + 610, "Entregas programadas (remessas)", 13, INK, negrito=True)
    b.button(MAIN_X + 820, y + 602, 160, 30, "+ Adicionar remessa", size=11)
    b.text(MAIN_X + 610, y + 640, "1ª remessa · prevista para 30/10/2026 · Confirmada", 11, MUTED)
    b.text(MAIN_X + 610, y + 660, "2ª remessa · prevista para 05/11/2026 · Confirmar / Remover", 11, MUTED)
    return b


def wf05():
    b = Board("WF-05 · Painel do Gerente", 1005)
    y = b.shell(
        "Painel",
        "Andamento da produção por setor e status.",
        ["Painel", "Pedidos", "Importar", "Fila"], "Painel",
        "Marcos Gerente", "Gerente de Produção", "Painel",
    )
    b.metric(MAIN_X, y, 238, "Pendências", "12", WHITE, "Atividades não concluídas.")
    b.metric(MAIN_X + 254, y, 238, "Em andamento", "5", BLUE_BG, "Em execução.")
    b.metric(MAIN_X + 508, y, 238, "Concluídas", "27", GREEN_BG, "Finalizadas.")
    b.metric(MAIN_X + 762, y, 238, "Cumprimento de prazo", "75%", GREEN_BG, "3 de 4 no prazo.")
    b.card(MAIN_X, y + 88, MAIN_W, 122, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 100, "Alertas operacionais", 14, INK, negrito=True)
    for i, (titulo, tone, item) in enumerate([
        ("Atrasados", "error", "Pedido 1001 · Corte e Dobra · 2 dias"),
        ("Parados", "warning", "Pedido 1002 · Telhas · 5 dias"),
        ("Não encaminhados", "info", "Pedido 1003 · Sem setor definido"),
    ]):
        x = MAIN_X + 14 + i * 330
        b.badge(x, y + 126, titulo, {"error": RED_BG, "warning": AMBER_BG, "info": BLUE_BG}[tone],
                {"error": RED, "warning": AMBER, "info": BLUE}[tone], INK)
        b.text(x, y + 158, item, 11, MUTED)
    b.card(MAIN_X, y + 224, MAIN_W, 196, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 236, "Ocorrências recentes", 14, INK, negrito=True)
    b.badge(MAIN_X + 720, y + 234, "13 no total", SOFT, BORDER, INK)
    b.badge(MAIN_X + 820, y + 234, "4 nos últimos 7 dias", AMBER_BG, AMBER, AMBER)
    for i, (tipo, tone, texto) in enumerate([
        ("Perda", "error", "Pedido 70435 · Telha termoac. 980"),
        ("Indisponibilidade", "warning", "Pedido 70435 · Telha termoac. 980"),
    ]):
        yy = y + 266 + i * 62
        largura = b.badge(MAIN_X + 14, yy, tipo, {"error": RED_BG, "warning": AMBER_BG}[tone],
                          {"error": RED, "warning": AMBER}[tone], INK)
        xt = MAIN_X + 14 + largura + 12
        b.text(xt, yy + 2, texto, 12, INK, negrito=True)
        b.text(xt, yy + 20, "Setor: Telhas · Responsável: João Operador · Motivo: Defeito de corte", 10, MUTED)
        b.text(xt, yy + 36, "26/10/2026 10:33", 10, MUTED)
    b.card(MAIN_X, y + 434, 490, 150, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 446, "Produção por setor", 14, INK, negrito=True)
    b.progress(MAIN_X + 14, y + 474, 440, "Corte e Dobra · 12,5 M", 70, None)
    b.progress(MAIN_X + 14, y + 518, 440, "Telhas · 40 un", 100, None, GREEN)
    b.card(MAIN_X + 510, y + 434, 490, 150, WHITE, BORDER)
    b.text(MAIN_X + 524, y + 446, "Atividades por status", 14, INK, negrito=True)
    for i, (lab, val) in enumerate([("Pendente", "7"), ("Em execução", "5"), ("Concluída", "27")]):
        b.text(MAIN_X + 524, y + 476 + i * 30, lab, 12, INK)
        b.text(MAIN_X + 940, y + 476 + i * 30, val, 12, INK, negrito=True)
    return b


def wf06():
    b = Board("WF-06 · Pedidos do Gerente", 1006)
    y = b.shell(
        "Pedidos", "Consulte e abra o detalhe dos pedidos.",
        ["Painel", "Pedidos", "Importar", "Fila"], "Pedidos",
        "Marcos Gerente", "Gerente de Produção", "Pedidos",
    )
    b.card(MAIN_X, y, MAIN_W, 118, WHITE, BORDER)
    b.input(MAIN_X + 14, y + 12, 300, "Trecho do número", "Pesquisar por número")
    b.input(MAIN_X + 330, y + 12, 300, "Trecho do nome", "Cliente")
    b.select(MAIN_X + 646, y + 12, 160, "Todos", "Setor")
    b.select(MAIN_X + 822, y + 12, 164, "Todos", "Status")
    b.button(MAIN_X + 14, y + 82, 90, 28, "Filtrar", primario=True, size=11)
    b.button(MAIN_X + 112, y + 82, 120, 28, "Limpar filtros", size=11)
    b.text(MAIN_X, y + 132, "128 pedido(s) encontrado(s) — página 1 de 7.", 11, MUTED)
    b.table(
        MAIN_X, y + 154, MAIN_W,
        ["Pedido", "Cliente", "Status", "Ações"],
        [
            ["Pedido 70435", "Metalúrgica Alfa", "Em andamento", "Abrir"],
            ["Pedido 82269", "Construtora Beta", "Pendente", "Abrir"],
            ["Pedido 91004", "Revenda Gama", "Produção concluída", "Abrir"],
            ["Pedido 91120", "Obras Sul", "Em andamento", "Abrir"],
        ],
        [0.22, 0.38, 0.25, 0.15],
    )
    b.text(MAIN_X, y + 300, "Anterior     Página 1 de 7     Próxima", 11, MUTED)
    return b


def wf07():
    b = Board("WF-07 · Detalhe e correção (Gerente)", 1007)
    y = b.shell(
        "Pedido 70435", "Metalúrgica Alfa",
        ["Painel", "Pedidos", "Importar", "Fila"], "Pedidos",
        "Marcos Gerente", "Gerente de Produção", "Pedidos / Pedido 70435",
    )
    b.text(MAIN_X, y - 24, "← Voltar para os pedidos", 11, ACCENT, link=True)
    b.metric(MAIN_X, y, 320, "Itens", "6", WHITE, "No pedido.")
    b.metric(MAIN_X + 336, y, 320, "Pendentes de desmembramento", "0", GREEN_BG, "Itens sem setor definido.")
    b.metric(MAIN_X + 672, y, 328, "Pendentes de produção", "38 un", WHITE, "A produzir, por unidade.")
    b.card(MAIN_X, y + 84, MAIN_W, 430, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 96, "Perfil UE 100×50", 18, INK, negrito=True)
    b.text(MAIN_X + 14, y + 122, "Item 2 · Código PF-100 · un", 11, MUTED)
    b.badge(MAIN_X + 820, y + 96, "Desmembrado", GREEN_BG, GREEN, GREEN)
    b.progress(MAIN_X + 14, y + 152, 700, "Execução do item 2", 40, "4 de 10 un executadas.")
    for i, (lab, val) in enumerate([
        ("Solicitado", "10"), ("Executado", "4"), ("Disponível", "3"),
        ("Entregue", "2"), ("Pendente", "6"), ("Unidade", "un"),
    ]):
        col = i % 3
        lin = i // 3
        b.text(MAIN_X + 14 + col * 240, y + 200 + lin * 34, lab, 10, MUTED)
        b.text(MAIN_X + 14 + col * 240, y + 214 + lin * 34, val, 12, INK, negrito=True)
    b.text(MAIN_X + 14, y + 272, "Setor: Corte e Dobra · Em andamento  ·  Prazo do setor: 29/10/2026", 11, MUTED)
    b.input(MAIN_X + 14, y + 296, 180, "05/11/2026", "Prazo do item 2")
    b.button(MAIN_X + 210, y + 313, 110, 32, "Salvar prazo", size=11)
    b.text(MAIN_X + 14, y + 360, "Correção de setor", 13, INK, negrito=True)
    b.text(MAIN_X + 760, y + 360, "− Fechar", 11, MUTED)
    b.card(MAIN_X + 14, y + 382, 720, 118, PANEL, BORDER)
    b.select(MAIN_X + 28, y + 394, 240, "Telhas", "Novo setor do item 2")
    b.textarea(MAIN_X + 284, y + 394, 300, 58, "Motivo da correção (mín. 15 caracteres)", "Motivo *")
    b.button(MAIN_X + 600, y + 420, 120, 30, "Confirmar", primario=True, size=11)
    b.button(MAIN_X + 600, y + 456, 120, 28, "Cancelar", size=11)
    b.text(MAIN_X + 14, y + 512, "Entregas programadas (remessas)", 13, INK, negrito=True)
    b.text(MAIN_X + 14, y + 534, "Sem remessa programada.", 11, MUTED)
    return b


def wf08():
    b = Board("WF-08 · Meus pedidos (Operador)", 1008)
    y = b.shell(
        "Meus pedidos",
        "Atividades dos seus setores. Abra uma atividade para registrar a produção.",
        ["Pedidos", "Ocorrências"], "Pedidos",
        "João Operador", "Operador · Telhas", "Meus pedidos",
    )
    for i, (prio, titulo, pedido, status, tone) in enumerate([
        ("Prioridade 2 · Telhas", "Telha termoac. eps30 trap 40 980 0,43", "Pedido 70435", "Em andamento", "warning"),
        ("Prioridade 1 · Telhas", "Telha termoac. eps30 trap 40 980 0,50", "Pedido 82269", "Pendente", "neutral"),
    ]):
        yy = y + i * 150
        b.card(MAIN_X, yy, MAIN_W, 130, WHITE, BORDER)
        b.text(MAIN_X + 14, yy + 12, prio, 10, MUTED, negrito=True)
        b.text(MAIN_X + 14, yy + 32, titulo, 16, INK, negrito=True)
        b.text(MAIN_X + 14, yy + 58, pedido, 12, MUTED)
        fill, border, cor = {
            "warning": (AMBER_BG, AMBER, AMBER),
            "neutral": (SOFT, BORDER, INK),
        }[tone]
        b.badge(MAIN_X + 880, yy + 14, status, fill, border, cor)
        b.button(MAIN_X + 14, yy + 82, 160, 36, "Abrir atividade", primario=True, size=12)
    b.text(MAIN_X, y + 320, "Vazio: “Nenhum pedido para você agora.”  ·  Erro: alerta + tentar de novo.", 11, MUTED)
    return b


def wf09():
    b = Board("WF-09 · Executar atividade (Operador)", 1009)
    y = b.shell(
        "Executar atividade", "Registre a produção do item.",
        ["Pedidos", "Ocorrências"], "Pedidos",
        "João Operador", "Operador · Telhas", "Meus pedidos / Executar atividade",
    )
    b.text(MAIN_X, y - 24, "← Voltar para meus pedidos", 11, ACCENT, link=True)
    b.text(MAIN_X + 700, y - 24, "Ver ordem de produção", 11, ACCENT, link=True)
    b.card(MAIN_X, y, MAIN_W, 160, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 12, "Telha termoac. eps30 trap 40 980 0,43", 16, INK, negrito=True)
    b.text(MAIN_X + 14, y + 38, "Pedido 70435 · Setor Telhas", 11, MUTED)
    b.progress(MAIN_X + 14, y + 64, 600, "Progresso da atividade", 50, "10 de 20 un executadas.")
    b.text(MAIN_X + 14, y + 116, "Solicitado: 20 un   ·   Executado: 10 un   ·   Pendente: 10 un", 12, INK)
    b.card(MAIN_X, y + 176, MAIN_W, 120, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 188, "Registrar execução", 14, INK, negrito=True)
    b.input(MAIN_X + 14, y + 214, 260, "Ex.: 2", "Quantidade produzida *")
    b.button(MAIN_X + 290, y + 231, 160, 36, "Registrar execução", primario=True, size=12)
    b.card(MAIN_X, y + 312, MAIN_W, 100, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 324, "Ocorrência", 14, INK, negrito=True)
    b.text(MAIN_X + 14, y + 348, "Teve uma perda, refugo ou outro problema? Registre na tela de ocorrências.", 12, MUTED)
    b.button(MAIN_X + 14, y + 372, 160, 32, "Registrar ocorrência", primario=True, size=11)
    b.text(MAIN_X + 190, y + 380, "Ver minhas ocorrências", 11, ACCENT, link=True)
    return b


def wf10():
    b = Board("WF-10 · Ocorrências (Operador)", 1010)
    y = b.shell(
        "Ocorrências", "Registre problemas da produção e consulte o que já foi registrado.",
        ["Pedidos", "Ocorrências"], "Ocorrências",
        "João Operador", "Operador · Telhas", "Ocorrências",
    )
    b.text(MAIN_X, y - 24, "← Voltar para meus pedidos", 11, ACCENT, link=True)
    b.card(MAIN_X, y, MAIN_W, 220, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 12, "Registrar ocorrência", 14, INK, negrito=True)
    b.select(MAIN_X + 14, y + 40, 460, "Pedido 70435 · Telha termoac. 980 · Telhas", "Atividade *")
    b.text(MAIN_X + 14, y + 92, "Escolha o pedido/item em que o problema aconteceu.", 10, MUTED)
    b.select(MAIN_X + 14, y + 116, 220, "Perda", "Tipo de ocorrência *")
    b.select(MAIN_X + 250, y + 116, 220, "Defeito de corte", "Motivo *")
    b.input(MAIN_X + 486, y + 116, 180, "Ex.: 2", "Quantidade")
    b.input(MAIN_X + 682, y + 116, 304, "Opcional", "Observação")
    b.button(MAIN_X + 14, y + 182, 160, 32, "Registrar ocorrência", primario=True, size=11)
    b.card(MAIN_X, y + 236, MAIN_W, 210, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 248, "Minhas ocorrências", 14, INK, negrito=True)
    b.badge(MAIN_X + 860, y + 246, "13 registrada(s)", SOFT, BORDER, INK)
    for i, (tipo, tone, texto, detalhe) in enumerate([
        ("Perda", "error", "Pedido 70435 · Telha termoac. 980", "Setor: Telhas · Defeito de corte · Quantidade: 1 · 21/10/2026 23:55"),
        ("Indisponibilidade", "warning", "Pedido 70435 · Telha termoac. 980", "Setor: Telhas · Saldo insuficiente · Quantidade: 12 · 26/10/2026 10:33"),
    ]):
        yy = y + 278 + i * 66
        largura = b.badge(MAIN_X + 14, yy, tipo, {"error": RED_BG, "warning": AMBER_BG}[tone],
                          {"error": RED, "warning": AMBER}[tone], INK)
        xt = MAIN_X + 14 + largura + 12
        b.text(xt, yy + 2, texto, 12, INK, negrito=True)
        b.text(xt, yy + 20, detalhe, 10, MUTED)
    return b


def wf11():
    b = Board("WF-11 · Entregas (Expedição)", 1011)
    y = b.shell(
        "Entregas", "Itens disponíveis e registro de entrega.",
        ["Entregas"], "Entregas", "Rita Expedição", "Expedição", "Entregas",
    )
    b.select(MAIN_X, y, 360, "Pedido 70435", "Pedido")
    b.metric(MAIN_X, y + 58, 320, "Itens", "6", WHITE, "No pedido.")
    b.metric(MAIN_X + 336, y + 58, 320, "Disponíveis", "28 un", GREEN_BG, "Para entrega.")
    b.metric(MAIN_X + 672, y + 58, 328, "Pendentes", "38 un", WHITE, "A produzir.")
    b.card(MAIN_X, y + 148, MAIN_W, 240, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 160, "Item 1", 14, INK, negrito=True)
    b.text(MAIN_X + 14, y + 184, "Disponível: 6 un", 11, MUTED)
    b.badge(MAIN_X + 880, y + 158, "Disponível", GREEN_BG, GREEN, GREEN)
    b.text(MAIN_X + 14, y + 210, "Solicitado: 20 · Executado: 10 · Entregue: 4 · Pendente: 10", 12, INK)
    b.input(MAIN_X + 14, y + 238, 220, "Ex.: 2", "Quantidade do item 1 *")
    b.button(MAIN_X + 250, y + 255, 150, 36, "Registrar entrega", primario=True, size=12)
    b.alert(MAIN_X + 14, y + 300, 640, "Quantidade acima do disponível: exige autorização de gerente.",
            "Marque “Autorizar acima do disponível”, informe o motivo e registre.", "warning")
    b.check(MAIN_X + 32, y + 360, "Autorizar acima do disponível")
    return b


def wf12():
    b = Board("WF-12 · Importar pedido", 1012)
    y = b.shell(
        "Importar pedido", "Informe o número do pedido para importar do Top Gerente.",
        ["Painel", "Pedidos", "Importar", "Fila"], "Importar",
        "Marcos Gerente", "Gerente de Produção", "Importar pedido",
    )
    b.card(MAIN_X, y, 470, 150, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 12, "Puxar pedido do Top Gerente", 14, INK, negrito=True)
    b.input(MAIN_X + 14, y + 42, 300, "Ex.: 70435", "Número do pedido *")
    b.text(MAIN_X + 14, y + 96, "Somente dígitos, como aparece no Top Gerente.", 10, MUTED)
    b.button(MAIN_X + 14, y + 116, 150, 32, "Importar pedido", primario=True, size=11)
    b.card(MAIN_X + 486, y, 514, 300, WHITE, BORDER)
    b.text(MAIN_X + 500, y + 12, "Status da importação", 14, INK, negrito=True)
    b.badge(MAIN_X + 880, y + 10, "Processando", BLUE_BG, BLUE, BLUE)
    b.text(MAIN_X + 500, y + 42, "Job cmuyq0ygh00024skr623teegx", 10, MUTED)
    b.text(MAIN_X + 500, y + 66, "Consultando o Top Gerente…", 12, INK)
    b.alert(MAIN_X + 500, y + 92, 486, "A importação pode levar alguns segundos.", "Não feche esta tela.", "info")
    b.alert(MAIN_X + 500, y + 156, 486, "Unidade preservada",
            "O Top Gerente enviou uma unidade diferente. A anterior foi mantida.", "warning")
    b.text(MAIN_X + 500, y + 226, "Abrir pedido", 11, ACCENT, link=True)
    return b


def wf13():
    b = Board("WF-13 · Usuários", 1013)
    y = b.shell(
        "Usuários", "Cadastre usuários, associe perfis e setores e controle o acesso.",
        ["Usuários", "Setores"], "Usuários", "Admin 3E", "Responsável pelo Sistema", "Usuários",
    )
    b.card(MAIN_X, y, MAIN_W, 210, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 12, "Novo usuário", 14, INK, negrito=True)
    b.input(MAIN_X + 14, y + 40, 300, "Nome completo", "Nome *")
    b.input(MAIN_X + 330, y + 40, 300, "nome@3e.com.br", "E-mail *")
    b.input(MAIN_X + 646, y + 40, 200, "••••••••", "Senha *")
    b.text(MAIN_X + 14, y + 100, "Perfis", 11, INK, negrito=True)
    for i, (perfil, marcado) in enumerate([
        ("Operador", True), ("Gerente de Produção", False), ("Vendedor", False),
        ("Expedição", False), ("Responsável pelo Sistema", False), ("Responsável Técnico", False),
    ]):
        b.check(MAIN_X + 14 + (i % 3) * 300, y + 118 + (i // 3) * 24, perfil, marcado)
    b.text(MAIN_X + 14, y + 172, "Setores", 11, INK, negrito=True)
    b.check(MAIN_X + 14, y + 190, "Telhas", True)
    b.check(MAIN_X + 130, y + 190, "Corte e Dobra", False)
    b.check(MAIN_X + 280, y + 190, "Revenda", False)
    b.button(MAIN_X + 820, y + 174, 160, 32, "Criar usuário", primario=True, size=11)
    b.card(MAIN_X, y + 226, MAIN_W, 230, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 238, "Usuários cadastrados", 14, INK, negrito=True)
    b.table(
        MAIN_X + 14, y + 266, MAIN_W - 28,
        ["Usuário", "Perfil", "Setor", "Status"],
        [
            ["João Operador", "Operador", "Telhas", "Ativo · Inativar"],
            ["Marcos Gerente", "Gerente", "Corte e Dobra, Telhas", "Ativo · Inativar"],
            ["Ana Vendedora", "Vendedor", "—", "Ativo · Inativar"],
        ],
        [0.32, 0.22, 0.28, 0.18],
    )
    return b


def wf14():
    b = Board("WF-14 · Setores e mapeamentos", 1014)
    y = b.shell(
        "Setores e mapeamentos", "Mantenha setores e o mapeamento de categoria para setor.",
        ["Usuários", "Setores"], "Setores", "Admin 3E", "Responsável pelo Sistema", "Setores",
    )
    b.card(MAIN_X, y, 490, 150, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 12, "Novo setor", 14, INK, negrito=True)
    b.input(MAIN_X + 14, y + 42, 200, "Ex.: PINTURA", "Código *")
    b.input(MAIN_X + 230, y + 42, 240, "Ex.: Pintura", "Nome do setor *")
    b.button(MAIN_X + 14, y + 104, 130, 32, "Criar setor", primario=True, size=11)
    b.card(MAIN_X + 510, y, 490, 220, WHITE, BORDER)
    b.text(MAIN_X + 524, y + 12, "Mapeamento de categoria", 14, INK, negrito=True)
    b.input(MAIN_X + 524, y + 42, 260, "Ex.: TELHA_TERMOACUSTICA", "Categoria *")
    b.button(MAIN_X + 800, y + 60, 170, 32, "Buscar mapeamento", size=11)
    b.text(MAIN_X + 524, y + 100, "Mapeado para Telhas.", 12, INK)
    b.select(MAIN_X + 524, y + 124, 220, "Telhas", "Setor *")
    b.button(MAIN_X + 524, y + 178, 160, 32, "Salvar mapeamento", primario=True, size=11)
    b.card(MAIN_X, y + 240, MAIN_W, 160, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 252, "Setores cadastrados", 14, INK, negrito=True)
    for i, (codigo, nome) in enumerate([
        ("CORTE_DOBRA", "Corte e Dobra"), ("TELHAS", "Telhas"), ("REVENDA", "Revenda"),
    ]):
        b.text(MAIN_X + 14, y + 284 + i * 30, codigo, 10, MUTED)
        b.text(MAIN_X + 250, y + 284 + i * 30, nome, 12, INK)
    return b


def wf15():
    b = Board("WF-15 · Integração (técnico)", 1015)
    y = b.shell(
        "Integração", "Jobs de integração com o Top Gerente e seus eventos.",
        ["Integração"], "Integração", "Rui Técnico", "Responsável Técnico", "Integração",
    )
    b.card(MAIN_X, y, MAIN_W, 180, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 12, "Jobs", 14, INK, negrito=True)
    b.card(MAIN_X + 14, y + 40, MAIN_W - 28, 56, ACCENT_BG, ACCENT)
    b.text(MAIN_X + 28, y + 50, "Pedido 70435", 13, INK, negrito=True)
    b.text(MAIN_X + 28, y + 70, "Job cmuyq0ygh00024skr623teegx", 10, MUTED)
    b.badge(MAIN_X + 860, y + 52, "Concluído", GREEN_BG, GREEN, GREEN)
    b.card(MAIN_X + 14, y + 104, MAIN_W - 28, 56, WHITE, BORDER)
    b.text(MAIN_X + 28, y + 114, "Pedido 82269", 13, INK, negrito=True)
    b.text(MAIN_X + 28, y + 134, "Erro: CONNECTOR_TIMEOUT — sem resposta do conector", 10, RED)
    b.badge(MAIN_X + 860, y + 116, "Falhou", RED_BG, RED, RED)
    b.card(MAIN_X, y + 196, MAIN_W, 160, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 208, "Eventos do job", 14, INK, negrito=True)
    for i, (tipo, detalhe) in enumerate([
        ("IMPORT_REQUESTED", "solicitado por Marcos Gerente"),
        ("DISPATCHED", "enviado ao conector"),
        ("SUCCEEDED", "pedido criado/atualizado"),
    ]):
        b.text(MAIN_X + 14, y + 240 + i * 30, tipo, 12, INK, negrito=True)
        b.text(MAIN_X + 240, y + 240 + i * 30, f"— {detalhe}", 11, MUTED)
    return b


def wf16():
    b = Board("WF-16 · Ordem de produção / impressão", 1016)
    b.canvas()
    b.text(20, 20, "← Voltar para a fila", 11, ACCENT, link=True)
    b.text(20, 48, "Ordem de produção", 24, INK, negrito=True)
    b.text(20, 82, "Pedido 70435", 12, MUTED)
    b.button(1150, 44, 120, 38, "Imprimir", primario=True)
    b.card(300, 130, 712, 620, WHITE, BORDER)
    b.text(332, 156, "3E Operações — Ordem de produção", 12, INK, negrito=True)
    b.hrule(332, 180, 648)
    b.text(332, 200, "Telha termoac. eps30 trap 40 980 0,43", 20, INK, negrito=True)
    b.text(332, 232, "Pedido 70435 · Setor Telhas", 12, MUTED)
    for i, (lab, val) in enumerate([
        ("Pedido", "70435"), ("Item", "Telha termoac. 980"), ("Setor", "Telhas"),
        ("Unidade", "un"), ("Solicitado", "20 un"), ("Executado", "10 un"), ("Pendente", "10 un"),
    ]):
        col = i % 2
        lin = i // 2
        b.text(332 + col * 330, 280 + lin * 64, lab.upper(), 10, MUTED, negrito=True)
        b.text(332 + col * 330, 298 + lin * 64, val, 14, INK, negrito=True)
    b.hrule(332, 690, 648)
    b.text(332, 706, "Documento operacional · impressão em 1 página A4", 10, MUTED)
    return b


def wf17():
    b = Board("WF-17 · Estados globais", 1017)
    y = b.shell(
        "Estados globais", "Feedback, vazio, erro, confirmação e acesso negado.",
        [], "", "Admin 3E", "Documentação", "Estados",
    )
    b.alert(MAIN_X, y, 480, "Sucesso", "Ocorrência registrada. O saldo foi atualizado.", "success")
    b.alert(MAIN_X + 500, y, 500, "Erro", "Não foi possível concluir. Verifique sua conexão e tente novamente.", "error")
    b.alert(MAIN_X, y + 70, 480, "Aviso", "Unidade preservada; nenhuma conversão foi feita.", "warning")
    b.alert(MAIN_X + 500, y + 70, 500, "Informação", "A importação pode levar alguns segundos.", "info")
    b.card(MAIN_X, y + 140, 480, 130, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 152, "Vazio", 10, MUTED, negrito=True)
    b.text(MAIN_X + 14, y + 178, "Sem pedidos", 16, INK, negrito=True)
    b.text(MAIN_X + 14, y + 204, "Nenhum pedido encontrado com os filtros atuais.", 11, MUTED)
    b.card(MAIN_X + 500, y + 140, 500, 130, WHITE, BORDER)
    b.text(MAIN_X + 514, y + 152, "Confirmação", 10, MUTED, negrito=True)
    b.text(MAIN_X + 514, y + 178, "Excluir 2ª remessa?", 15, INK, negrito=True)
    b.text(MAIN_X + 514, y + 204, "Entregas e saldos não serão alterados.", 11, MUTED)
    b.button(MAIN_X + 514, y + 228, 90, 28, "Cancelar", size=11)
    b.button(MAIN_X + 614, y + 228, 130, 28, "Excluir remessa", primario=True, size=11)
    b.card(MAIN_X, y + 290, 480, 120, WHITE, BORDER)
    b.text(MAIN_X + 14, y + 302, "Acesso negado", 10, MUTED, negrito=True)
    b.text(MAIN_X + 14, y + 328, "401 / 403", 16, INK, negrito=True)
    b.text(MAIN_X + 14, y + 354, "Sessão expirada volta ao login; sem permissão mostra a mensagem.", 11, MUTED)
    b.card(MAIN_X + 500, y + 290, 500, 120, WHITE, BORDER)
    b.text(MAIN_X + 514, y + 302, "Não encontrado", 10, MUTED, negrito=True)
    b.text(MAIN_X + 514, y + 328, "404", 16, INK, negrito=True)
    b.text(MAIN_X + 514, y + 354, "“Atividade não encontrada” ou “Página não encontrada”.", 11, MUTED)
    return b


def wf18():
    b = Board("WF-18 · Padrão responsivo", 1018)
    b.canvas()
    b.text(40, 32, "Padrão responsivo — 390 px", 24, INK, negrito=True)
    b.text(40, 70, "Menu em gaveta, filtros empilhados, tabela em cartões e alvos ≥ 44 px.", 13, MUTED)
    for i, (titulo, subtitulo) in enumerate([
        ("Filtros empilhados", "De/Até em duas colunas"),
        ("Tabela → cartões", "data-label + botão grande"),
        ("Menu em gaveta", "sidebar vira drawer"),
    ]):
        x = 70 + i * 400
        b.card(x, 130, 340, 600, WHITE, BORDER)
        b.card(x + 20, 150, 300, 40, PANEL, BORDER)
        b.text(x + 36, 162, "☰   " + titulo, 12, INK, negrito=True)
        b.vrule(x + 20, 210, 490)
        if i == 0:
            for j, lab in enumerate(["Número", "Cliente", "Setor", "Status"]):
                b.text(x + 36, 224 + j * 64, lab, 10, MUTED, negrito=True)
                b.card(x + 36, 240 + j * 64, 260, 30, WHITE, INK)
                b.text(x + 46, 248 + j * 64, "…", 11, MUTED)
            b.button(x + 36, 490, 260, 36, "Filtrar", primario=True, size=12)
            b.button(x + 36, 534, 260, 36, "Limpar filtros", size=12)
        elif i == 1:
            for j, pedido in enumerate(["70435", "82269"]):
                b.card(x + 36, 224 + j * 118, 260, 100, WHITE, BORDER)
                b.text(x + 50, 236 + j * 118, f"Pedido {pedido}", 12, INK, negrito=True)
                b.text(x + 50, 258 + j * 118, "Metalúrgica Alfa", 10, MUTED)
                b.button(x + 50, 278 + j * 118, 230, 34, "Abrir pedido", primario=True, size=12)
        else:
            for j, item in enumerate(["Painel", "Pedidos", "Importar", "Fila"]):
                if j == 0:
                    b.card(x + 36, 224 + j * 44, 260, 34, ACCENT_BG, BORDER)
                b.text(x + 48, 232 + j * 44, item, 12, INK, negrito=(j == 0))
            b.hrule(x + 36, 410, 260)
            b.text(x + 48, 428, "Marcos Gerente", 12, INK, negrito=True)
            b.text(x + 48, 450, "Gerente de Produção", 10, MUTED)
        b.text(x + 20, 690, subtitulo, 10, MUTED)
    return b


def wf19():
    b = Board("WF-19 · Mapa de navegação", 1019)
    b.canvas()
    b.text(40, 32, "Mapa de navegação por perfil", 24, INK, negrito=True)
    b.text(40, 70, "A primeira rota de cada perfil é a tela inicial após o login.", 13, MUTED)
    perfis = [
        ("Público", ["/login", "/ (decide perfil)"]),
        ("Vendedor", ["/vendedor/pedidos", "/vendedor/pedidos/[id]"]),
        ("Gerente", ["/gerente/painel", "/gerente/pedidos", "/gerente/pedidos/[id]", "/integracao", "/operador/fila"]),
        ("Operador", ["/operador/fila", "/operador/atividades/[id]", "/operador/ocorrencias", "/producao/.../ordem"]),
        ("Expedição", ["/expedicao/entregas"]),
        ("Admin", ["/admin/usuarios", "/admin/setores"]),
        ("Técnico", ["/tecnico/integracao"]),
    ]
    for i, (perfil, rotas) in enumerate(perfis):
        y = 120 + i * 88
        b.card(40, y, 1232, 70, WHITE, BORDER)
        b.text(60, y + 12, perfil, 14, INK, negrito=True)
        x = 60
        for j, rota in enumerate(rotas):
            if j > 0:
                b.text(x, y + 40, "→", 12, MUTED)
                x += 30
            largura = max(120, len(rota) * 7 + 20)
            b.card(x, y + 32, largura, 26, ACCENT_BG if j == 0 else PANEL, BORDER)
            b.text(x + 8, y + 38, rota, 10, INK)
            x += largura + 10
    return b


def wf20():
    b = Board("WF-20 · Componentes", 1020)
    y = b.shell(
        "Componentes e medidas", "Referência de controles, rótulos e estados.",
        [], "", "Admin 3E", "Documentação", "Style guide",
    )
    b.text(MAIN_X, y, "Botões", 13, INK, negrito=True)
    b.button(MAIN_X, y + 24, 160, 42, "Ação principal", primario=True, size=13)
    b.button(MAIN_X + 176, y + 24, 120, 42, "Secundária", size=13)
    b.button(MAIN_X + 312, y + 24, 110, 42, "Contorno", size=13)
    b.button(MAIN_X + 438, y + 24, 110, 42, "Destrutiva", size=13)
    b.text(MAIN_X, y + 84, "Campos", 13, INK, negrito=True)
    b.input(MAIN_X, y + 108, 300, "Valor", "Rótulo *")
    b.input(MAIN_X + 320, y + 108, 300, "Placeholder", "Busca")
    b.select(MAIN_X + 640, y + 108, 200, "Opção", "Seleção")
    b.text(MAIN_X, y + 168, "Status", 13, INK, negrito=True)
    b.badge(MAIN_X, y + 192, "Pendente", SOFT, BORDER, INK)
    b.badge(MAIN_X + 100, y + 192, "Em andamento", AMBER_BG, AMBER, AMBER)
    b.badge(MAIN_X + 230, y + 192, "Concluída", GREEN_BG, GREEN, GREEN)
    b.badge(MAIN_X + 330, y + 192, "Atrasado", RED_BG, RED, RED)
    b.badge(MAIN_X + 430, y + 192, "Confirmada", BLUE_BG, BLUE, BLUE)
    b.text(MAIN_X, y + 232, "Progresso e métricas", 13, INK, negrito=True)
    b.progress(MAIN_X, y + 256, 450, "Execução", 62, "38 de 60 un executadas.")
    b.metric(MAIN_X + 500, y + 252, 200, "Pendências", "12", WHITE)
    b.metric(MAIN_X + 720, y + 252, 200, "Concluídas", "27", GREEN_BG)
    b.text(MAIN_X, y + 326, "Alertas", 13, INK, negrito=True)
    b.alert(MAIN_X, y + 350, 300, "Sucesso", "", "success")
    b.alert(MAIN_X + 320, y + 350, 300, "Erro", "", "error")
    b.alert(MAIN_X + 640, y + 350, 300, "Aviso", "", "warning")
    b.text(MAIN_X, y + 406, "Tabela", 13, INK, negrito=True)
    b.table(MAIN_X, y + 430, 700, ["Pedido", "Status", "Ação"],
            [["70435", "Em andamento", "Abrir"]], [0.4, 0.4, 0.2])
    return b


TELAS = [
    wf01, wf02, wf03, wf04, wf05, wf06, wf07, wf08, wf09, wf10,
    wf11, wf12, wf13, wf14, wf15, wf16, wf17, wf18, wf19, wf20,
]


def criar_banco(caminho):
    if os.path.exists(caminho):
        os.remove(caminho)
    con = sqlite3.connect(caminho)
    cur = con.cursor()
    cur.executescript(
        """
        CREATE TABLE BRANCHES (ID VARCHAR(255) PRIMARY KEY, ATTRIBUTES TEXT);
        CREATE TABLE COMMENTS (ID VARCHAR(255) PRIMARY KEY, BRANCHID VARCHAR(255), RESOURCEID VARCHAR(255), DATA LONGTEXT, USERID VARCHAR(255), ATTRIBUTES TEXT);
        CREATE TABLE INFO (NAME VARCHAR(255) PRIMARY KEY, VALUE TEXT);
        CREATE TABLE RESOURCES (ID VARCHAR(255), BRANCHID VARCHAR(255), ATTRIBUTES TEXT, DATA LONGTEXT, PRIMARY KEY (ID, BRANCHID));
        CREATE TABLE THUMBNAILS (ID VARCHAR(255) PRIMARY KEY, ATTRIBUTES MEDIUMTEXT);
        CREATE TABLE USERS (ID VARCHAR(255) PRIMARY KEY, ATTRIBUTES TEXT);
        """
    )
    branch = {
        "branchDescription": "",
        "creationDate": 1431008677010,
        "fontFace": "Balsamiq Sans",
        "fontSize": 13,
        "modifiedBy": [],
        "projectDescription": "",
        "selectionColor": 9813234,
        "skinName": "programmatic",
        "symbolLibraryID": "",
    }
    cur.execute("INSERT INTO BRANCHES (ID, ATTRIBUTES) VALUES (?, ?)", ("Master", json.dumps(branch)))
    for nome, valor in [
        ("SchemaVersion", "2.0"),
        ("ArchiveFormat", "bmpr"),
        ("ArchiveRevisionUUID", ""),
        ("ArchiveAttributes", json.dumps({"name": "3E Operações — Wireframes"}, ensure_ascii=False)),
        ("ArchiveRevision", "19.0"),
    ]:
        cur.execute("INSERT INTO INFO (NAME, VALUE) VALUES (?, ?)", (nome, valor))
    con.commit()
    return con


def main():
    destino = os.path.join("docs", "wireframes", "3e-operacoes-wireframes.bmpr")
    con = criar_banco(destino)
    cur = con.cursor()
    total_controles = 0
    for i, fabrica in enumerate(TELAS):
        b = fabrica()
        rid = str(uuid.uuid4()).upper()
        attrs = {
            "name": b.nome,
            "kind": "mockup",
            "trashed": False,
            "importedFrom": "",
            "creationDate": 0,
            "modifiedBy": None,
            "notes": None,
            "order": b.ordem,
        }
        data = {
            "mockup": {
                "controls": {"control": b.controles},
                "attributes": {
                    "name": b.nome,
                    "order": b.ordem,
                    "parentID": None,
                    "notes": None,
                    "trashed": False,
                },
                "branchID": "Master",
                "resourceID": rid,
                "mockupH": str(b.altura),
                "mockupW": str(b.largura),
                "measuredW": str(b.largura),
                "measuredH": str(b.altura),
                "version": "6.0",
                "calloutsOffset": {"x": 55, "y": 0},
            }
        }
        cur.execute(
            "INSERT INTO RESOURCES (ID, BRANCHID, ATTRIBUTES, DATA) VALUES (?, ?, ?, ?)",
            (rid, "Master", json.dumps(attrs, ensure_ascii=False), json.dumps(data, ensure_ascii=False)),
        )
        cur.execute(
            "INSERT INTO THUMBNAILS (ID, ATTRIBUTES) VALUES (?, ?)",
            (str(uuid.uuid4()).upper(), json.dumps({"branchID": "Master", "resourceID": rid})),
        )
        total_controles += len(b.controles)
        print(f"{b.nome:<45} {len(b.controles):>3} controles")
    con.commit()
    con.close()
    print(f"\n{len(TELAS)} boards · {total_controles} controles · {destino}")


if __name__ == "__main__":
    main()
