"""Passo 3: junta CNES (quem é pediatra) com a Receita (contato) e gera o CSV do Funil.

Contato de um pediatra vem de (1) empresa em que ele é sócio pessoa física (nome igual) ou
(2) estabelecimento do CNES dele com até 3 profissionais (o consultório dele, não hospital).
E-mail genérico (contato@, contabilidade…) ou repetido entre pediatras é descartado.
Quem já está no funil sai (e-mail, últimos 10 dígitos do telefone ou nome), lido de
data/funil.txt: chaves separadas por "|", exportadas do Supabase via MCP (ver README).
Saída: data/pediatras-mg.csv, no formato do "Importar CSV" do Funil.
"""
import collections
import csv
import json
import os
import re
import sys

from common import DATA, is_generic_email, norm, phone_key

SMALL = 3


def fmt_phone(p: str) -> str:
    d = re.sub(r"\D", "", p).lstrip("0")
    if len(d) == 10 and d[2] in "6789":  # celular antigo, sem o 9 da frente
        d = d[:2] + "9" + d[2:]
    return f"({d[:2]}) {d[2:-4]}-{d[-4:]}" if len(d) in (10, 11) else ""


def is_mobile(p: str) -> bool:
    d = re.sub(r"\D", "", p).lstrip("0")
    return len(d) == 11 and d[2] == "9" or len(d) == 10 and d[2] in "6789"


def main() -> None:
    cnes = json.load(open(os.path.join(DATA, "cnes.json")))["pediatras"]
    rf = json.load(open(os.path.join(DATA, "cnpj.json")))
    estabs, socios = rf["estabelecimentos"], rf["socios"]
    funil = {k.strip() for k in open(os.path.join(DATA, "funil.txt")).read().split("|") if k.strip()}
    funil_names = {norm(re.sub(r"^(dr|dra|prof)\.?\s+", "", k)) for k in funil if "@" not in k and not k.isdigit()}

    by_basico = collections.defaultdict(list)
    for cnpj in estabs:
        by_basico[cnpj[:8]].append(cnpj)
    partner = collections.defaultdict(list)  # nome do sócio → CNPJs das empresas dele
    for basico, names in socios.items():
        for n in names:
            partner[norm(n)].extend(by_basico[basico])

    ibge = {norm(l["city"]): l["city"] for p in cnes for l in p["links"]}  # Receita grava sem acento
    leads, stats = [], collections.Counter()
    for p in cnes:
        name = norm(p["name"])
        cities = {l["city"] for l in p["links"]}
        own = [c for c in partner.get(name, []) if estabs[c]["city"] in cities or len(name.split()) >= 3]
        small = [l["cnpj"] for l in p["links"] if l["cnpj"] in estabs and l["staff"] <= SMALL]
        cand = list(dict.fromkeys(own + small))
        stats["casou_cnpj"] += bool(own)
        # Pessoal = tem um pedaço do nome dele (mariasouza.ped@…); o resto é da clínica ou de outra pessoa.
        tokens = [t for t in name.split() if len(t) >= 4]
        emails = [estabs[c]["email"] for c in cand if not is_generic_email(estabs[c]["email"]) and any(t in norm(estabs[c]["email"]).replace(" ", "") for t in tokens)]
        phones = sorted({fmt_phone(t) for c in cand for t in estabs[c]["phones"]} - {""}, key=lambda t: not is_mobile(t))
        if not emails and not phones:
            continue
        main_link = max(p["links"], key=lambda l: l["hours"])
        e = estabs[cand[0]]
        leads.append({
            "id": f"cnes-{p['cns'] or name.replace(' ', '-')}",
            "kind": "médico",
            "name": p["name"].title(),
            "full_name": p["name"].title(),
            "city": ibge.get(norm(e["city"]), e["city"]) or main_link["city"],
            "email": emails[0] if emails else "",
            "phone": " / ".join(phones[:2]),
            "crm": p["crm"],
            "clinic": e["fantasia"],
            "address": e["address"],
            "sources": "CNES | Receita CNPJ" + (" (sócio)" if own else " (consultório)"),
            "has_whatsapp": "sim" if phones and is_mobile(phones[0]) else "",
        })

    shared = {e for e, n in collections.Counter(l["email"] for l in leads if l["email"]).items() if n > 1}
    for l in leads:
        if l["email"] in shared:
            l["email"] = ""
    out = []
    for l in leads:
        keys = {l["email"]} | {phone_key(t) for t in l["phone"].split(" / ")}
        if keys & funil or norm(l["name"]) in funil_names:
            stats["ja_no_funil"] += 1
            continue
        if l["email"] or l["phone"]:
            out.append(l)
    path = os.path.join(DATA, "pediatras-mg.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(sorted(out, key=lambda l: (not l["email"], not l["has_whatsapp"], l["city"], l["name"])))
    print(json.dumps({
        "pediatras_cnes": len(cnes), "casou_socio_cnpj": stats["casou_cnpj"], "com_contato": len(leads),
        "ja_no_funil": stats["ja_no_funil"], "novos": len(out),
        "novos_com_email_pessoal": sum(1 for l in out if l["email"]),
        "novos_com_whatsapp": sum(1 for l in out if l["has_whatsapp"]),
        "emails_repetidos_descartados": len(shared), "csv": path,
    }, ensure_ascii=False, indent=1), file=sys.stderr)


if __name__ == "__main__":
    main()
