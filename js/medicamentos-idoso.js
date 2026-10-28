import { API_BASE_URL } from './config.js';

let idosoId = null;
let doseSelecionadaId = null;

async function fetchAutenticado(url, options = {}) {
  options.credentials = 'include';
  const userIdSalvo = localStorage.getItem('userId');
  options.headers = {
    ...options.headers,
    'X-User-Id': userIdSalvo || ''
  };
  return await fetch(url, options);
}

function inicializar() {
  const usuarioRaw = localStorage.getItem('usuario');
  if (usuarioRaw) {
    try {
      const user = JSON.parse(usuarioRaw);
      idosoId = user.id;
    } catch (e) {}
  }

  if (!idosoId || idosoId === 'undefined') {
    idosoId = localStorage.getItem('userId');
  }

  if (!idosoId || idosoId === 'undefined') {
    window.location.href = 'index.html';
    return;
  }

  carregarDosesEGavetas();
}

async function carregarDosesEGavetas() {
  const grid = document.getElementById('gridGavetas');

  try {
    const res = await fetchAutenticado(`${API_BASE_URL}/doses/idoso/${idosoId}`);

    if (res.ok) {
      const doses = await res.json();

      if (!Array.isArray(doses) || doses.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: span 3; text-align: center; margin-top: 50px;">
            <p style="font-size: 1.2rem; color: #4a5568;">🎉 Nenhuma gaveta ou dose pendente para hoje!</p>
          </div>`;
        return;
      }

      renderizarGavetas(doses);
    } else {
      grid.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #e53e3e;">Erro ao carregar dados (${res.status}).</p>`;
    }
  } catch (err) {
    console.error('Erro ao buscar doses:', err);
    grid.innerHTML = '<p style="grid-column: span 3; text-align: center; color: #e53e3e;">Erro de conexão com o servidor.</p>';
  }
}

function renderizarGavetas(doses) {
  const grid = document.getElementById('gridGavetas');
  const agora = new Date();

  grid.innerHTML = doses.map(dose => {
    const idDose = dose.id || dose.idDose;

    // CAPTURA DA COR CADASTRADA NO REMÉDIO (Com Fallbacks do DTO)
    const corBruta = dose.corCaixa || dose.cor || (dose.medicamento && dose.medicamento.corCaixa) || 'CINZA';
    const cor = corBruta.toUpperCase().trim();

    // CAPTURA DA LETRA/NÚMERO CADASTRADO NO REMÉDIO (Com Fallbacks do DTO)
    const letraBruta = dose.identificadorCaixa || dose.identificador || dose.letra || (dose.medicamento && dose.medicamento.identificadorCaixa) || '?';
    const letra = letraBruta.toUpperCase().trim();

    const statusDose = (dose.status || 'PENDENTE').toUpperCase();

    const horarioProgramado = new Date(dose.horarioProgramado);
    const diffMinutos = Math.floor((horarioProgramado - agora) / 60000);

    let iconeStatus = '⏳';
    let classeStatus = 'status-PENDENTE';
    let classeDestaque = '';

    // Regras visuais de Status Real
    if (statusDose === 'CONCLUIDO' || statusDose === 'TOMADO' || dose.confirmado) {
      iconeStatus = '✓';
      classeStatus = 'status-TOMADO';
    } else if (diffMinutos < -15) {
      // Passou do horário = Atrasado (✕ vermelho)
      iconeStatus = '✕';
      classeStatus = 'status-ATRASADO';
    } else if (diffMinutos <= 30 && diffMinutos >= -15) {
      // Na janela do horário de tomar = Alerta (⚠️ pulsante)
      iconeStatus = '⚠️';
      classeStatus = 'status-HORA';
      classeDestaque = 'destaque-hora';
    } else {
      // Pendente futuro (⏳ relógio)
      iconeStatus = '⏳';
      classeStatus = 'status-PENDENTE';
    }

    return `
      <div class="gaveta-box bg-${cor} ${classeDestaque}" onclick="abrirModalConfirmacao(${idDose}, '${letra}', '${statusDose}')">
        <div class="status-badge ${classeStatus}">${iconeStatus}</div>
        <div class="gaveta-letra">${letra}</div>
      </div>
    `;
  }).join('');
}

function abrirModalConfirmacao(idDose, letra, statusAtual) {
  if (statusAtual === 'CONCLUIDO' || statusAtual === 'TOMADO') {
    alert('Esta dose já foi confirmada!');
    return;
  }

  doseSelecionadaId = idDose;
  const modal = document.getElementById('modalConfirmacao');
  const subtitulo = document.getElementById('modalSubtitulo');

  subtitulo.textContent = `Deseja confirmar a tomada da Gaveta ${letra}?`;
  modal.classList.remove('hidden');
}

function fecharModal() {
  document.getElementById('modalConfirmacao').classList.add('hidden');
  doseSelecionadaId = null;
}

async function confirmarTomadaDose() {
  if (!doseSelecionadaId) return;

  try {
    const res = await fetchAutenticado(`${API_BASE_URL}/doses/${doseSelecionadaId}/confirmar`, {
      method: 'PUT'
    });

    if (res.ok) {
      fecharModal();
      carregarDosesEGavetas(); // Recarrega para atualizar para ✓ verde e disparar a notificação no Telegram do familiar
    } else {
      alert('Não foi possível confirmar a dose no servidor.');
    }
  } catch (err) {
    alert('Erro de conexão ao confirmar a dose.');
  }
}

function voltarParaHome() {
  window.location.href = 'home-idoso.html';
}

// Event Listeners
const btnTomar = document.getElementById('btnTomarDose');
if (btnTomar) {
  btnTomar.addEventListener('click', confirmarTomadaDose);
}

window.abrirModalConfirmacao = abrirModalConfirmacao;
window.fecharModal = fecharModal;
window.voltarParaHome = voltarParaHome;

document.addEventListener('DOMContentLoaded', inicializar);