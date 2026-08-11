/**
 * Verificacao ponta a ponta do acesso: sobe a app real e exercita login,
 * autorizacao por permissao, CRUD de perfil e a trava anti-lockout de admin.
 * Aponte DATABASE_URL para um banco de TESTE antes de rodar.
 */
import { criarContainer } from '../src/composicao/container.js';
import { criarAplicacao } from '../src/interfaces/http/aplicacao.js';

const PORTA = 4599;
const base = `http://localhost:${PORTA}/api`;

async function req(metodo: string, caminho: string, token?: string, corpo?: unknown) {
  const r = await fetch(`${base}${caminho}`, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  const dados = texto ? JSON.parse(texto) : null;
  return { status: r.status, dados };
}

async function login(email: string, senha: string): Promise<string> {
  const r = await req('POST', '/auth/login', undefined, { email, senha });
  if (r.status !== 200) throw new Error(`login ${email} falhou: ${r.status} ${JSON.stringify(r.dados)}`);
  return r.dados.token as string;
}

const marca = (ok: boolean) => (ok ? 'OK  ' : 'FALHA');

async function principal() {
  const app = criarAplicacao(criarContainer());
  const server = app.listen(PORTA);
  await new Promise((r) => server.once('listening', r));

  try {
    // 1) Login admin traz perfil + permissoes.
    const loginAdmin = await req('POST', '/auth/login', undefined, {
      email: 'admin@gestrato.local',
      senha: 'admin123',
    });
    const tokenAdmin = loginAdmin.dados.token as string;
    console.log(
      marca(
        loginAdmin.status === 200 &&
          loginAdmin.dados.usuario.perfilNome === 'Administrador' &&
          loginAdmin.dados.usuario.permissoes.includes('GERIR_USUARIOS'),
      ),
      '1. login admin -> perfil e permissoes',
      loginAdmin.dados.usuario.perfilNome,
    );

    const tokenConsulta = await login('consulta@gestrato.local', 'consulta123');

    // 2) Admin le usuarios; Consulta recebe 403 (leitura protegida).
    const listaAdmin = await req('GET', '/usuarios', tokenAdmin);
    console.log(marca(listaAdmin.status === 200 && Array.isArray(listaAdmin.dados)), '2a. admin GET /usuarios', listaAdmin.status);
    const listaConsulta = await req('GET', '/usuarios', tokenConsulta);
    console.log(marca(listaConsulta.status === 403), '2b. consulta GET /usuarios bloqueado', listaConsulta.status);

    // 3) /auth/eu reflete o perfil.
    const eu = await req('GET', '/auth/eu', tokenAdmin);
    console.log(marca(eu.status === 200 && eu.dados.perfilNome === 'Administrador'), '3. GET /auth/eu', eu.dados?.perfilNome);

    // 4) Cria perfil personalizado com matriz especifica.
    const criar = await req('POST', '/perfis', tokenAdmin, {
      nome: 'Cobrança externa',
      descricao: 'Só envia cobrança',
      permissoes: ['ENVIAR_COBRANCA', 'PERMISSAO_INEXISTENTE'],
    });
    const perfilNovoId = criar.dados?.id as string;
    console.log(
      marca(criar.status === 201 && criar.dados.permissoes.length === 1 && criar.dados.permissoes[0] === 'ENVIAR_COBRANCA'),
      '4. cria perfil (permissao invalida filtrada)',
      JSON.stringify(criar.dados?.permissoes),
    );

    // 5) Atribui o novo perfil a um usuario e confirma as permissoes efetivas.
    const vendedor = (listaAdmin.dados as Array<{ id: string; email: string }>).find(
      (u) => u.email === 'vendas@gestrato.local',
    )!;
    const atribuir = await req('PUT', `/usuarios/${vendedor.id}`, tokenAdmin, {
      nome: 'Juliana Castro',
      email: 'vendas@gestrato.local',
      perfilId: perfilNovoId,
    });
    console.log(
      marca(atribuir.status === 200 && atribuir.dados.perfilNome === 'Cobrança externa'),
      '5. atribui perfil novo ao vendedor',
      atribuir.dados?.perfilNome,
    );

    // 6) Trava anti-lockout: rebaixar o unico admin para um perfil sem GERIR_USUARIOS falha.
    const adminUser = (listaAdmin.dados as Array<{ id: string; email: string }>).find(
      (u) => u.email === 'admin@gestrato.local',
    )!;
    const rebaixar = await req('PUT', `/usuarios/${adminUser.id}`, tokenAdmin, {
      nome: 'Ana Paula Ribeiro',
      email: 'admin@gestrato.local',
      perfilId: perfilNovoId,
    });
    console.log(marca(rebaixar.status === 409), '6. trava anti-lockout de admin', rebaixar.status, rebaixar.dados?.erro?.mensagem);

    // 7) Excluir perfil vinculado falha; sem vinculo (troca o vendedor de volta) funciona.
    const excluirComVinculo = await req('DELETE', `/perfis/${perfilNovoId}`, tokenAdmin);
    console.log(marca(excluirComVinculo.status === 409), '7a. excluir perfil com usuarios falha', excluirComVinculo.status);
    await req('PUT', `/usuarios/${vendedor.id}`, tokenAdmin, {
      nome: 'Juliana Castro',
      email: 'vendas@gestrato.local',
      perfilId: '00000000-0000-0000-0000-0000000000a3',
    });
    const excluirLimpo = await req('DELETE', `/perfis/${perfilNovoId}`, tokenAdmin);
    console.log(marca(excluirLimpo.status === 204), '7b. excluir perfil sem vinculo', excluirLimpo.status);

    // 8) Perfil de sistema nao pode ser excluido.
    const excluirSistema = await req('DELETE', '/perfis/00000000-0000-0000-0000-0000000000a4', tokenAdmin);
    console.log(marca(excluirSistema.status === 409), '8. perfil de sistema protegido', excluirSistema.status);
  } finally {
    server.close();
  }
  process.exit(0);
}

principal().catch((e) => {
  console.error('ERRO', e);
  process.exit(1);
});
