// js/telegram.js
import { API_BASE_URL } from './config.js';

const CENTRAL_BOT_USERNAME = 'ConnectHubSpoke_bot'; 

let usuarioLogado = null;
let intervalPollingId = null;

function showMessage(text, isError = true) {
  const msgDiv = document.getElementById('responseMessage');
  if (msgDiv) {
    msgDiv.textContent = text;
    msgDiv.className = `message ${isError ? 'error' : 'success'}`;
    msgDiv.style.display = 'block';
  }
}

async function inicializarTelaTelegram() {
  const statusContainer = document.getElementById('statusUsuario');
  const btnTelegram = document.getElementById('btnConectarTelegram');

  // Recupera dados do localStorage
  const usuarioLocal = JSON.parse(localStorage.getItem('usuario') || '{}');
  const urlParams = new URLSearchParams(window.location.search);
  
  const userId = urlParams.get('id') || usuarioLocal.id || localStorage.getItem('userId');
  const userTipo = (urlParams.get('tipo') || usuarioLocal.tipo || localStorage.getItem('userTipo') || '').toUpperCase().replace('ROLE_', '');

  if (!userId || !userTipo) {
    if (statusContainer) {
      statusContainer.style.backgroundColor = '#fde8e8';
      statusContainer.style.color = '#e53e3e';
      statusContainer.style.borderColor = '#feb2b2';
      statusContainer.innerHTML = 'Você precisa estar logado. <a href="auth.html">Fazer Login</a>';
    }
    return;
  }

  usuarioLogado = {
    id: userId,
    tipo: userTipo,
    nome: usuarioLocal.nome || localStorage.getItem('userNome') || 'Usuário'
  };

  // Atualiza a interface
  if (statusContainer) {
    statusContainer.style.backgroundColor = '#e6fffa';
    statusContainer.style.color = '#234e52';
    statusContainer.style.borderColor = '#b2f5ea';
    statusContainer.innerHTML = `Sessão Ativa: <strong>${usuarioLogado.nome}</strong> (${usuarioLogado.tipo})`;
  }

  if (btnTelegram) {
    const tokenDeepLink = `${usuarioLogado.tipo}_${usuarioLogado.id}`;
    btnTelegram.href = `https://t.me/${CENTRAL_BOT_USERNAME}?start=${tokenDeepLink}`;
    btnTelegram.classList.remove('btn-disabled');
  }

  // INICIA O POLLING DE VERIFICAÇÃO AUTOMÁTICA
  iniciarPollingStatus(usuarioLogado.id, usuarioLogado.tipo);
}

// 2. POLLING A CADA 2.5s CONSULTANDO O BACKEND
function iniciarPollingStatus(userId, userTipo) {
  if (intervalPollingId) clearInterval(intervalPollingId);

  intervalPollingId = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/usuarios/${userId}/status-telegram`);
      if (res.ok) {
        const data = await res.json();
        
        if (data.telegramConectado) {
          clearInterval(intervalPollingId); // Para o polling

          // Atualiza a flag de conexão no localStorage
          const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
          usuario.telegramConectado = true;
          usuario.id = userId;
          usuario.tipo = userTipo;
          localStorage.setItem('usuario', JSON.stringify(usuario));

          showMessage('Telegram conectado com sucesso! Redirecionando...', false);

          // Redireciona definitivamente para a Home
          setTimeout(() => {
            if (userTipo === 'IDOSO') {
              window.location.href = `home-idoso.html?id=${userId}&tipo=IDOSO`;
            } else {
              window.location.href = `home-familiar.html?id=${userId}&tipo=FAMILIAR`;
            }
          }, 1200);
        }
      }
    } catch (error) {
      console.warn('Erro na consulta de polling do Telegram:', error);
    }
  }, 2500);
}

function voltarParaAplicativo() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const userTipo = (usuario.tipo || localStorage.getItem('userTipo') || '').toUpperCase().replace('ROLE_', '');

  if (userTipo === 'IDOSO') {
    window.location.href = 'home-idoso.html';
  } else if (userTipo === 'FAMILIAR') {
    window.location.href = 'home-familiar.html';
  } else {
    window.location.href = 'auth.html';
  }
}

document.addEventListener('DOMContentLoaded', inicializarTelaTelegram);

// Exposição global das funções necessárias para eventos do HTML
window.voltarParaAplicativo = voltarParaAplicativo;