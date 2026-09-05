#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
apply_fixes.py — Correcciones ortográficas y de consistencia para el contenido español de Fiqhpedia.

Aplica SOLO las 13 correcciones CONFIRMADAS (errores ortográficos de transliteración
y unificación de variantes). NO toca las decisiones editoriales pendientes
(transliteración vs. traducción de términos, ni las traducciones incompletas de F49/F52/M5),
porque esas requieren una decisión humana.

Colócalo en la raíz del repositorio (junto a la carpeta data/).

Uso:
    python3 apply_fixes.py            # dry-run: solo muestra qué cambiaría
    python3 apply_fixes.py --write    # aplica los cambios a los archivos JSON
"""
import json, os, sys, re
from collections import defaultdict

DRY  = "--write" not in sys.argv
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "content")

# (archivo_relativo, patrón_regex, reemplazo, etiqueta)
FIXES = [
    # 1) Errores ortográficos de transliteración
    ("issues/F10.json",  r"istiŷmār", "istijmār", "istiŷmār → istijmār (jim = j)"),
    ("issues/F16.json",  r"tazwīb",   "tathwīb",  "tazwīb → tathwīb (raíz ث-و-ب, no ز-و-ب)"),
    ("issues/F16.json",  r"\bfayr\b", "fajr",     "fayr → fajr (jim = j)"),
    # 2) Unificación de la variante 'hadis' → 'hadiz' (forma ya usada en F33/F47/F60)
    ("issues/F49.json",  r"\bhadis\b", "hadiz",   "hadis → hadiz (unificación)"),
    # 3) Unificación del nombre divino 'Al-lah' → 'Allah' (forma usada en el resto del sitio)
    ("articles/M1.json", r"Al-lah\b",  "Allah",   "Al-lah → Allah (unificación)"),
]

def process():
    by_file = defaultdict(list)
    for rel, pat, repl, label in FIXES:
        by_file[rel].append((pat, repl, label))

    total = 0
    for rel, rules in by_file.items():
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            print(f"[SKIP] no existe: {rel}")
            continue
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        text = json.dumps(data, ensure_ascii=False)
        changed = 0
        for pat, repl, label in rules:
            text, n = re.subn(pat, repl, text)
            if n:
                print(f"  [{rel}] {label}: {n} cambio(s)")
                changed += n
                total += n
        if changed and not DRY:
            data = json.loads(text)  # revalida JSON antes de escribir
            with open(path, "w", encoding="utf-8") as fh:
                json.dump(data, fh, ensure_ascii=False, indent=2)
            print(f"  [WRITE] {rel} actualizado.")

    mode = "SIMULACIÓN (usa --write para aplicar)" if DRY else "APLICADO"
    print(f"\nTotal de cambios: {total}  |  Modo: {mode}")

if __name__ == "__main__":
    process()
