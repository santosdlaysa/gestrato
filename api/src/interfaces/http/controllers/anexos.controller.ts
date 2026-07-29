import type { Response } from 'express';
import { z } from 'zod';
import { ErroDeValidacao, ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import { formatarTamanho } from '../../../domain/arquivos/anexo.js';
import type { Anexo } from '../../../domain/arquivos/anexo.js';
import {
  categoriasDoEscopo,
  ROTULOS_DE_CATEGORIA,
  TAMANHO_MAXIMO_EM_BYTES,
  type EscopoDoAnexo,
} from '../../../domain/arquivos/tipos.js';
import type {
  AnexarArquivo,
  BaixarAnexo,
  ListarAnexos,
  RemoverAnexo,
} from '../../../application/use-cases/arquivos/gerir-anexos.js';
import { usuarioDaRequisicao } from '../middlewares/autenticacao.js';
import type { RequisicaoAutenticada } from '../tipos.js';
import { esquemaDeIdentificador } from '../validacao/esquemas-comuns.js';

export interface CasosDeUsoDeAnexos {
  readonly anexar: AnexarArquivo;
  readonly listar: ListarAnexos;
  readonly baixar: BaixarAnexo;
  readonly remover: RemoverAnexo;
}

const esquemaDoEnvio = z.object({
  categoria: z.string().trim().min(1, 'Informe a categoria do documento.'),
  descricao: z.string().trim().max(300).optional().nullable(),
});

export class ControladorDeAnexos {
  constructor(private readonly casosDeUso: CasosDeUsoDeAnexos) {}

  /** Fabrica o handler de envio para um escopo — evita duplicar cliente e contrato. */
  anexar(escopo: EscopoDoAnexo) {
    // `requisicao.file` vem do multer, que aumenta o tipo do Express.
    return async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
      const donoId = esquemaDeIdentificador.parse(requisicao.params.id);
      const { categoria, descricao } = esquemaDoEnvio.parse(requisicao.body ?? {});
      const arquivo = requisicao.file;

      if (!arquivo) {
        throw new ErroDeValidacao(
          `Nenhum arquivo recebido. Envie multipart/form-data com o campo "arquivo" (ate ${formatarTamanho(TAMANHO_MAXIMO_EM_BYTES)}).`,
        );
      }

      const anexo = await this.casosDeUso.anexar.executar({
        escopo,
        donoId,
        categoria,
        nomeOriginal: arquivo.originalname,
        tipoMime: arquivo.mimetype,
        conteudo: arquivo.buffer,
        descricao: descricao ?? null,
        enviadoPor: usuarioDaRequisicao(requisicao).email,
      });

      resposta.status(201).json(apresentarAnexo(anexo));
    };
  }

  listar(escopo: EscopoDoAnexo) {
    return async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
      const donoId = esquemaDeIdentificador.parse(requisicao.params.id);
      const anexos = await this.casosDeUso.listar.executar(escopo, donoId);
      resposta.json({
        itens: anexos.map(apresentarAnexo),
        categoriasDisponiveis: categoriasDoEscopo(escopo).map((categoria) => ({
          valor: categoria,
          rotulo: ROTULOS_DE_CATEGORIA[categoria],
        })),
        tamanhoMaximoBytes: TAMANHO_MAXIMO_EM_BYTES,
      });
    };
  }

  /**
   * Entrega o binario.
   *
   * `Content-Disposition: inline` deixa o navegador exibir PDF e imagem numa
   * aba, em vez de forcar download — e o comportamento util para conferir um
   * documento. O nome vai codificado, porque acento quebra o cabecalho.
   */
  baixar = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    const { anexo, conteudo } = await this.casosDeUso.baixar.executar(id);

    resposta.setHeader('Content-Type', anexo.tipoMime);
    resposta.setHeader('Content-Length', String(anexo.tamanhoBytes));
    resposta.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(anexo.nomeOriginal)}`,
    );
    // Documento de cliente nao pode ficar em cache compartilhado.
    resposta.setHeader('Cache-Control', 'private, max-age=0, no-store');
    resposta.send(conteudo);
  };

  remover = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    await this.casosDeUso.remover.executar(id);
    resposta.status(204).end();
  };
}

function apresentarAnexo(anexo: Anexo) {
  return {
    id: anexo.id.paraString(),
    escopo: anexo.escopo,
    donoId: anexo.donoId.paraString(),
    categoria: anexo.categoria,
    categoriaRotulo: anexo.categoriaRotulo,
    nomeOriginal: anexo.nomeOriginal,
    tipoMime: anexo.tipoMime,
    tamanhoBytes: anexo.tamanhoBytes,
    tamanhoLegivel: formatarTamanho(anexo.tamanhoBytes),
    descricao: anexo.descricao,
    enviadoPor: anexo.enviadoPor,
    enviadoEm: anexo.enviadoEm.toISOString(),
  };
}

export { ErroNaoEncontrado };
