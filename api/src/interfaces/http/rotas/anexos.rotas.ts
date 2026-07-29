import { Router } from 'express';
import multer from 'multer';
import { ErroDeValidacao } from '../../../domain/shared/errors.js';
import { TAMANHO_MAXIMO_EM_BYTES, TIPOS_ACEITOS } from '../../../domain/arquivos/tipos.js';
import type { ControladorDeAnexos } from '../controllers/anexos.controller.js';
import { exigirPermissao } from '../middlewares/autenticacao.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';
import type { RequisicaoAutenticada } from '../tipos.js';

/**
 * Arquivo em memoria, nao em disco temporario.
 *
 * O limite e de 10 MB e o caso de uso repassa o buffer direto ao armazenamento,
 * entao nao ha ganho em passar por arquivo temporario — e evita deixar lixo em
 * /tmp quando a requisicao falha no meio.
 */
const recebedorDeArquivo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO_EM_BYTES, files: 1 },
  fileFilter: (_requisicao, arquivo, prosseguir) => {
    if (!TIPOS_ACEITOS[arquivo.mimetype]) {
      prosseguir(
        new ErroDeValidacao(
          `Tipo de arquivo nao aceito: ${arquivo.mimetype}. Envie PDF, JPEG, PNG ou WebP.`,
        ),
      );
      return;
    }
    prosseguir(null, true);
  },
}).single('arquivo');

export function criarRotasDeAnexos(controlador: ControladorDeAnexos): Router {
  const rotas = Router();

  rotas.get('/clientes/:id/anexos', assincrono<RequisicaoAutenticada>(controlador.listar('CLIENTE')));
  rotas.get('/contratos/:id/anexos', assincrono<RequisicaoAutenticada>(controlador.listar('CONTRATO')));

  rotas.post(
    '/clientes/:id/anexos',
    exigirPermissao('ANEXAR_ARQUIVO'),
    recebedorDeArquivo,
    assincrono<RequisicaoAutenticada>(controlador.anexar('CLIENTE')),
  );
  rotas.post(
    '/contratos/:id/anexos',
    exigirPermissao('ANEXAR_ARQUIVO'),
    recebedorDeArquivo,
    assincrono<RequisicaoAutenticada>(controlador.anexar('CONTRATO')),
  );

  // Download exige token: documento de cliente nao pode ficar acessivel por URL
  // adivinhavel. Por isso o front busca por fetch e nao por <a href>.
  rotas.get('/anexos/:id/conteudo', assincrono<RequisicaoAutenticada>(controlador.baixar));

  rotas.delete(
    '/anexos/:id',
    exigirPermissao('REMOVER_ANEXO'),
    assincrono<RequisicaoAutenticada>(controlador.remover),
  );

  return rotas;
}
