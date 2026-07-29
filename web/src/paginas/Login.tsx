import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAutenticacao } from '@/contextos/AutenticacaoContexto';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { mensagemDeErro } from '@/lib/http';

interface EstadoDaNavegacao {
  de?: string;
}

const DIFERENCIAIS = [
  {
    titulo: 'Cobrança sob controle',
    descricao: 'Boletos, Pix e parcelas em um só fluxo, do vencimento à baixa.',
    icone: <IconeGrafico />,
  },
  {
    titulo: 'Inadimplência à vista',
    descricao: 'Régua automática e alertas para agir antes do atraso virar perda.',
    icone: <IconeEscudo />,
  },
  {
    titulo: 'Dados seguros',
    descricao: 'Acesso controlado por perfil e trilha completa de cada operação.',
    icone: <IconeCadeado />,
  },
];

export function Login() {
  const { entrar, autenticado } = useAutenticacao();
  const local = useLocation();
  const [email, definirEmail] = useState('');
  const [senha, definirSenha] = useState('');
  const [mostrarSenha, definirMostrarSenha] = useState(false);
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
    <div className="login">
      <aside className="login__marca" aria-hidden="true">
        <div className="login__marca-topo">
          <Logotipo />
        </div>

        <div className="login__marca-centro">
          <h1 className="login__manchete">
            A gestão de cobrança das loteadoras, do primeiro contrato à última parcela.
          </h1>
          <ul className="login__diferenciais">
            {DIFERENCIAIS.map((item) => (
              <li key={item.titulo} className="login__diferencial">
                <span className="login__diferencial-icone">{item.icone}</span>
                <span>
                  <strong>{item.titulo}</strong>
                  {item.descricao}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="login__rodape-marca">
          © {new Date().getFullYear()} Gestrato · Plataforma de gestão de contratos e cobranças
        </p>
      </aside>

      <main className="login__painel">
        <form className="login__cartao" onSubmit={aoEnviar}>
          <div className="login__marca-compacta">
            <Logotipo compacto />
          </div>

          <header className="login__cabecalho">
            <h2>Acessar plataforma</h2>
            <p>Entre com suas credenciais para continuar.</p>
          </header>

          <div className="login__campos">
            <AvisoDeErro mensagem={erro} />

            <label className="campo">
              <span className="campo__rotulo">E-mail</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(evento) => definirEmail(evento.target.value)}
                placeholder="voce@empresa.com.br"
                required
                autoFocus
              />
            </label>

            <label className="campo">
              <span className="campo__rotulo">Senha</span>
              <div className="login__senha">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(evento) => definirSenha(evento.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="login__olho"
                  onClick={() => definirMostrarSenha((visivel) => !visivel)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <IconeOlhoFechado /> : <IconeOlho />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              className="botao botao--primario login__enviar"
              disabled={enviando}
            >
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </div>

          <p className="login__seguranca">
            <IconeCadeado />
            Conexão protegida. Suas informações trafegam de forma criptografada.
          </p>
        </form>
      </main>
    </div>
  );
}

function Logotipo({ compacto = false }: { compacto?: boolean }) {
  return (
    <span className={`logotipo${compacto ? ' logotipo--compacto' : ''}`}>
      <svg viewBox="0 0 32 32" width="32" height="32" role="img" aria-label="Gestrato">
        <rect x="2" y="2" width="28" height="28" rx="7" fill="currentColor" opacity="0.14" />
        <path
          d="M22 11.5A6.5 6.5 0 1 0 22 22h1.5v-5.5H17"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="logotipo__texto">
        <strong>GESTRATO</strong>
        <small>Gestão de cobrança</small>
      </span>
    </span>
  );
}

function IconeGrafico() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-6M22 20H2" />
    </svg>
  );
}

function IconeEscudo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconeCadeado() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconeOlho() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconeOlhoFechado() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2" />
      <path d="M9.4 5.2A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.3 9.3 0 0 0 3.2-.6" />
    </svg>
  );
}
