#!/usr/bin/env python3
"""Renderiza uma prévia aproximada do PPTX em PNG, para conferir layout.

Uso: python scripts/render-pptx-preview.py
Saída: docs/seminario/preview/slide-XX.png
"""
from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn

RAIZ = Path(__file__).resolve().parents[1]
PPTX = RAIZ / "docs" / "seminario" / "seminario-3e-operacoes-2026-11-12.pptx"
SAIDA = RAIZ / "docs" / "seminario" / "preview"

DPI = 108
PX_POR_PT = DPI / 72.0

FONTES = {
    ("Segoe UI", False): r"C:\Windows\Fonts\segoeui.ttf",
    ("Segoe UI", True): r"C:\Windows\Fonts\segoeuib.ttf",
    ("Segoe UI Light", False): r"C:\Windows\Fonts\segoeuil.ttf",
    ("Segoe UI Light", True): r"C:\Windows\Fonts\segoeuib.ttf",
    ("Consolas", False): r"C:\Windows\Fonts\consola.ttf",
    ("Consolas", True): r"C:\Windows\Fonts\consolab.ttf",
    ("Segoe UI Symbol", False): r"C:\Windows\Fonts\seguisym.ttf",
    ("Segoe UI Symbol", True): r"C:\Windows\Fonts\seguisym.ttf",
}
CACHE: dict = {}


def px(emu) -> int:
    return int(round(emu / 914400 * DPI))


def cor_de(obj, padrao=(0, 0, 0)):
    try:
        c = obj.rgb
        return (c[0], c[1], c[2])
    except Exception:
        return padrao


def fonte(nome: str, negrito: bool, tamanho_pt: float):
    chave = (nome, negrito, round(tamanho_pt, 1))
    if chave in CACHE:
        return CACHE[chave]
    caminho = FONTES.get((nome, negrito)) or FONTES.get((nome, False)) or FONTES[("Segoe UI", False)]
    tam = max(int(round(tamanho_pt * PX_POR_PT)), 6)
    try:
        f = ImageFont.truetype(caminho, tam)
    except Exception:
        f = ImageFont.load_default()
    CACHE[chave] = f
    return f


def gradiente(img, box, cor1, cor2, angulo):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    if w <= 0 or h <= 0:
        return
    pequeno = Image.new("RGB", (max(w, 1), max(h, 1)))
    d = ImageDraw.Draw(pequeno)
    vertical = abs((angulo or 0) % 180 - 90) > 45
    n = max(h if vertical else w, 1)
    for i in range(n):
        t = i / max(n - 1, 1)
        c = tuple(int(cor1[k] + (cor2[k] - cor1[k]) * t) for k in range(3))
        if vertical:
            d.line([(0, i), (w, i)], fill=c)
        else:
            d.line([(i, 0), (i, h)], fill=c)
    img.paste(pequeno, (x0, y0))


def desenhar_shape(img, d, shp):
    x, y = px(shp.left), px(shp.top)
    w, h = px(shp.width), px(shp.height)
    if w <= 0 or h <= 0:
        return

    if shp.shape_type == MSO_SHAPE_TYPE.PICTURE:
        try:
            pic = Image.open(io.BytesIO(shp.image.blob)).convert("RGBA")
            pic = pic.resize((w, h), Image.LANCZOS)
            img.paste(pic, (x, y), pic)
        except Exception:
            pass
        return

    nome_forma = ""
    try:
        nome_forma = shp._element.spPr.find(qn("a:prstGeom")).get("prst")
    except Exception:
        pass

    preench = None
    try:
        if shp.fill.type == 1:
            preench = cor_de(shp.fill.fore_color)
        elif shp.fill.type == 3:
            stops = shp.fill.gradient_stops
            c1 = cor_de(stops[0].color)
            c2 = cor_de(stops[1].color)
            gradiente(img, (x, y, x + w, y + h), c1, c2, shp.fill.gradient_angle or 0)
    except Exception:
        pass

    linha = None
    largura_linha = 1
    try:
        if shp.line.fill.type == 1:
            linha = cor_de(shp.line.color)
            largura_linha = max(1, int(round((shp.line.width or 12700) / 12700 * 1.5)))
    except Exception:
        pass

    if preench or linha:
        if nome_forma == "ellipse":
            d.ellipse([x, y, x + w, y + h], fill=preench, outline=linha, width=largura_linha)
        elif nome_forma == "roundRect":
            d.rounded_rectangle([x, y, x + w, y + h], radius=min(w, h) * 0.09,
                                fill=preench, outline=linha, width=largura_linha)
        else:
            d.rectangle([x, y, x + w, y + h], fill=preench, outline=linha, width=largura_linha)


def quebrar(runs, largura_px, d):
    """runs: lista (texto, pt, cor, negrito, fonte). Retorna lista de linhas."""
    palavras = []
    for txt, tam, cor, neg, nome in runs:
        partes = txt.split(" ")
        for i, parte in enumerate(partes):
            if parte or i < len(partes) - 1:
                palavras.append((parte + (" " if i < len(partes) - 1 else ""), tam, cor, neg, nome))
    linhas, atual, larg = [], [], 0.0
    for palavra, tam, cor, neg, nome in palavras:
        f = fonte(nome, neg, tam)
        w = d.textlength(palavra, font=f)
        if larg + w > largura_px and atual:
            linhas.append(atual)
            atual, larg = [], 0.0
            if palavra.strip() == "":
                continue
        atual.append((palavra, tam, cor, neg, nome))
        larg += w
    if atual:
        linhas.append(atual)
    return linhas


def desenhar_texto(img, d, shp):
    if not shp.has_text_frame:
        return
    tf = shp.text_frame
    if not tf.text.strip():
        return

    x, y = px(shp.left), px(shp.top)
    w, h = px(shp.width), px(shp.height)
    ml, mr = px(tf.margin_left or 0), px(tf.margin_right or 0)
    mt, mb = px(tf.margin_top or 0), px(tf.margin_bottom or 0)
    largura = max(w - ml - mr, 10)

    blocos = []
    for p in tf.paragraphs:
        runs = []
        for r in p.runs:
            tam = r.font.size.pt if r.font.size else 18
            runs.append((r.text, tam, cor_de(r.font.color), bool(r.font.bold),
                         r.font.name or "Segoe UI"))
        pPr = p._p.pPr
        marL = int(pPr.get("marL")) if pPr is not None and pPr.get("marL") else 0
        indent = int(pPr.get("indent")) if pPr is not None and pPr.get("indent") else 0
        bullet = ""
        if pPr is not None:
            bc = pPr.find(qn("a:buChar"))
            if bc is not None:
                bullet = bc.get("char") or "•"
        blocos.append({
            "runs": runs,
            "align": p.alignment or PP_ALIGN.LEFT,
            "ls": p.line_spacing if isinstance(p.line_spacing, (int, float)) else 1.0,
            "marL": int(marL / 914400 * DPI),
            "indent": int(indent / 914400 * DPI),
            "bullet": bullet,
        })

    # altura total
    preparados = []
    total = 0.0
    for b in blocos:
        linhas = quebrar(b["runs"], largura - b["marL"], d) if b["runs"] else [[]]
        alturas = []
        for ln in linhas:
            tam_max = max([p[1] for p in ln] or [12])
            alturas.append(tam_max * 1.2 * b["ls"] * PX_POR_PT)
        preparados.append((b, linhas, alturas))
        total += sum(alturas)

    ancora = tf.vertical_anchor
    if ancora == MSO_ANCHOR.MIDDLE:
        cy = y + mt + (h - mt - mb - total) / 2
    elif ancora == MSO_ANCHOR.BOTTOM:
        cy = y + h - mb - total
    else:
        cy = y + mt

    for b, linhas, alturas in preparados:
        for idx, (ln, alt) in enumerate(zip(linhas, alturas)):
            larg_ln = sum(d.textlength(p[0], font=fonte(p[4], p[3], p[1])) for p in ln)
            cx = x + ml + b["marL"]
            if b["align"] == PP_ALIGN.CENTER:
                cx = x + ml + (largura - larg_ln) / 2
            elif b["align"] == PP_ALIGN.RIGHT:
                cx = x + w - mr - larg_ln

            if b["bullet"] and idx == 0:
                fb = fonte("Segoe UI", True, max(ln[0][1] if ln else 12, 8))
                d.text((x + ml + b["marL"] + b["indent"], cy), b["bullet"], font=fb,
                       fill=(14, 116, 144))

            for (txt, tam, cor, neg, nome) in ln:
                f = fonte(nome, neg, tam)
                d.text((cx, cy), txt, font=f, fill=cor)
                cx += d.textlength(txt, font=f)
            cy += alt


def principal():
    prs = Presentation(str(PPTX))
    SAIDA.mkdir(parents=True, exist_ok=True)
    for i, slide in enumerate(prs.slides, start=1):
        img = Image.new("RGB", (int(13.333 * DPI), int(7.5 * DPI)), "white")
        d = ImageDraw.Draw(img)
        for shp in slide.shapes:
            desenhar_shape(img, d, shp)
        for shp in slide.shapes:
            desenhar_texto(img, d, shp)
        img.save(SAIDA / f"slide-{i:02d}.png")
    print("Prévia gerada em", SAIDA, "·", len(prs.slides), "slides")


if __name__ == "__main__":
    principal()
