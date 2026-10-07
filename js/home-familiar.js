import { API_BASE_URL, API_VINCULO_URL, API_AUTH_URL } from './config.js';

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=Familiar&background=cbd5e0&color=fff';

let html5QrCodeScanner = null;
let usuarioLogado = null;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Encerra a sessão/janela no Telegram WebApp ou Navegador.
 */
function fecharEFinalizarWebApp() {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
    window.Telegram.WebApp.close();
  } else {
    window.location.href = 'index.html';
  }
}

/**
 * Lê e consolida a sessão local (idêntico ao mecanismo do idoso)
 */
function carregarSessaoLocal() {
  const urlParams = new URLSearchParams(window.location.search);
  const idUrl = urlParams.get('id');
  const tipoUrl = urlParams.get('tipo');

  const idSalvo = localStorage.getItem('userId');

  if (idUrl && idSalvo && idUrl !== idSalvo) {
    console.warn('Novo usuário detectado na URL! Limpando cache anterior...');
    localStorage.clear();
  }

  if (idUrl) {
    usuarioLogado = {
      id: parseInt(idUrl, 10),
      nome: localStorage.getItem('userNome') || 'Familiar',
      fotoUrl: localStorage.getItem('userFoto') || null,
      tipo: (tipoUrl || 'FAMILIAR').toUpperCase().replace('ROLE_', '')
    };

    localStorage.setItem('userId', idUrl);
    localStorage.setItem('userTipo', usuarioLogado.tipo);
    localStorage.setItem('usuario', JSON.stringify(usuarioLogado));

    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  const usuarioSalvo = localStorage.getItem('usuario');
  if (usuarioSalvo) {
    try {
      usuarioLogado = JSON.parse(usuarioSalvo);
    } catch (e) {
      usuarioLogado = null;
    }
  }

  if (!usuarioLogado || !usuarioLogado.id) {
    const idSolf = localStorage.getItem('userId');
    const nomeSolf = localStorage.getItem('userNome');
    const fotoSolf = localStorage.getItem('userFoto');
    const tipoSolf = localStorage.getItem('userTipo');

    if (idSolf) {
      usuarioLogado = {
        id: parseInt(idSolf, 10),
        nome: nomeSolf || 'Familiar',
        fotoUrl: fotoSolf || null,
        tipo: tipoSolf || 'FAMILIAR'
      };
    }
  }
}

// 1. INICIALIZAÇÃO DA PÁGINA
async function inicializarHomeFamiliar() {
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }

  carregarSessaoLocal();

  if (!usuarioLogado || !usuarioLogado.id) {
    try {
      const response = await fetch(API_AUTH_URL, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        try {
          usuarioLogado = await response.json();
        } catch (e) {
          console.warn('Falha ao converter JSON da sessão');
        }

        if (usuarioLogado && usuarioLogado.id) {
          localStorage.setItem('userId', usuarioLogado.id);
          localStorage.setItem('usuario', JSON.stringify(usuarioLogado));
        }
      }
    } catch (error) {
      console.warn('Servidor indisponível:', error);
    }
  }

  if (!usuarioLogado || !usuarioLogado.id) {
    redirecionarParaLogin();
    return;
  }

  fecharModalVinculo();
  fecharScannerQrCode(true);

  renderizarPerfil();
  await carregarIdososVinculados(usuarioLogado.id);
}

// 2. RENDERIZAÇÃO DO PERFIL DO FAMILIAR (Idêntico ao Idoso)
function renderizarPerfil() {
  if (!usuarioLogado) return;

  const nomeElem = document.getElementById('userName');
  const avatarElem = document.getElementById('userAvatar');

  const foto = usuarioLogado.fotoUrl || 
               usuarioLogado.imagemUrl || 
               localStorage.getItem('userFoto') || 
               DEFAULT_AVATAR;

  const nome = usuarioLogado.nome || 
               localStorage.getItem('userNome') || 
               `Familiar #${usuarioLogado.id}`;

  if (nomeElem) nomeElem.textContent = nome;
  if (avatarElem) avatarElem.src = foto;
}

// 3. CARREGAR IDOSOS VINCULADOS
async function carregarIdososVinculados(idFamiliar) {
  const container = document.getElementById('listaIdososVinculados');
  if (!container) return;

  const AVATAR_IDOSO_PADRAO = 'https://ui-avatars.com/api/?name=Idoso&background=cbd5e0&color=fff';

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
        const foto = idoso.fotoUrl || idoso.imagemUrl || item.fotoIdosoUrl || item.fotoUrl || AVATAR_IDOSO_PADRAO;

        return `
          <div class="card-idoso" style="border: 1px solid #cbd5e0; padding: 10px 15px; border-radius: 8px; background: #f8fafc; display: flex; align-items: center; gap: 10px;">
            <img src="${foto}" alt="${escapeHtml(nome)}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">
            <div>
              <strong style="display: block; font-size: 0.95rem; color: #2d3748;">${escapeHtml(nome)}</strong>
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

// 4. MODAL DE OPÇÕES DE VÍNCULO
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

// 5. LEITOR DE QR CODE
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

    if (rawText.startsWith('{') && rawText.endsWith('}')) {
      const parsed = JSON.parse(rawText);
      idIdoso = parsed.idIdoso || parsed.idosoId || parsed.id || parsed.userId;
    } else if (rawText.includes('?')) {
      const queryString = rawText.split('?')[1];
      const urlParams = new URLSearchParams(queryString);
      idIdoso = urlParams.get('id') || urlParams.get('idIdoso') || urlParams.get('idosoId');
    } else {
      const match = rawText.match(/\d+/);
      if (match) idIdoso = match[0];
    }

    const idIdosoParsed = parseInt(idIdoso, 10);
    if (!idIdoso || isNaN(idIdosoParsed)) {
      throw new Error('Não foi possível identificar o ID numérico do idoso no QR Code.');
    }

    exibirStatusScanner('QR Code lido com sucesso! Estabelecendo vínculo...', 'info');

    const response = await fetch(`${API_VINCULO_URL}/qrcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        idFamiliar: parseInt(usuarioLogado.id, 10),
        idIdoso: idIdosoParsed
      })
    });

    if (response.ok) {
      exibirStatusScanner('Vínculo realizado com sucesso!', 'sucesso');

      if (usuarioLogado && usuarioLogado.id) {
        await carregarIdososVinculados(usuarioLogado.id);
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

function onScanError(errorMessage) {}

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

// 6. NAVEGAÇÃO E LOGOUT
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
    }).catch(err => console.warn('Logout falhou ou expirou:', err));

    clearTimeout(timeoutId);
  } catch (e) {
    console.warn('Erro no servidor:', e);
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

// INICIALIZAÇÃO VIA DOMCONTENTLOADED
document.addEventListener('DOMContentLoaded', async () => {
  await inicializarHomeFamiliar();

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', fazerLogout);
  }
});

// Exposição de funções para chamadas inline no HTML
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