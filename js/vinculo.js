// js/vinculo.js
import { API_AUTH_URL, API_VINCULO_URL } from './config.js';

const DEFAULT_AVATAR = 'https://via.placeholder.com/80/cbd5e0/ffffff?text=User';

let usuarioLogado = null;

// Mensagens de Feedback
function showMessage(text, isSuccess) {
  const msgDiv = document.getElementById('responseMessage');
  if (msgDiv) {
    msgDiv.textContent = text;
    msgDiv.className = `alert ${isSuccess ? 'alert-sucesso' : 'alert-erro'}`;
    msgDiv.classList.remove('hidden');
  }
}

function hideMessage() {
  const msgDiv = document.getElementById('responseMessage');
  if (msgDiv) {
    msgDiv.classList.add('hidden');
  }
}

// Controle de Abas
function alternarAba(nomeAba, evt) {
  const painelAtivo = usuarioLogado?.perfil === 'IDOSO' ? 'painelIdoso' : 'painelFamiliar';
  const container = document.getElementById(painelAtivo);

  if (!container) return;

  container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  container.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const abaAlvo = document.getElementById(`aba-${nomeAba}`);
  if (abaAlvo) abaAlvo.classList.add('active');

  const targetEvent = evt || window.event;
  if (targetEvent && targetEvent.currentTarget) {
    targetEvent.currentTarget.classList.add('active');
  }

  if (nomeAba === 'pendentes-idoso') carregarPedidosPendentes();
  if (nomeAba === 'familiares-idoso') carregarFamiliaresAceitos();
  if (nomeAba === 'idosos-familiar') carregarIdososAceitos();
  if (nomeAba === 'qrcode-idoso') gerarQrCodeIdoso();
}

// 1. CARREGA A SESSÃO DO USUÁRIO LOGADO E AJUSTA A INTERFACE
async function inicializarTela() {
  try {
    const response = await fetch(API_AUTH_URL, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      exibirSessaoInvalida();
      return;
    }

    let isIdoso = false;
    let idUsuario = null;

    try {
      usuarioLogado = await response.json();
      idUsuario = usuarioLogado.id;
      isIdoso = usuarioLogado.perfil === 'IDOSO';

      const statusContainer = document.getElementById('sessionStatus');
      if (statusContainer) {
        statusContainer.innerHTML = `<strong>Sessão Ativa:</strong> ${usuarioLogado.nome} (${usuarioLogado.perfil})`;
      }
    } catch (e) {
      const sessionText = await response.text();
      isIdoso = sessionText.includes('IDOSO');
      const matchId = sessionText.match(/(?:ID:\s*|id=)(\d+)/i);
      if (matchId && matchId[1]) {
        idUsuario = parseInt(matchId[1], 10);
      }
      usuarioLogado = { id: idUsuario, perfil: isIdoso ? 'IDOSO' : 'FAMILIAR' };

      const statusContainer = document.getElementById('sessionStatus');
      if (statusContainer) {
        statusContainer.innerHTML = `<strong>Sessão Ativa:</strong><br>${sessionText}`;
      }
    }

    const painelIdoso = document.getElementById('painelIdoso');
    const painelFamiliar = document.getElementById('painelFamiliar');

    if (isIdoso) {
      if (painelIdoso) painelIdoso.classList.remove('hidden');
      if (painelFamiliar) painelFamiliar.classList.add('hidden');
      carregarPedidosPendentes();
      carregarFamiliaresAceitos();
    } else {
      if (painelFamiliar) painelFamiliar.classList.remove('hidden');
      if (painelIdoso) painelIdoso.classList.add('hidden');
      carregarIdososAceitos();
    }

  } catch (error) {
    console.error('Erro na validação da sessão:', error);
    exibirSessaoInvalida();
  }
}

function exibirSessaoInvalida() {
  const statusContainer = document.getElementById('sessionStatus');
  if (statusContainer) {
    statusContainer.innerHTML = '<p class="alert-erro">Você precisa estar logado para acessar esta página. <a href="index.html">Fazer Login</a></p>';
  }
}

// 2. FUNÇÕES DO IDOSO

async function carregarPedidosPendentes() {
  if (!usuarioLogado || !usuarioLogado.id) return;
  const container = document.getElementById('listaPendentes');
  if (!container) return;

  try {
    const response = await fetch(`${API_VINCULO_URL}/idoso/${usuarioLogado.id}/pendentes`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) return;

    const pendentes = await response.json();
    const badge = document.getElementById('badgePendentes');
    if (badge) badge.textContent = pendentes.length;

    container.innerHTML = '';

    if (!pendentes || pendentes.length === 0) {
      container.innerHTML = '<p class="empty-msg">Nenhuma solicitação de vínculo pendente.</p>';
      return;
    }

    pendentes.forEach(p => {
      const img = p.fotoFamiliarUrl || p.fotoUrl || DEFAULT_AVATAR;
      container.innerHTML += `
        <div class="user-card">
          <img src="${img}" alt="Foto">
          <div class="user-info">
            <h4>${p.nomeFamiliar}</h4>
            <p>${p.emailFamiliar}</p>
            <small>Solicitado em: ${p.dataSolicitacao ? new Date(p.dataSolicitacao).toLocaleDateString('pt-BR') : 'N/A'}</small>
          </div>
          <div class="card-actions">
            <button class="btn btn-sucesso" onclick="responderSolicitacao(${p.idVinculo}, true)">Aceitar</button>
            <button class="btn btn-perigo" onclick="responderSolicitacao(${p.idVinculo}, false)">Recusar</button>
          </div>
        </div>
      `;
    });
  } catch (error) {
    console.error('Erro ao carregar solicitações pendentes:', error);
  }
}

async function responderSolicitacao(vinculoId, aceito) {
  hideMessage();
  try {
    const response = await fetch(`${API_VINCULO_URL}/responder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ vinculoId, aceito })
    });

    const msg = await response.text();
    showMessage(msg, response.ok);

    if (response.ok) {
      carregarPedidosPendentes();
      carregarFamiliaresAceitos();
    }
  } catch (error) {
    showMessage('Erro ao responder à solicitação.', false);
  }
}

async function carregarFamiliaresAceitos() {
  if (!usuarioLogado || !usuarioLogado.id) return;
  const container = document.getElementById('listaFamiliaresAceitos');
  if (!container) return;

  try {
    const response = await fetch(`${API_VINCULO_URL}/idoso/${usuarioLogado.id}/familiares`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) return;

    const familiares = await response.json();
    renderizarUsuarios(familiares, container, 'Nenhum familiar vinculado ainda.');
  } catch (error) {
    console.error('Erro ao carregar familiares:', error);
  }
}

function gerarQrCodeIdoso() {
  if (!usuarioLogado || !usuarioLogado.id) return;
  const container = document.getElementById('qrcodeContainerIdoso');
  if (!container) return;

  container.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    new QRCode(container, {
      text: JSON.stringify({ idIdoso: usuarioLogado.id }),
      width: 160,
      height: 160,
      colorDark: "#2c3e50",
      colorLight: "#ffffff"
    });
  }
}

// 3. FUNÇÕES DO FAMILIAR

document.addEventListener('DOMContentLoaded', () => {
  inicializarTela();

  document.getElementById('formSolicitarVinculo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    if (!usuarioLogado) {
      showMessage('Usuário não autenticado.', false);
      return;
    }

    const idFamiliar = usuarioLogado.id;
    const idIdoso = parseInt(document.getElementById('inputIdosoId')?.value, 10);

    try {
      const response = await fetch(`${API_VINCULO_URL}/solicitar-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idFamiliar, idIdoso })
      });

      const msg = await response.text();
      showMessage(msg, response.ok);

      if (response.ok) {
        document.getElementById('formSolicitarVinculo').reset();
      }
    } catch (error) {
      showMessage('Erro ao solicitar vínculo.', false);
    }
  });

  document.getElementById('formQrCodeFamiliar')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();

    if (!usuarioLogado) {
      showMessage('Usuário não autenticado.', false);
      return;
    }

    const idFamiliar = usuarioLogado.id;
    const idIdoso = parseInt(document.getElementById('inputIdosoQr')?.value, 10);

    try {
      const response = await fetch(`${API_VINCULO_URL}/qrcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idFamiliar, idIdoso })
      });

      const msg = await response.text();
      showMessage(msg, response.ok);

      if (response.ok) {
        document.getElementById('formQrCodeFamiliar').reset();
        carregarIdososAceitos();
      }
    } catch (error) {
      showMessage('Erro ao ativar vínculo por QR Code.', false);
    }
  });
});

async function carregarIdososAceitos() {
  if (!usuarioLogado || !usuarioLogado.id) return;
  const container = document.getElementById('listaIdososAceitos');
  if (!container) return;

  try {
    const response = await fetch(`${API_VINCULO_URL}/familiar/${usuarioLogado.id}/idosos`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) return;

    const idosos = await response.json();
    renderizarUsuarios(idosos, container, 'Nenhum idoso vinculado até o momento.');
  } catch (error) {
    console.error('Erro ao carregar idosos:', error);
  }
}

// 4. FUNÇÃO AUXILIAR DE RENDERIZAÇÃO
function renderizarUsuarios(lista, container, mensagemVazia) {
  if (!container) return;
  container.innerHTML = '';

  if (!lista || lista.length === 0) {
    container.innerHTML = `<p class="empty-msg">${mensagemVazia}</p>`;
    return;
  }

  lista.forEach(user => {
    const img = user.fotoUrl || user.imagemUrl || DEFAULT_AVATAR;
    container.innerHTML += `
      <div class="user-card">
        <img src="${img}" alt="Foto">
        <div class="user-info">
          <h4>${user.nome}</h4>
          <p>${user.email}</p>
          <span class="status-tag status-ativo">Ativo</span>
        </div>
      </div>
    `;
  });
}

// Exposição global das funções chamadas por manipuladores de evento no HTML
window.alternarAba = alternarAba;
window.responderSolicitacao = responderSolicitacao;