import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Modal } from '@/componentes/comuns/Modal';
import { Selo } from '@/componentes/comuns/Selo';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import type { Opcao } from '@/componentes/comuns/Campo';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { useRequisicao } from '@/ganchos/useRequisicao';
import {
  atualizarPerfil,
  atualizarUsuario,
  criarPerfil,
  criarUsuario,
  excluirPerfil,
  excluirUsuario,
  listarPermissoes,
  listarPerfis,
  listarUsuarios,
  redefinirSenha,
  type EntradaDePerfil,
  type EntradaDeUsuario,
} from '@/lib/api/acesso';
import { formatarDataHora } from '@/lib/formato';
import type { PerfilDeAcesso, UsuarioDeAcesso } from '@/tipos/acesso';
import type { Permissao } from '@/tipos/usuario';

function mensagemDeErro(e: unknown, padrao: string): string {
  return e instanceof Error ? e.message : padrao;
}

export function Acesso() {
  const caminho = useLocation().pathname;
  const aba = caminho.endsWith('/perfis')
    ? 'perfis'
    : caminho.endsWith('/permissoes')
      ? 'permissoes'
      : 'usuarios';
  const titulo = aba === 'usuarios' ? 'Usuários' : aba === 'perfis' ? 'Perfis' : 'Permissões';

  return (
    <>
      <CabecalhoDaPagina titulo={titulo} descricao="Controle de acesso do sistema." />
      <div className="corpo-da-pagina pilha">
        {aba === 'usuarios' && <PainelDeUsuarios />}
        {aba === 'perfis' && <PainelDePerfis />}
        {aba === 'permissoes' && <PainelDePermissoes />}
      </div>
    </>
  );
}

// ============================================================== Usuários

const SITUACOES: Opcao[] = [
  { valor: 'true', texto: 'Ativo' },
  { valor: 'false', texto: 'Inativo' },
];

function formularioVazio(perfilId: string): EntradaDeUsuario {
  return { nome: '', email: '', perfilId, senha: '', ativo: true };
}

function PainelDeUsuarios() {
  const usuarios = useRequisicao(listarUsuarios, []);
  const perfis = useRequisicao(listarPerfis, []);
  const opcoesDePerfil: Opcao[] = useMemo(
    () => (perfis.dados ?? []).map((p) => ({ valor: p.id, texto: p.nome })),
    [perfis.dados],
  );
  const perfilPadrao = perfis.dados?.[0]?.id ?? '';

  const [edicao, setEdicao] = useState<UsuarioDeAcesso | null | false>(false);
  const [form, setForm] = useState<EntradaDeUsuario>(formularioVazio(''));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [alvoSenha, setAlvoSenha] = useState<UsuarioDeAcesso | null>(null);

  function abrirNovo() {
    setForm(formularioVazio(perfilPadrao));
    setErro('');
    setEdicao(null);
  }
  function abrirEdicao(u: UsuarioDeAcesso) {
    setForm({ nome: u.nome, email: u.email, perfilId: u.perfilId, senha: '', ativo: u.ativo });
    setErro('');
    setEdicao(u);
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      const dados: EntradaDeUsuario = { ...form, senha: form.senha || undefined };
      if (edicao) await atualizarUsuario(edicao.id, dados);
      else await criarUsuario(dados);
      setEdicao(false);
      usuarios.recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar.'));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(u: UsuarioDeAcesso) {
    if (!window.confirm(`Excluir o usuário ${u.nome}? Esta ação não pode ser desfeita.`)) return;
    try {
      await excluirUsuario(u.id);
      usuarios.recarregar();
    } catch (e) {
      window.alert(mensagemDeErro(e, 'Não foi possível excluir.'));
    }
  }

  return (
    <Painel
      titulo="Usuários"
      descricao="Quem acessa o sistema e com qual perfil"
      acoes={
        <button type="button" className="botao botao--primario" onClick={abrirNovo}>
          + Novo usuário
        </button>
      }
      semPreenchimento
    >
      <ConteudoDaRequisicao
        requisicao={usuarios}
        vazio={(d) => d.length === 0}
        tituloDoVazio="Nenhum usuário"
        descricaoDoVazio="Cadastre o primeiro usuário."
      >
        {(dados) => (
          <div className="rolagem-horizontal">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Situação</th>
                  <th>Último acesso</th>
                  <th className="acoes">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nome}</td>
                    <td>{u.email}</td>
                    <td>{u.perfilNome}</td>
                    <td>
                      <Selo texto={u.ativo ? 'Ativo' : 'Inativo'} tom={u.ativo ? 'ok' : 'neutro'} />
                    </td>
                    <td className="texto-suave">{formatarDataHora(u.ultimoAcesso)}</td>
                    <td className="acoes">
                      <div className="linha">
                        <button
                          type="button"
                          className="botao botao--fantasma botao--pequeno"
                          onClick={() => abrirEdicao(u)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="botao botao--fantasma botao--pequeno"
                          onClick={() => setAlvoSenha(u)}
                        >
                          Redefinir senha
                        </button>
                        <button
                          type="button"
                          className="botao botao--fantasma botao--pequeno"
                          onClick={() => void excluir(u)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConteudoDaRequisicao>

      {edicao !== false && (
        <Modal
          titulo={edicao ? 'Editar usuário' : 'Novo usuário'}
          descricao="Dados de acesso"
          aoFechar={() => setEdicao(false)}
          rodape={
            <div className="linha linha--entre" style={{ width: '100%' }}>
              <button type="button" className="botao" onClick={() => setEdicao(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="botao botao--primario"
                disabled={salvando}
                onClick={() => void salvar()}
              >
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          }
        >
          <div className="pilha">
            <CampoDeTexto rotulo="Nome" valor={form.nome} aoMudar={(nome) => setForm({ ...form, nome })} obrigatorio />
            <CampoDeTexto
              rotulo="E-mail"
              tipo="email"
              valor={form.email}
              aoMudar={(email) => setForm({ ...form, email })}
              obrigatorio
            />
            <CampoDeSelecao
              rotulo="Perfil"
              valor={form.perfilId}
              opcoes={opcoesDePerfil}
              aoMudar={(perfilId) => setForm({ ...form, perfilId })}
              textoVazio="Selecione um perfil"
            />
            <CampoDeTexto
              rotulo={edicao ? 'Nova senha (opcional)' : 'Senha'}
              tipo="password"
              valor={form.senha ?? ''}
              aoMudar={(senha) => setForm({ ...form, senha })}
              obrigatorio={!edicao}
            />
            <CampoDeSelecao
              rotulo="Situação"
              valor={form.ativo === false ? 'false' : 'true'}
              opcoes={SITUACOES}
              aoMudar={(v) => setForm({ ...form, ativo: v === 'true' })}
            />
            {erro && <div className="aviso aviso--erro">{erro}</div>}
          </div>
        </Modal>
      )}

      {alvoSenha && (
        <ModalDeSenha usuario={alvoSenha} aoFechar={() => setAlvoSenha(null)} />
      )}
    </Painel>
  );
}

function ModalDeSenha({ usuario, aoFechar }: { usuario: UsuarioDeAcesso; aoFechar: () => void }) {
  const [senha, setSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      await redefinirSenha(usuario.id, senha);
      aoFechar();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível redefinir a senha.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo="Redefinir senha"
      descricao={usuario.nome}
      aoFechar={aoFechar}
      rodape={
        <div className="linha linha--entre" style={{ width: '100%' }}>
          <button type="button" className="botao" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className="botao botao--primario"
            disabled={salvando || senha.length < 8}
            onClick={() => void salvar()}
          >
            {salvando ? 'Salvando…' : 'Redefinir'}
          </button>
        </div>
      }
    >
      <div className="pilha">
        <CampoDeTexto
          rotulo="Nova senha"
          tipo="password"
          valor={senha}
          aoMudar={setSenha}
          dica="Ao menos 8 caracteres."
          obrigatorio
        />
        {erro && <div className="aviso aviso--erro">{erro}</div>}
      </div>
    </Modal>
  );
}

// ================================================================ Perfis

interface FormularioDePerfil {
  nome: string;
  descricao: string;
  permissoes: Permissao[];
}

function PainelDePerfis() {
  const perfis = useRequisicao(listarPerfis, []);
  const permissoes = useRequisicao(listarPermissoes, []);

  const [edicao, setEdicao] = useState<PerfilDeAcesso | null | false>(false);
  const [form, setForm] = useState<FormularioDePerfil>({ nome: '', descricao: '', permissoes: [] });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  function abrirNovo() {
    setForm({ nome: '', descricao: '', permissoes: [] });
    setErro('');
    setEdicao(null);
  }
  function abrirEdicao(p: PerfilDeAcesso) {
    setForm({ nome: p.nome, descricao: p.descricao ?? '', permissoes: [...p.permissoes] });
    setErro('');
    setEdicao(p);
  }
  function alternar(permissao: Permissao) {
    setForm((f) => ({
      ...f,
      permissoes: f.permissoes.includes(permissao)
        ? f.permissoes.filter((x) => x !== permissao)
        : [...f.permissoes, permissao],
    }));
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      const dados: EntradaDePerfil = {
        nome: form.nome,
        descricao: form.descricao || null,
        permissoes: form.permissoes,
      };
      if (edicao) await atualizarPerfil(edicao.id, dados);
      else await criarPerfil(dados);
      setEdicao(false);
      perfis.recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar o perfil.'));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(p: PerfilDeAcesso) {
    if (!window.confirm(`Excluir o perfil "${p.nome}"?`)) return;
    try {
      await excluirPerfil(p.id);
      perfis.recarregar();
    } catch (e) {
      window.alert(mensagemDeErro(e, 'Não foi possível excluir o perfil.'));
    }
  }

  return (
    <Painel
      titulo="Perfis"
      descricao="Cada perfil reúne um conjunto de permissões"
      acoes={
        <button type="button" className="botao botao--primario" onClick={abrirNovo}>
          + Novo perfil
        </button>
      }
      semPreenchimento
    >
      <ConteudoDaRequisicao
        requisicao={perfis}
        vazio={(d) => d.length === 0}
        tituloDoVazio="Nenhum perfil"
        descricaoDoVazio="Crie o primeiro perfil de acesso."
      >
        {(dados) => (
          <div className="rolagem-horizontal">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Perfil</th>
                  <th>Descrição</th>
                  <th>Usuários ativos</th>
                  <th>Permissões</th>
                  <th className="acoes">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="linha">
                        {p.nome}
                        {p.sistema && <Selo texto="Sistema" tom="info" />}
                      </div>
                    </td>
                    <td className="texto-suave">{p.descricao ?? '—'}</td>
                    <td>{p.usuariosVinculados}</td>
                    <td>{p.permissoes.length}</td>
                    <td className="acoes">
                      <div className="linha">
                        <button
                          type="button"
                          className="botao botao--fantasma botao--pequeno"
                          onClick={() => abrirEdicao(p)}
                        >
                          Editar
                        </button>
                        {!p.sistema && (
                          <button
                            type="button"
                            className="botao botao--fantasma botao--pequeno"
                            onClick={() => void excluir(p)}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConteudoDaRequisicao>

      {edicao !== false && (
        <Modal
          titulo={edicao ? `Editar perfil` : 'Novo perfil'}
          descricao="Nome, descrição e permissões"
          largo
          aoFechar={() => setEdicao(false)}
          rodape={
            <div className="linha linha--entre" style={{ width: '100%' }}>
              <button type="button" className="botao" onClick={() => setEdicao(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="botao botao--primario"
                disabled={salvando}
                onClick={() => void salvar()}
              >
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          }
        >
          <div className="pilha">
            <CampoDeTexto rotulo="Nome" valor={form.nome} aoMudar={(nome) => setForm({ ...form, nome })} obrigatorio />
            <CampoDeTexto
              rotulo="Descrição"
              valor={form.descricao}
              aoMudar={(descricao) => setForm({ ...form, descricao })}
              espacoReservado="Para que serve este perfil"
            />
            <div className="campo">
              <span className="campo__rotulo">Permissões</span>
              <div className="grade grade--2">
                {(permissoes.dados ?? []).map((permissao) => (
                  <label key={permissao.id} className="linha" style={{ gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.permissoes.includes(permissao.id)}
                      onChange={() => alternar(permissao.id)}
                    />
                    {permissao.nome}
                  </label>
                ))}
              </div>
            </div>
            {erro && <div className="aviso aviso--erro">{erro}</div>}
          </div>
        </Modal>
      )}
    </Painel>
  );
}

// ============================================================= Permissões

function PainelDePermissoes() {
  const permissoes = useRequisicao(listarPermissoes, []);
  return (
    <Painel
      titulo="Permissões"
      descricao="Cada permissão e os perfis que a possuem"
      semPreenchimento
    >
      <ConteudoDaRequisicao
        requisicao={permissoes}
        vazio={(d) => d.length === 0}
        tituloDoVazio="Nenhuma permissão"
        descricaoDoVazio="Permissões disponíveis para os perfis."
      >
        {(dados) => (
          <div className="rolagem-horizontal">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Permissão</th>
                  <th>Perfis com esta permissão</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td className="texto-suave">{p.perfis.length > 0 ? p.perfis.join(', ') : 'Nenhum'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConteudoDaRequisicao>
    </Painel>
  );
}
