import { useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { Paginacao } from '@/componentes/comuns/Paginacao';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { Selo } from '@/componentes/comuns/Selo';
import { ModalDeContratoDeFornecimento } from '@/componentes/financeiro/ModalDeContratoDeFornecimento';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useValorAtrasado } from '@/ganchos/useValorAtrasado';
import { listarContratosDeFornecimento } from '@/lib/api/contratos-de-fornecimento';
import { formatarData, formatarDinheiro } from '@/lib/formato';
import { podeEditarFinanceiro } from '@/lib/permissoes';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import type {
  ContratoDeFornecimento,
  RespostaDeContratosDeFornecimento,
  SituacaoDaEmpresa,
  TipoDeItemContrato,
} from '@/tipos/contratos-de-fornecimento';

const SITUACOES = [
  { valor: 'true', texto: 'Ativos' },
  { valor: 'false', texto: 'Inativos' },
];

const SITUACOES_DA_EMPRESA = [
  { valor: 'CONTRATANTE', texto: 'Contratante' },
  { valor: 'CONTRATADA', texto: 'Contratada' },
];

const TIPOS_DE_ITEM = [
  { valor: 'SERVICO', texto: 'Serviço' },
  { valor: 'INSUMO', texto: 'Insumo' },
];

const ROTULO_SITUACAO: Record<SituacaoDaEmpresa, string> = {
  CONTRATANTE: 'Contratante',
  CONTRATADA: 'Contratada',
};

const ROTULO_TIPO: Record<TipoDeItemContrato, string> = {
  SERVICO: 'Serviço',
  INSUMO: 'Insumo',
};

export function ContratosDeFornecimento() {
  const { filtros, definirFiltro } = useFiltrosNaUrl<
    'busca' | 'ativo' | 'situacaoDaEmpresa' | 'tipoDeItem' | 'pagina'
  >(['busca', 'ativo', 'situacaoDaEmpresa', 'tipoDeItem', 'pagina']);
  const [edicao, definirEdicao] = useState<ContratoDeFornecimento | null>(null);
  const [aberto, definirAberto] = useState(false);
  const papel = usePermissoes();
  const busca = useValorAtrasado(filtros.busca, 400);
  const pagina = Number(filtros.pagina || 1);

  const requisicao = useRequisicao<RespostaDeContratosDeFornecimento>(
    (sinal) =>
      listarContratosDeFornecimento(
        {
          busca: busca || undefined,
          ativo: filtros.ativo || undefined,
          situacaoDaEmpresa: (filtros.situacaoDaEmpresa || undefined) as SituacaoDaEmpresa | undefined,
          tipoDeItem: (filtros.tipoDeItem || undefined) as TipoDeItemContrato | undefined,
          pagina,
          porPagina: 25,
        },
        sinal,
      ),
    [busca, filtros.ativo, filtros.situacaoDaEmpresa, filtros.tipoDeItem, pagina],
  );

  const abrir = (contrato: ContratoDeFornecimento | null) => {
    definirEdicao(contrato);
    definirAberto(true);
  };

  return (
    <>
      <CabecalhoDaPagina
        titulo="Contratos de fornecimento"
        descricao="Contratos de compras e fornecimento (serviço ou insumo) firmados com fornecedores."
        acoes={
          podeEditarFinanceiro(papel) && (
            <button type="button" className="botao botao--primario" onClick={() => abrir(null)}>
              + Novo contrato
            </button>
          )
        }
      />
      <div className="corpo-da-pagina pilha">
        <Painel>
          <div className="filtros">
            <CampoDeTexto
              rotulo="Busca"
              valor={filtros.busca}
              aoMudar={(valor) => definirFiltro('busca', valor)}
              espacoReservado="Número, objeto, empresa ou fornecedor"
            />
            <CampoDeSelecao
              rotulo="Situação da empresa"
              valor={filtros.situacaoDaEmpresa}
              opcoes={SITUACOES_DA_EMPRESA}
              aoMudar={(valor) => definirFiltro('situacaoDaEmpresa', valor)}
              textoVazio="Todas"
            />
            <CampoDeSelecao
              rotulo="Tipo de item"
              valor={filtros.tipoDeItem}
              opcoes={TIPOS_DE_ITEM}
              aoMudar={(valor) => definirFiltro('tipoDeItem', valor)}
              textoVazio="Todos"
            />
            <CampoDeSelecao
              rotulo="Situação"
              valor={filtros.ativo}
              opcoes={SITUACOES}
              aoMudar={(valor) => definirFiltro('ativo', valor)}
              textoVazio="Todos"
            />
          </div>
        </Painel>
        <Painel
          titulo="Contratos"
          semPreenchimento
          rodape={
            requisicao.dados && (
              <Paginacao
                pagina={requisicao.dados.pagina}
                totalDePaginas={requisicao.dados.totalDePaginas}
                total={requisicao.dados.total}
                aoMudarPagina={(valor) => definirFiltro('pagina', String(valor))}
              />
            )
          }
        >
          <ConteudoDaRequisicao
            requisicao={requisicao}
            vazio={(dados) => dados.itens.length === 0}
            tituloDoVazio="Nenhum contrato encontrado"
            descricaoDoVazio="Cadastre o primeiro contrato de fornecimento."
          >
            {(dados) => (
              <div className="rolagem-horizontal">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Objeto</th>
                      <th>Empresa</th>
                      <th>Tipo</th>
                      <th>Fornecedor</th>
                      <th>Data</th>
                      <th className="numerico">Valor</th>
                      <th>Situação</th>
                      <th className="acoes">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.itens.map((contrato) => (
                      <tr key={contrato.id}>
                        <td>{contrato.numero}</td>
                        <td className="celula-larga">{contrato.objeto}</td>
                        <td>
                          {contrato.empresa || '—'}
                          <br />
                          <Selo texto={ROTULO_SITUACAO[contrato.situacaoDaEmpresa]} tom="neutro" />
                        </td>
                        <td>{ROTULO_TIPO[contrato.tipoDeItem]}</td>
                        <td>{contrato.fornecedor?.nome || '—'}</td>
                        <td>{formatarData(contrato.dataDoContrato)}</td>
                        <td className="numerico">
                          {contrato.valorCentavos === null
                            ? '—'
                            : formatarDinheiro(contrato.valorCentavos)}
                        </td>
                        <td>
                          <Selo
                            texto={contrato.ativo ? 'Ativo' : 'Inativo'}
                            tom={contrato.ativo ? 'ok' : 'neutro'}
                          />
                        </td>
                        <td className="acoes">
                          {podeEditarFinanceiro(papel) && (
                            <button
                              type="button"
                              className="botao botao--fantasma botao--pequeno"
                              onClick={() => abrir(contrato)}
                            >
                              Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ConteudoDaRequisicao>
        </Painel>
      </div>
      {aberto && (
        <ModalDeContratoDeFornecimento
          contrato={edicao}
          aoFechar={() => definirAberto(false)}
          aoConcluir={requisicao.recarregar}
        />
      )}
    </>
  );
}
