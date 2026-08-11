import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type {
  ConteudoDoToken,
  ServicoDeSenha,
  ServicoDeToken,
} from '../../application/ports/seguranca.js';

/** Custo do bcrypt: equilibrio entre resistencia a forca bruta e tempo de login. */
const FATOR_DE_CUSTO = 10;

export class ServicoDeSenhaBcrypt implements ServicoDeSenha {
  async gerarHash(senha: string): Promise<string> {
    return bcrypt.hash(senha, FATOR_DE_CUSTO);
  }

  async conferir(senha: string, hash: string): Promise<boolean> {
    return bcrypt.compare(senha, hash);
  }
}

export class ServicoDeTokenJwt implements ServicoDeToken {
  constructor(
    private readonly segredo: string,
    private readonly validade: string,
  ) {}

  emitir(conteudo: ConteudoDoToken): string {
    return jwt.sign(
      { email: conteudo.email },
      this.segredo,
      { subject: conteudo.usuarioId, expiresIn: this.validade } as jwt.SignOptions,
    );
  }

  /**
   * Token invalido ou expirado devolve `null` em vez de lancar: expirar e
   * situacao esperada no fluxo normal, nao excecao.
   */
  verificar(token: string): ConteudoDoToken | null {
    try {
      const conteudo = jwt.verify(token, this.segredo);
      if (typeof conteudo === 'string' || !conteudo.sub) return null;

      return {
        usuarioId: String(conteudo.sub),
        email: String(conteudo.email ?? ''),
      };
    } catch {
      return null;
    }
  }
}
