"""Helpers dos scripts de captação: pasta de dados e normalização de nomes/e-mails."""
import os
import re
import unicodedata

DATA = os.environ.get("PROSPECTS_DATA", os.path.join(os.path.dirname(__file__), "data"))
os.makedirs(DATA, exist_ok=True)

# Mesma ideia de isClinicEmail em lib/funnel.ts (lá também conta e-mail repetido entre pessoas).
GENERIC_EMAIL = re.compile(
    r"^(contato|info|sac|atendimento|recepcao|agendamento|secretaria|adm|financeiro|comercial|faleconosco|marcacao|clinica|consultorio|ouvidoria)"
)
# E-mail de escritório de contabilidade que abriu o CNPJ: comum na Receita, não é do médico.
ACCOUNTANT = re.compile(r"contab|contad|escritorio|assessoria|fiscal|\bdp\b|legaliza", re.I)


def norm(name: str) -> str:
    s = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z ]", " ", s)).strip()


def is_generic_email(email: str) -> bool:
    e = (email or "").strip().lower()
    return not e or bool(GENERIC_EMAIL.match(e)) or bool(ACCOUNTANT.search(e))


def phone_key(phone: str) -> str:
    d = re.sub(r"\D", "", phone or "")
    return d[-10:] if len(d) >= 10 else ""


if __name__ == "__main__":
    assert norm("  JOSÉ  da Silva-Júnior ") == "jose da silva junior"
    assert is_generic_email("contato@clinica.com.br") and is_generic_email("contabilidade.x@gmail.com")
    assert not is_generic_email("dra.ana@gmail.com")
    assert phone_key("(31) 99562-6630") == phone_key("5531995626630") == "1995626630"  # igual a prospects.phone_key (right(dígitos, 10))
    print("ok")
