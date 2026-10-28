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
            <p style="font-size: 1.2rem; color: #4a5568;">🎉 Nenhuma gaveta/dose cadastrada para hoje!</p>
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
    const cor = (dose.corCaixa || dose.cor || 'CINZA').toUpperCase();
    const letra = (dose.identificadorCaixa || dose.identificador || dose.letra || '?').toUpperCase();
    const statusDose = (dose.status || 'PENDENTE').toUpperCase();

    const horarioProgramado = new Date(dose.horarioProgramado);
    const diffMinutos = Math.floor((horarioProgramado - agora) / 60000);

    let iconeStatus = '⏳';
    let classeStatus = 'status-PENDENTE';
    let classeDestaque = '';

    // Lógica dos Status Reais
    if (statusDose === 'CONCLUIDO' || statusDose === 'TOMADO' || dose.confirmado) {
      iconeStatus = '✓';
      classeStatus = 'status-TOMADO';
    } else if (diffMinutos < -15) {
      // Passou mais de 15 min do horário = Atrasado
      iconeStatus = '✕';
      classeStatus = 'status-ATRASADO';
    } else if (diffMinutos <= 30 && diffMinutos >= -15) {
      // Faltam até 30 min ou está dentro da tolerância = Hora de Tomar
      iconeStatus = '⚠️';
      classeStatus = 'status-HORA';
      classeDestaque = 'destaque-hora';
    } else {
      // Faltam mais de 30 min = Pendente futuro
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
      carregarDosesEGavetas(); // Recarrega para atualizar o status visual para ✓
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

document.getElementById('btnTomarDose').addEventListener('click', confirmarTomadaDose);

window.abrirModalConfirmacao = abrirModalConfirmacao;
window.fecharModal = fecharModal;
window.voltarParaHome = voltarParaHome;

document.addEventListener('DOMContentLoaded', inicializar);