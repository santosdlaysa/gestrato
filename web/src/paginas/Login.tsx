import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAutenticacao } from '@/contextos/AutenticacaoContexto';
import { CampoDeTexto } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { mensagemDeErro } from '@/lib/http';

interface EstadoDaNavegacao {
  de?: string;
}

export function Login() {
  const { entrar, autenticado } = useAutenticacao();
  const local = useLocation();
  const [email, definirEmail] = useState('');
  const [senha, definirSenha] = useState('');
  const [erro, definirErro] = useState<string | null>(null);
  const [enviando, definirEnviando] = useState(false);

  if (autenticado) {
    const destino = (local.state as EstadoDaNavegacao | null)?.de ?? '/';
    return <Navigate to={destino} replace />;
  }

  async function aoEnviar(evento: React.FormEvent) {
    evento.preventDefault();
    definirEnviando(true);
    definirErro(null);
    try {
      await entrar(email.trim(), senha);
    } catch (falha: unknown) {
      definirErro(mensagemDeErro(falha));
    } finally {
      definirEnviando(false);
    }
  }

  return (
    <div className="tela-de-login">
      <form className="cartao-de-login" onSubmit={aoEnviar}>
        <div className="cartao-de-login__marca">
          <strong>GESTRATO</strong>
          <span>Gestão de cobrança</span>
        </div>

        <div className="pilha" style={{ gap: 12 }}>
          <AvisoDeErro mensagem={erro} />
          <CampoDeTexto
            rotulo="E-mail"
            tipo="email"
            valor={email}
            aoMudar={definirEmail}
            espacoReservado="voce@empresa.com.br"
            obrigatorio
          />
          <CampoDeTexto
            rotulo="Senha"
            tipo="password"
            valor={senha}
            aoMudar={definirSenha}
            obrigatorio
          />
          <button type="submit" className="botao botao--primario" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
