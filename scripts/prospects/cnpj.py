"""Passo 2: contatos dos CNPJs de saúde de MG nos dados abertos da Receita.

Lê data/cnes.json e baixa da Receita (compartilhamento público, ~6 GB por mês) os
Estabelecimentos0-9.zip (~5,4 GB) e Socios0-9.zip (~0,7 GB). Cada zip é lido em streaming
(linha a linha) e apagado depois. Guarda só estabelecimentos ativos em MG que estão no CNES
de algum pediatra ou têm CNAE 8630-5/01..03 (consultório médico), e os sócios deles.
Saída: data/cnpj.json. Uso: python cnpj.py [AAAA-MM]   (padrão: o mês mais recente)
"""
import csv
import io
import json
import os
import re
import subprocess
import sys
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor

import requests

from common import DATA

SHARE = "YggdBLfdninEJX9"  # https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9
DAV = "https://arquivos.receitafederal.gov.br/public.php/webdav"
CNAES = ("8630501", "8630502", "8630503")


def latest_month() -> str:
    r = requests.request("PROPFIND", f"{DAV}/", auth=(SHARE, ""), headers={"Depth": "1"}, timeout=60)
    return sorted(re.findall(r"/webdav/(\d{4}-\d{2})/", r.text))[-1]


def download(month: str, name: str) -> str:
    path = os.path.join(DATA, name)
    if not os.path.exists(path):
        # O servidor da Receita trava conexões longas: aborta se ficar 30 s parado e retoma do byte onde parou.
        cmd = ["curl", "-sf", "-C", "-", "--speed-limit", "20000", "--speed-time", "30", "-u", f"{SHARE}:", "-o", path + ".part", f"{DAV}/{month}/{name}"]
        # Poucas tentativas com pausa: a Receita bloqueia o IP quando é martelada.
        for _ in range(20):
            if subprocess.run(cmd).returncode == 0:
                break
            time.sleep(30)
        else:
            raise RuntimeError(f"download de {name} não terminou")
        os.rename(path + ".part", path)
    return path


def rows(path: str):
    with zipfile.ZipFile(path) as z:
        with z.open(z.namelist()[0]) as f:
            yield from csv.reader(io.TextIOWrapper(f, encoding="latin-1", newline=""), delimiter=";")


def main() -> None:
    month = sys.argv[1] if len(sys.argv) > 1 else latest_month()
    cnes = json.load(open(os.path.join(DATA, "cnes.json")))["pediatras"]
    wanted = {link["cnpj"] for p in cnes for link in p["links"] if link["cnpj"]}

    names = [f"Estabelecimentos{i}.zip" for i in range(10)] + [f"Socios{i}.zip" for i in range(10)] + ["Municipios.zip"]
    pool = ThreadPoolExecutor(2)  # mais de 3 conexões e a Receita bloqueia o IP por alguns minutos
    files = {n: pool.submit(download, month, n) for n in names}

    cities = {r[0]: r[1].title() for r in rows(files["Municipios.zip"].result())}
    estabs: dict[str, dict] = {}
    for n in names[:10]:
        path = files[n].result()
        for r in rows(path):
            if r[19] != "MG" or r[5] != "02":
                continue
            cnpj = r[0] + r[1] + r[2]
            cnaes = [r[11], *r[12].split(",")]
            if cnpj not in wanted and not any(c in CNAES for c in cnaes):
                continue
            phones = [f"{d}{t}" for d, t in ((r[21], r[22]), (r[23], r[24])) if t.strip()]
            estabs[cnpj] = {
                "fantasia": r[4].strip().title(),
                "email": r[27].strip().lower(),
                "phones": phones,
                "city": cities.get(r[20], ""),
                "address": " ".join(x.strip() for x in (r[13], r[14], r[15], r[17]) if x.strip()).title(),
                "consultorio": any(c in CNAES for c in cnaes),
            }
        os.remove(path)
        print(f"{n}: {len(estabs)} estabelecimentos", file=sys.stderr)

    basicos = {c[:8] for c in estabs}
    socios: dict[str, list[str]] = {}
    for n in names[10:20]:
        path = files[n].result()
        for r in rows(path):
            if r[1] == "2" and r[0] in basicos:  # 2 = sócio pessoa física
                socios.setdefault(r[0], []).append(r[2].strip())
        os.remove(path)
        print(f"{n}: {len(socios)} empresas com sócio", file=sys.stderr)

    json.dump({"mes": month, "estabelecimentos": estabs, "socios": socios}, open(os.path.join(DATA, "cnpj.json"), "w"), ensure_ascii=False)


if __name__ == "__main__":
    main()
