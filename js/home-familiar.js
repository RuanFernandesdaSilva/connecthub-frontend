// js/home-familiar.js
import { API_VINCULO_URL } from './config.js';

let html5QrCodeScanner = null;

// Garantir que todos os modais iniciem FECHADOS assim que a página carregar
document.addEventListener('DOMContentLoaded', () => {
  fecharModalVinculo();
  fecharScannerQrCode(true);
  if (typeof carregarDadosPerfil === 'function') {
    carregarDadosPerfil();
  }
});

// ABRIR APENAS COM O CLIQUE DO USUÁRIO
function abrirModalVinculo() {
  const modal = document.getElementById('modalOpcoesVinculo');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

// FECHAR MODAL DE SELEÇÃO
function fecharModalVinculo() {
  const modal = document.getElementById('modalOpcoesVinculo');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

// REDIRECIONAR / AÇÕES
function redirecionarVinculo(tipo) {
  fecharModalVinculo();
  window.location.href = `vinculo.html?aba=${tipo}`;
}

// INICIAR CÂMERA SCANNER QR CODE (Somente no clique)
function iniciarLeitorQrCode() {
  fecharModalVinculo();

  const modalScanner = document.getElementById('modalScanner');
  if (modalScanner) {
    modalScanner.classList.remove('hidden');
    modalScanner.style.display = 'flex';
  }

  // Evita re-inicializar leitor já ativo
  if (html5QrCodeScanner) {
    return;
  }

  // Inicializa o leitor na div #qr-reader
  if (typeof Html5QrcodeScanner !== 'undefined') {
    html5QrCodeScanner = new Html5QrcodeScanner("qr-reader", {
      fps: 10,
      qrbox: { width: 220, height: 220 }
    });

    html5QrCodeScanner.render(onScanSuccess, onScanError);
  } else {
    exibirStatusScanner('Biblioteca de QR Code não carregada.', 'erro');
  }
}

// Leitura com sucesso do QR Code
async function onScanSuccess(decodedText) {
  try {
    let idIdoso = decodedText;
    
    // Tenta interpretar JSON se o QR Code for do formato {"idIdoso": X}
    if (decodedText.startsWith('{')) {
      const parsed = JSON.parse(decodedText);
      idIdoso = parsed.idIdoso || parsed.id;
    }

    exibirStatusScanner(`QR Code lido! Processando ID do Idoso: ${idIdoso}...`, 'info');

    // Envia o vínculo automático via API
    const response = await fetch(`${API_VINCULO_URL}/qrcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ idIdoso: parseInt(idIdoso, 10) })
    });

    if (response.ok) {
      exibirStatusScanner('Vínculo realizado com sucesso!', 'sucesso');
      setTimeout(() => {
        fecharScannerQrCode(true);
        window.location.reload();
      }, 1500);
    } else {
      const erro = await response.text();
      exibirStatusScanner(`Erro: ${erro}`, 'erro');
    }

  } catch (e) {
    exibirStatusScanner('Formato do QR Code inválido.', 'erro');
  }
}

function onScanError(errorMessage) {
  // Ignora erros contínuos de busca de quadro da câmera
}

// FECHAMENTO SEGURO DA CÂMERA E DO MODAL
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
      console.warn('Erro ao limpar leitor:', err);
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

// Exposição global para chamadas via atributo onclick no HTML
window.abrirModalVinculo = abrirModalVinculo;
window.fecharModalVinculo = fecharModalVinculo;
window.redirecionarVinculo = redirecionarVinculo;
window.iniciarLeitorQrCode = iniciarLeitorQrCode;
window.fecharScannerQrCode = fecharScannerQrCode;
window.mostrarAvisoEmBreve = mostrarAvisoEmBreve;
window.navegarPara = navegarPara;
window.fazerLogout = fazerLogout;