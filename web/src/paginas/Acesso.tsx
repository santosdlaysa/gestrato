import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Modal } from '@/componentes/comuns/Modal';
import { Selo } from '@/componentes/comuns/Selo';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { criarUsuario, atualizarUsuario, listarPermissoes, listarPerfis, listarUsuarios, type EntradaDeUsuario } from '@/lib/api/acesso';
import type { UsuarioDeAcesso } from '@/tipos/acesso';
import type { Papel } from '@/tipos/usuario';

const PAPEIS: { valor: Papel; texto: string }[] = [
  { valor: 'ADMINISTRADOR', texto: 'Administrador' }, { valor: 'FINANCEIRO', texto: 'Financeiro' },
  { valor: 'VENDEDOR', texto: 'Vendedor' }, { valor: 'CONSULTA', texto: 'Consulta' },
];

export function Acesso() {
  const caminho = useLocation().pathname;
  const tipo = caminho.endsWith('/perfis') ? 'perfis' : caminho.endsWith('/permissoes') ? 'permissoes' : 'usuarios';
  const usuarios = useRequisicao(listarUsuarios, []);
  const perfis = useRequisicao(listarPerfis, []);
  const permissoes = useRequisicao(listarPermissoes, []);
  const [edicao, setEdicao] = useState<UsuarioDeAcesso | null | false>(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState<EntradaDeUsuario>({ nome: '', email: '', papel: 'CONSULTA', senha: '' });
  const titulo = tipo === 'usuarios' ? 'Usuários' : tipo === 'perfis' ? 'Perfis' : 'Permissões';
  const abrirNovo = () => { setForm({ nome: '', email: '', papel: 'CONSULTA', senha: '' }); setErro(''); setEdicao(null); };
  const abrirEdicao = (usuario: UsuarioDeAcesso) => { setForm({ nome: usuario.nome, email: usuario.email, papel: usuario.papel, ativo: usuario.ativo }); setErro(''); setEdicao(usuario); };
  async function salvar() {
    setSalvando(true); setErro('');
    try { if (edicao) await atualizarUsuario(edicao.id, form); else await criarUsuario(form); setEdicao(false); await usuarios.recarregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar.'); } finally { setSalvando(false); }
  }
  return <>
    <CabecalhoDaPagina titulo={titulo} descricao="Controle de acesso do sistema." acoes={tipo === 'usuarios' ? <button className="botao botao--primario" type="button" onClick={abrirNovo}>+ Novo usuário</button> : undefined} />
    <div className="corpo-da-pagina pilha"><Painel titulo={titulo} semPreenchimento>
      {tipo === 'usuarios' && <ConteudoDaRequisicao requisicao={usuarios} vazio={(dados) => dados.length === 0} tituloDoVazio="Nenhum usuário" descricaoDoVazio="Cadastre o primeiro usuário.">{(dados) => <div className="rolagem-horizontal"><table className="tabela"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th className="acoes">Ações</th></tr></thead><tbody>{dados.map((u) => <tr key={u.id}><td>{u.nome}</td><td>{u.email}</td><td>{PAPEIS.find((p) => p.valor === u.papel)?.texto}</td><td><Selo texto={u.ativo ? 'Ativo' : 'Inativo'} tom={u.ativo ? 'ok' : 'neutro'} /></td><td className="acoes"><button className="botao botao--fantasma botao--pequeno" type="button" onClick={() => abrirEdicao(u)}>Editar</button></td></tr>)}</tbody></table></div>}</ConteudoDaRequisicao>}
      {tipo === 'perfis' && <ConteudoDaRequisicao requisicao={perfis} vazio={(dados) => dados.length === 0} tituloDoVazio="Nenhum perfil" descricaoDoVazio="Os perfis definidos pelo sistema aparecerão aqui.">{(dados) => <table className="tabela"><thead><tr><th>Perfil</th><th>Usuários ativos</th><th>Permissões</th><th>Situação</th></tr></thead><tbody>{dados.map((p) => <tr key={p.id}><td>{p.nome}</td><td>{p.usuariosVinculados}</td><td>{p.permissoes.length}</td><td><Selo texto="Ativo" tom="ok" /></td></tr>)}</tbody></table>}</ConteudoDaRequisicao>}
      {tipo === 'permissoes' && <ConteudoDaRequisicao requisicao={permissoes} vazio={(dados) => dados.length === 0} tituloDoVazio="Nenhuma permissão" descricaoDoVazio="Permissões disponíveis para os perfis do sistema.">{(dados) => <table className="tabela"><thead><tr><th>Permissão</th><th>Perfis</th><th>Situação</th></tr></thead><tbody>{dados.map((p) => <tr key={p.id}><td>{p.nome}</td><td>{p.perfis.map((perfil) => PAPEIS.find((item) => item.valor === perfil)?.texto).join(', ') || 'Nenhum'}</td><td><Selo texto="Ativa" tom="ok" /></td></tr>)}</tbody></table>}</ConteudoDaRequisicao>}
    </Painel></div>
    {edicao !== false && <Modal titulo={edicao ? 'Editar usuário' : 'Novo usuário'} descricao="Dados de acesso" aoFechar={() => setEdicao(false)} rodape={<div className="linha linha--entre" style={{ width: '100%' }}><button className="botao" type="button" onClick={() => setEdicao(false)}>Cancelar</button><button className="botao botao--primario" type="button" disabled={salvando} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Salvar'}</button></div>}><div className="pilha"><CampoDeTexto rotulo="Nome" valor={form.nome} aoMudar={(nome) => setForm({ ...form, nome })} obrigatorio /><CampoDeTexto rotulo="E-mail" tipo="email" valor={form.email} aoMudar={(email) => setForm({ ...form, email })} obrigatorio /><CampoDeSelecao rotulo="Perfil" valor={form.papel} opcoes={PAPEIS} aoMudar={(papel) => setForm({ ...form, papel: papel as Papel })} /><CampoDeTexto rotulo={edicao ? 'Nova senha (opcional)' : 'Senha'} tipo="password" valor={form.senha ?? ''} aoMudar={(senha) => setForm({ ...form, senha })} obrigatorio={!edicao} /><CampoDeSelecao rotulo="Situação" valor={form.ativo === false ? 'false' : 'true'} opcoes={[{ valor: 'true', texto: 'Ativo' }, { valor: 'false', texto: 'Inativo' }]} aoMudar={(ativo) => setForm({ ...form, ativo: ativo === 'true' })} />{erro && <div className="aviso aviso--erro">{erro}</div>}</div></Modal>}
  </>;
}
