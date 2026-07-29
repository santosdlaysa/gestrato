import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ProvedorDeAutenticacao } from './contextos/AutenticacaoContexto';

import './estilos/base.css';
import './estilos/layout.css';
import './estilos/componentes.css';
import './estilos/tabela.css';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado no index.html.');

createRoot(raiz).render(
  <StrictMode>
    <BrowserRouter>
      <ProvedorDeAutenticacao>
        <App />
      </ProvedorDeAutenticacao>
    </BrowserRouter>
  </StrictMode>,
);
