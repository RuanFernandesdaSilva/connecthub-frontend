import { API_BASE_URL, API_AUTH_URL } from './config.js';

// Cache dos elementos do DOM
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const btnTabLogin = document.getElementById('btnTabLogin');
const btnTabRegister = document.getElementById('btnTabRegister');
const btnCheckSession = document.getElementById('btnCheckSession');
const btnLogout = document.getElementById('btnLogout');
const msgDiv = document.getElementById('responseMessage');

/**
 * Exibe mensagem de feedback para o usuário.
 */
function showMessage(text, isSuccess) {
  if (msgDiv) {
    msgDiv.textContent = text;
    msgDiv.className = `message ${isSuccess ? 'success' : 'error'}`;
    msgDiv.style.display = 'block';
  }
}

/**
 * Oculta o painel de mensagens.
 */
function hideMessage() {
  if (msgDiv) {
    msgDiv.style.display = 'none';
    msgDiv.textContent = '';
  }
}

/**
 * Alterna entre as abas de Login e Cadastro.
 */
function switchTab(tab) {
  hideMessage();

  if (tab === 'login') {
    loginForm?.classList.remove('hidden');
    registerForm?.classList.add('hidden');
    btnTabLogin?.classList.add('active');
    btnTabRegister?.classList.remove('active');
  } else {
    loginForm?.classList.add('hidden');
    registerForm?.classList.remove('hidden');
    btnTabLogin?.classList.remove('active');
    btnTabRegister?.classList.add('active');
  }
}

/**
 * Redireciona o usuário para a Home correspondente.
 */
function redirecionarParaHome(tipo, id) {
  const perfil = (tipo || '').toUpperCase().replace('ROLE_', '');
  if (perfil === 'IDOSO') {
    window.location.href = `home-idoso.html?id=${id}&tipo=IDOSO`;
  } else {
    window.location.href = `home-familiar.html?id=${id}&tipo=FAMILIAR`;
  }
}

// Event Listeners das Abas e Botões
btnTabLogin?.addEventListener('click', () => switchTab('login'));
btnTabRegister?.addEventListener('click', () => switchTab('register'));
btnCheckSession?.addEventListener('click', checkSession);
btnLogout?.addEventListener('click', logout);

// 1. EXECUTA O CADASTRO DE USUÁRIO
registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage();

  const submitBtn = registerForm.querySelector('button[type="submit"]');
  
  const nome = document.getElementById('regNome')?.value.trim();
  const email = document.getElementById('regEmail')?.value.trim();
  const senha = document.getElementById('regSenha')?.value;
  const telefone = document.getElementById('regTelefone')?.value.trim();
  const perfil = document.getElementById('regPerfil')?.value;

  if (!nome || !email || !senha || !perfil) {
    showMessage('Por favor, preencha todos os campos obrigatórios.', false);
    return;
  }

  const bodyData = {
    nome,
    email,
    senha,
    telefone: telefone || null,
    telegramChatId: null,
    perfil
  };

  try {
    if (submitBtn) submitBtn.disabled = true;

    const response = await fetch(`${API_BASE_URL}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(bodyData)
    });

    let msgText = '';
    try {
      const jsonRes = await response.json();
      msgText = jsonRes.mensagem || jsonRes.message || 'Operação concluída.';
    } catch {
      msgText = await response.text();
    }

    if (response.ok || response.status === 201) {
      showMessage(msgText || 'Cadastro realizado com sucesso!', true);
      registerForm.reset();
      setTimeout(() => switchTab('login'), 1500);
    } else {
      showMessage(msgText || 'Erro ao realizar cadastro.', false);
    }
  } catch (error) {
    console.error('Erro no cadastro:', error);
    showMessage('Erro ao conectar com o servidor Spring Boot!', false);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

// 2. EXECUTA O LOGIN DE USUÁRIO
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage();

  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const email = document.getElementById('loginEmail')?.value.trim();
  const senha = document.getElementById('loginSenha')?.value;

  if (!email || !senha) {
    showMessage('Informe o e-mail e a senha.', false);
    return;
  }

  try {
    if (submitBtn) submitBtn.disabled = true;

    const response = await fetch(API_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, senha })
    });

    if (response.ok) {
      const responseData = await response.json();

      const userId = responseData.id;
      const userTipo = (responseData.tipo || responseData.perfil || '').toUpperCase().replace('ROLE_', '');
      const userNome = responseData.nome || 'Usuário';

      localStorage.setItem('userId', userId);
      localStorage.setItem('userTipo', userTipo);
      localStorage.setItem('userNome', userNome);

      let telegramConectado = Boolean(responseData.telegramConectado);

      try {
        const statusRes = await fetch(`${API_BASE_URL}/usuarios/${userId}/status-telegram`, {
          method: 'GET',
          credentials: 'include'
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          telegramConectado = Boolean(statusData.telegramConectado);
        }
      } catch (errStatus) {
        console.warn('Não foi possível verificar status do Telegram:', errStatus);
      }

      const dadosSessao = {
        id: userId,
        nome: userNome,
        tipo: userTipo,
        telegramConectado: telegramConectado
      };
      localStorage.setItem('usuario', JSON.stringify(dadosSessao));

      showMessage('Login realizado com sucesso! Entrando...', true);

      setTimeout(() => {
        if (telegramConectado) {
          redirecionarParaHome(userTipo, userId);
        } else {
          window.location.href = `telegram.html?id=${userId}&tipo=${userTipo}`;
        }
      }, 1000);

    } else {
      let msgText = '';
      try {
        const jsonRes = await response.json();
        msgText = jsonRes.mensagem || jsonRes.message;
      } catch {
        msgText = await response.text();
      }
      showMessage(msgText || 'E-mail ou senha incorretos.', false);
    }
  } catch (error) {
    console.error('Erro no login:', error);
    showMessage('Erro de conexão ao efetuar login.', false);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

// 3. VERIFICA SESSÃO ATIVA
async function checkSession() {
  try {
    const response = await fetch(API_AUTH_URL, {
      method: 'GET',
      credentials: 'include'
    });

    const sessionPanel = document.getElementById('sessionPanel');
    const sessionDetails = document.getElementById('sessionDetails');

    if (response.ok) {
      const infoText = await response.text();
      if (sessionDetails) sessionDetails.textContent = infoText;
      if (sessionPanel) sessionPanel.classList.remove('hidden');
    } else {
      if (sessionPanel) sessionPanel.classList.add('hidden');
    }
  } catch (error) {
    console.warn('Não foi possível validar sessão ativa:', error);
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
    console.error('Erro ao encerrar sessão no servidor:', error);
  } finally {
    localStorage.clear();
    showMessage('Sessão encerrada com sucesso.', true);
    const sessionPanel = document.getElementById('sessionPanel');
    if (sessionPanel) sessionPanel.classList.add('hidden');
  }
}

// Exposição global limpa para o escopo window
window.logout = logout;
window.checkSession = checkSession;

// Executa verificação inicial de sessão
checkSession();