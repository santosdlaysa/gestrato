# Perfis e Permissões — status da implementação

Branch: `feat/perfis-e-permissoes` (nada commitado ainda).
Objetivo: substituir os 4 papéis fixos por **perfis personalizados com matriz de
permissões editável (no banco)**, proteger a leitura no backend e fazer o front
consumir as permissões da API.

> ⚠️ Esta branch também carrega, sem commit, o feature anterior de **inadimplência**
> (a branch foi criada a partir da `main` com aquelas alterações no working tree).
> Ao commitar, separe em commits distintos se quiser.

---

## ✅ BACKEND — concluído e verificado

Modelo novo: `Perfil` (id, nome, descrição, `permissoes: String[]`, `sistema`) e
`Usuario.perfilId` (FK). As 10 permissões continuam fixas no código (são
capacidades que o código checa); o que virou dado é **quais permissões cada
perfil reúne**. Autorização passou a ser resolvida **a cada requisição** a partir
do banco (inativar/trocar perfil tem efeito imediato; o token só carrega id+email).

Arquivos criados/alterados:
- `domain/acesso/permissao.ts` (novo) — PERMISSOES, `garantirPermissao`, `normalizarPermissoes`, `rotuloDaPermissao`.
- `domain/acesso/perfil.ts` (novo) — entidade `Perfil` (renomear, definirPermissoes, garantirQuePodeSerExcluido).
- `domain/acesso/usuario.ts` — refatorado: `perfilId`+permissões efetivas; `atribuirPerfil`, `ativar`, `renomear`, `alterarEmail`; reexporta as permissões.
- `application/ports/repositorios.ts` — `RepositorioDePerfis`, `excluir` em usuários, `perfis` em `Repositorios`.
- `application/ports/seguranca.ts` — `ConteudoDoToken` sem `papel`.
- `application/use-cases/acesso/autenticar.ts` — saída com `perfilId`/`perfilNome`/`permissoes`.
- `infrastructure/seguranca/servicos-de-seguranca.ts` — token sem `papel`.
- `infrastructure/persistence/prisma/mappers/perfil.mapper.ts` (novo).
- `infrastructure/persistence/prisma/mappers/usuario.mapper.ts` — inclui relação `perfil`.
- `infrastructure/persistence/prisma/repositorios/usuarios.repositorio.ts` — `include perfil` + `excluir`.
- `infrastructure/persistence/prisma/repositorios/perfis.repositorio.ts` (novo).
- `infrastructure/persistence/prisma/unidade-de-trabalho.ts` — fia `perfis`.
- `interfaces/http/tipos.ts` — `UsuarioAutenticado { id, nome, email, perfilId, perfilNome, permissoes }`.
- `interfaces/http/middlewares/autenticacao.ts` — `criarExigirAutenticacao(token, resolverIdentidade)`; `exigirPermissao` via `permissoes`.
- `interfaces/http/controllers/autenticacao.controller.ts` — `eu` retorna perfil+permissões.
- `interfaces/http/controllers/acesso.controller.ts` — reescrito: CRUD de usuários (criar/editar/redefinir senha/excluir) e de perfis (criar/editar/excluir), listar permissões, **trava anti-lockout** de administrador.
- `interfaces/http/rotas/acesso.rotas.ts` — todas as rotas (inclusive GETs) exigem `GERIR_USUARIOS`; novos endpoints `PUT /usuarios/:id/senha`, `DELETE /usuarios/:id`, `POST/PUT/DELETE /perfis`.
- `interfaces/http/aplicacao.ts` — resolvedor de identidade por requisição + controller com repositório de perfis.
- `prisma/schema.prisma` — modelo `Perfil` + `Usuario.perfilId`; removidos enum `PapelUsuario` e coluna `papel`.
- `prisma/migrations/20260810000000_perfis_e_permissoes/migration.sql` — migração com **backfill** (cria 4 perfis de sistema, mapeia cada usuário pelo papel atual, remove coluna/enum).
- `prisma/seed.ts` — `semearPerfis()` (4 perfis de sistema com ids fixos) + usuários por `perfilId`.
- `scripts/verificar-acesso.ts` — verificação e2e (sobe a app real e testa 8 cenários).

Verificações feitas:
- `npm run check` (typecheck backend): **OK**.
- `npm test`: **275/275 OK**.
- Migração + **backfill** aplicados em Postgres local: 3 usuários legados (ADMINISTRADOR/FINANCEIRO/CONSULTA) mapeados aos perfis certos; `papel`/enum removidos. **OK**.
- `npm run seed` no banco de teste: **OK**.
- e2e `scripts/verificar-acesso.ts`: **8/8 OK** (login com perfil+permissões; leitura 403 p/ Consulta; `/auth/eu`; criar perfil com permissão inválida filtrada; atribuir perfil; trava anti-lockout 409; excluir perfil com usuários 409; excluir perfil sem vínculo 204; perfil de sistema protegido 409).

Mapeamento de erros → HTTP: regra de negócio/conflito retornam **409**.

---

## ✅ FRONTEND — concluído (código); verificação visual pendente

Concluído:
- `tipos/usuario.ts` — union `Permissao`; `Usuario { id, nome, email, perfilId, perfilNome, permissoes }`.
- `tipos/acesso.ts` — `UsuarioDeAcesso`, `PerfilDeAcesso` (com `sistema`, `descricao`, `permissoes`), `PermissaoDeAcesso`.
- `lib/api/acesso.ts` — `EntradaDeUsuario` (perfilId), `EntradaDePerfil`, `redefinirSenha`, `excluirUsuario`, `criarPerfil`, `atualizarPerfil`, `excluirPerfil`.
- `lib/permissoes.ts` — helpers baseados em **permissões** (não mais em papel) + `podeGerirUsuarios`.
- `contextos/AutenticacaoContexto.tsx` — `usePapel()` → `usePermissoes()`.
- `lib/navegacao.ts` — `Modulo.permissao?` + `PERMISSAO_POR_MODULO` (gate por permissão).
- `componentes/layout/BarraLateral.tsx` — filtro de módulo por permissão; exibe `perfilNome`.
- 14 telas/componentes: `usePapel` → `usePermissoes` (sed). Obs.: a variável local ainda se chama `papel` em alguns arquivos, mas agora contém a lista de permissões (funciona; renomear é cosmético).
- **`web/src/paginas/Acesso.tsx` reescrita** (feita): aba **Usuários** (tabela nome/e-mail/perfil/situação/último acesso; **dropdown de perfil dinâmico**; ações Editar / Redefinir senha / Excluir com tratamento de erro), aba **Perfis** (**matriz de permissões editável** por checkbox; criar/editar/excluir; perfil `sistema` sem excluir; mostra descrição e usuários vinculados), aba **Permissões** (informativa: permissão → perfis).
- Grep confirmou: nenhum resquício de `Papel`/`.papel`/`PAPEIS`/`rotuloDoPapel` restante no front.

Verificações do front:
- `npm run checar-tipos` (web): **OK**.
- `npm run build` (web): **OK** (202 módulos).

### ❌ FALTA (verificação visual)

- **Não** foi possível dirigir a UI no navegador nesta sessão: o **Docker Desktop foi encerrado** (banco de teste local caiu) e a **extensão do Chrome está desconectada**. O código do front compila e faz build; o backend está provado por 8/8 testes e2e. Falta apenas subir os dois servidores (API contra um banco local + `web` dev) e clicar pelas três abas para uma conferência visual.

---

## 🔧 Pendências operacionais

- **Migração no Render (produção)**: NÃO aplicada. Quando aprovar, rodar `npx prisma migrate deploy` apontando para o banco real — o backfill mapeia os usuários existentes (papel → perfil) automaticamente. Fazer backup/verificar antes.
- **Commit**: nada commitado na branch `feat/perfis-e-permissoes` (inclui inadimplência + perfis).
- **`prisma generate`** deu `EPERM` (lock de DLL no Windows por um processo `node`/`tsx` em execução — provável dev server). Os **tipos** foram atualizados (typecheck passou); para regenerar o engine, encerrar o processo que trava a DLL e rodar `npx prisma generate`.
- **Bancos de teste locais em execução** (podem ser removidos):
  - `gestrato-test-db` (Postgres em `localhost:5544`) — criado só para validar. Remover: `docker rm -f gestrato-test-db`.
  - `gestrato-db` (compose, `localhost:5432`) — subido por mim; **conflita com um Postgres nativo do host na 5432**. Parar: `docker compose down` (na raiz do repo).
- **Mudança de comportamento do menu (decisão a confirmar)**: o gating de menu deixou de ser por papel e passou a liberar a maioria dos módulos para qualquer autenticado, restringindo por `GERIR_USUARIOS` apenas a área administrativa (cadastros/auditoria/configurações). Motivo: os módulos "por função" (comercial/financeiro/crm) não mapeiam limpo para uma permissão. O backend continua barrando as ações de escrita por permissão. Se preferir preservar o recorte antigo por função, precisamos de um mapeamento módulo→permissão mais fino.

---

## Endpoints novos/alterados (referência)

- `POST /api/auth/login` → `{ token, usuario: { id, nome, email, perfilId, perfilNome, permissoes } }`
- `GET /api/auth/eu` → `{ id, nome, email, perfilId, perfilNome, permissoes }`
- `GET/POST /api/usuarios`, `PUT /api/usuarios/:id`, `PUT /api/usuarios/:id/senha`, `DELETE /api/usuarios/:id` — exigem `GERIR_USUARIOS`
- `GET/POST /api/perfis`, `PUT /api/perfis/:id`, `DELETE /api/perfis/:id` — exigem `GERIR_USUARIOS`
- `GET /api/permissoes` — exige `GERIR_USUARIOS`
