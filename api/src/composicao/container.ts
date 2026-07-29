import { Autenticar } from '../application/use-cases/acesso/autenticar.js';
import {
  ObterRegua,
  SalvarModeloDeMensagem,
  SalvarRegua,
} from '../application/use-cases/cobranca/configurar-regua.js';
import { EmitirDocumento } from '../application/use-cases/cobranca/emitir-documento.js';
import { EnviarCobrancaAvulsa } from '../application/use-cases/cobranca/enviar-cobranca-avulsa.js';
import { ExecutarRegua } from '../application/use-cases/cobranca/executar-regua.js';
import { ListarParcelasParaCobranca } from '../application/use-cases/cobranca/listar-parcelas-para-cobranca.js';
import { ProcessarWebhookDeCobranca } from '../application/use-cases/cobranca/processar-webhook.js';
import { AplicarReajuste } from '../application/use-cases/contratos/aplicar-reajuste.js';
import { CriarContrato } from '../application/use-cases/contratos/criar-contrato.js';
import { EncerrarContrato } from '../application/use-cases/contratos/encerrar-contrato.js';
import { ObterExtratoDoContrato } from '../application/use-cases/contratos/obter-extrato-do-contrato.js';
import { RenegociarContrato } from '../application/use-cases/contratos/renegociar-contrato.js';
import { SimularContrato } from '../application/use-cases/contratos/simular-contrato.js';
import { EstornarBaixa } from '../application/use-cases/parcelas/estornar-baixa.js';
import { RegistrarBaixa } from '../application/use-cases/parcelas/registrar-baixa.js';
import { ServicoDeEnvioDeCobranca } from '../application/servicos/servico-de-envio-de-cobranca.js';
import { ServicoDeDocumentoAtualizado } from '../application/servicos/servico-de-documento-atualizado.js';
import { NotificarEquipeDoCiclo } from '../application/use-cases/cobranca/notificar-equipe.js';
import {
  AnexarArquivo,
  BaixarAnexo,
  ListarAnexos,
  RemoverAnexo,
} from '../application/use-cases/arquivos/gerir-anexos.js';
import type { ArmazenamentoDeArquivos } from '../application/ports/armazenamento-de-arquivos.js';
import { ArmazenamentoLocal } from '../infrastructure/armazenamento/armazenamento-local.js';
import type { CasosDeUsoDeAnexos } from '../interfaces/http/controllers/anexos.controller.js';
import type { GeradorDeIdentificador, Relogio } from '../application/ports/comuns.js';
import type { ConsultaDeContextoDeCobranca } from '../application/ports/consulta-de-contexto.js';
import type { GatewayDeCobranca } from '../application/ports/gateway-de-cobranca.js';
import type { Mensageria } from '../application/ports/mensageria.js';
import type { Repositorios, UnidadeDeTrabalho } from '../application/ports/repositorios.js';
import type { ServicoDeSenha, ServicoDeToken } from '../application/ports/seguranca.js';
import { ambiente } from '../infrastructure/config/ambiente.js';
import { GeradorDeUuid, RelogioDoSistema } from '../infrastructure/comuns/relogio-do-sistema.js';
import { GatewayDeCobrancaFake } from '../infrastructure/gateways/gateway-fake.js';
import { MensageriaConsole } from '../infrastructure/mensageria/mensageria-console.js';
import { prisma } from '../infrastructure/persistence/prisma/cliente-prisma.js';
import { ConsultaDeContextoDeCobrancaPrisma } from '../infrastructure/persistence/prisma/consultas/contexto-de-cobranca.consulta.js';
import { ConsultasDePainelPrisma } from '../infrastructure/persistence/prisma/consultas/painel.consulta.js';
import { ConsultasDeRelatorioPrisma } from '../infrastructure/persistence/prisma/consultas/relatorios.consulta.js';
import type { ConsultasDePainel, ConsultasDeRelatorio } from '../application/ports/consultas-de-painel.js';
import { repositorios, UnidadeDeTrabalhoPrisma } from '../infrastructure/persistence/prisma/unidade-de-trabalho.js';
import { ServicoDeSenhaBcrypt, ServicoDeTokenJwt } from '../infrastructure/seguranca/servicos-de-seguranca.js';
import type { CasosDeUsoDeCobranca } from '../interfaces/http/controllers/cobranca.controller.js';
import type { CasosDeUsoDeContratos } from '../interfaces/http/controllers/contratos.controller.js';

export interface Container {
  readonly repositorios: Repositorios;
  readonly unidadeDeTrabalho: UnidadeDeTrabalho;
  readonly relogio: Relogio;
  readonly geradorDeIdentificador: GeradorDeIdentificador;
  readonly gateway: GatewayDeCobranca;
  readonly mensageria: Mensageria;
  readonly servicoDeToken: ServicoDeToken;
  readonly servicoDeSenha: ServicoDeSenha;
  readonly consultaDeContexto: ConsultaDeContextoDeCobranca;
  readonly consultasDePainel: ConsultasDePainel;
  readonly consultasDeRelatorio: ConsultasDeRelatorio;
  readonly autenticar: Autenticar;
  readonly casosDeUsoDeContratos: CasosDeUsoDeContratos;
  readonly casosDeUsoDeCobranca: CasosDeUsoDeCobranca;
  readonly executarRegua: ExecutarRegua;
  readonly notificarEquipe: NotificarEquipeDoCiclo;
  readonly armazenamento: ArmazenamentoDeArquivos;
  readonly casosDeUsoDeAnexos: CasosDeUsoDeAnexos;
}

/**
 * Raiz de composicao: o unico lugar do sistema que sabe QUAIS implementacoes
 * concretas existem.
 *
 * Os casos de uso recebem tudo por construtor e conhecem apenas as portas. Por
 * isso trocar o adaptador `fake` por Asaas, ou o console por WhatsApp de
 * verdade, e mudar uma linha deste arquivo — nenhuma regra de negocio e tocada.
 */
export function criarContainer(): Container {
  const relogio = new RelogioDoSistema();
  const geradorDeIdentificador = new GeradorDeUuid();
  const unidadeDeTrabalho = new UnidadeDeTrabalhoPrisma();
  const consultaDeContexto = new ConsultaDeContextoDeCobrancaPrisma(prisma);

  const gateway = escolherGateway();
  const mensageria = escolherMensageria();
  const armazenamento = escolherArmazenamento();

  const servicoDeSenha = new ServicoDeSenhaBcrypt();
  const servicoDeToken = new ServicoDeTokenJwt(ambiente.segredoDoToken, ambiente.validadeDoToken);

  const servicoDeEnvio = new ServicoDeEnvioDeCobranca(
    repositorios.cobrancas,
    mensageria,
    geradorDeIdentificador,
    relogio,
    ambiente.nomeDaEmpresa,
    ambiente.urlPublica,
  );

  const registrarBaixa = new RegistrarBaixa(unidadeDeTrabalho, geradorDeIdentificador);

  const emitirDocumento = new EmitirDocumento(
    repositorios,
    consultaDeContexto,
    gateway,
    geradorDeIdentificador,
    relogio,
  );
  const servicoDeDocumento = new ServicoDeDocumentoAtualizado(repositorios.documentos, emitirDocumento);

  const executarRegua = new ExecutarRegua(
    repositorios,
    consultaDeContexto,
    servicoDeEnvio,
    servicoDeDocumento,
    relogio,
  );
  const notificarEquipe = new NotificarEquipeDoCiclo(
    repositorios,
    consultaDeContexto,
    mensageria,
    relogio,
    ambiente.emailsDaEquipe,
    ambiente.nomeDaEmpresa,
  );

  return {
    repositorios,
    unidadeDeTrabalho,
    relogio,
    geradorDeIdentificador,
    gateway,
    mensageria,
    servicoDeToken,
    servicoDeSenha,
    consultaDeContexto,
    consultasDePainel: new ConsultasDePainelPrisma(prisma),
    consultasDeRelatorio: new ConsultasDeRelatorioPrisma(prisma),
    autenticar: new Autenticar(repositorios.usuarios, servicoDeSenha, servicoDeToken),
    executarRegua,
    notificarEquipe,
    armazenamento,

    casosDeUsoDeAnexos: {
      anexar: new AnexarArquivo(repositorios, armazenamento, geradorDeIdentificador),
      listar: new ListarAnexos(repositorios),
      baixar: new BaixarAnexo(repositorios, armazenamento),
      remover: new RemoverAnexo(repositorios, armazenamento),
    },

    casosDeUsoDeContratos: {
      simular: new SimularContrato(),
      criar: new CriarContrato(unidadeDeTrabalho, geradorDeIdentificador),
      obterExtrato: new ObterExtratoDoContrato(repositorios, relogio),
      encerrar: new EncerrarContrato(unidadeDeTrabalho),
      aplicarReajuste: new AplicarReajuste(unidadeDeTrabalho, geradorDeIdentificador),
      renegociar: new RenegociarContrato(unidadeDeTrabalho, geradorDeIdentificador, relogio),
    },

    casosDeUsoDeCobranca: {
      listarParcelas: new ListarParcelasParaCobranca(repositorios, consultaDeContexto, relogio),
      registrarBaixa,
      estornarBaixa: new EstornarBaixa(unidadeDeTrabalho),
      emitirDocumento,
      enviarCobrancaAvulsa: new EnviarCobrancaAvulsa(
        repositorios,
        consultaDeContexto,
        servicoDeEnvio,
        servicoDeDocumento,
        relogio,
      ),
      executarRegua,
      obterRegua: new ObterRegua(repositorios.regua, repositorios.modelos),
      salvarRegua: new SalvarRegua(repositorios.regua, repositorios.modelos),
      salvarModelo: new SalvarModeloDeMensagem(repositorios.modelos),
      processarWebhook: new ProcessarWebhookDeCobranca(
        repositorios,
        gateway,
        registrarBaixa,
        geradorDeIdentificador,
        relogio,
      ),
    },
  };
}

/**
 * Enquanto a loteadora nao escolhe o banco/gateway, so existe o adaptador de
 * desenvolvimento. Falhar alto aqui e melhor que subir com um gateway errado e
 * descobrir na primeira emissao real.
 */
function escolherGateway(): GatewayDeCobranca {
  switch (ambiente.gatewayDeCobranca) {
    case 'fake':
      return new GatewayDeCobrancaFake(ambiente.nomeDaEmpresa, 'SAO PAULO', ambiente.urlPublica);
    default:
      throw new Error(
        `Gateway de cobranca "${ambiente.gatewayDeCobranca}" nao implementado. ` +
          `Implemente a porta GatewayDeCobranca e registre-o em composicao/container.ts.`,
      );
  }
}

/**
 * Disco local e o unico adaptador implementado. Para publicar em plataforma com
 * sistema de arquivos efemero (Render, Heroku, Fly), implemente
 * `ArmazenamentoDeArquivos` sobre S3, R2 ou Backblaze e registre aqui — os anexos
 * seriam apagados a cada deploy de outra forma.
 */
function escolherArmazenamento(): ArmazenamentoDeArquivos {
  switch (ambiente.armazenamentoDeArquivos) {
    case 'local':
      return new ArmazenamentoLocal(ambiente.diretorioDeArquivos);
    default:
      throw new Error(
        `Armazenamento de arquivos "${ambiente.armazenamentoDeArquivos}" nao implementado. ` +
          `Implemente a porta ArmazenamentoDeArquivos e registre-o em composicao/container.ts.`,
      );
  }
}

function escolherMensageria(): Mensageria {
  switch (ambiente.provedorDeMensageria) {
    case 'console':
      return new MensageriaConsole();
    default:
      throw new Error(
        `Provedor de mensageria "${ambiente.provedorDeMensageria}" nao implementado. ` +
          `Implemente a porta Mensageria e registre-o em composicao/container.ts.`,
      );
  }
}
