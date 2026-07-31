import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';

interface Props {
  titulo: string;
  descricao: string;
  limitacao: string;
}

export function ModuloFinanceiroIndisponivel({ titulo, descricao, limitacao }: Props) {
  return (
    <>
      <CabecalhoDaPagina titulo={titulo} descricao={descricao} />
      <div className="corpo-da-pagina pilha">
        <section className="aviso aviso--atencao" role="status">
          <strong>Backend ainda não disponível</strong>
          <p>{limitacao}</p>
          <p>Esta tela não exibe dados fictícios.</p>
        </section>
      </div>
    </>
  );
}
