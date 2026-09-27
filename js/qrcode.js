// js/qrcode.js
import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  inicializarTelaQRCode();
});

function inicializarTelaQRCode() {
  const urlParams = new URLSearchParams(window.location.search);
  let ididoso = urlParams.get('id');

  // Fallbacks de busca de ID
  if (!ididoso || ididoso === 'undefined' || ididoso === 'null') {
    ididoso = localStorage.getItem('userId');
  }

  const usuarioRaw = localStorage.getItem('usuario');
  let nomeIdoso = 'Idoso';

  if (usuarioRaw) {
    try {
      const usuario = JSON.parse(usuarioRaw);
      if (usuario.nome) nomeIdoso = usuario.nome;
      if ((!ididoso || ididoso === 'undefined' || ididoso === 'null') && usuario.id) {
        ididoso = usuario.id;
      }
    } catch (e) {
      console.warn('Erro ao ler dados da sessão local');
    }
  }

  const elNome = document.getElementById('idosoNome');
  const elId = document.getElementById('idosoIdDisplay');

  if (elNome) elNome.textContent = nomeIdoso;

  // Se não houver ID válido, exibe mensagem tratada
  if (!ididoso || ididoso === 'undefined' || ididoso === 'null') {
    if (elId) elId.textContent = "Não encontrado";
    const container = document.getElementById('qrcodeContainer');
    if (container) {
      container.innerHTML = '<p style="color: #e53e3e; font-weight: bold; padding: 15px;">Sessão não identificada.<br>Por favor, volte e faça login novamente.</p>';
    }
    return;
  }

  if (elId) elId.textContent = ididoso;
  
  // Chama a integração enviando o token
  carregarQrCodeDoJava(ididoso);
}

async function carregarQrCodeDoJava(idosoId) {
  const imgElement = document.getElementById('qrCodeImg');
  const container = document.getElementById('qrcodeContainer');

  try {
    const response = await fetch(`${API_BASE_URL}/api/qrcode/${idosoId}`, {
      method: 'GET',
      credentials: 'include' // Garante que o cookie JSESSIONID é enviado
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const imageBlob = await response.blob();
    const imageObjectURL = URL.createObjectURL(imageBlob);

    if (imgElement) {
      imgElement.src = imageObjectURL;
    }
  } catch (err) {
    console.error('Falha ao obter QR Code do Java:', err);
    if (container) {
      container.innerHTML = '<p style="color: #e53e3e; font-size: 0.9rem; padding: 10px;">Acesso não autorizado (401).<br>Por favor, faça login novamente no sistema.</p>';
    }
  }
}

function voltarParaHome() {
  window.location.href = 'home-idoso.html';
}

// Exposição global das funções utilizadas por manipuladores de eventos no HTML
window.voltarParaHome = voltarParaHome;