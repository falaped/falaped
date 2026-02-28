# Pediatric Dashboard Design – Referência Expandida

Exemplos detalhados e variações para consulta quando precisar de mais orientação.

---

## Variações de PatientCard

### Card compacto (listagem)

```tsx
<Card className="overflow-hidden">
  <CardHeader className="pb-2">
    <CardTitle className="text-base font-medium">{patient.name}</CardTitle>
    <CardDescription className="text-sm">
      {patient.responsible} • {formatPhone(patient.contact_phone)}
    </CardDescription>
  </CardHeader>
</Card>
```

### Card expandido (detalhes)

```tsx
<Card>
  <CardHeader>
    <CardTitle>{patient.name}</CardTitle>
    <CardDescription>Paciente desde {formatDate(patient.created_at)}</CardDescription>
  </CardHeader>
  <CardContent className="space-y-3">
    <div>
      <p className="text-sm font-medium text-muted-foreground">Responsável</p>
      <p className="text-base">{patient.responsible}</p>
    </div>
    <div>
      <p className="text-sm font-medium text-muted-foreground">Telefone de contato</p>
      <a href={`tel:${patient.contact_phone}`} className="text-primary hover:underline">
        {formatPhone(patient.contact_phone)}
      </a>
    </div>
    {patient.birth_date && (
      <div>
        <p className="text-sm font-medium text-muted-foreground">Data de nascimento</p>
        <p className="text-base">{formatDate(patient.birth_date)}</p>
      </div>
    )}
    {patient.allergies && (
      <div>
        <p className="text-sm font-medium text-muted-foreground">Alergias</p>
        <p className="text-base">{patient.allergies}</p>
      </div>
    )}
  </CardContent>
  <CardFooter className="gap-2">
    <Button variant="outline" asChild><Link href={`/dashboard/patients/${patient.id}`}>Ver detalhes</Link></Button>
    <Button asChild><Link href={`/dashboard/cases?patient=${patient.id}`}>Ver casos</Link></Button>
  </CardFooter>
</Card>
```

### Linha em tabela (layout alternativo)

```tsx
<tr className="border-b border-border hover:bg-muted/50 transition-colors">
  <td className="px-4 py-3 font-medium">{patient.name}</td>
  <td className="px-4 py-3 text-muted-foreground">{patient.responsible}</td>
  <td className="px-4 py-3 text-muted-foreground">{formatPhone(patient.contact_phone)}</td>
  <td className="px-4 py-3">
    <Button variant="ghost" size="sm" asChild><Link href={`/dashboard/patients/${patient.id}`}>Abrir</Link></Button>
  </td>
</tr>
```

---

## Variações de Empty State

### Com ícone e CTA

```tsx
<div className="rounded-xl border border-dashed border-border p-8 text-center">
  <UsersIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
  <p className="mt-4 font-medium text-muted-foreground">Nenhum paciente cadastrado.</p>
  <p className="mt-1 text-sm text-muted-foreground">
    Cadastre o primeiro paciente para começar.
  </p>
  <Button asChild className="mt-6">
    <Link href="/dashboard/patients/new">Cadastrar paciente</Link>
  </Button>
</div>
```

### Sem CTA (casos – vêm do WhatsApp)

```tsx
<div className="rounded-xl border border-dashed border-border p-8 text-center">
  <MessagesSquareIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
  <p className="mt-4 font-medium text-muted-foreground">Nenhum caso ativo.</p>
  <p className="mt-1 text-sm text-muted-foreground">
    Os atendimentos aparecem aqui quando iniciados pelo WhatsApp.
  </p>
</div>
```

### Busca sem resultados

```tsx
<div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
  <p className="font-medium text-muted-foreground">Nenhum resultado encontrado.</p>
  <p className="mt-1 text-sm text-muted-foreground">
    Tente outro termo de busca ou limpe os filtros.
  </p>
  <Button variant="outline" size="sm" className="mt-4" onClick={onClearFilters}>
    Limpar filtros
  </Button>
</div>
```

---

## Listagem vs Cards – quando usar

| Cenário | Recomendação |
|---------|--------------|
| Muitos itens (>10), busca/filtro | Tabela ou lista compacta; scroll; paginação |
| Poucos itens (<10), destaque visual | Grid de cards |
| Busca de paciente para associar a caso | Combobox ou lista compacta com nome + responsável + telefone |
| Casos ativos (geralmente <5) | Cards ou lista com status em destaque |
| Histórico de casos (muitos) | Tabela com colunas: data, responsável, paciente, status |

---

## Padrão de página com filtro/busca

```tsx
<div className="flex flex-col gap-6">
  <div>
    <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
    <p className="text-sm text-muted-foreground">Gerencie os pacientes cadastrados.</p>
  </div>
  <div className="flex items-center gap-4">
    <Input placeholder="Buscar por nome..." className="max-w-sm" />
    <Button asChild><Link href="/dashboard/patients/new">Cadastrar</Link></Button>
  </div>
  {patients.length > 0 ? (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {patients.map((p) => <PatientCard key={p.id} patient={p} />)}
    </div>
  ) : (
    <EmptyStatePatients />
  )}
</div>
```

---

## Referência de campos Patient (schema)

Para consulta ao modelar PatientCard ou PatientForm:

- **Obrigatórios**: `name`, `responsible`, `contact_phone`
- **Frequentes**: `birth_date`, `sex`
- **Clínicos (opcional)**: `legal_guardian`, `blood_type`, `weight`, `height`, `head_circumference`, `allergies`, `current_medications`, `medical_history`

Prioridade de exibição em card: nome > responsável > telefone > nascimento > alergias.
