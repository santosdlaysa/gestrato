/** Ícones de linha (24×24) para os módulos da barra lateral. */

const CAMINHOS: Record<string, string> = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  cadastros: 'M4 5h16M4 5v14h16V5M9 9h6M9 13h6M9 17h3',
  crm: 'M3 5h18l-7 8v5l-4 2v-7z',
  clientes: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-3.5 3.6-6 8-6s8 2.5 8 6',
  contratos: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  parcelas: 'M4 7h16v12H4zM4 11h16M8 3v4M16 3v4',
  cobrancas: 'M5 10v4h3l5 4V6l-5 4zM17 9a4 4 0 0 1 0 6',
  boletos: 'M4 5v14M7 5v14M10 5v14M13 5v14M16 5v14M19 5v14',
  financeiro: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5a2.5 2 0 0 1 5 0M14.5 14.5a2.5 2 0 0 1-5 0',
  relatorios: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8',
  comercial: 'M4 4h7l9 9-7 7-9-9zM8.5 8.5h.01',
  loteamentos: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  mapa: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  'portal-cliente': 'M4 5h16v14H4zM4 9h16M7 13h4M7 16h7',
  'portal-corretor': 'M4 8h16v12H4zM9 8V6a3 3 0 0 1 6 0v2',
  documentos: 'M7 3h7l4 4v14H7zM14 3v4h4M9 12h6M9 16h6',
  configuracoes:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1.5-1.5-3-2.3.8-1.7-1-.5-2.4h-3l-.5 2.4-1.7 1-2.3-.8L4 10.5 6 12l-2 1.5 1.5 3 2.3-.8 1.7 1 .5 2.4h3l.5-2.4 1.7-1 2.3.8 1.5-3z',
  auditoria: 'M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM10.5 11.5a2 2 0 1 0 3 3M13 14l2 2',
  integracoes: 'M9 3v5M15 3v5M8 8h8v3a4 4 0 0 1-8 0zM12 15v6',
  mobile: 'M8 3h8v18H8zM11 18h2',
};

export function IconeDoModulo({ id, tamanho = 17 }: { id: string; tamanho?: number }) {
  const d = CAMINHOS[id] ?? 'M4 4h16v16H4z';
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
