import { ErroDeValidacao } from '../shared/errors.js';
import { DataCivil } from '../value-objects/data-civil.js';
import { Dinheiro } from '../value-objects/dinheiro.js';
import { mesesEntreParcelas, type FormaPagamento, type Periodicidade, type TipoParcela } from './tipos.js';

/** Limite defensivo: acima disso quase sempre e erro de digitacao. */
const MAXIMO_DE_PARCELAS = 600;

/** Linha do plano de pagamento, antes de virar entidade persistida. */
export interface EspecificacaoDeParcela {
  readonly numero: number;
  readonly tipo: TipoParcela;
  readonly valor: Dinheiro;
  readonly vencimento: DataCivil;
  readonly descricao: string;
}

interface EntradaDosTermos {
  valorTotal: Dinheiro;
  valorEntrada: Dinheiro;
  dataEntrada: DataCivil | null;
  formaPagamentoEntrada: FormaPagamento | null;
  quantidadeDeParcelas: number;
  /** Quando informado, manda sobre o rateio: e o valor que consta no contrato assinado. */
  valorDaParcela: Dinheiro | null;
  primeiroVencimento: DataCivil | null;
  periodicidade: Periodicidade;
}

/**
 * As condicoes comerciais do contrato — a fonte de verdade de onde as parcelas
 * nascem. Validar tudo aqui, no construtor, garante que nao existe contrato
 * salvo com plano de pagamento impossivel.
 */
export class TermosDoFinanciamento {
  private constructor(private readonly entrada: EntradaDosTermos) {}

  static de(entrada: EntradaDosTermos): TermosDoFinanciamento {
    const {
      valorTotal, valorEntrada, dataEntrada, quantidadeDeParcelas, valorDaParcela, primeiroVencimento,
    } = entrada;

    if (!valorTotal.ehPositivo()) {
      throw new ErroDeValidacao('Valor total do contrato deve ser maior que zero.');
    }
    if (valorEntrada.ehNegativo()) {
      throw new ErroDeValidacao('Valor de entrada nao pode ser negativo.');
    }
    if (valorEntrada.maiorQue(valorTotal)) {
      throw new ErroDeValidacao('Valor de entrada nao pode ser maior que o valor total.');
    }
    if (valorEntrada.ehPositivo() && dataEntrada === null) {
      throw new ErroDeValidacao('Contrato com entrada exige a data da entrada.');
    }
    if (!Number.isInteger(quantidadeDeParcelas) || quantidadeDeParcelas < 0) {
      throw new ErroDeValidacao('Quantidade de parcelas deve ser inteiro nao negativo.');
    }
    if (quantidadeDeParcelas > MAXIMO_DE_PARCELAS) {
      throw new ErroDeValidacao(`Quantidade de parcelas nao pode passar de ${MAXIMO_DE_PARCELAS}.`);
    }

    const valorFinanciado = valorTotal.subtrair(valorEntrada);

    if (valorFinanciado.ehPositivo() && quantidadeDeParcelas === 0) {
      throw new ErroDeValidacao(
        `Restam ${valorFinanciado.formatar()} a financiar; informe a quantidade de parcelas.`,
      );
    }
    if (valorFinanciado.ehZero() && quantidadeDeParcelas > 0) {
      throw new ErroDeValidacao('Contrato quitado na entrada nao pode ter parcelas de financiamento.');
    }
    if (quantidadeDeParcelas > 0 && primeiroVencimento === null) {
      throw new ErroDeValidacao('Informe a data do primeiro vencimento.');
    }
    if (valorDaParcela !== null && !valorDaParcela.ehPositivo()) {
      throw new ErroDeValidacao('Valor da parcela deve ser maior que zero.');
    }

    const termos = new TermosDoFinanciamento(entrada);
    // Materializa o plano uma vez para provar que ele fecha antes de aceitar os termos.
    termos.gerarPlanoDeParcelas();
    return termos;
  }

  /**
   * Reidrata termos ja persistidos, sem revalidar nem materializar o plano.
   *
   * O que esta no banco ja passou por `de()` quando o contrato foi criado;
   * repetir a geracao a cada leitura custaria caro nos paineis, que carregam
   * centenas de contratos de uma vez.
   */
  static restaurar(entrada: EntradaDosTermos): TermosDoFinanciamento {
    return new TermosDoFinanciamento(entrada);
  }

  get valorTotal(): Dinheiro {
    return this.entrada.valorTotal;
  }

  get valorEntrada(): Dinheiro {
    return this.entrada.valorEntrada;
  }

  get dataEntrada(): DataCivil | null {
    return this.entrada.dataEntrada;
  }

  get formaPagamentoEntrada(): FormaPagamento | null {
    return this.entrada.formaPagamentoEntrada;
  }

  get quantidadeDeParcelas(): number {
    return this.entrada.quantidadeDeParcelas;
  }

  get valorDaParcela(): Dinheiro | null {
    return this.entrada.valorDaParcela;
  }

  get primeiroVencimento(): DataCivil | null {
    return this.entrada.primeiroVencimento;
  }

  get periodicidade(): Periodicidade {
    return this.entrada.periodicidade;
  }

  get valorFinanciado(): Dinheiro {
    return this.entrada.valorTotal.subtrair(this.entrada.valorEntrada);
  }

  temEntrada(): boolean {
    return this.entrada.valorEntrada.ehPositivo();
  }

  /**
   * Produz o plano completo: a entrada vira a parcela 0 e o financiamento vira
   * as parcelas 1..N, espacadas pela periodicidade.
   *
   * A soma do plano e sempre exatamente o valor total — nunca sobra nem falta
   * centavo. Quando o contrato fixa o valor da parcela, a diferenca de
   * arredondamento cai toda na ultima; quando nao fixa, os centavos sao
   * rateados entre as ultimas parcelas.
   */
  gerarPlanoDeParcelas(): EspecificacaoDeParcela[] {
    const plano: EspecificacaoDeParcela[] = [];

    if (this.temEntrada()) {
      plano.push({
        numero: 0,
        tipo: 'ENTRADA',
        valor: this.entrada.valorEntrada,
        vencimento: this.entrada.dataEntrada!,
        descricao: 'Entrada',
      });
    }

    const quantidade = this.entrada.quantidadeDeParcelas;
    if (quantidade === 0) return plano;

    const valores = this.calcularValoresDasParcelas(quantidade);
    const intervalo = mesesEntreParcelas(this.entrada.periodicidade);
    const primeiro = this.entrada.primeiroVencimento!;

    for (let indice = 0; indice < quantidade; indice += 1) {
      plano.push({
        numero: indice + 1,
        tipo: 'FINANCIAMENTO',
        valor: valores[indice]!,
        vencimento: primeiro.somarMeses(intervalo * indice),
        descricao: `Parcela ${indice + 1}/${quantidade}`,
      });
    }
    return plano;
  }

  private calcularValoresDasParcelas(quantidade: number): Dinheiro[] {
    const financiado = this.valorFinanciado;
    const valorFixado = this.entrada.valorDaParcela;

    if (valorFixado === null) {
      return financiado.ratear(quantidade);
    }

    const somaDasAnteriores = valorFixado.multiplicarPor(quantidade - 1);
    const ultima = financiado.subtrair(somaDasAnteriores);
    if (!ultima.ehPositivo()) {
      throw new ErroDeValidacao(
        `${quantidade} parcelas de ${valorFixado.formatar()} superam o valor financiado de ${financiado.formatar()}.`,
      );
    }
    return [...Array.from({ length: quantidade - 1 }, () => valorFixado), ultima];
  }
}
