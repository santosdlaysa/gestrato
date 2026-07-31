export type SituacaoDaIntegracao = 'CONFIGURADO' | 'NAO_CONFIGURADO' | 'NAO_SUPORTADO';

export interface IntegracaoDoStatus {
  chave: string;
  nome: string;
  situacao: SituacaoDaIntegracao;
  detalhe: string;
}

export interface StatusDeConfiguracoesEIntegracoes {
  empresa: { nome: string; fusoHorario: string; ambiente: string; urlPublica: string; armazenamento: string };
  mensageria: { provedor: string; canais: string[] };
  gateway: { provedor: string };
  integracoes: IntegracaoDoStatus[];
  bloqueios: string[];
}
