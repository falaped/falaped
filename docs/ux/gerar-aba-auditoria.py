# Regera a aba "Auditoria visual" do fluxo-falaped-2.0.html a partir de auditoria-visual.md
import re,html,sys
import os
D=os.path.dirname(os.path.abspath(__file__))+"/"
md=open(D+"auditoria-visual.md").read().split("\n")
def inl(t):
    t=html.escape(t,quote=False)
    t=re.sub(r"`([^`]+)`",r"<code>\1</code>",t)
    return re.sub(r"\*\*([^*]+)\*\*",r"<b>\1</b>",t)
def sev(c):
    m=re.match(r"(?:<b>)?(\d)(?:</b>)?(.*)",c)
    return f'<span class="sev s{m.group(1)}">{m.group(1)}</span>{m.group(2)}' if m else c
out=[];i=0
while i<len(md):
    l=md[i]
    if l.startswith("# ") or l.startswith("**Data:**"): i+=1; continue
    if l.startswith("## "): out.append(f'<h2>{inl(l[3:])}</h2>')
    elif l.startswith("### "): out.append(f'<h3>{inl(l[4:])}</h3>')
    elif l.startswith("> "): out.append(f'<div class="note">{inl(l[2:])}</div>')
    elif l.startswith("|"):
        rows=[]
        while i<len(md) and md[i].startswith("|"):
            if not re.match(r"^\|[-| ]+\|$",md[i]): rows.append([c.strip() for c in md[i].strip("|").split("|")])
            i+=1
        h,*b=rows
        t='<table class="aud"><tr>'+"".join(f"<th>{inl(c)}</th>" for c in h)+"</tr>"
        for r in b:
            cs=[inl(c) for c in r]; cs[0]=f"<b>{cs[0]}</b>"; cs[-1]=sev(cs[-1])
            t+="<tr>"+"".join(f"<td>{c}</td>" for c in cs)+"</tr>"
        out.append(t+"</table>"); continue
    elif re.match(r"^(\d+\.|-) ",l):
        tag="ol" if l[0].isdigit() else "ul"; start=l.split(".")[0] if tag=="ol" else "1"; items=[]
        while i<len(md) and (re.match(r"^(\d+\.|-) ",md[i]) or md[i].startswith("   - ")):
            if md[i].startswith("   - "): items[-1][1].append(inl(md[i][5:]))
            else: items.append([inl(re.sub(r"^(\d+\.|-) ","",md[i])),[]])
            i+=1
        out.append(f'<{tag} start="{start}">'+"".join(f"<li>{a}"+(("<ul>"+"".join(f"<li>{x}</li>" for x in sub)+"</ul>") if sub else "")+"</li>" for a,sub in items)+f"</{tag}>"); continue
    elif l.strip(): out.append(f"<p>{inl(l)}</p>")
    i+=1
body="\n".join(out)
demo='''<h2>Demonstração dos problemas de cor (C1 e C2)</h2>
<p class="muted">Única parte em cor desta aba: os tokens reais do app, para ver o contraste. O retrato completo está na aba Componentes atuais.</p>
<div class="demo">
  <div><span class="dbtn" style="background:oklch(0.7603 0.0916 255.41);color:oklch(0.98 0.01 255)">Iniciar consulta</span><small>Hoje (claro): texto branco no azul da marca · 2,0:1 ✕</small></div>
  <div><span class="dbtn" style="background:oklch(0.7603 0.0916 255.41);color:oklch(0.22 0.04 255)">Iniciar consulta</span><small>Opção A: texto escuro no mesmo azul (como o modo escuro) · 8,1:1 ✓</small></div>
  <div><span class="dbtn" style="background:oklch(0.52 0.11 255);color:#fff">Iniciar consulta</span><small>Opção B: botão no azul escuro (primary-ink) · 5,5:1 ✓</small></div>
  <div><span style="color:oklch(0.7603 0.0916 255.41);font-weight:600">Ver ficha →</span><small>Hoje: <code>text-primary</code> como texto · 2,1:1 ✕</small></div>
  <div><span style="color:oklch(0.52 0.11 255);font-weight:600">Ver ficha →</span><small><code>text-primary-ink</code> · 5,5:1 ✓</small></div>
</div>'''
body=body.replace("<h2>Achados</h2>",demo+"\n<h2>Achados</h2>",1)
g3=sum(1 for l in md if re.match(r"^\| [A-Z]\d+ \|.*\| \*\*3\*\* \|$",l))
pane=f'''<div id="pane-audit" class="audit" hidden>
  <div class="ahead">
    <div><div class="muted">Etapa 1 · 06/10/2026 · skill <code>redesign-existing-projects</code></div><h1>Auditoria visual do app atual</h1></div>
    <div class="score"><b>6</b><span>/10</span><small>{g3} problemas de gravidade 3</small></div>
  </div>
  <div class="legend">Gravidade: <span class="sev s0">0</span> não é problema <span class="sev s1">1</span> cosmético <span class="sev s2">2</span> menor <span class="sev s3">3</span> grave <span class="sev s4">4</span> impede a tarefa</div>
{body}
</div>
<!-- /pane-audit -->'''
p=D+"fluxo-falaped-2.0.html";s=open(p).read()
s2,n=re.subn(r'<div id="pane-audit".*?(?:<!-- /pane-audit -->|\n</div>\n(?=\s*<div id="pane-comp"|\s*\n?<script>))',lambda m:pane,s,count=1,flags=re.S)
assert n==1; open(p,"w").write(s2); print("aba regerada,",g3,"de gravidade 3")
