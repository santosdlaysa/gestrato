import type { Response } from 'express';
import { z } from 'zod';
import { PAPEIS, PERMISSOES, Usuario, permissoesDoPapel, type Papel } from '../../../domain/acesso/usuario.js';
import { ErroDeConflito, ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import { Identificador } from '../../../domain/shared/identificador.js';
import { Email } from '../../../domain/value-objects/contato.js';
import type { GeradorDeIdentificador } from '../../../application/ports/comuns.js';
import type { RepositorioDeUsuarios } from '../../../application/ports/repositorios.js';
import type { ServicoDeSenha } from '../../../application/ports/seguranca.js';
import type { RequisicaoAutenticada } from '../tipos.js';

const papeis = z.enum(PAPEIS);
const esquemaDeUsuario = z.object({
  nome: z.string().trim().min(2),
  email: z.string().trim().email(),
  papel: papeis,
  senha: z.string().min(8).optional(),
  ativo: z.boolean().optional(),
});

function apresentar(usuario: Usuario) {
  return {
    id: usuario.id.paraString(), nome: usuario.nome, email: usuario.email.valor,
    papel: usuario.papel, ativo: usuario.ativo, ultimoAcesso: usuario.ultimoAcesso,
    permissoes: usuario.permissoes,
  };
}

export class ControladorDeAcesso {
  constructor(
    private readonly usuarios: RepositorioDeUsuarios,
    private readonly senhas: ServicoDeSenha,
    private readonly ids: GeradorDeIdentificador,
  ) {}

  listarUsuarios = async (_req: RequisicaoAutenticada, res: Response): Promise<void> => {
    res.json((await this.usuarios.listar()).map(apresentar));
  };

  criarUsuario = async (req: RequisicaoAutenticada, res: Response): Promise<void> => {
    const entrada = esquemaDeUsuario.extend({ senha: z.string().min(8) }).parse(req.body);
    const email = Email.de(entrada.email);
    if (await this.usuarios.porEmail(email.valor)) throw new ErroDeConflito('Já existe um usuário com este e-mail.');
    const usuario = Usuario.novo({
      id: Identificador.de(this.ids.gerar()), nome: entrada.nome, email,
      senhaHash: await this.senhas.gerarHash(entrada.senha!), papel: entrada.papel,
    });
    await this.usuarios.salvar(usuario);
    res.status(201).json(apresentar(usuario));
  };

  atualizarUsuario = async (req: RequisicaoAutenticada, res: Response): Promise<void> => {
    const entrada = esquemaDeUsuario.parse(req.body);
    const id = req.params.id ?? '';
    const atual = await this.usuarios.porId(id);
    if (!atual) throw new ErroNaoEncontrado('Usuário', id);
    const email = Email.de(entrada.email);
    const outro = await this.usuarios.porEmail(email.valor);
    if (outro && outro.id.paraString() !== atual.id.paraString()) throw new ErroDeConflito('Já existe um usuário com este e-mail.');
    const estado = atual.paraEstado();
    const atualizado = Usuario.restaurar({
      ...estado, nome: entrada.nome, email, papel: entrada.papel,
      ativo: entrada.ativo ?? atual.ativo,
      senhaHash: entrada.senha ? await this.senhas.gerarHash(entrada.senha) : atual.senhaHash,
    });
    await this.usuarios.salvar(atualizado);
    res.json(apresentar(atualizado));
  };

  listarPerfis = async (_req: RequisicaoAutenticada, res: Response): Promise<void> => {
    const usuarios = await this.usuarios.listar();
    res.json(PAPEIS.map((papel) => ({
      id: papel, nome: rotuloDoPapel(papel), ativo: true,
      usuariosVinculados: usuarios.filter((u) => u.papel === papel && u.ativo).length,
      permissoes: permissoesDoPapel(papel),
    })));
  };

  listarPermissoes = async (_req: RequisicaoAutenticada, res: Response): Promise<void> => {
    res.json(PERMISSOES.map((permissao) => ({
      id: permissao, nome: rotuloDaPermissao(permissao), perfis: PAPEIS.filter((papel) => permissoesDoPapel(papel).includes(permissao)), ativo: true,
    })));
  };
}

function rotuloDoPapel(papel: Papel): string {
  return { ADMINISTRADOR: 'Administrador', FINANCEIRO: 'Financeiro', VENDEDOR: 'Vendedor', CONSULTA: 'Consulta' }[papel];
}

function rotuloDaPermissao(permissao: (typeof PERMISSOES)[number]): string {
  return permissao.replaceAll('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}
