# Regras de Negócio — Especialidades e Procedimentos

**Sistema:** Alfamed API  
**Módulos:** Specialties · Procedures  
**Data:** Junho/2026  

---

## 1. Visão Geral e Relação entre os Módulos

Especialidades (`specialties`) e procedimentos (`procedures`) são entidades de catálogo pertencentes a uma unidade. Eles possuem uma relação direta: procedimentos do tipo Consulta e Retorno são obrigatoriamente vinculados a uma especialidade. Esse vínculo é utilizado pela criação de agenda — ao selecionar uma especialidade, o sistema filtra e exibe apenas os procedimentos associados a ela.

```
specialties (catálogo da unidade)
 └── procedures (tipos 1 e 2 vinculados à especialidade)
       └── schedules (agenda filtra procs pela especialidade selecionada)
```

| Entidade | Descrição |
|---|---|
| `specialties` | Categorias clínicas da unidade (ex: Cardiologia, Ortopedia) |
| `procedures` | Serviços oferecidos pela unidade, podendo ser vinculados a uma especialidade |

---

## 2. Contexto de Unidade

A maioria das rotas de ambos os módulos exige que uma unidade esteja selecionada na requisição (via cabeçalho de contexto). As exceções são as rotas de listagem, que são acessíveis pelo app mobile sem unidade selecionada:

| Rota | Exige cabeçalho de unidade? |
|---|---|
| `GET /specialties/list-specialties-by-unit/:unitId` | Não |
| `GET /procedures/list-procedures-by-unit/:unitId` | Não |
| `GET /procedures/list-procedures-by-ids/:listaIds` | **Sim** (usado para filtrar por unidade) |
| Todas as outras rotas | Sim |

**Resposta de erro (HTTP 400) quando unidade não selecionada:**
```json
{ "message": "Selecione uma unidade para continuar" }
```

O sistema também valida se o usuário autenticado tem acesso à unidade nas rotas que exigem contexto. Caso contrário, HTTP 403.

---

## 3. Módulo: Specialties

### 3.1 Modelo de Dados

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Identificador único |
| `unitId` | UUID | Unidade à qual a especialidade pertence |
| `name` | String | Nome da especialidade (único por unidade) |
| `isActive` | Boolean | Status de ativo/inativo |
| `createdAt` | DateTime | Data de criação |
| `updatedAt` | DateTime | Data da última atualização |

---

### 3.2 `POST /specialties/` — Criar especialidade

Cria uma nova especialidade na unidade do contexto.

**Payload:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | String | Sim | Nome da especialidade |
| `isActive` | Boolean | Não | Padrão `true` |

**Regras:**
- Usuário deve ter acesso à unidade do contexto → HTTP 403
- Nome já cadastrado para a mesma unidade → HTTP 409
- `name` é trimado antes de salvar e da verificação de unicidade

| Código | Situação |
|---|---|
| `201 Created` | Especialidade criada |
| `400 Bad Request` | Unidade não selecionada |
| `401 Unauthorized` | Não autenticado |
| `403 Forbidden` | Sem acesso à unidade |
| `409 Conflict` | Nome já cadastrado nessa unidade |
| `500 Internal Server Error` | Erro interno |

---

### 3.3 `GET /specialties/list-specialties-by-unit/:unitId` — Listar especialidades da unidade

Retorna todas as especialidades da unidade informada no path.

**Parâmetros:**

| Parâmetro | Local | Tipo | Descrição |
|---|---|---|---|
| `:unitId` | Path | UUID | ID da unidade |
| `isActive` | Query | Boolean | Filtra por status ativo/inativo (opcional) |

**Regras:**
- Não exige unidade no cabeçalho de contexto — acessível pelo mobile sem unidade selecionada
- Requer apenas autenticação

| Código | Situação |
|---|---|
| `200 OK` | Lista retornada |
| `401 Unauthorized` | Não autenticado |
| `500 Internal Server Error` | Erro interno |

---

### 3.4 `GET /specialties/:specialtyId` — Buscar especialidade por ID

Retorna os dados de uma especialidade específica.

**Regras:**
- Usuário deve ter acesso à unidade do contexto → HTTP 403
- A especialidade deve pertencer à unidade do contexto → HTTP 404 se não encontrada

| Código | Situação |
|---|---|
| `200 OK` | Dados retornados |
| `400 Bad Request` | Unidade não selecionada |
| `401 Unauthorized` | Não autenticado |
| `403 Forbidden` | Sem acesso à unidade |
| `404 Not Found` | Especialidade não encontrada na unidade |
| `500 Internal Server Error` | Erro interno |

---

### 3.5 `PATCH /specialties/` — Atualizar especialidade

Atualiza uma especialidade existente. O `specialtyId` é enviado no body.

**Payload:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `specialtyId` | UUID | Sim | ID da especialidade a ser atualizada |
| `name` | String | Não | Novo nome |
| `isActive` | Boolean | Não | Novo status |

**Regras:**
- Usuário deve ter acesso à unidade do contexto → HTTP 403
- Especialidade não encontrada na unidade → HTTP 404
- Se `name` for enviado: valida unicidade excluindo a própria especialidade → HTTP 409
- **Somente campos informados no payload são atualizados**

| Código | Situação |
|---|---|
| `200 OK` | Especialidade atualizada |
| `400 Bad Request` | Unidade não selecionada |
| `401 Unauthorized` | Não autenticado |
| `403 Forbidden` | Sem acesso à unidade |
| `404 Not Found` | Especialidade não encontrada na unidade |
| `409 Conflict` | Nome já cadastrado nessa unidade |
| `500 Internal Server Error` | Erro interno |

---

## 4. Módulo: Procedures

### 4.1 Tipos de Procedimento

| Código | Nome | Especialidade obrigatória? |
|---|---|---|
| `1` | Consulta | **Sim** |
| `2` | Retorno | **Sim** |
| `3` | Exame | Não |

> Procedimentos do tipo Consulta e Retorno devem estar vinculados a uma especialidade. Ao criar uma agenda com uma especialidade selecionada, o sistema usa o filtro `specialtyId` nessa listagem para exibir apenas os procedimentos daquela especialidade.

---

### 4.2 Modelo de Dados

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Identificador único |
| `unitId` | UUID | Unidade à qual o procedimento pertence |
| `specialtyId` | UUID \| null | Especialidade associada (obrigatória para tipos 1 e 2) |
| `type` | Inteiro | Tipo do procedimento (ver seção 4.1) |
| `description` | String | Descrição do procedimento |
| `observation` | String \| null | Observação adicional |
| `code` | String | Código do procedimento (único por unidade) |
| `price` | String | Preço em formato decimal (`"150.00"`) |
| `isPerformedInUnit` | Boolean | Indica se o procedimento é executado internamente pela unidade — padrão `false` |
| `isActive` | Boolean | Status de ativo/inativo |
| `createdAt` | DateTime | Data de criação |
| `updatedAt` | DateTime | Data da última atualização |

---

### 4.3 `POST /procedures/` — Criar procedimento

Cria um novo procedimento na unidade do contexto.

**Payload:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `specialtyId` | UUID | Condicional | Obrigatório para tipos 1 e 2; opcional para tipo 3 |
| `type` | Inteiro | Sim | Tipo do procedimento (1, 2 ou 3) |
| `description` | String | Sim | Descrição do procedimento |
| `observation` | String | Não | Observação adicional |
| `code` | String | Sim | Código do procedimento (único por unidade) |
| `price` | String | Sim | Preço (aceita formato BR: `"1.500,00"` ou decimal: `"1500.00"`) |
| `isPerformedInUnit` | Boolean | Não | Padrão `false` |
| `isActive` | Boolean | Não | Padrão `true` |

**Regras:**
- Usuário deve ter acesso à unidade do contexto → HTTP 403
- `type` 1 ou 2 sem `specialtyId` → HTTP 422
- `code` já cadastrado para a mesma unidade → HTTP 409
- `price` é normalizado (ver seção 5.3)
- `code` é trimado antes de salvar

| Código | Situação |
|---|---|
| `201 Created` | Procedimento criado |
| `400 Bad Request` | Unidade não selecionada |
| `401 Unauthorized` | Não autenticado |
| `403 Forbidden` | Sem acesso à unidade |
| `409 Conflict` | Código já cadastrado nessa unidade |
| `422 Unprocessable Entity` | `specialtyId` ausente para tipo Consulta ou Retorno |
| `500 Internal Server Error` | Erro interno |

---

### 4.4 `GET /procedures/list-procedures-by-unit/:unitId` — Listar procedimentos da unidade

Retorna todos os procedimentos da unidade com suporte a filtros.

**Parâmetros:**

| Parâmetro | Local | Tipo | Descrição |
|---|---|---|---|
| `:unitId` | Path | UUID | ID da unidade |
| `specialtyId` | Query | UUID | Filtra por especialidade (opcional) |
| `isActive` | Query | Boolean | Filtra por status ativo/inativo (opcional) |

**Regras:**
- Não exige unidade no cabeçalho de contexto — acessível pelo mobile sem unidade selecionada
- Requer apenas autenticação
- Os filtros são opcionais e combináveis
- O filtro `specialtyId` é o mecanismo principal usado pela agenda para carregar apenas os procedimentos da especialidade selecionada

| Código | Situação |
|---|---|
| `200 OK` | Lista retornada |
| `401 Unauthorized` | Não autenticado |
| `500 Internal Server Error` | Erro interno |

---

### 4.5 `GET /procedures/list-procedures-by-ids/:listaIds` — Listar procedimentos por IDs

Retorna procedimentos a partir de uma lista de IDs, restrito à unidade do contexto.

**Parâmetros:**

| Parâmetro | Local | Tipo | Descrição |
|---|---|---|---|
| `:listaIds` | Path | String | IDs separados por vírgula (ex: `uuid1,uuid2,uuid3`) |
| `isActive` | Query | Boolean | Filtra por status ativo/inativo (opcional) |

**Regras:**
- Exige unidade no cabeçalho de contexto — retorna apenas procedures que pertencem à unidade selecionada
- IDs que não pertençam à unidade são silenciosamente ignorados
- Requer autenticação

| Código | Situação |
|---|---|
| `200 OK` | Lista retornada |
| `400 Bad Request` | Unidade não selecionada |
| `401 Unauthorized` | Não autenticado |
| `500 Internal Server Error` | Erro interno |

---

### 4.6 `GET /procedures/:procedureId` — Buscar procedimento por ID

Retorna os dados de um procedimento específico.

**Regras:**
- Usuário deve ter acesso à unidade do contexto → HTTP 403
- O procedimento deve pertencer à unidade do contexto → HTTP 404 se não encontrado

| Código | Situação |
|---|---|
| `200 OK` | Dados retornados |
| `400 Bad Request` | Unidade não selecionada |
| `401 Unauthorized` | Não autenticado |
| `403 Forbidden` | Sem acesso à unidade |
| `404 Not Found` | Procedimento não encontrado na unidade |
| `500 Internal Server Error` | Erro interno |

---

### 4.7 `PATCH /procedures/` — Atualizar procedimento

Atualiza um procedimento existente. O `procedureId` é enviado no body.

**Payload:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `procedureId` | UUID | Sim | ID do procedimento a ser atualizado |
| `specialtyId` | UUID \| null | Não | Novo vínculo (null remove — apenas válido para tipo 3) |
| `type` | Inteiro | Não | Novo tipo |
| `description` | String | Não | Nova descrição |
| `observation` | String \| null | Não | Nova observação (null limpa o campo) |
| `code` | String | Não | Novo código |
| `price` | String | Não | Novo preço |
| `isPerformedInUnit` | Boolean | Não | Atualiza se a unidade executa o procedimento internamente |
| `isActive` | Boolean | Não | Novo status |

**Regras:**
- Usuário deve ter acesso à unidade do contexto → HTTP 403
- Procedimento não encontrado na unidade → HTTP 404
- O sistema calcula o estado efetivo: `tipoEfetivo = type enviado ?? type existente` e `specialtyIdEfetivo = specialtyId enviado ?? specialtyId existente`. Se o tipo efetivo for 1 ou 2 e specialtyId efetivo for nulo → HTTP 422
- Se `code` for enviado: valida unicidade excluindo o próprio procedimento → HTTP 409
- **Somente campos informados no payload são atualizados**

| Código | Situação |
|---|---|
| `200 OK` | Procedimento atualizado |
| `400 Bad Request` | Unidade não selecionada |
| `401 Unauthorized` | Não autenticado |
| `403 Forbidden` | Sem acesso à unidade |
| `404 Not Found` | Procedimento não encontrado na unidade |
| `409 Conflict` | Código já cadastrado nessa unidade |
| `422 Unprocessable Entity` | Tipo efetivo é Consulta/Retorno sem especialidade vinculada |
| `500 Internal Server Error` | Erro interno |

---

## 5. Regras de Negócio Transversais

### 5.1 Unicidade de Nome de Especialidade por Unidade

O campo `name` da especialidade deve ser único dentro da mesma unidade.

**Resposta de erro (HTTP 409):**
```json
{ "message": "Essa especialidade já está cadastrada nessa unidade" }
```

### 5.2 Especialidade Condicional por Tipo de Procedimento

A validação considera o estado efetivo dos campos após aplicação do payload:

- **CREATE**: `type` 1 ou 2 sem `specialtyId` → HTTP 422
- **UPDATE**: tipo efetivo 1 ou 2 com specialtyId efetivo nulo → HTTP 422

**Resposta de erro (HTTP 422):**
```json
{ "message": "Especialidade é obrigatória para Consultas e Retornos" }
```

### 5.3 Normalização de Preço do Procedimento

Aceita formato brasileiro (ponto como milhar, vírgula como decimal):

```
"1.500,50" → "1500.50"
"150,00"   → "150.00"
"1500.00"  → "1500.00"
```

O valor é armazenado como `numeric(12,2)` no banco.

### 5.4 Unicidade de Código de Procedimento por Unidade

O campo `code` deve ser único dentro da mesma unidade. Na atualização, o próprio procedimento é excluído da verificação.

**Resposta de erro (HTTP 409):**
```json
{ "message": "O código do procedimento já está cadastrado nessa unidade" }
```

### 5.5 Execução Interna do Procedimento (`isPerformedInUnit`)

O campo `isPerformedInUnit` indica se a unidade executa o procedimento internamente ou se ele é apenas um encaminhamento externo.

- Padrão `false` — o procedimento não é executado pela unidade.
- Quando `true`, o médico pode criar **pedidos internos** (`requests`) para esse procedimento durante o atendimento, desde que a unidade também tenha `modulo1GestaoExames = true` em `unit_parameters`.
- Quando `false`, o procedimento pode ser usado apenas em **pedidos externos** (`external_requests`).

Consulte [regras-negocio-parametros-unidade.md](regras-negocio-parametros-unidade.md) e [regras-negocio-pedidos-externos.md](regras-negocio-pedidos-externos.md).

### 5.6 Atualização Incremental

Em ambos os módulos, o `PATCH` atualiza apenas os campos enviados no payload. Campos ausentes mantêm seus valores atuais.

### 5.7 Controle de Acesso por Unidade

Operações de escrita e busca por ID validam se o usuário pertence à unidade via `assertUserHasUnitAccess`, aplicado antes de qualquer lógica de negócio. As rotas de listagem são abertas a qualquer usuário autenticado para suportar o fluxo de agendamento mobile.
