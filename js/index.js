// js/auth.js
import { API_BASE_URL, API_AUTH_URL } from './config.js';

// Alternar entre abas de Login e Cadastro
function switchTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const btnLogin = document.getElementById('btnTabLogin');
  const btnRegister = document.getElementById('btnTabRegister');
  hideMessage();

  if (tab === 'login') {
    loginForm?.classList.remove('hidden');
    registerForm?.classList.add('hidden');
    btnLogin?.classList.add('active');
    btnRegister?.classList.remove('active');
  } else {
    loginForm?.classList.add('hidden');
    registerForm?.classList.remove('hidden');
    btnLogin?.classList.remove('active');
    btnRegister?.classList.add('active');
  }
}

function showMessage(text, isSuccess) {
  const msgDiv = document.getElementById('responseMessage');
  if (msgDiv) {
    msgDiv.textContent = text;
    msgDiv.className = `message ${isSuccess ? 'success' : 'error'}`;
    msgDiv.style.display = 'block';
  }
}

function hideMessage() {
  const msgDiv = document.getElementById('responseMessage');
  if (msgDiv) msgDiv.style.display = 'none';
}

// Função para direcionar para a Home correspondente ao perfil
function redirecionarParaHome(tipo, id) {
  const perfil = (tipo || '').toUpperCase().replace('ROLE_', '');
  if (perfil === 'IDOSO') {
    window.location.href = `home-idoso.html?id=${id}&tipo=IDOSO`;
  } else {
    window.location.href = `home-familiar.html?id=${id}&tipo=FAMILIAR`;
  }
}

// Listeners dos botões de alternar abas
document.getElementById('btnTabLogin')?.addEventListener('click', () => switchTab('login'));
document.getElementById('btnTabRegister')?.addEventListener('click', () => switchTab('register'));

// 1. EXECUTA O CADASTRO
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage();

  const bodyData = {
    nome: document.getElementById('regNome').value,
    email: document.getElementById('regEmail').value,
    senha: document.getElementById('regSenha').value,
    telefone: document.getElementById('regTelefone').value,
    telegramChatId: null,
    perfil: document.getElementById('regPerfil').value
  };

  try {
    const response = await fetch(`${API_AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(bodyData)
    });

    const msgText = await response.text();

    if (response.status === 201) {
      showMessage(msgText, true);
      document.getElementById('registerForm').reset();
      setTimeout(() => switchTab('login'), 1500);
    } else {
      showMessage(msgText, false);
    }
  } catch (error) {
    showMessage('Erro ao conectar com a aplicação Spring Boot!', false);
  }
});

// 2. EXECUTA O LOGIN COM REDIRECIONAMENTO INTELIGENTE E COOKIE DE SESSÃO
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage();

  const bodyData = {
    email: document.getElementById('loginEmail').value,
    senha: document.getElementById('loginSenha').value
  };

  try {
    const response = await fetch(API_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(bodyData)
    });

    if (response.ok) {
      const responseData = await response.json();
      
      const userId = responseData.id;
      const userTipo = (responseData.tipo || responseData.perfil || '').toUpperCase().replace('ROLE_', '');
      const userNome = responseData.nome || 'Usuário';

      // 1. Salva os dados básicos no localStorage
      localStorage.setItem('userId', userId);
      localStorage.setItem('userTipo', userTipo);
      localStorage.setItem('userNome', userNome);

      // 2. Consulta no Backend se o Telegram JÁ está conectado no Banco de Dados
      let telegramConectado = Boolean(responseData.telegramConectado);

      try {
        const statusRes = await fetch(`${API_BASE_URL}/usuarios/${userId}/status-telegram`, {
          method: 'GET',
          credentials: 'include'
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          telegramConectado = statusData.telegramConectado;
        }
      } catch (errStatus) {
        console.warn('Não foi possível verificar status atualizado do Telegram:', errStatus);
      }

      // 3. Atualiza o objeto completo de sessão
      const dadosSessao = {
        id: userId,
        nome: userNome,
        tipo: userTipo,
        telegramConectado: telegramConectado
      };
      localStorage.setItem('usuario', JSON.stringify(dadosSessao));

      showMessage('Login realizado com sucesso! Entrando...', true);

      // 4. ROTEAMENTO INTELIGENTE
      setTimeout(() => {
        if (telegramConectado) {
          redirecionarParaHome(userTipo, userId);
        } else {
          window.location.href = `telegram.html?id=${userId}&tipo=${userTipo}`;
        }
      }, 1000);

    } else {
      const msgText = await response.text();
      showMessage(msgText || 'E-mail ou senha incorretos.', false);
    }
  } catch (error) {
    console.error('Erro no login:', error);
    showMessage('Erro de conexão ao efetuar login.', false);
  }
});

// 3. VERIFICA A SESSÃO ATIVA
async function checkSession() {
  try {
    const response = await fetch(API_AUTH_URL, {
      method: 'GET',
      credentials: 'include'
    });

    if (response.ok) {
      const infoText = await response.text();
      const sessionDetails = document.getElementById('sessionDetails');
      const sessionPanel = document.getElementById('sessionPanel');
      
      if (sessionDetails) sessionDetails.textContent = infoText;
      if (sessionPanel) sessionPanel.classList.remove('hidden');

    } else {
      const sessionPanel = document.getElementById('sessionPanel');
      if (sessionPanel) sessionPanel.classList.add('hidden');
    }
  } catch (error) {
    console.error('Falha ao verificar sessão', error);
  }
}

// 4. LOGOUT
async function logout() {
  try {
    await fetch(`${API_AUTH_URL}/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Erro ao realizar o logout no servidor.', error);
  } finally {
    localStorage.clear();
    showMessage('Sessão encerrada com sucesso.', true);
    const sessionPanel = document.getElementById('sessionPanel');
    if (sessionPanel) sessionPanel.classList.add('hidden');
  }
}

// Exposição global para escopos de eventos HTML se necessário
window.logout = logout;

checkSession();