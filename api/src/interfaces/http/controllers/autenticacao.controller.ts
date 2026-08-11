import type { Response } from 'express';
import type { Autenticar } from '../../../application/use-cases/acesso/autenticar.js';
import { usuarioDaRequisicao } from '../middlewares/autenticacao.js';
import type { RequisicaoAutenticada } from '../tipos.js';
import { esquemaDeLogin } from '../validacao/esquemas-de-cobranca.js';

export class ControladorDeAutenticacao {
  constructor(private readonly autenticar: Autenticar) {}

  entrar = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const credenciais = esquemaDeLogin.parse(requisicao.body);
    resposta.json(await this.autenticar.executar(credenciais));
  };

  /**
   * Devolve a identidade resolvida (perfil + permissoes efetivas) — o front usa
   * para decidir o que exibir. Como a identidade e resolvida do banco a cada
   * requisicao, o que volta aqui ja reflete mudancas recentes de perfil.
   */
  eu = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const usuario = usuarioDaRequisicao(requisicao);
    resposta.json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfilId: usuario.perfilId,
      perfilNome: usuario.perfilNome,
      permissoes: usuario.permissoes,
    });
  };
}
