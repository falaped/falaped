# Captação de pediatras (CNES + CNPJ)

Gera `data/pediatras-mg.csv` para o botão **Importar CSV** do Funil. Só dados públicos e
profissionais; cada linha diz a fonte em `sources`.

```bash
python3 -m venv /tmp/prospects-venv && /tmp/prospects-venv/bin/pip install -r requirements.txt
cd scripts/prospects
/tmp/prospects-venv/bin/python cnes.py     # ~1 min: PFMG<AAMM>.dbc do DataSUS (~40 MB)
/tmp/prospects-venv/bin/python cnpj.py     # ~25 min: ~6 GB da Receita, lidos em streaming e apagados
/tmp/prospects-venv/bin/python merge.py    # segundos
```

1. **cnes.py**: todos os profissionais de MG com CBO 225124 (médico pediatra) no CNES, com
   os estabelecimentos onde atendem, o CNPJ deles e quantos profissionais cada um tem.
2. **cnpj.py**: dos dados abertos da Receita (`arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9`),
   estabelecimentos ativos de MG que aparecem no CNES ou têm CNAE 8630-5/01..03, com e-mail e
   telefone, e os sócios pessoa física deles. Use no máximo 2–3 downloads em paralelo: com mais,
   a Receita bloqueia o IP por alguns minutos.
3. **merge.py**: contato de cada pediatra = empresa de que é sócio (nome igual) ou consultório
   do CNES com até 3 profissionais. E-mail só entra se tiver um pedaço do nome do médico (não é
   genérico, de contabilidade nem repetido); quem já está no funil sai.

Antes do `merge.py`, exporte as chaves do funil para `data/funil.txt` pelo MCP do Supabase:

```sql
select string_agg(distinct k, '|') from (
  select lower(email) k from prospects where email is not null
  union select phone_key from prospects where phone_key is not null
  union select regexp_replace(lower(coalesce(full_name, name)), '^(dr|dra|prof)\.?\s+', '') from prospects where kind = 'médico'
) t;
```

A importação já pula e-mail repetido, mas não telefone nem nome; por isso o filtro aqui.
`data/` fica fora do git (`PROSPECTS_DATA` muda a pasta).
