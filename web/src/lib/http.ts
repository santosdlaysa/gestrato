import type { CorpoDeErro } from '@/tipos/comum';
import { lerToken, limparSessao } from './armazenamento';

// Base das chamadas HTTP. Em desenvolvimento o proxy do Vite encaminha "/api"
// para o servidor local, entao VITE_API_URL pode ficar vazia. Em producao
// (Vercel) defina VITE_API_URL com a URL da API.
//
// Tolerante de proposito: aceita o host com ou sem "/api" e sempre garante o
// sufixo "/api" (a API monta todas as rotas sob esse prefixo). Assim tanto
// "https://sua-api.onrender.com" quanto ".../api" funcionam.
function resolverBase(): string {
  const bruto = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');
  if (!bruto) return '/api';
  return /\/api$/.test(bruto) ? bruto : `${bruto}/api`;
}

const BASE = resolverBase();

export class ErroDaApi extends Error {
  constructor(
    readonly status: number,
    readonly tipo: string,
    mensagem: string,
    readonly detalhes: unknown[] = [],
  ) {
    super(mensagem);
    this.name = 'ErroDaApi';
  }
}

export type Parametros = Record<string, string | number | boolean | null | undefined>;

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  corpo?: unknown;
  parametros?: Parametros;
  sinal?: AbortSignal;
}

let aoPerderSessao: (() => void) | null = null;

export function definirTratadorDeSessaoExpirada(tratador: () => void): void {
  aoPerderSessao = tratador;
}

export function montarQuery(parametros: Parametros | undefined): string {
  if (!parametros) return '';
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor === null || valor === undefined || valor === '') continue;
    busca.set(chave, String(valor));
  }
  const texto = busca.toString();
  return texto ? `?${texto}` : '';
}

/**
 * `FormData` sai sem `Content-Type` de propósito: o cabeçalho do multipart
 * precisa carregar o `boundary` que separa as partes, e só o navegador conhece
 * esse valor — ele o gera ao serializar o corpo. Definir "multipart/form-data"
 * aqui sobrescreveria o cabeçalho sem o boundary e a API não conseguiria
 * separar o arquivo dos demais campos.
 */
function montarCabecalhos(corpo: unknown): HeadersInit {
  const cabecalhos: Record<string, string> = { Accept: 'application/json' };
  if (corpo !== undefined && !(corpo instanceof FormData)) {
    cabecalhos['Content-Type'] = 'application/json';
  }
  const token = lerToken();
  if (token) cabecalhos.Authorization = `Bearer ${token}`;
  return cabecalhos;
}

function montarCorpo(corpo: unknown): BodyInit | undefined {
  if (corpo === undefined) return undefined;
  if (corpo instanceof FormData) return corpo;
  return JSON.stringify(corpo);
}

async function lerErro(resposta: Response): Promise<ErroDaApi> {
  let tipo = 'ErroDesconhecido';
  let mensagem = `Falha na requisição (HTTP ${resposta.status}).`;
  let detalhes: unknown[] = [];
  try {
    const corpo = (await resposta.json()) as Partial<CorpoDeErro> & { motivo?: string; mensagem?: string; situacao?: string };
    if (corpo?.erro) {
      tipo = corpo.erro.tipo ?? tipo;
      mensagem = corpo.erro.mensagem ?? mensagem;
      detalhes = corpo.erro.detalhes ?? [];
    } else if (typeof corpo?.motivo === 'string' || typeof corpo?.mensagem === 'string') {
      // Respostas que sinalizam falha fora do envelope padrão de erro — por
      // exemplo o envio de cobrança, que responde { situacao: 'FALHA', motivo }.
      if (corpo.situacao) tipo = corpo.situacao;
      mensagem = corpo.motivo ?? corpo.mensagem ?? mensagem;
    }
  } catch {
    /* resposta sem corpo JSON: mantém a mensagem padrão */
  }
  return new ErroDaApi(resposta.status, tipo, mensagem, detalhes);
}

function tratarNaoAutenticado(): void {
  limparSessao();
  aoPerderSessao?.();
}

/**
 * Todo 401 encerra a sessão local e devolve o usuário para a entrada — inclusive
 * quando não havia token, porque nesse caso o estado do app está inconsistente e
 * insistir só produz o mesmo erro em laço.
 *
 * O que muda é a mensagem. "Sessão expirada" só faz sentido se havia sessão; sem
 * token, o texto real da API ("credenciais inválidas", "usuário inativo") é a
 * informação de que a pessoa precisa para entender por que não entrou.
 */
async function tratar401(resposta: Response, tinhaToken: boolean): Promise<ErroDaApi> {
  const erro = tinhaToken
    ? new ErroDaApi(401, 'NaoAutenticado', 'Sessão expirada. Entre novamente.')
    : await lerErro(resposta);
  tratarNaoAutenticado();
  return erro;
}

export async function requisitar<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { metodo = 'GET', corpo, parametros, sinal } = opcoes;
  const tinhaToken = Boolean(lerToken());
  const resposta = await fetch(`${BASE}${caminho}${montarQuery(parametros)}`, {
    method: metodo,
    headers: montarCabecalhos(corpo),
    body: montarCorpo(corpo),
    signal: sinal,
  });

  if (resposta.status === 401) throw await tratar401(resposta, tinhaToken);
  if (!resposta.ok) throw await lerErro(resposta);
  if (resposta.status === 204) return undefined as T;

  const texto = await resposta.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}

/**
 * Baixa um arquivo autenticado (o `?formato=csv` dos relatórios e o conteúdo dos
 * anexos). Passa pelo `fetch` porque um `<a href>` não leva o `Authorization`.
 */
export async function baixarArquivo(
  caminho: string,
  parametros: Parametros,
  nomeDoArquivo: string,
): Promise<void> {
  const tinhaToken = Boolean(lerToken());
  const resposta = await fetch(`${BASE}${caminho}${montarQuery(parametros)}`, {
    headers: montarCabecalhos(undefined),
  });
  if (resposta.status === 401) throw await tratar401(resposta, tinhaToken);
  if (!resposta.ok) throw await lerErro(resposta);

  const conteudo = await resposta.blob();
  const url = URL.createObjectURL(conteudo);
  const ancora = document.createElement('a');
  ancora.href = url;
  ancora.download = nomeDoArquivo;
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  URL.revokeObjectURL(url);
}

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroDaApi) return erro.message;
  if (erro instanceof Error) return erro.message;
  return 'Erro inesperado.';
}

export function foiCancelada(erro: unknown): boolean {
  return erro instanceof DOMException && erro.name === 'AbortError';
}
