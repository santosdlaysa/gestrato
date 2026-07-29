import { Entidade } from '../shared/entidade.js';
import { ErroDeRegraDeNegocio, ErroDeValidacao } from '../shared/errors.js';
import { Identificador } from '../shared/identificador.js';
import { DataCivil } from '../value-objects/data-civil.js';
import { Dinheiro } from '../value-objects/dinheiro.js';
import type { Canal, Gatilho, StatusCobranca } from './tipos.js';

/** Limite de reenvio automatico antes de exigir intervencao humana. */
const MAXIMO_DE_TENTATIVAS = 3;

interface EstadoDaCobranca {
  id: Identificador;
  contratoId: Identificador;
  parcelaId: Identificador;
  clienteId: Identificador;
  /** `parcelaId:GATILHO:dias` — garante um unico envio por etapa da regua. */
  chaveDeIdempotencia: string;
  gatilho: Gatilho;
  dias: number;
  canal: Canal;
  destino: string;
  assunto: string | null;
  mensagem: string;
  valorCobrado: Dinheiro;
  dataDeReferencia: DataCivil;
  status: StatusCobranca;
  tentativas: number;
  ultimoErro: string | null;
  identificadorNoProvedor: string | null;
  criadaEm: Date;
  enviadaEm: Date | null;
}

/**
 * Registro de uma comunicacao de cobranca — o "historico completo de cobrancas
 * enviadas" que a loteadora precisa ter para provar que notificou o cliente.
 *
 * E criada como PENDENTE antes do envio: se o provedor cair no meio, o registro
 * ja existe com o erro, e a chave de idempotencia impede duplicar a mensagem
 * quando o job rodar de novo.
 */
export class Cobranca extends Entidade {
  private constructor(private readonly estado: EstadoDaCobranca) {
    super(estado.id);
  }

  static nova(entrada: {
    id: Identificador;
    contratoId: Identificador;
    parcelaId: Identificador;
    clienteId: Identificador;
    chaveDeIdempotencia: string;
    gatilho: Gatilho;
    dias: number;
    canal: Canal;
    destino: string;
    assunto?: string | null;
    mensagem: string;
    valorCobrado: Dinheiro;
    dataDeReferencia: DataCivil;
    criadaEm?: Date;
  }): Cobranca {
    if (!entrada.destino?.trim()) {
      throw new ErroDeValidacao('Cobranca precisa de um destino (telefone ou e-mail).');
    }
    if (!entrada.mensagem?.trim()) {
      throw new ErroDeValidacao('Cobranca precisa de uma mensagem.');
    }
    return new Cobranca({
      ...entrada,
      destino: entrada.destino.trim(),
      assunto: entrada.assunto?.trim() || null,
      mensagem: entrada.mensagem.trim(),
      status: 'PENDENTE',
      tentativas: 0,
      ultimoErro: null,
      identificadorNoProvedor: null,
      criadaEm: entrada.criadaEm ?? new Date(),
      enviadaEm: null,
    });
  }

  static restaurar(estado: EstadoDaCobranca): Cobranca {
    return new Cobranca({ ...estado });
  }

  get contratoId(): Identificador {
    return this.estado.contratoId;
  }

  get parcelaId(): Identificador {
    return this.estado.parcelaId;
  }

  get clienteId(): Identificador {
    return this.estado.clienteId;
  }

  get chaveDeIdempotencia(): string {
    return this.estado.chaveDeIdempotencia;
  }

  get gatilho(): Gatilho {
    return this.estado.gatilho;
  }

  get dias(): number {
    return this.estado.dias;
  }

  get canal(): Canal {
    return this.estado.canal;
  }

  get destino(): string {
    return this.estado.destino;
  }

  get assunto(): string | null {
    return this.estado.assunto;
  }

  get mensagem(): string {
    return this.estado.mensagem;
  }

  get valorCobrado(): Dinheiro {
    return this.estado.valorCobrado;
  }

  get dataDeReferencia(): DataCivil {
    return this.estado.dataDeReferencia;
  }

  get status(): StatusCobranca {
    return this.estado.status;
  }

  get tentativas(): number {
    return this.estado.tentativas;
  }

  get ultimoErro(): string | null {
    return this.estado.ultimoErro;
  }

  get identificadorNoProvedor(): string | null {
    return this.estado.identificadorNoProvedor;
  }

  get criadaEm(): Date {
    return this.estado.criadaEm;
  }

  get enviadaEm(): Date | null {
    return this.estado.enviadaEm;
  }

  foiEnviada(): boolean {
    return this.estado.status === 'ENVIADA';
  }

  /** Falha temporaria ainda pode ser retentada; esgotadas as tentativas, nao. */
  podeSerRetentada(): boolean {
    return this.estado.status === 'FALHA' && this.estado.tentativas < MAXIMO_DE_TENTATIVAS;
  }

  registrarEnvio(identificadorNoProvedor: string | null, enviadaEm = new Date()): void {
    if (this.estado.status === 'CANCELADA') {
      throw new ErroDeRegraDeNegocio('Cobranca cancelada nao pode ser marcada como enviada.');
    }
    this.estado.status = 'ENVIADA';
    this.estado.tentativas += 1;
    this.estado.identificadorNoProvedor = identificadorNoProvedor;
    this.estado.enviadaEm = enviadaEm;
    this.estado.ultimoErro = null;
  }

  registrarFalha(motivo: string): void {
    this.estado.status = 'FALHA';
    this.estado.tentativas += 1;
    this.estado.ultimoErro = motivo.slice(0, 500);
  }

  /** Cancela o envio pendente — usado quando a parcela e paga antes do disparo. */
  cancelar(motivo: string): void {
    if (this.estado.status === 'ENVIADA') {
      throw new ErroDeRegraDeNegocio('Cobranca ja enviada nao pode ser cancelada.');
    }
    this.estado.status = 'CANCELADA';
    this.estado.ultimoErro = motivo.slice(0, 500);
  }

  paraEstado(): Readonly<EstadoDaCobranca> {
    return { ...this.estado };
  }
}
