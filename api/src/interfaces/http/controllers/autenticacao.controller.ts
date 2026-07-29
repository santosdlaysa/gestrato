import type { Response } from 'express';
import { permissoesDoPapel } from '../../../domain/acesso/usuario.js';
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

  /** Devolve a identidade do token — o front usa para decidir o que exibir. */
  eu = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const usuario = usuarioDaRequisicao(requisicao);
    resposta.json({ ...usuario, permissoes: permissoesDoPapel(usuario.papel) });
  };
}
