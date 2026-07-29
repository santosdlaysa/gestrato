import type { ReactNode } from 'react';

export function EstadoDeCarregamento({ mensagem = 'Carregando…' }: { mensagem?: string }) {
  return (
    <div className="estado" role="status">
      <div className="pilha" style={{ gap: 8, maxWidth: 320, margin: '0 auto' }}>
        <div className="esqueleto" style={{ width: '70%' }} />
        <div className="esqueleto" style={{ width: '100%' }} />
        <div className="esqueleto" style={{ width: '85%' }} />
      </div>
      <p style={{ marginTop: 14 }}>{mensagem}</p>
    </div>
  );
}

interface PropsDeErro {
  mensagem: string;
  aoTentarNovamente?: () => void;
}

export function EstadoDeErro({ mensagem, aoTentarNovamente }: PropsDeErro) {
  return (
    <div className="estado estado--erro" role="alert">
      <div className="estado__titulo">Não foi possível carregar</div>
      <p>{mensagem}</p>
      {aoTentarNovamente && (
        <button type="button" className="botao" onClick={aoTentarNovamente}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

interface PropsDeVazio {
  titulo?: string;
  descricao?: string;
  acao?: ReactNode;
}

export function EstadoVazio({
  titulo = 'Nada por aqui',
  descricao = 'Nenhum registro encontrado com os filtros atuais.',
  acao,
}: PropsDeVazio) {
  return (
    <div className="estado">
      <div className="estado__titulo">{titulo}</div>
      <p>{descricao}</p>
      {acao}
    </div>
  );
}

export function AvisoDeErro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return (
    <div className="aviso aviso--erro" role="alert">
      {mensagem}
    </div>
  );
}

export function AvisoDeSucesso({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return (
    <div className="aviso aviso--sucesso" role="status">
      {mensagem}
    </div>
  );
}
