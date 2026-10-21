// Obtém o IP/Domínio de onde a página front-end está rodando no momento
const HOST_ATUAL = window.location.hostname;

// Se estiver rodando localmente (sua máquina), usa o localhost:8080.
// Se estiver em produção (ex: Vercel ou qualquer outro domínio), usa a URL do Render.
export const API_BASE_URL = (HOST_ATUAL === 'localhost' || HOST_ATUAL === '127.0.0.1')
  ? 'http://localhost:8080'
  : 'https://connecthub-backend-s06j.onrender.com';

export const API_AUTH_URL = `${API_BASE_URL}/login`;
export const API_VINCULO_URL = `${API_BASE_URL}/api/vinculos`;