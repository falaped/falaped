"""Passo 1: pediatras de MG no CNES (CBO 225124) e onde atendem.

Baixa PFMG<AAMM>.dbc do FTP do DataSUS (~40 MB) e os nomes dos municípios do IBGE.
Saída: data/cnes.json — um registro por pediatra (CNS), com os vínculos (CNES, CNPJ, cidade).
Uso: python cnes.py [AAMM]   (padrão: o arquivo mais recente do FTP)
"""
import collections
import json
import os
import sys
from ftplib import FTP

import requests
from dbfread import DBF
from pyreaddbc import dbc2dbf

from common import DATA

PEDIATRA = "225124"
FTP_DIR = "/dissemin/publicos/CNES/200508_/Dados/PF"


def latest(ftp: FTP) -> str:
    return sorted(n for n in ftp.nlst() if n.startswith("PFMG") and n.endswith(".dbc"))[-1][4:8]


def main() -> None:
    ftp = FTP("ftp.datasus.gov.br")
    ftp.login()
    ftp.cwd(FTP_DIR)
    aamm = sys.argv[1] if len(sys.argv) > 1 else latest(ftp)
    dbc, dbf = os.path.join(DATA, f"PFMG{aamm}.dbc"), os.path.join(DATA, f"PFMG{aamm}.dbf")
    if not os.path.exists(dbc):
        with open(dbc, "wb") as f:
            ftp.retrbinary(f"RETR PFMG{aamm}.dbc", f.write)
    ftp.quit()
    if not os.path.exists(dbf):
        dbc2dbf(dbc, dbf)

    url = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/31/municipios"
    cities = {str(m["id"])[:6]: m["nome"] for m in requests.get(url, timeout=60).json()}

    staff = collections.Counter()  # profissionais (qualquer CBO) por CNES: separa consultório de hospital
    peds: dict[str, dict] = {}
    for r in DBF(dbf, encoding="latin-1"):
        staff[r["CNES"]] += 1
        if r["CBO"] != PEDIATRA:
            continue
        key = r["CNS_PROF"] or r["NOMEPROF"]
        p = peds.setdefault(key, {"cns": r["CNS_PROF"], "name": r["NOMEPROF"].strip(), "crm": "", "links": []})
        if r["REGISTRO"].strip():
            p["crm"] = r["REGISTRO"].strip()
        p["links"].append({
            "cnes": r["CNES"],
            "cnpj": r["CPF_CNPJ"] if r["PF_PJ"] == "3" and r["CPF_CNPJ"].strip("0") else "",
            "city": cities.get(r["CODUFMUN"], ""),
            "public": r["NAT_JUR"].startswith("1"),
            "hours": (r["HORAOUTR"] or 0) + (r["HORAHOSP"] or 0) + (r["HORA_AMB"] or 0),
        })
    for p in peds.values():
        for link in p["links"]:
            link["staff"] = staff[link["cnes"]]
    json.dump({"competencia": aamm, "pediatras": list(peds.values())}, open(os.path.join(DATA, "cnes.json"), "w"), ensure_ascii=False)
    print(f"CNES {aamm}: {len(peds)} pediatras em MG", file=sys.stderr)


if __name__ == "__main__":
    main()
