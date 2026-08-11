import type { Repositorios, UnidadeDeTrabalho } from '../../../application/ports/repositorios.js';
import { prisma, type ClientePrisma } from './cliente-prisma.js';
import { RepositorioDeUsuariosPrisma } from './repositorios/usuarios.repositorio.js';
import { RepositorioDePerfisPrisma } from './repositorios/perfis.repositorio.js';
import { RepositorioDeClientesPrisma } from './repositorios/clientes.repositorio.js';
import { RepositorioDeLoteamentosPrisma } from './repositorios/loteamentos.repositorio.js';
import { RepositorioDeQuadrasPrisma } from './repositorios/quadras.repositorio.js';
import { RepositorioDeLotesPrisma } from './repositorios/lotes.repositorio.js';
import { RepositorioDeContratosPrisma } from './repositorios/contratos.repositorio.js';
import { RepositorioDeParcelasPrisma } from './repositorios/parcelas.repositorio.js';
import { RepositorioDePagamentosPrisma } from './repositorios/pagamentos.repositorio.js';
import { RepositorioDeCobrancasPrisma, RepositorioDeDocumentosPrisma } from './repositorios/cobrancas.repositorio.js';
import { RepositorioDaReguaPrisma, RepositorioDeModelosPrisma } from './repositorios/regua.repositorio.js';
import { RepositorioDaPoliticaDeInadimplenciaPrisma } from './repositorios/politica-de-inadimplencia.repositorio.js';
import { RepositorioDeReajustesPrisma, RepositorioDeRenegociacoesPrisma } from './repositorios/acordos.repositorio.js';
import { RepositorioDeEventosDeWebhookPrisma } from './repositorios/eventos-de-webhook.repositorio.js';
import { RepositorioDeAnexosPrisma } from './repositorios/anexos.repositorio.js';

/**
 * Monta o conjunto de repositorios sobre um cliente Prisma.
 *
 * Recebe `ClientePrisma` em vez do cliente global justamente para poder ser
 * chamado com o `tx` de uma transacao: os mesmos repositorios servem dentro e
 * fora dela, e o caso de uso nao percebe a diferenca.
 */
export function montarRepositorios(clientePrisma: ClientePrisma): Repositorios {
  return {
    usuarios: new RepositorioDeUsuariosPrisma(clientePrisma),
    perfis: new RepositorioDePerfisPrisma(clientePrisma),
    clientes: new RepositorioDeClientesPrisma(clientePrisma),
    loteamentos: new RepositorioDeLoteamentosPrisma(clientePrisma),
    quadras: new RepositorioDeQuadrasPrisma(clientePrisma),
    lotes: new RepositorioDeLotesPrisma(clientePrisma),
    contratos: new RepositorioDeContratosPrisma(clientePrisma),
    parcelas: new RepositorioDeParcelasPrisma(clientePrisma),
    pagamentos: new RepositorioDePagamentosPrisma(clientePrisma),
    renegociacoes: new RepositorioDeRenegociacoesPrisma(clientePrisma),
    reajustes: new RepositorioDeReajustesPrisma(clientePrisma),
    cobrancas: new RepositorioDeCobrancasPrisma(clientePrisma),
    documentos: new RepositorioDeDocumentosPrisma(clientePrisma),
    regua: new RepositorioDaReguaPrisma(clientePrisma),
    politicaDeInadimplencia: new RepositorioDaPoliticaDeInadimplenciaPrisma(clientePrisma),
    modelos: new RepositorioDeModelosPrisma(clientePrisma),
    eventosDeWebhook: new RepositorioDeEventosDeWebhookPrisma(clientePrisma),
    anexos: new RepositorioDeAnexosPrisma(clientePrisma),
  };
}

/** Repositorios fora de transacao, para leitura. */
export const repositorios: Repositorios = montarRepositorios(prisma);

/**
 * Criar contrato e gerar 120 parcelas, ou dar baixa e quitar o contrato, sao
 * operacoes que nao podem ficar pela metade. O timeout e maior que o padrao
 * porque contratos longos geram centenas de linhas de uma vez.
 */
export class UnidadeDeTrabalhoPrisma implements UnidadeDeTrabalho {
  async executar<T>(operacao: (repositorios: Repositorios) => Promise<T>): Promise<T> {
    return prisma.$transaction(
      async (transacao) => operacao(montarRepositorios(transacao)),
      { timeout: 30_000, maxWait: 10_000 },
    );
  }
}
