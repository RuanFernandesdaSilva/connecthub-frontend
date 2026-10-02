import { API_BASE_URL, API_VINCULO_URL, API_AUTH_URL } from './config.js';

let html5QrCodeScanner = null;

/**
 * Função utilitária para encerrar a sessão/janela no Telegram WebApp ou Navegador.
 */
function fecharEFinalizarWebApp() {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
    window.Telegram.WebApp.close();
  } else {
    window.location.href = 'index.html';
  }
}

/**
 * Obtém e consolida as informações da sessão do usuário.
 */
function getSessaoUsuario() {
  const urlParams = new URLSearchParams(window.location.search);
  const idUrl = urlParams.get('id');
  const tipoUrl = urlParams.get('tipo');

  const idSalvo = localStorage.getItem('userId');

  if (idUrl && idSalvo && idUrl !== idSalvo) {
    console.warn('Novo usuário detectado na URL! Limpando cache do usuário anterior...');
    localStorage.clear();
  }

  if (idUrl) {
    const usuarioUrl = {
      id: parseInt(idUrl, 10),
      tipo: (tipoUrl || 'FAMILIAR').toUpperCase().replace('ROLE_', '')
    };

    localStorage.setItem('userId', idUrl);
    localStorage.setItem('userTipo', usuarioUrl.tipo);
    localStorage.setItem('usuario', JSON.stringify(usuarioUrl));

    window.history.replaceState({}, document.title, window.location.pathname);

    return { usuario: usuarioUrl, idFamiliar: idUrl, tipo: usuarioUrl.tipo };
  }

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const idFamiliar = usuario.id || localStorage.getItem('userId');
  const tipo = (usuario.tipo || localStorage.getItem('userTipo') || '').toUpperCase().replace('ROLE_', '');

  return { usuario, idFamiliar, tipo };
}

// 1. INICIALIZAÇÃO DA PÁGINA
document.addEventListener('DOMContentLoaded', async () => {
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }

  let sessao = getSessaoUsuario();

  try {
    const res = await fetch(API_AUTH_URL, { method: 'GET', credentials: 'include' });
    if (res.ok) {
      const usuarioApi = await res.json();
      if (usuarioApi && usuarioApi.id) {
        localStorage.setItem('userId', usuarioApi.id);
        localStorage.setItem('userTipo', usuarioApi.tipo || 'FAMILIAR');
        localStorage.setItem('usuario', JSON.stringify(usuarioApi));
        sessao = getSessaoUsuario();
      }
    }
  } catch (e) {
    console.warn('Servidor offline ou sem sessão de cookie. Mantendo sessão via ID local/URL.');
  }

  if (!sessao.idFamiliar) {
    redirecionarParaLogin();
    return;
  }

  fecharModalVinculo();
  fecharScannerQrCode(true);

  if (typeof window.carregarDadosPerfil === 'function') {
    window.carregarDadosPerfil();
  }

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', fazerLogout);
  }
});

async function carregarDadosPerfil() {
  const { idFamiliar, usuario } = getSessaoUsuario();

  const elemNome = document.getElementById('userName');
  const elemAvatar = document.getElementById('userAvatar');

  if (elemNome) {
    elemNome.textContent = usuario.nome || `Familiar #${idFamiliar}`;
  }

  if (elemAvatar && (usuario.fotoUrl || usuario.imagemUrl)) {
    elemAvatar.src = usuario.fotoUrl || usuario.imagemUrl;
  }

  await carregarIdososVinculados(idFamiliar);
}

async function carregarIdososVinculados(idFamiliar) {
  const container = document.getElementById('listaIdososVinculados');
  if (!container) return;

  const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=Idoso&background=cbd5e0&color=fff';

  try {
    const endpoints = [
      `${API_BASE_URL}/api/vinculos/familiar/${idFamiliar}/idosos`,
      `${API_BASE_URL}/api/vinculos/familiar/${idFamiliar}`,
      `${API_BASE_URL}/vinculos/familiar/${idFamiliar}`
    ];

    let response = null;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        if (res.ok) {
          response = res;
          break;
        }
      } catch (err) {
        console.warn(`Tentativa falhou para endpoint: ${url}`);
      }
    }

    if (response && response.ok) {
      const dados = await response.json();

      if (!Array.isArray(dados) || dados.length === 0) {
        container.innerHTML = '<p style="color: #666;">Nenhum idoso vinculado ainda.</p>';
        return;
      }

      container.innerHTML = dados.map(item => {
        const idoso = item.idoso || item.usuario || item;

        const nome = idoso.nome || item.nomeIdoso || item.nome || 'Idoso';
        const idExibicao = idoso.id || item.idIdoso || item.id || '--';
        const foto = idoso.fotoUrl || idoso.imagemUrl || item.fotoIdosoUrl || item.fotoUrl || DEFAULT_AVATAR;

        return `
          <div class="card-idoso" style="border: 1px solid #cbd5e0; padding: 10px 15px; border-radius: 8px; background: #f8fafc; display: flex; align-items: center; gap: 10px;">
            <img src="${foto}" alt="${nome}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">
            <div>
              <strong style="display: block; font-size: 0.95rem; color: #2d3748;">${nome}</strong>
              <small style="color: #64748b;">ID: ${idExibicao}</small>
            </div>
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = '<p style="color: #666;">Nenhum idoso vinculado ainda.</p>';
    }
  } catch (error) {
    console.error('Erro ao carregar idosos vinculados:', error);
    container.innerHTML = '<p style="color: #e53e3e;">Erro ao carregar vínculos.</p>';
  }
}

// 2. MODAL DE OPÇÕES DE VÍNCULO
function abrirModalVinculo() {
  const modal = document.getElementById('modalOpcoesVinculo');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

function fecharModalVinculo() {
  const modal = document.getElementById('modalOpcoesVinculo');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

function redirecionarVinculo(tipo) {
  fecharModalVinculo();
  window.location.href = `vinculo.html?aba=${tipo}`;
}

// 3. LEITOR DE QR CODE
function iniciarLeitorQrCode() {
  fecharModalVinculo();

  const modalScanner = document.getElementById('modalScanner');
  if (modalScanner) {
    modalScanner.classList.remove('hidden');
    modalScanner.style.display = 'flex';
  }

  if (html5QrCodeScanner) return;

  if (typeof Html5QrcodeScanner !== 'undefined') {
    html5QrCodeScanner = new Html5QrcodeScanner("qr-reader", {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      rememberLastUsedCamera: true
    });

    html5QrCodeScanner.render(onScanSuccess, onScanError);
  } else {
    exibirStatusScanner('Biblioteca de QR Code não carregada no navegador.', 'erro');
  }
}

async function onScanSuccess(decodedText) {
  try {
    let idIdoso = null;
    const rawText = decodedText.trim();

    // 1. Caso o QR Code seja um JSON
    if (rawText.startsWith('{') && rawText.endsWith('}')) {
      const parsed = JSON.parse(rawText);
      idIdoso = parsed.idIdoso || parsed.idosoId || parsed.id || parsed.userId;
    } 
    // 2. Caso o QR Code seja uma URL ou parâmetro (ex: qrcode.html?id=8 ou ?idIdoso=8)
    else if (rawText.includes('?')) {
      const queryString = rawText.split('?')[1];
      const urlParams = new URLSearchParams(queryString);
      idIdoso = urlParams.get('id') || urlParams.get('idIdoso') || urlParams.get('idosoId');
    }
    // 3. Caso o QR Code contenha apenas números ou texto como "ID: 8"
    else {
      const match = rawText.match(/\d+/);
      if (match) {
        idIdoso = match[0];
      }
    }

    const idIdosoParsed = parseInt(idIdoso, 10);
    if (!idIdoso || isNaN(idIdosoParsed)) {
      throw new Error('Não foi possível identificar o ID numérico do idoso no QR Code.');
    }

    const { idFamiliar } = getSessaoUsuario();

    exibirStatusScanner('QR Code lido com sucesso! Estabelecendo vínculo...', 'info');

    const response = await fetch(`${API_VINCULO_URL}/qrcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        idFamiliar: parseInt(idFamiliar, 10),
        idIdoso: idIdosoParsed
      })
    });

    if (response.ok) {
      exibirStatusScanner('Vínculo realizado com sucesso!', 'sucesso');

      // Atualização imediata do grid de idosos na DOM
      if (idFamiliar) {
        await carregarIdososVinculados(idFamiliar);
      }

      setTimeout(async () => {
        await fecharScannerQrCode(true);
      }, 1200);
    } else {
      const erroText = await response.text();
      exibirStatusScanner(`Erro ao vincular: ${erroText || 'Solicitação recusada pelo servidor.'}`, 'erro');
    }

  } catch (e) {
    console.error('Erro de leitura do QR Code:', e);
    exibirStatusScanner('Formato do QR Code inválido ou idoso não identificado.', 'erro');
  }
}

function onScanError(errorMessage) {
  // Loop silencioso da busca por quadros de câmeras
}

async function fecharScannerQrCode(esconderModal = true) {
  if (esconderModal) {
    const modalScanner = document.getElementById('modalScanner');
    if (modalScanner) {
      modalScanner.classList.add('hidden');
      modalScanner.style.display = 'none';
    }
  }

  if (html5QrCodeScanner) {
    try {
      await html5QrCodeScanner.clear();
    } catch (err) {
      console.warn('Erro ao encerrar câmera:', err);
    } finally {
      html5QrCodeScanner = null;
    }
  }
}

function exibirStatusScanner(texto, tipo) {
  const statusDiv = document.getElementById('statusVinculoScanner');
  if (statusDiv) {
    statusDiv.textContent = texto;
    statusDiv.className = `alert alert-${tipo}`;
    statusDiv.classList.remove('hidden');
  }
}

// 4. NAVEGAÇÃO E LOGOUT
function mostrarAvisoEmBreve(modulo) {
  alert(`O módulo de ${modulo} estará disponível em breve!`);
}

function navegarPara(url) {
  window.location.href = url;
}

async function fazerLogout() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    await fetch(`${API_AUTH_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
      signal: controller.signal
    }).catch(err => console.warn('Requisição de logout expirou ou falhou:', err));

    clearTimeout(timeoutId);
  } catch (e) {
    console.warn('Erro ao encerrar sessão no servidor:', e);
  } finally {
    localStorage.clear();
    sessionStorage.clear();
    fecharEFinalizarWebApp();
  }
}

function redirecionarParaLogin() {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = 'index.html';
}

// Exposição global para chamadas inline HTML (onclick)
window.carregarDadosPerfil = carregarDadosPerfil;
window.carregarIdososVinculados = carregarIdososVinculados;
window.abrirModalVinculo = abrirModalVinculo;
window.fecharModalVinculo = fecharModalVinculo;
window.redirecionarVinculo = redirecionarVinculo;
window.iniciarLeitorQrCode = iniciarLeitorQrCode;
window.fecharScannerQrCode = fecharScannerQrCode;
window.mostrarAvisoEmBreve = mostrarAvisoEmBreve;
window.navegarPara = navegarPara;
window.fazerLogout = fazerLogout;
window.fecharEFinalizarWebApp = fecharEFinalizarWebApp;