import { API_VINCULO_URL, API_AUTH_URL } from './config.js';

let html5QrCodeScanner = null;

/**
 * Obtém e consolida as informações da sessão do usuário.
 * Prioriza parâmetros na URL (?id=...&tipo=...), caindo para localStorage se não existirem.
 */
function getSessaoUsuario() {
  const urlParams = new URLSearchParams(window.location.search);
  const idUrl = urlParams.get('id');
  const tipoUrl = urlParams.get('tipo');

  // 1. Veio via parâmetros de URL (Ex: Link vindo do Telegram)
  if (idUrl) {
    const usuarioUrl = {
      id: parseInt(idUrl, 10),
      tipo: (tipoUrl || 'FAMILIAR').toUpperCase().replace('ROLE_', '')
    };

    // Grava no localStorage do navegador para persistência contínua
    localStorage.setItem('userId', idUrl);
    localStorage.setItem('userTipo', usuarioUrl.tipo);
    localStorage.setItem('usuario', JSON.stringify(usuarioUrl));

    // Limpa a URL visualmente para manter a navegação limpa no navegador
    window.history.replaceState({}, document.title, window.location.pathname);

    return { usuario: usuarioUrl, idFamiliar: idUrl, tipo: usuarioUrl.tipo };
  }

  // 2. Fallback para o localStorage
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const idFamiliar = usuario.id || localStorage.getItem('userId');
  const tipo = (usuario.tipo || localStorage.getItem('userTipo') || '').toUpperCase().replace('ROLE_', '');

  return { usuario, idFamiliar, tipo };
}

// 1. INICIALIZAÇÃO DA PÁGINA
document.addEventListener('DOMContentLoaded', async () => {
  let sessao = getSessaoUsuario();

  // Tenta validar no servidor se houver cookie, mas NÃO faz logout se falhar e já houver ID local
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

  // Se não houver ID por nenhum meio, aí sim vai para a tela de login
  if (!sessao.idFamiliar) {
    fazerLogout();
    return;
  }

  fecharModalVinculo();
  fecharScannerQrCode(true);

  if (typeof window.carregarDadosPerfil === 'function') {
    window.carregarDadosPerfil();
  }
});

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

// Processamento do payload do QR Code
async function onScanSuccess(decodedText) {
  try {
    let idIdoso = decodedText;

    if (decodedText.startsWith('{')) {
      const parsed = JSON.parse(decodedText);
      idIdoso = parsed.idIdoso || parsed.id;
    } else if (decodedText.includes('?')) {
      const urlParams = new URLSearchParams(decodedText.split('?')[1]);
      idIdoso = urlParams.get('idIdoso') || urlParams.get('id') || decodedText;
    }

    const idIdosoParsed = parseInt(idIdoso, 10);
    if (isNaN(idIdosoParsed)) {
      throw new Error('ID do idoso inválido');
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
      setTimeout(async () => {
        await fecharScannerQrCode(true);
        window.location.reload();
      }, 1500);
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

// 4. NAVEGAÇÃO E UTILITÁRIOS
function mostrarAvisoEmBreve(modulo) {
  alert(`O módulo de ${modulo} estará disponível em breve!`);
}

function navegarPara(url) {
  window.location.href = url;
}

function fazerLogout() {
  localStorage.clear();
  window.location.href = 'index.html';
}

// Exposição global para chamadas inline HTML (onclick)
window.abrirModalVinculo = abrirModalVinculo;
window.fecharModalVinculo = fecharModalVinculo;
window.redirecionarVinculo = redirecionarVinculo;
window.iniciarLeitorQrCode = iniciarLeitorQrCode;
window.fecharScannerQrCode = fecharScannerQrCode;
window.mostrarAvisoEmBreve = mostrarAvisoEmBreve;
window.navegarPara = navegarPara;
window.fazerLogout = fazerLogout;