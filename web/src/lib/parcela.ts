import type { ParcelaDeCobranca } from '@/tipos/parcela';

export function nomeDoCliente(parcela: ParcelaDeCobranca): string {
  if (typeof parcela.cliente === 'string') return parcela.cliente;
  return parcela.cliente?.nome ?? '—';
}

export function idDoCliente(parcela: ParcelaDeCobranca): string | undefined {
  if (typeof parcela.cliente === 'object' && parcela.cliente) return parcela.cliente.id;
  return parcela.clienteId;
}

export function numeroDoContrato(parcela: ParcelaDeCobranca): string {
  if (typeof parcela.contrato === 'string') return parcela.contrato;
  return parcela.contrato?.numero ?? '—';
}

export function idDoContrato(parcela: ParcelaDeCobranca): string | undefined {
  if (typeof parcela.contrato === 'object' && parcela.contrato) return parcela.contrato.id;
  return parcela.contratoId;
}

export function descricaoDoImovel(parcela: ParcelaDeCobranca): string {
  const partes = [parcela.loteamento, parcela.quadra && `Q ${parcela.quadra}`, parcela.lote && `L ${parcela.lote}`];
  const texto = partes.filter(Boolean).join(' · ');
  return texto || '—';
}

export function valorAtualizadoCentavos(parcela: ParcelaDeCobranca): number {
  return parcela.demonstrativo?.totalCentavos ?? parcela.valorOriginalCentavos;
}

export function diasDeAtraso(parcela: ParcelaDeCobranca): number {
  return parcela.demonstrativo?.diasDeAtraso ?? 0;
}

export function estaEmAberto(parcela: ParcelaDeCobranca): boolean {
  return parcela.status !== 'PAGA' && parcela.status !== 'CANCELADA' && parcela.status !== 'RENEGOCIADA';
}

export function classeDaLinha(parcela: ParcelaDeCobranca, selecionada: boolean): string {
  // NÃO acrescente a classe base "linha" aqui: ela é o utilitário de layout
  // (`display: flex; flex-wrap: wrap`) e, aplicada a um <tr>, transforma a
  // linha em container flex — as células saem da grade da tabela e empilham
  // numa coluna estreita. Os modificadores abaixo já são estilizados com
  // escopo próprio (`.tabela tbody tr.linha--*`) e dispensam a classe base.
  const classes: string[] = [];
  if (parcela.situacao === 'VENCIDA') classes.push('linha--vencida');
  if (parcela.situacao === 'VENCE_HOJE') classes.push('linha--vence-hoje');
  if (parcela.status === 'PAGA') classes.push('linha--paga');
  if (selecionada) classes.push('linha--selecionada');
  return classes.join(' ');
}

export function somarValoresAtualizados(parcelas: ParcelaDeCobranca[]): number {
  return parcelas.reduce((soma, parcela) => soma + valorAtualizadoCentavos(parcela), 0);
}
