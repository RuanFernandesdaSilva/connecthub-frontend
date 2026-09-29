import { API_BASE_URL, API_AUTH_URL } from './config.js';

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const btnTabLogin = document.getElementById('btnTabLogin');
const btnTabRegister = document.getElementById('btnTabRegister');
const btnCheckSession = document.getElementById('btnCheckSession');
const btnLogout = document.getElementById('btnLogout');
const msgDiv = document.getElementById('responseMessage');

async function parseResponseBody(response) {
  const rawText = await response.text();
  if (!rawText) return { data: null, text: '' };

  try {
    const json = JSON.parse(rawText);
    return { data: json, text: rawText };
  } catch {
    return { data: null, text: rawText };
  }
}

function showMessage(text, isSuccess) {
  if (msgDiv) {
    msgDiv.textContent = text;
    msgDiv.className = `message ${isSuccess ? 'success' : 'error'}`;
    msgDiv.style.display = 'block';
  }
}

function hideMessage() {
  if (msgDiv) {
    msgDiv.style.display = 'none';
    msgDiv.textContent = '';
  }
}

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

function redirecionarParaHome(tipo, id) {
  const perfil = (tipo || '').toUpperCase().replace('ROLE_', '');
  if (perfil === 'IDOSO') {
    window.location.href = `home-idoso.html?id=${id}&tipo=IDOSO`;
  } else {
    window.location.href = `home-familiar.html?id=${id}&tipo=FAMILIAR`;
  }
}

btnTabLogin?.addEventListener('click', () => switchTab('login'));
btnTabRegister?.addEventListener('click', () => switchTab('register'));
btnCheckSession?.addEventListener('click', checkSession);
btnLogout?.addEventListener('click', logout);

// CADASTRO DE USUÁRIO (Ajustado para API_AUTH_URL + '/register')
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

    // Rota alterada de `${API_BASE_URL}/usuarios` para `${API_AUTH_URL}/register`
    const response = await fetch(`${API_AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(bodyData)
    });

    const { data: jsonRes, text: rawText } = await parseResponseBody(response);
    const msgText = jsonRes?.mensagem || jsonRes?.message || rawText;

    if (response.ok || response.status === 201) {
      showMessage(msgText || 'Cadastro realizado com sucesso!', true);
      registerForm.reset();
      setTimeout(() => switchTab('login'), 1500);
    } else {
      showMessage(msgText || 'Erro ao realizar cadastro.', false);
    }
  } catch (error) {
    console.error('Erro no cadastro:', error);
    showMessage('Erro ao conectar com o servidor (O Render pode estar acordando). Tente novamente.', false);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

// LOGIN
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

    const { data: responseData, text: rawText } = await parseResponseBody(response);

    if (response.ok) {
      const userId = responseData?.id;
      const userTipo = (responseData?.tipo || responseData?.perfil || '').toUpperCase().replace('ROLE_', '');
      const userNome = responseData?.nome || 'Usuário';

      localStorage.setItem('userId', userId);
      localStorage.setItem('userTipo', userTipo);
      localStorage.setItem('userNome', userNome);

      let telegramConectado = Boolean(responseData?.telegramConectado);

      try {
        const statusRes = await fetch(`${API_BASE_URL}/usuarios/${userId}/status-telegram`, {
          method: 'GET',
          credentials: 'include'
        });
        if (statusRes.ok) {
          const { data: statusData } = await parseResponseBody(statusRes);
          if (statusData) {
            telegramConectado = Boolean(statusData.telegramConectado);
          }
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
      const msgText = responseData?.mensagem || responseData?.message || rawText;

      if (response.status === 401) {
        showMessage('E-mail ou senha incorretos.', false);
      } else {
        showMessage(msgText || `Erro no login (${response.status})`, false);
      }
    }
  } catch (error) {
    console.error('Erro no login:', error);
    showMessage('Erro ao conectar com o servidor. Verifique sua conexão.', false);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

async function checkSession() {
  try {
    const response = await fetch(API_AUTH_URL, {
      method: 'GET',
      credentials: 'include'
    });

    const sessionPanel = document.getElementById('sessionPanel');
    const sessionDetails = document.getElementById('sessionDetails');

    if (response.ok) {
      const { text: infoText } = await parseResponseBody(response);
      if (sessionDetails) sessionDetails.textContent = infoText;
      if (sessionPanel) sessionPanel.classList.remove('hidden');
    } else {
      if (sessionPanel) sessionPanel.classList.add('hidden');
    }
  } catch (error) {
    console.warn('Não foi possível validar sessão ativa:', error);
  }
}

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

window.logout = logout;
window.checkSession = checkSession;

checkSession();