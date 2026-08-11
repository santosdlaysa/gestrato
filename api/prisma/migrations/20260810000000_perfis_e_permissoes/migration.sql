-- Perfis de acesso dinamicos: substitui o enum fixo PapelUsuario por uma tabela
-- de perfis (nome + conjunto de permissoes) referenciada pelo usuario.
--
-- Migracao com preservacao de dados: cria os quatro perfis de sistema com os
-- mesmos poderes que os papeis fixos tinham, aponta cada usuario para o perfil
-- equivalente ao seu papel atual e so entao remove a coluna e o enum antigos.

-- 1) Tabela de perfis.
CREATE TABLE "perfis" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "permissoes" TEXT[],
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "perfis_nome_key" ON "perfis"("nome");

-- 2) Perfis de sistema, com a mesma matriz que os papeis tinham no codigo.
INSERT INTO "perfis" ("id", "nome", "descricao", "permissoes", "sistema", "atualizadoEm") VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Administrador', 'Acesso total ao sistema',
   ARRAY['CADASTRAR','GERIR_CONTRATOS','RECEBER_PAGAMENTO','EMITIR_DOCUMENTO','ENVIAR_COBRANCA','CONFIGURAR_REGUA','RENEGOCIAR','ANEXAR_ARQUIVO','REMOVER_ANEXO','GERIR_USUARIOS'],
   true, CURRENT_TIMESTAMP),
  ('00000000-0000-0000-0000-0000000000a2', 'Financeiro', 'Operação financeira, cobrança e recebimentos',
   ARRAY['CADASTRAR','GERIR_CONTRATOS','RECEBER_PAGAMENTO','EMITIR_DOCUMENTO','ENVIAR_COBRANCA','CONFIGURAR_REGUA','RENEGOCIAR','ANEXAR_ARQUIVO','REMOVER_ANEXO'],
   true, CURRENT_TIMESTAMP),
  ('00000000-0000-0000-0000-0000000000a3', 'Vendedor', 'Cadastro de clientes, contratos e documentos',
   ARRAY['CADASTRAR','GERIR_CONTRATOS','EMITIR_DOCUMENTO','ANEXAR_ARQUIVO'],
   true, CURRENT_TIMESTAMP),
  ('00000000-0000-0000-0000-0000000000a4', 'Consulta', 'Somente leitura',
   ARRAY[]::TEXT[],
   true, CURRENT_TIMESTAMP);

-- 3) Liga cada usuario ao perfil equivalente ao seu papel atual.
ALTER TABLE "usuarios" ADD COLUMN "perfilId" TEXT;

UPDATE "usuarios" SET "perfilId" = CASE "papel"::text
  WHEN 'ADMINISTRADOR' THEN '00000000-0000-0000-0000-0000000000a1'
  WHEN 'FINANCEIRO'    THEN '00000000-0000-0000-0000-0000000000a2'
  WHEN 'VENDEDOR'      THEN '00000000-0000-0000-0000-0000000000a3'
  ELSE                      '00000000-0000-0000-0000-0000000000a4'
END;

ALTER TABLE "usuarios" ALTER COLUMN "perfilId" SET NOT NULL;

CREATE INDEX "usuarios_perfilId_idx" ON "usuarios"("perfilId");

ALTER TABLE "usuarios"
  ADD CONSTRAINT "usuarios_perfilId_fkey"
  FOREIGN KEY ("perfilId") REFERENCES "perfis"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

-- 4) Remove o papel fixo e o enum, agora sem uso.
ALTER TABLE "usuarios" DROP COLUMN "papel";
DROP TYPE "PapelUsuario";
