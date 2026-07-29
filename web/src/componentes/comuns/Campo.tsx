import { useId } from 'react';
import type { ReactNode } from 'react';

interface PropsDoCampo {
  rotulo: string;
  dica?: string;
  erro?: string | null;
  children: (idDoControle: string) => ReactNode;
}

export function Campo({ rotulo, dica, erro, children }: PropsDoCampo) {
  const id = useId();
  return (
    <div className="campo">
      <label className="campo__rotulo" htmlFor={id}>
        {rotulo}
      </label>
      {children(id)}
      {dica && !erro && <span className="campo__dica">{dica}</span>}
      {erro && <span className="campo__erro">{erro}</span>}
    </div>
  );
}

interface PropsDeTexto {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  tipo?: 'text' | 'date' | 'number' | 'email' | 'password';
  espacoReservado?: string;
  dica?: string;
  erro?: string | null;
  desabilitado?: boolean;
  obrigatorio?: boolean;
}

export function CampoDeTexto({
  rotulo,
  valor,
  aoMudar,
  tipo = 'text',
  espacoReservado,
  dica,
  erro,
  desabilitado,
  obrigatorio,
}: PropsDeTexto) {
  return (
    <Campo rotulo={rotulo} dica={dica} erro={erro}>
      {(id) => (
        <input
          id={id}
          type={tipo}
          value={valor}
          placeholder={espacoReservado}
          disabled={desabilitado}
          required={obrigatorio}
          onChange={(evento) => aoMudar(evento.target.value)}
        />
      )}
    </Campo>
  );
}

export interface Opcao {
  valor: string;
  texto: string;
}

interface PropsDeSelecao {
  rotulo: string;
  valor: string;
  opcoes: Opcao[];
  aoMudar: (valor: string) => void;
  textoVazio?: string;
  dica?: string;
  desabilitado?: boolean;
}

export function CampoDeSelecao({
  rotulo,
  valor,
  opcoes,
  aoMudar,
  textoVazio = 'Todos',
  dica,
  desabilitado,
}: PropsDeSelecao) {
  return (
    <Campo rotulo={rotulo} dica={dica}>
      {(id) => (
        <select
          id={id}
          value={valor}
          disabled={desabilitado}
          onChange={(evento) => aoMudar(evento.target.value)}
        >
          <option value="">{textoVazio}</option>
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.texto}
            </option>
          ))}
        </select>
      )}
    </Campo>
  );
}

interface PropsDeDinheiro {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  dica?: string;
  erro?: string | null;
  desabilitado?: boolean;
}

/** Entrada em reais (texto); a conversão para centavos acontece no envio. */
export function CampoDeDinheiro({
  rotulo,
  valor,
  aoMudar,
  dica,
  erro,
  desabilitado,
}: PropsDeDinheiro) {
  return (
    <Campo rotulo={rotulo} dica={dica} erro={erro}>
      {(id) => (
        <input
          id={id}
          type="text"
          inputMode="decimal"
          className="numerico"
          value={valor}
          placeholder="0,00"
          disabled={desabilitado}
          onChange={(evento) => aoMudar(evento.target.value)}
        />
      )}
    </Campo>
  );
}
