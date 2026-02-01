# Avaliação do frontend em relação às regras (.cursor/rules)

Este documento resume a conformidade do portal com as regras em `.cursor/rules` (frontend-architecture, coding-standards, pre-commit-checks) e as correções aplicadas.

---

## 1. Estrutura e camadas (frontend-architecture §3)

**Regra:** `src/` com `pages/`, `features/`, `shared/` (components, hooks, api, utils, types), styles. Pages só coordenam roteamento; features agrupam UI + hooks + api + types; shared contém componentes e utilitários cross-cutting; features não dependem de internals de outras features.

**Status:** ✅ Em grande parte conforme.

- **features/** – Cada feature tem `api.ts`, `hooks/`, `types.ts` e, quando necessário, `schemas.ts`. Domínios: applications, auth, clusters, components, dashboard, environments, groups, instances, organizations, templates, tokens, users. **setup** foi adicionado com `api.ts` e `types.ts`.
- **shared/** – Contém `components/`, `api/` (client axios), `utils/`, `types/`.
- **pages/** – Páginas importam hooks e tipos das features e componentes de `shared/components`; poucas ainda importam de `src/components/` (legado).
- **Inconsistência:** Existe `src/components/` na raiz (além de `shared/components/`), com duplicação (Layout, Breadcrumbs, DataTable, PageHeader, etc.). A regra recomenda apenas `shared/` para componentes compartilhados. Parte das páginas já usa `shared/components`; **InstanceDetail** foi ajustado para usar `shared/components` em vez de `components/`.

---

## 2. API e dados (frontend-architecture §4, coding-standards)

**Regra:** Camada de API centralizada; sem URLs/fetch espalhados; cada feature com seu `api/`; uso de hooks para fetching; tratamento de erro padronizado; não vazar objetos brutos do backend para a UI.

**Status:** ✅ Ajustado.

- **Correções feitas:**
  - **SecretsInput** – Deixou de montar URL manualmente e usar `axios` + `API_BASE_URL`. Passou a usar `webappComponentsApi`, `cronComponentsApi` e `workerComponentsApi` de `features/components/api`, com novo método `getSecrets` em cada um.
  - **Setup** – Criada a feature **setup** com `api.ts` (`getStatus`, `initialize`) e `types.ts`. **Setup.tsx** e **SetupGuard** passaram a usar `setupApi` em vez de `axios.get/post` + `API_BASE_URL`.
- **Pendente:** `services/api.ts` ainda concentra muitas APIs (re-exportando features e definindo outras). O ideal a longo prazo é que páginas/hooks usem apenas as features e que `services/api` seja reduzido ao client (ou re-exports de compatibilidade). **AuthContext** usa `authApi` de `services/api`; poderia usar `features/auth/api`.

---

## 3. Estado (frontend-architecture §5)

**Regra:** Preferir abordagem mais simples: estado local → hooks de feature → estado global só quando necessário; evitar múltiplas libs de estado global.

**Status:** ✅ Conforme. Uso de React state, React Query (via hooks das features) e contextos (Auth, Organization) de forma coerente.

---

## 4. UI, UX e design (frontend-architecture §6)

**Regra:** Tabelas, formulários e layouts consistentes; ações primárias previsíveis; empty states e loading claros.

**Status:** ✅ Conforme. Uso de `DataTable`, `PageHeader`, `Breadcrumbs`, loading/empty em listagens e formulários.

---

## 5. Formulários e validação (frontend-architecture §7)

**Regra:** Biblioteca de validação unificada (Yup/Zod); reutilizar mensagens do backend quando possível; desabilitar submit durante request; evitar duplo submit.

**Status:** ✅ Conforme. Zod usado nas features (schemas em `features/*/schemas.ts`); submit desabilitado durante envio onde verificado.

---

## 6. Tipos e backend (frontend-architecture §8, coding-standards §2)

**Regra:** TypeScript; DTOs em `types/`; espelhar contratos do backend; evitar `any` a não ser que justificado.

**Status:** ⚠️ Parcialmente conforme. Tipos e DTOs existem nas features. Há `any` e variáveis não usadas em alguns arquivos (ex.: InstanceDetail, organizations/api, services/api), gerando erros de lint/tsc pré-existentes.

---

## 7. Comentários e idioma (coding-standards §2.1)

**Regra:** Código, comentários, logs e mensagens de erro em **inglês**. Texto de UI pode estar no idioma do produto; chaves e comentários em inglês para futura i18n.

**Status:** ✅ Ajustado.

- **Correções feitas:** Em `shared/components/Layout.tsx`, comentários em português foram alterados para inglês: "Barra de Pesquisa" → "Search bar", "Overlay para mobile" → "Mobile overlay".
- **Nota:** `NoOrganizationScreen` usa texto de UI em português ("Nenhuma organização associada", "Sair", etc.). Isso é permitido pela regra para texto de produto; para i18n futura, o ideal é centralizar cópias.

---

## 8. Tamanho e responsabilidade de componentes (frontend-architecture §13)

**Regra:** Componentes pequenos e com uma responsabilidade; evitar “God Components”; arquivos em torno de ~150–200 LOC; separar apresentação e lógica; hooks com lógica, componentes com layout.

**Status:** ⚠️ Parcialmente conforme.

- **Layout.tsx** (~358 linhas) e **InstanceDetail.tsx** (~1453 linhas) estão acima do guia. A regra sugere avaliar divisão quando passar de ~150–200 LOC. Recomendação: extrair trechos do Layout (ex.: sidebar, header) e quebrar InstanceDetail em subcomponentes/hooks (por tipo de componente, tabelas, modais, etc.).
- Demais componentes e hooks estão em tamanho razoável.

---

## 9. Testes e pré-commit (pre-commit-checks, frontend-architecture §9)

**Regra:** Antes do commit: `npm run lint`, `npx tsc --noEmit`, `npm run test`. Testes para componentes/hooks complexos; nomes em inglês.

**Status:** ⚠️ Lint e tsc ainda reportam erros/warnings pré-existentes (unused vars, hooks condicionais em Layout, `any`, etc.). Os arquivos alterados nesta avaliação não introduziram novos erros. Recomendação: corrigir esses itens e manter o fluxo de pré-commit (lint + typecheck + test) antes de cada commit.

---

## 10. Resumo das alterações realizadas

| Item | Ação |
|------|------|
| Comentários em português no Layout | Traduzidos para inglês em `shared/components/Layout.tsx`. |
| SecretsInput com URL/axios direto | Passou a usar `features/components/api` (webapp/cron/worker) com novo `getSecrets`. |
| Setup/SetupGuard com axios + API_BASE_URL | Criada feature `setup` com `api.ts` e `types.ts`; Setup.tsx e SetupGuard usam `setupApi`. |
| InstanceDetail importando de `components/` | Imports de Breadcrumbs, PageHeader e DataTable unificados para `shared/components`. |

---

## 11. Recomendações futuras

1. **Estrutura:** Migrar gradualmente o restante dos usos de `src/components/` para `shared/components` ou para componentes dentro das features; reduzir duplicação entre `components/` e `shared/components/`.
2. **API:** Fazer AuthContext (e outros consumidores) usarem diretamente as APIs das features (ex.: `features/auth/api`) em vez de `services/api`, e reduzir o papel de `services/api` a client/re-exports.
3. **Componentes grandes:** Refatorar Layout (extrair sidebar/header) e InstanceDetail (quebrar em subcomponentes/hooks) para alinhar ao limite de LOC e responsabilidade única.
4. **Lint/TypeScript:** Corrigir erros e warnings atuais (unused vars, hooks condicionais, `any`) e manter pré-commit (lint + tsc + test) verde.
5. **i18n:** Quando houver internacionalização, centralizar textos de UI (incluindo os atualmente em português) em chaves em inglês.
