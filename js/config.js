// js/config.js

// Obtém o IP/Domínio de onde a página está rodando no momento
const HOST_ATUAL = window.location.hostname;

// Se estiver no PC (localhost ou 127.0.0.1), usa localhost.
// Se estiver no celular via IP local, usa o IP da rede atual na porta 8080.
export const API_BASE_URL = (HOST_ATUAL === 'localhost' || HOST_ATUAL === '127.0.0.1')
  ? 'http://localhost:8080'
  : `http://${HOST_ATUAL}:8080`;

export const API_AUTH_URL = `${API_BASE_URL}/login`;
export const API_VINCULO_URL = `${API_BASE_URL}/api/vinculos`;