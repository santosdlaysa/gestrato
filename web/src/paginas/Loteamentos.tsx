import { useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeTexto } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useAcao } from '@/ganchos/useAcao';
import { criarLoteamento, criarQuadra, listarLoteamentos, listarQuadras } from '@/lib/api/cadastros';
import { extrairItens } from '@/lib/colecoes';
import { podeEscrever } from '@/lib/permissoes';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import type { EntradaDeLoteamento, Quadra } from '@/lib/api/cadastros';
import type { Loteamento } from '@/tipos/cadastros';

export function Loteamentos() {
  const editavel = podeEscrever(usePermissoes());
  const [novo, definirNovo] = useState(false);
  const [selecionado, definirSelecionado] = useState<Loteamento | null>(null);
  const [nomeQuadra, definirNomeQuadra] = useState('');
  const [dados, definirDados] = useState<EntradaDeLoteamento>({ nome: '', cidade: '', uf: '', registroImobiliario: '' });
  const acao = useAcao();
  const requisicao = useRequisicao((sinal) => listarLoteamentos(sinal), []);
  const quadras = useRequisicao(
    (sinal) => (selecionado ? listarQuadras(selecionado.id, sinal) : Promise.resolve([] as Quadra[])),
    [selecionado?.id],
  );

  async function salvarLoteamento() {
    const sucesso = await acao.executar(() => criarLoteamento({ ...dados, registroImobiliario: dados.registroImobiliario || null }));
    if (sucesso) {
      definirNovo(false);
      definirDados({ nome: '', cidade: '', uf: '', registroImobiliario: '' });
      requisicao.recarregar();
    }
  }

  async function salvarQuadra() {
    if (!selecionado || !nomeQuadra.trim()) return;
    const sucesso = await acao.executar(() => criarQuadra(selecionado.id, nomeQuadra));
    if (sucesso) {
      definirNomeQuadra('');
      quadras.recarregar();
    }
  }

  const loteamentos = extrairItens(requisicao.dados);

  return (
    <>
      <CabecalhoDaPagina
        titulo="Loteamentos"
        descricao="Empreendimentos, quadras e estrutura dos lotes"
        acoes={editavel ? <button className="botao botao--primario" onClick={() => definirNovo(true)}>+ Novo loteamento</button> : undefined}
      />
      <div className="corpo-da-pagina pilha">
        <ConteudoDaRequisicao requisicao={requisicao} vazio={() => loteamentos.length === 0} tituloDoVazio="Nenhum loteamento" descricaoDoVazio="Cadastre o primeiro loteamento." >
          {() => (
            <Painel titulo="Loteamentos" semPreenchimento>
              <div className="rolagem-horizontal"><table className="tabela"><thead><tr><th>Nome</th><th>Cidade</th><th>UF</th><th>Registro imobiliário</th><th className="acoes">Ações</th></tr></thead><tbody>
                {loteamentos.map((loteamento) => <tr key={loteamento.id}><td className="celula-larga">{loteamento.nome}</td><td>{loteamento.cidade ?? '—'}</td><td>{loteamento.uf ?? '—'}</td><td>{loteamento.registroImobiliario ?? '—'}</td><td className="acoes"><button className="botao botao--fantasma botao--pequeno" onClick={() => definirSelecionado(loteamento)}>Quadras</button></td></tr>)}
              </tbody></table></div>
            </Painel>
          )}
        </ConteudoDaRequisicao>
      </div>

      {novo && <Modal titulo="Novo loteamento" aoFechar={() => definirNovo(false)} rodape={<><button className="botao" onClick={() => definirNovo(false)}>Cancelar</button><button className="botao botao--primario" onClick={salvarLoteamento} disabled={acao.emAndamento || !dados.nome.trim() || !dados.cidade.trim() || dados.uf.length !== 2}>Salvar</button></>}>
        <AvisoDeErro mensagem={acao.erro} /><div className="grade grade--2"><CampoDeTexto rotulo="Nome" valor={dados.nome} aoMudar={(v) => definirDados({ ...dados, nome: v })} /><CampoDeTexto rotulo="Cidade" valor={dados.cidade} aoMudar={(v) => definirDados({ ...dados, cidade: v })} /><CampoDeTexto rotulo="UF" valor={dados.uf} aoMudar={(v) => definirDados({ ...dados, uf: v.toUpperCase() })} /><CampoDeTexto rotulo="Registro imobiliário" valor={dados.registroImobiliario ?? ''} aoMudar={(v) => definirDados({ ...dados, registroImobiliario: v })} /></div>
      </Modal>}

      {selecionado && <Modal titulo={`Quadras · ${selecionado.nome}`} aoFechar={() => definirSelecionado(null)} rodape={<button className="botao" onClick={() => definirSelecionado(null)}>Fechar</button>}>
        <AvisoDeErro mensagem={acao.erro} />{editavel && <div className="linha"><CampoDeTexto rotulo="Nova quadra" valor={nomeQuadra} aoMudar={definirNomeQuadra} /><button className="botao botao--primario" onClick={salvarQuadra} disabled={acao.emAndamento || !nomeQuadra.trim()}>Adicionar</button></div>}<ConteudoDaRequisicao requisicao={quadras}>{(itens) => <ul>{itens.map((quadra) => <li key={quadra.id}>{quadra.nome}</li>)}</ul>}</ConteudoDaRequisicao>
      </Modal>}
    </>
  );
}
