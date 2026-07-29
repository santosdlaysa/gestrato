import {
  EventoDaRegua,
  ReguaDeCobranca,
} from '../../../domain/cobranca/regua-de-cobranca.js';
import {
  RedatorDeMensagens,
  VARIAVEIS_DISPONIVEIS,
  type ModeloDeMensagem,
} from '../../../domain/cobranca/redator-de-mensagens.js';
import type { Canal, Gatilho, TipoDocumento } from '../../../domain/cobranca/tipos.js';
import { ErroDeRegraDeNegocio } from '../../../domain/shared/errors.js';
import type { RepositorioDaRegua, RepositorioDeModelosDeMensagem } from '../../ports/repositorios.js';

export interface EventoInformado {
  readonly gatilho: Gatilho;
  readonly dias: number;
  readonly canais: readonly Canal[];
  readonly modelo: string;
  readonly emitirDocumento: boolean;
  readonly tipoDeDocumento: TipoDocumento;
  readonly ativo: boolean;
}

export class ObterRegua {
  constructor(
    private readonly regua: RepositorioDaRegua,
    private readonly modelos: RepositorioDeModelosDeMensagem,
  ) {}

  async executar(): Promise<{
    eventos: readonly EventoDaRegua[];
    modelos: readonly ModeloDeMensagem[];
    variaveisDisponiveis: readonly string[];
  }> {
    const [regua, modelos] = await Promise.all([this.regua.obter(), this.modelos.listar()]);
    return { eventos: regua.eventos, modelos, variaveisDisponiveis: VARIAVEIS_DISPONIVEIS };
  }
}

/**
 * Substitui a regua inteira.
 *
 * Antes de gravar, confere que todo modelo citado existe. Salvar uma etapa
 * apontando para um modelo inexistente nao daria erro nenhum hoje — apenas
 * silenciaria aquela cobranca daqui a trinta dias, quando ninguem lembrasse da
 * alteracao.
 */
export class SalvarRegua {
  constructor(
    private readonly regua: RepositorioDaRegua,
    private readonly modelos: RepositorioDeModelosDeMensagem,
  ) {}

  async executar(eventos: readonly EventoInformado[]): Promise<{ eventos: readonly EventoDaRegua[] }> {
    const nova = ReguaDeCobranca.de(
      eventos.map((evento) =>
        EventoDaRegua.de({
          gatilho: evento.gatilho,
          dias: evento.dias,
          canais: evento.canais,
          modelo: evento.modelo,
          emitirDocumento: evento.emitirDocumento,
          tipoDeDocumento: evento.tipoDeDocumento,
          ativo: evento.ativo,
        }),
      ),
    );

    const cadastrados = await this.modelos.mapa();
    const ausentes = [...new Set(nova.eventos.map((evento) => evento.modelo))].filter(
      (chave) => !cadastrados.has(chave),
    );
    if (ausentes.length > 0) {
      throw new ErroDeRegraDeNegocio(
        `Modelo(s) de mensagem nao cadastrado(s): ${ausentes.join(', ')}. Cadastre antes de usar na regua.`,
      );
    }

    await this.regua.substituir(nova);
    return { eventos: nova.eventos };
  }
}

/** Valida as variaveis do texto antes de gravar — erro de digitacao vira 422, nao mensagem torta. */
export class SalvarModeloDeMensagem {
  constructor(private readonly modelos: RepositorioDeModelosDeMensagem) {}

  async executar(modelo: ModeloDeMensagem): Promise<ModeloDeMensagem> {
    RedatorDeMensagens.validarModelo(modelo);
    await this.modelos.salvar(modelo);
    return modelo;
  }
}
