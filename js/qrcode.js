import { API_BASE_URL } from './config.js';

let currentBlobUrl = null;

// 1. INICIALIZAÇÃO DA TELA
document.addEventListener('DOMContentLoaded', () => {
  inicializarTelaQRCode();
});

/**
 * Obtém o ID do idoso e dados do perfil salvos em sessão/URL.
 */
function obterDadosSessao() {
  const urlParams = new URLSearchParams(window.location.search);
  let ididoso = urlParams.get('id');

  // Filtra strings falsas de nulo/indefinido
  if (!ididoso || ididoso === 'undefined' || ididoso === 'null') {
    ididoso = localStorage.getItem('userId');
  }

  const usuarioRaw = localStorage.getItem('usuario');
  let nomeIdoso = localStorage.getItem('userNome') || 'Idoso';

  if (usuarioRaw) {
    try {
      const usuario = JSON.parse(usuarioRaw);
      if (usuario.nome) nomeIdoso = usuario.nome;
      if ((!ididoso || ididoso === 'undefined' || ididoso === 'null') && usuario.id) {
        ididoso = usuario.id;
      }
    } catch (e) {
      console.warn('Erro ao processar objeto de usuário do localStorage:', e);
    }
  }

  return { ididoso, nomeIdoso };
}

function inicializarTelaQRCode() {
  const { ididoso, nomeIdoso } = obterDadosSessao();

  const elNome = document.getElementById('idosoNome');
  const elId = document.getElementById('idosoIdDisplay');
  const container = document.getElementById('qrcodeContainer');

  if (elNome) elNome.textContent = nomeIdoso;

  // Validação de segurança do ID do idoso
  if (!ididoso || ididoso === 'undefined' || ididoso === 'null') {
    if (elId) elId.textContent = "Não encontrado";
    if (container) {
      container.innerHTML = `
        <div style="color: #e53e3e; font-weight: bold; padding: 15px; text-align: center;">
          <p>Sessão não identificada.</p>
          <p style="font-size: 0.85rem; font-weight: normal; color: #4a5568;">Por favor, faça login novamente para visualizar seu QR Code.</p>
        </div>
      `;
    }
    return;
  }

  if (elId) elId.textContent = ididoso;

  // Requisição do QR Code
  carregarQrCodeDoJava(ididoso);
}

// 2. BUSCA DO QR CODE JUNTO À API JAVA
async function carregarQrCodeDoJava(idosoId) {
  const imgElement = document.getElementById('qrCodeImg');
  const container = document.getElementById('qrcodeContainer');

  try {
    let response = await fetch(`${API_BASE_URL}/api/qrcode/${idosoId}`, {
      method: 'GET',
      credentials: 'include'
    });

    // Fallback caso a rota no Spring Boot não utilize a subpasta /api
    if (response.status === 404) {
      response = await fetch(`${API_BASE_URL}/qrcode/${idosoId}`, {
        method: 'GET',
        credentials: 'include'
      });
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('401_UNAUTHORIZED');
      }
      throw new Error(`HTTP_${response.status}`);
    }

    const imageBlob = await response.blob();

    // Revoga URL antiga para liberar memória do navegador
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }

    currentBlobUrl = URL.createObjectURL(imageBlob);

    if (imgElement) {
      imgElement.src = currentBlobUrl;
      imgElement.alt = `QR Code do Idoso ID ${idosoId}`;
      imgElement.style.display = 'block';
    }
  } catch (err) {
    console.error('Falha ao obter QR Code do servidor:', err);

    if (container) {
      if (err.message === '401_UNAUTHORIZED') {
        container.innerHTML = `
          <p style="color: #e53e3e; font-size: 0.9rem; padding: 10px; text-align: center;">
            Sessão expirada ou não autorizada (401).<br>
            <a href="auth.html" style="color: #3182ce; text-decoration: underline;">Clique aqui para fazer login</a>
          </p>
        `;
      } else {
        container.innerHTML = `
          <p style="color: #e53e3e; font-size: 0.9rem; padding: 10px; text-align: center;">
            Não foi possível carregar o QR Code no momento.<br>Tente novamente em instantes.
          </p>
        `;
      }
    }
  }
}

// 3. NAVEGAÇÃO
function voltarParaHome() {
  const usuarioRaw = localStorage.getItem('usuario');
  let userTipo = localStorage.getItem('userTipo');

  if (usuarioRaw) {
    try {
      const user = JSON.parse(usuarioRaw);
      userTipo = user.tipo || userTipo;
    } catch (e) {}
  }

  const perfil = (userTipo || '').toUpperCase().replace('ROLE_', '');
  
  if (perfil === 'FAMILIAR') {
    window.location.href = 'home-familiar.html';
  } else {
    window.location.href = 'home-idoso.html';
  }
}

// Exposição explícita para o manipulador no HTML (onclick="voltarParaHome()")
window.voltarParaHome = voltarParaHome;