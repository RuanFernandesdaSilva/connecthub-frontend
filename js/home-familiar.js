import { API_VINCULO_URL } from './config.js';

let html5QrCodeScanner = null;

/**
 * Obtém as informações da sessão do usuário logado.
 */
function getSessaoUsuario() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const idFamiliar = usuario.id || localStorage.getItem('userId');
  const tipo = (usuario.tipo || localStorage.getItem('userTipo') || '').toUpperCase().replace('ROLE_', '');
  return { usuario, idFamiliar, tipo };
}

// 1. INICIALIZAÇÃO DA PÁGINA E CONTROLE DE MODAIS
document.addEventListener('DOMContentLoaded', () => {
  const { idFamiliar } = getSessaoUsuario();

  if (!idFamiliar) {
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

    // Trata se o QR Code for JSON
    if (decodedText.startsWith('{')) {
      const parsed = JSON.parse(decodedText);
      idIdoso = parsed.idIdoso || parsed.id;
    } 
    // Trata se o QR Code for uma URL contendo parâmetro
    else if (decodedText.includes('?')) {
      const urlParams = new URLSearchParams(decodedText.split('?')[1]);
      idIdoso = urlParams.get('idIdoso') || urlParams.get('id') || decodedText;
    }

    const idIdosoParsed = parseInt(idIdoso, 10);
    if (isNaN(idIdosoParsed)) {
      throw new Error('ID do idoso inválido');
    }

    const { idFamiliar } = getSessaoUsuario();

    exibirStatusScanner(`QR Code lido com sucesso! Estabelecendo vínculo...`, 'info');

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
  // Ignora o loop silencioso de busca por frames do scanner
}

// Fechamento e destruição da instância da câmera
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
  window.location.href = 'auth.html';
}

// Exposição explícita para manipuladores inline no HTML (onclick)
window.abrirModalVinculo = abrirModalVinculo;
window.fecharModalVinculo = fecharModalVinculo;
window.redirecionarVinculo = redirecionarVinculo;
window.iniciarLeitorQrCode = iniciarLeitorQrCode;
window.fecharScannerQrCode = fecharScannerQrCode;
window.mostrarAvisoEmBreve = mostrarAvisoEmBreve;
window.navegarPara = navegarPara;
window.fazerLogout = fazerLogout;