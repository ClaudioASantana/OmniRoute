---
title: "Análise Técnica: Roteamento auto/coding e Seleção por Complexidade"
description: "Diagnóstico detalhado sobre o comportamento do modelo auto/coding, estratégia LKGP e se a complexidade influencia a escolha do modelo no OmniRoute."
version: 3.8.53
lastUpdated: 2026-11-23
---

# Análise Técnica: Roteamento `auto/coding` e Seleção por Complexidade

> **Data:** 23 de Novembro de 2026  
> **Escopo:** OmniRoute Auto-Combo Engine (`open-sse/services/autoCombo/`)  
> **Cenário do Usuário:** Desenvolvimento de projeto em ASP.NET Core / C# com melhores práticas de arquitetura. Utilização do modelo `auto/coding` resultando no acionamento exclusivo de `antigravity/gemini-3.8-flash-medium`.

---

## 1. Dúvidas do Usuário

1. **O acionamento exclusivo de `antigravity/gemini-3.8-flash-medium` está correto ou deveria estar usando outro modelo?**
2. **A escolha por complexidade está sendo usada para escolher o melhor modelo no `auto/coding` ou não?**

---

## 2. Resumo Executivo

| Pergunta                                               | Resposta                   | Motivo Principal                                                                                                                                                                                                                                                   |
| :----------------------------------------------------- | :------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A complexidade decide o modelo em `auto/coding`?**   | **Não.**                   | No perfil `quality-first` do `auto/coding`, os pesos de afinidade de complexidade (`tierAffinity` e `specificityMatch`) são **iguais a zero**, e a estratégia LKGP intercepta a seleção antes do score.                                                            |
| **Por que só acionou o `gemini-3.8-flash-medium`?**    | **Estratégia LKGP ativa.** | Todos os combos `auto/*` usam a estratégia LKGP (_Last Known Good Provider_). Uma vez que a Antigravity respondeu com sucesso, ela é fixada na sessão e o primeiro modelo elegível é reutilizado.                                                                  |
| **Está adequado para ASP.NET / C# com boas práticas?** | **Parcialmente.**          | O `gemini-3.8-flash-medium` é rápido e funcional, mas para arquiteturas robustas em C# (Clean Architecture, DDD, CQRS, EF Core), modelos _Pro_ (`claude-sonnet-4-6`, `claude-opus`, `gemini-3.8-flash-high`) entregam qualidade de código e abstrações superiores. |

---

## 3. Evidência em Tempo Real (Logs do Container `omniroute-prod`)

A inspeção dos logs reais da instância OmniRoute revelou exatamente o fluxo de decisão para as requisições em `auto/coding`:

```text
[HTTP]  POST /v1/v1/messages | auto/coding | 80 msgs | 17 tools
[POLICY] Guardrail reroute to "antigravity/gemini-3.8-flash-high" rejected by API key policy (key=unknown); keeping original model "auto/coding"
[AUTO]  Zero-config routing variant: coding (model=auto/coding)
[AUTO]  Virtual auto-combo created: auto/coding (3 candidates)
[COMBO] Complexity-aware routing: level=complex score=43 minTier=cheap tools=true
[COMBO] Auto selection: antigravity/gemini-3.8-flash-medium | intent=code task=coding | strategy=lkgp | LKGP: using last known good provider antigravity
[COMBO] Trying model 1/55: antigravity/gemini-3.8-flash-medium
[COMBO] Model antigravity/gemini-3.8-flash-medium succeeded (7494ms, 0 fallbacks)
```

---

## 4. Análise Técnica Detalhada do Código

### 4.1. Por que o `auto/coding` não usa a complexidade para trocar de modelo?

No pipeline do OmniRoute, a classificação de complexidade ocorre em `open-sse/services/combo/resolveAutoStrategy.ts`:

```typescript
const autoManifestHint: RoutingHint | null = await buildComplexityRoutingHint(
  eligibleTargets.filter((t) => t.kind === "model"),
  body,
  log
);
```

O detector regex avaliou a requisição como:
`level=complex score=43 minTier=cheap tools=true`

Porém, essa recomendação **não afeta o resultado final** por dois bloqueios arquiteturais:

#### Bloqueio 1: Pesos zerados no mode pack `quality-first`

O `auto/coding` adota o pacote de pesos `quality-first` (`open-sse/services/autoCombo/modePacks.ts`):

```typescript
"quality-first": {
  quota: 0.0752,
  health: 0.1714,
  costInv: 0.0276,
  latencyInv: 0.0476,
  taskFit: 0.3524,        // 👈 Peso dominante (aptidão para código)
  stability: 0.1429,
  tierPriority: 0.0276,
  tierAffinity: 0,        // 👈 Peso zero
  specificityMatch: 0,    // 👈 Peso zero (ignora o match de complexidade)
  ...
}
```

Na fórmula de cálculo de score (`open-sse/services/autoCombo/scoring.ts`):

```typescript
(weights.tierAffinity ?? 0) * factors.tierAffinity +
  (weights.specificityMatch ?? 0) * factors.specificityMatch;
```

Como ambos os pesos são `0`, o fator de complexidade calculado é multiplicado por zero e descartado.

#### Bloqueio 2: A estratégia LKGP anula o ranking dinâmico

Todas as rotas virtuais `auto/*` são instanciadas com `routerStrategy = "lkgp"` (`open-sse/services/autoCombo/virtualFactory.ts:1084`).

Quando uma requisição anterior tem sucesso:

```typescript
// open-sse/services/autoCombo/routerStrategy.ts
if (context.lastKnownGoodProvider) {
  const candidates = pool.filter(
    (c) => c.provider === context.lastKnownGoodProvider && c.circuitBreakerState !== "OPEN"
  );
  if (candidates.length > 0) {
    const best = candidates[0];
    return {
      provider: best.provider,
      model: best.model,
      strategy: this.name,
      reason: `LKGP: using last known good provider ${best.provider}`,
      candidatesConsidered: 1,
      finalScore: 1.0,
      connectionId: best.connectionId,
    };
  }
}
```

O LKGP dá prioridade absoluta à estabilidade de conexão (evitar trocar de provedor a cada chamada de tool ou prompt sequencial). Ele ignora o score comparativo e retorna imediatamente o primeiro modelo disponível da Antigravity com score `1.0`.

---

## 5. Como Obter Modelos de Maior Calibre no seu Projeto ASP.NET / C#

Se você deseja que o roteador utilize modelos mais fortes (como `claude-sonnet-4-6`, `claude-opus-5` ou `gemini-3.8-flash-high`) para suportar decisões arquiteturais complexas no C#, você tem as seguintes opções:

### Opção 1: Usar o seletor de tier `auto/coding:pro`

O OmniRoute suporta sufixos de composição (veja `docs/routing/AUTO-COMBO.md`):

- Configure o modelo no seu cliente/IDE como:
  ```json
  "model": "auto/coding:pro"
  ```
- O tier `:pro` filtra o pool de candidatos via `classifyTier`, descartando modelos `free` e `cheap` e mantendo apenas modelos de nível premium/flagship.

### Opção 2: Usar o Combo Dedicado por Complexidade (`combo/roteador-inteligente`)

O seu banco de dados local já possui um combo cadastrado com a estratégia nativa de complexidade:

- **Nome do combo:** `combo/roteador-inteligente`
- **Estratégia:** `complexity-optimized`
- **Modelos configurados no pool:**
  1. `claude/claude-haiku-4-5-20251001` (para tarefas simples/rápidas)
  2. `antigravity/gemini-3.1-flash-lite`
  3. `antigravity/gemini-3.7-flash-high`
  4. `claude/claude-sonnet-4-6` (ativado para códigos complexos)
  5. `claude/claude-opus-5` (ativado para tarefas expert de arquitetura)

Nesse combo, o `ComplexityRouter` **efetivamente comanda** qual modelo é chamado com base na complexidade do prompt.

### Opção 3: Definir o Modelo Padrão na Conexão Antigravity

Se preferir continuar usando `auto/coding`, mas quer que a Antigravity utilize um modelo mais potente que o `-medium`:

1. Acesse o dashboard do OmniRoute em `http://localhost:20130`.
2. Vá em **Connections** -> **antigravity**.
3. No campo **Default Model**, selecione `gemini-3.8-flash-high` (ou `gemini-pro-agent`).
4. Salve. O LKGP passará a usar esse modelo como primeira opção para a Antigravity.
