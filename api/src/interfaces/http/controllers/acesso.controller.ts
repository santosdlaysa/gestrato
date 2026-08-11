import type { Response } from 'express';
import { z } from 'zod';
import { Perfil } from '../../../domain/acesso/perfil.js';
import { PERMISSOES, rotuloDaPermissao } from '../../../domain/acesso/permissao.js';
import { Usuario } from '../../../domain/acesso/usuario.js';
import { ErroDeConflito, ErroDeRegraDeNegocio, ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import { Identificador } from '../../../domain/shared/identificador.js';
import { Email } from '../../../domain/value-objects/contato.js';
import type { GeradorDeIdentificador } from '../../../application/ports/comuns.js';
import type { RepositorioDePerfis, RepositorioDeUsuarios } from '../../../application/ports/repositorios.js';
import type { ServicoDeSenha } from '../../../application/ports/seguranca.js';
import { usuarioDaRequisicao } from '../middlewares/autenticacao.js';
import type { RequisicaoAutenticada } from '../tipos.js';

const esquemaDeUsuario = z.object({
  nome: z.string().trim().min(2),
  email: z.string().trim().email(),
  perfilId: z.string().uuid('Selecione um perfil valido.'),
  senha: z.string().min(8).optional(),
  ativo: z.boolean().optional(),
});

const esquemaDeSenha = z.object({ senha: z.string().min(8, 'A senha precisa de ao menos 8 caracteres.') });

const esquemaDePerfil = z.object({
  nome: z.string().trim().min(2, 'Informe um nome para o perfil.'),
  descricao: z.string().trim().max(200).nullable().optional(),
  permissoes: z.array(z.string()).default([]),
});

function apresentarUsuario(usuario: Usuario) {
  return {
    id: usuario.id.paraString(),
    nome: usuario.nome,
    email: usuario.email.valor,
    perfilId: usuario.perfilId.paraString(),
    perfilNome: usuario.perfilNome,
    ativo: usuario.ativo,
    ultimoAcesso: usuario.ultimoAcesso,
    permissoes: usuario.permissoes,
  };
}

export class ControladorDeAcesso {
  constructor(
    private readonly usuarios: RepositorioDeUsuarios,
    private readonly perfis: RepositorioDePerfis,
    private readonly senhas: ServicoDeSenha,
    private readonly ids: GeradorDeIdentificador,
  ) {}

  // ------------------------------------------------------------- usuarios

  listarUsuarios = async (_req: RequisicaoAutenticada, res: Response): Promise<void> => {
    res.json((await this.usuarios.listar()).map(apresentarUsuario));
  };

  criarUsuario = async (req: RequisicaoAutenticada, res: Response): Promise<void> => {
    const entrada = esquemaDeUsuario.extend({ senha: z.string().min(8) }).parse(req.body);
    const email = Email.de(entrada.email);
    if (await this.usuarios.porEmail(email.valor)) {
      throw new ErroDeConflito('Já existe um usuário com este e-mail.');
    }
    const perfil = await this.perfilObrigatorio(entrada.perfilId);
    const usuario = Usuario.novo({
      id: Identificador.de(this.ids.gerar()),
      nome: entrada.nome,
      email,
      senhaHash: await this.senhas.gerarHash(entrada.senha),
      perfil,
    });
    if (entrada.ativo === false) usuario.inativar();
    await this.usuarios.salvar(usuario);
    res.status(201).json(apresentarUsuario(usuario));
  };

  atualizarUsuario = async (req: RequisicaoAutenticada, res: Response): Promise<void> => {
    const entrada = esquemaDeUsuario.parse(req.body);
    const id = req.params.id ?? '';
    const atual = await this.usuarios.porId(id);
    if (!atual) throw new ErroNaoEncontrado('Usuário', id);

    const email = Email.de(entrada.email);
    const outro = await this.usuarios.porEmail(email.valor);
    if (outro && outro.id.paraString() !== atual.id.paraString()) {
      throw new ErroDeConflito('Já existe um usuário com este e-mail.');
    }
    const perfil = await this.perfilObrigatorio(entrada.perfilId);

    const eraAdmin = atual.permissoes.includes('GERIR_USUARIOS');
    const ficaraAtivo = entrada.ativo ?? atual.ativo;
    const seraAdmin = ficaraAtivo && perfil.pode('GERIR_USUARIOS');
    if (eraAdmin && !seraAdmin) {
      await this.garantirQueRestaAdmin(new Set([atual.id.paraString()]));
    }

    atual.renomear(entrada.nome);
    atual.alterarEmail(email);
    atual.atribuirPerfil(perfil);
    if (entrada.ativo === false) atual.inativar();
    else if (entrada.ativo === true) atual.ativar();
    if (entrada.senha) atual.trocarSenha(await this.senhas.gerarHash(entrada.senha));

    await this.usuarios.salvar(atual);
    res.json(apresentarUsuario(atual));
  };

  redefinirSenha = async (req: RequisicaoAutenticada, res: Response): Promise<void> => {
    const { senha } = esquemaDeSenha.parse(req.body);
    const id = req.params.id ?? '';
    const usuario = await this.usuarios.porId(id);
    if (!usuario) throw new ErroNaoEncontrado('Usuário', id);
    usuario.trocarSenha(await this.senhas.gerarHash(senha));
    await this.usuarios.salvar(usuario);
    res.json({ ok: true });
  };

  excluirUsuario = async (req: RequisicaoAutenticada, res: Response): Promise<void> => {
    const id = req.params.id ?? '';
    const solicitante = usuarioDaRequisicao(req);
    if (solicitante.id === id) {
      throw new ErroDeRegraDeNegocio('Você não pode excluir o próprio usuário.');
    }
    const usuario = await this.usuarios.porId(id);
    if (!usuario) throw new ErroNaoEncontrado('Usuário', id);
    if (usuario.permissoes.includes('GERIR_USUARIOS')) {
      await this.garantirQueRestaAdmin(new Set([id]));
    }
    await this.usuarios.excluir(id);
    res.status(204).end();
  };

  // --------------------------------------------------------------- perfis

  listarPerfis = async (_req: RequisicaoAutenticada, res: Response): Promise<void> => {
    const [perfis, usuarios] = await Promise.all([this.perfis.listar(), this.usuarios.listar()]);
    res.json(
      perfis.map((perfil) => ({
        id: perfil.id.paraString(),
        nome: perfil.nome,
        descricao: perfil.descricao,
        sistema: perfil.sistema,
        permissoes: perfil.permissoes,
        usuariosVinculados: usuarios.filter(
          (u) => u.perfilId.paraString() === perfil.id.paraString() && u.ativo,
        ).length,
      })),
    );
  };

  criarPerfil = async (req: RequisicaoAutenticada, res: Response): Promise<void> => {
    const entrada = esquemaDePerfil.parse(req.body);
    if (await this.perfis.porNome(entrada.nome)) {
      throw new ErroDeConflito('Já existe um perfil com este nome.');
    }
    const perfil = Perfil.novo({
      id: Identificador.de(this.ids.gerar()),
      nome: entrada.nome,
      descricao: entrada.descricao ?? null,
      permissoes: entrada.permissoes,
    });
    await this.perfis.salvar(perfil);
    res.status(201).json(this.apresentarPerfil(perfil, 0));
  };

  atualizarPerfil = async (req: RequisicaoAutenticada, res: Response): Promise<void> => {
    const entrada = esquemaDePerfil.parse(req.body);
    const id = req.params.id ?? '';
    const perfil = await this.perfis.porId(id);
    if (!perfil) throw new ErroNaoEncontrado('Perfil', id);

    const homonimo = await this.perfis.porNome(entrada.nome);
    if (homonimo && homonimo.id.paraString() !== id) {
      throw new ErroDeConflito('Já existe um perfil com este nome.');
    }

    // Tirar GERIR_USUARIOS de um perfil afeta todos os seus usuarios ativos de
    // uma vez — checamos antes para nao deixar o sistema sem administrador.
    const novasPermissoes = entrada.permissoes;
    if (perfil.pode('GERIR_USUARIOS') && !novasPermissoes.includes('GERIR_USUARIOS')) {
      const usuarios = await this.usuarios.listar();
      const afetados = usuarios
        .filter((u) => u.perfilId.paraString() === id && u.ativo)
        .map((u) => u.id.paraString());
      await this.garantirQueRestaAdmin(new Set(afetados));
    }

    perfil.renomear(entrada.nome);
    perfil.alterarDescricao(entrada.descricao ?? null);
    perfil.definirPermissoes(novasPermissoes);
    await this.perfis.salvar(perfil);

    const vinculados = await this.perfis.contarUsuarios(id);
    res.json(this.apresentarPerfil(perfil, vinculados));
  };

  excluirPerfil = async (req: RequisicaoAutenticada, res: Response): Promise<void> => {
    const id = req.params.id ?? '';
    const perfil = await this.perfis.porId(id);
    if (!perfil) throw new ErroNaoEncontrado('Perfil', id);
    perfil.garantirQuePodeSerExcluido();
    const vinculados = await this.perfis.contarUsuarios(id);
    if (vinculados > 0) {
      throw new ErroDeRegraDeNegocio(
        `Este perfil está vinculado a ${vinculados} usuário(s). Mova-os para outro perfil antes de excluir.`,
      );
    }
    await this.perfis.excluir(id);
    res.status(204).end();
  };

  // ----------------------------------------------------------- permissoes

  listarPermissoes = async (_req: RequisicaoAutenticada, res: Response): Promise<void> => {
    const perfis = await this.perfis.listar();
    res.json(
      PERMISSOES.map((permissao) => ({
        id: permissao,
        nome: rotuloDaPermissao(permissao),
        perfis: perfis.filter((p) => p.pode(permissao)).map((p) => p.nome),
      })),
    );
  };

  // ------------------------------------------------------------ internos

  private apresentarPerfil(perfil: Perfil, usuariosVinculados: number) {
    return {
      id: perfil.id.paraString(),
      nome: perfil.nome,
      descricao: perfil.descricao,
      sistema: perfil.sistema,
      permissoes: perfil.permissoes,
      usuariosVinculados,
    };
  }

  private async perfilObrigatorio(perfilId: string): Promise<Perfil> {
    const perfil = await this.perfis.porId(perfilId);
    if (!perfil) throw new ErroNaoEncontrado('Perfil', perfilId);
    return perfil;
  }

  /**
   * Impede que uma acao deixe o sistema sem nenhum usuario ativo capaz de gerir
   * usuarios. `idsQuePerdemAdmin` sao os usuarios que, apos a acao, deixarao de
   * ter a permissao (o proprio alvo, ou todos os do perfil que a perdeu).
   */
  private async garantirQueRestaAdmin(idsQuePerdemAdmin: Set<string>): Promise<void> {
    const usuarios = await this.usuarios.listar();
    const adminsRestantes = usuarios.filter(
      (u) =>
        u.ativo &&
        u.permissoes.includes('GERIR_USUARIOS') &&
        !idsQuePerdemAdmin.has(u.id.paraString()),
    );
    if (adminsRestantes.length === 0) {
      throw new ErroDeRegraDeNegocio(
        'Esta ação deixaria o sistema sem nenhum administrador ativo (permissão para gerir usuários).',
      );
    }
  }
}
