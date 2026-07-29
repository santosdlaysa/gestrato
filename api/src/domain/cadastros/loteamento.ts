import { Entidade } from '../shared/entidade.js';
import { ErroDeValidacao } from '../shared/errors.js';
import { Identificador } from '../shared/identificador.js';

interface EstadoDoLoteamento {
  id: Identificador;
  nome: string;
  cidade: string;
  uf: string;
  registroImobiliario: string | null;
  ativo: boolean;
}

/** Empreendimento que agrupa quadras e lotes. */
export class Loteamento extends Entidade {
  private constructor(private readonly estado: EstadoDoLoteamento) {
    super(estado.id);
  }

  static novo(entrada: {
    id: Identificador;
    nome: string;
    cidade: string;
    uf: string;
    registroImobiliario?: string | null;
  }): Loteamento {
    const nome = entrada.nome?.trim();
    if (!nome) throw new ErroDeValidacao('Nome do loteamento e obrigatorio.');
    const cidade = entrada.cidade?.trim();
    if (!cidade) throw new ErroDeValidacao('Cidade do loteamento e obrigatoria.');
    const uf = entrada.uf?.trim().toUpperCase();
    if (!uf || uf.length !== 2) throw new ErroDeValidacao('UF do loteamento deve ter 2 letras.');

    return new Loteamento({
      id: entrada.id,
      nome,
      cidade,
      uf,
      registroImobiliario: entrada.registroImobiliario?.trim() || null,
      ativo: true,
    });
  }

  static restaurar(estado: EstadoDoLoteamento): Loteamento {
    return new Loteamento({ ...estado });
  }

  get nome(): string {
    return this.estado.nome;
  }

  get cidade(): string {
    return this.estado.cidade;
  }

  get uf(): string {
    return this.estado.uf;
  }

  get registroImobiliario(): string | null {
    return this.estado.registroImobiliario;
  }

  get ativo(): boolean {
    return this.estado.ativo;
  }

  renomear(nome: string): void {
    const novo = nome?.trim();
    if (!novo) throw new ErroDeValidacao('Nome do loteamento e obrigatorio.');
    this.estado.nome = novo;
  }

  inativar(): void {
    this.estado.ativo = false;
  }

  paraEstado(): Readonly<EstadoDoLoteamento> {
    return { ...this.estado };
  }
}
