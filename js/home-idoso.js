import { API_BASE_URL, API_AUTH_URL, API_VINCULO_URL } from './config.js';

const DEFAULT_AVATAR = 'https://via.placeholder.com/100/cbd5e0/ffffff?text=User';

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
 * Lê e consolida a sessão local do navegador ou vinda da URL.
 */
function carregarSessaoLocal() {
  const urlParams = new URLSearchParams(window.location.search);
  const idUrl = urlParams.get('id');
  const tipoUrl = urlParams.get('tipo');

  const idSalvo = localStorage.getItem('userId');

  if (idUrl && idSalvo && idUrl !== idSalvo) {
    console.warn('Novo usuário detectado na URL! Limpando cache do usuário anterior...');
    localStorage.clear();
  }

  if (idUrl) {
    usuarioLogado = {
      id: parseInt(idUrl, 10),
      nome: localStorage.getItem('userNome') || 'Idoso',
      tipo: (tipoUrl || 'IDOSO').toUpperCase()
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
    const tipoSolf = localStorage.getItem('userTipo');

    if (idSolf) {
      usuarioLogado = {
        id: parseInt(idSolf, 10),
        nome: nomeSolf || 'Idoso',
        tipo: tipoSolf || 'IDOSO'
      };
    }
  }
}

function parseSessaoTexto(texto) {
  const matchId = texto.match(/(?:ID:\s*|id=)(\d+)/i);
  const matchNome = texto.match(/(?:Nome:\s*|nome=)([^,\n]+)/i);

  return {
    id: matchId ? parseInt(matchId[1], 10) : null,
    nome: matchNome ? matchNome[1].trim() : 'Idoso',
    tipo: 'IDOSO'
  };
}

// 1. INICIALIZAÇÃO DA PÁGINA
async function inicializarHomeIdoso() {
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
          const textoSessao = await response.text();
          usuarioLogado = parseSessaoTexto(textoSessao);
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

  renderizarPerfil();
  carregarFamiliaresVinculados(usuarioLogado.id);
}

// 2. RENDERIZAÇÃO DO PERFIL DO IDOSO
function renderizarPerfil() {
  if (!usuarioLogado) return;

  const nomeElem = document.getElementById('userName');
  const avatarElem = document.getElementById('userAvatar');

  if (nomeElem) nomeElem.textContent = usuarioLogado.nome || 'Idoso';
  if (avatarElem) avatarElem.src = usuarioLogado.fotoUrl || usuarioLogado.imagemUrl || DEFAULT_AVATAR;
}

// 3. CARREGAR FAMILIARES VINCULADOS
async function carregarFamiliaresVinculados(idosoId) {
  const container = document.getElementById('listaFamiliaresVinculados');
  if (!container) return;

  try {
    const endpointVinculos = API_VINCULO_URL 
      ? `${API_VINCULO_URL}/idoso/${idosoId}`
      : `${API_BASE_URL}/api/vinculos/idoso/${idosoId}`;

    const response = await fetch(endpointVinculos, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    if (response.ok) {
      const familiares = await response.json();

      if (!Array.isArray(familiares) || familiares.length === 0) {
        container.innerHTML = '<p style="color: #777;">Nenhum familiar vinculado ainda.</p>';
        return;
      }

      container.innerHTML = familiares.map(fam => {
        const nomeFormatado = escapeHtml(fam.nome || 'Familiar');
        const telFormatado = escapeHtml(fam.telefone || 'Não informado');
        const fotoUrl = fam.fotoUrl || fam.imagemUrl || DEFAULT_AVATAR;

        return `
          <div class="card-familiar" style="border: 1px solid #cbd5e0; padding: 10px 15px; border-radius: 8px; background: #f8fafc; display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <img src="${fotoUrl}" alt="${nomeFormatado}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">
            <div>
              <strong style="display: block; font-size: 0.95rem; color: #2d3748;">${nomeFormatado}</strong>
              <small style="color: #64748b;">Tel: ${telFormatado}</small>
            </div>
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = '<p style="color: #777;">Nenhum familiar vinculado ainda.</p>';
    }
  } catch (error) {
    console.error('Erro ao carregar familiares do idoso:', error);
    container.innerHTML = '<p style="color: #e53e3e;">Erro ao carregar vínculos.</p>';
  }
}

// 4. ROTAS E NAVEGAÇÃO
function irParaQRCode() {
  let idDestino = null;

  if (usuarioLogado && usuarioLogado.id) {
    idDestino = usuarioLogado.id;
  } else {
    carregarSessaoLocal();
    if (usuarioLogado && usuarioLogado.id) {
      idDestino = usuarioLogado.id;
    }
  }

  if (idDestino) {
    localStorage.setItem('userId', idDestino);
    window.location.href = `qrcode.html?id=${idDestino}`;
  } else {
    mostrarAvisoEmBreve('Identificação do usuário não encontrada. Faça login novamente.');
  }
}

function navegarPara(pagina) {
  window.location.href = pagina;
}

function mostrarAvisoEmBreve(modulo) {
  const msgDiv = document.getElementById('responseMessage');
  if (msgDiv) {
    msgDiv.textContent = `O módulo de "${modulo}" estará disponível em breve!`;
    msgDiv.className = 'alert alert-info';
    msgDiv.classList.remove('hidden');

    setTimeout(() => {
      msgDiv.classList.add('hidden');
    }, 3000);
  } else {
    alert(`O módulo de "${modulo}" estará disponível em breve!`);
  }
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

document.addEventListener('DOMContentLoaded', () => {
  inicializarHomeIdoso();

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', fazerLogout);
  }
});

// Exposição global para chamadas inline HTML (onclick)
window.irParaQRCode = irParaQRCode;
window.navegarPara = navegarPara;
window.mostrarAvisoEmBreve = mostrarAvisoEmBreve;
window.fazerLogout = fazerLogout;
window.fecharEFinalizarWebApp = fecharEFinalizarWebApp;