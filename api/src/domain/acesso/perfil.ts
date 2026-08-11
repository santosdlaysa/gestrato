import { Entidade } from '../shared/entidade.js';
import { ErroDeRegraDeNegocio, ErroDeValidacao } from '../shared/errors.js';
import { Identificador } from '../shared/identificador.js';
import { normalizarPermissoes, type Permissao } from './permissao.js';

/**
 * Um perfil de acesso: um nome e o conjunto de permissoes que ele reune.
 *
 * A matriz perfil->permissoes deixou de ser fixa no codigo e passou a ser dado:
 * a loteadora cria perfis proprios e marca, para cada um, o que pode fazer. As
 * permissoes em si continuam fixas (sao capacidades que o codigo verifica); o
 * que varia e o agrupamento.
 *
 * Perfis marcados como `sistema` sao os que acompanham a instalacao — podem ter
 * as permissoes ajustadas e ser renomeados, mas nao podem ser excluidos, para
 * nao deixar o sistema sem um perfil de referencia.
 */
interface EstadoDoPerfil {
  id: Identificador;
  nome: string;
  descricao: string | null;
  permissoes: Permissao[];
  sistema: boolean;
}

export class Perfil extends Entidade {
  private constructor(private readonly estado: EstadoDoPerfil) {
    super(estado.id);
  }

  static novo(entrada: {
    id: Identificador;
    nome: string;
    descricao?: string | null;
    permissoes: readonly string[];
    sistema?: boolean;
  }): Perfil {
    const nome = entrada.nome?.trim();
    if (!nome) throw new ErroDeValidacao('Nome do perfil e obrigatorio.');
    return new Perfil({
      id: entrada.id,
      nome,
      descricao: entrada.descricao?.trim() || null,
      permissoes: normalizarPermissoes(entrada.permissoes),
      sistema: entrada.sistema ?? false,
    });
  }

  static restaurar(estado: EstadoDoPerfil): Perfil {
    return new Perfil({ ...estado });
  }

  get nome(): string {
    return this.estado.nome;
  }

  get descricao(): string | null {
    return this.estado.descricao;
  }

  get sistema(): boolean {
    return this.estado.sistema;
  }

  get permissoes(): readonly Permissao[] {
    return this.estado.permissoes;
  }

  pode(permissao: Permissao): boolean {
    return this.estado.permissoes.includes(permissao);
  }

  renomear(nome: string): void {
    const limpo = nome?.trim();
    if (!limpo) throw new ErroDeValidacao('Nome do perfil e obrigatorio.');
    this.estado.nome = limpo;
  }

  alterarDescricao(descricao: string | null): void {
    this.estado.descricao = descricao?.trim() || null;
  }

  definirPermissoes(permissoes: readonly string[]): void {
    this.estado.permissoes = normalizarPermissoes(permissoes);
  }

  garantirQuePodeSerExcluido(): void {
    if (this.estado.sistema) {
      throw new ErroDeRegraDeNegocio(
        `O perfil "${this.estado.nome}" e um perfil de sistema e nao pode ser excluido.`,
      );
    }
  }

  paraEstado(): Readonly<EstadoDoPerfil> {
    return { ...this.estado, permissoes: [...this.estado.permissoes] };
  }
}
