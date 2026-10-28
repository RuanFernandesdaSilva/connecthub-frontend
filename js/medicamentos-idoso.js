import { API_BASE_URL } from './config.js';

let idosoId = null;
let intervalTimer = null;
let dosesLista = [];

const MAPA_CORES = {
  'VERMELHO': '#e53e3e', 'RED': '#e53e3e',
  'AZUL': '#0083a0', 'BLUE': '#0083a0',
  'AMARELO': '#f6e05e', 'YELLOW': '#f6e05e',
  'VERDE': '#38a169', 'GREEN': '#38a169',
  'ROXO': '#b76eeb', 'PURPLE': '#b76eeb',
  'LARANJA': '#dd6b20', 'ORANGE': '#dd6b20',
  'CIANO': '#38bdf8', 'CYAN': '#38bdf8',
  'MARROM': '#744210', 'BROWN': '#744210',
  'CINZA': '#718096', 'GREY': '#718096'
};

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

  if (!idosoId) {
    idosoId = localStorage.getItem('userId');
  }

  if (!idosoId) {
    window.location.href = 'index.html';
    return;
  }

  carregarDoses();
}

async function carregarDoses() {
  const container = document.getElementById('listaDoses');
  try {
    const res = await fetchAutenticado(`${API_BASE_URL}/doses/idoso/${idosoId}`);
    if (res.ok) {
      dosesLista = await res.json();
      if (!Array.isArray(dosesLista) || dosesLista.length === 0) {
        container.innerHTML = '<div class="card"><p style="color: #4a5568; text-align: center;">🎉 Nenhuma dose pendente no momento!</p></div>';
        document.getElementById('gerenciadorTempo').style.display = 'none';
        renderizarGavetas([]);
        return;
      }

      // Ordena cronologicamente do horário mais próximo para o mais distante
      dosesLista.sort((a, b) => new Date(a.horarioProgramado) - new Date(b.horarioProgramado));

      renderizarGavetas(dosesLista);
      renderizarCardsDoses();
      iniciarContagemRegressiva();
    }
  } catch (err) {
    console.error('Erro ao carregar doses:', err);
    container.innerHTML = '<p style="color: #e53e3e; text-align: center;">Erro ao buscar informações das doses.</p>';
  }
}

function renderizarGavetas(doses) {
  const grid = document.getElementById('gridGavetas');
  if (!grid) return;

  if (doses.length === 0) {
    grid.innerHTML = '<p style="color: #718096; grid-column: span 3; text-align: center;">Nenhuma gaveta em uso.</p>';
    return;
  }

  // Filtra gavetas únicas agrupadas por cor + letra/identificador
  const gavetasUnicas = {};
  doses.forEach(d => {
    const cor = d.corCaixa ? d.corCaixa.toUpperCase() : 'CINZA';
    const letra = d.identificadorCaixa || '?';
    const chave = `${cor}_${letra}`;
    if (!gavetasUnicas[chave]) {
      gavetasUnicas[chave] = { cor, letra, medicamento: d.nomeMedicamento };
    }
  });

  grid.innerHTML = Object.values(gavetasUnicas).map(g => {
    const hexCor = MAPA_CORES[g.cor] || '#718096';
    const corTexto = (g.cor === 'AMARELO' || g.cor === 'YELLOW') ? '#1a202c' : '#ffffff';
    return `
      <div class="gaveta-item" style="background-color: ${hexCor}; color: ${corTexto};" title="${g.medicamento}">
        ${g.letra}
      </div>
    `;
  }).join('');
}

function renderizarCardsDoses() {
  const container = document.getElementById('listaDoses');
  const agora = new Date();

  container.innerHTML = dosesLista.map((dose, index) => {
    const idDoseReal = dose.id || dose.idDose;
    const cor = dose.corCaixa ? dose.corCaixa.toUpperCase() : 'CINZA';
    const hexCor = MAPA_CORES[cor] || '#718096';
    const letra = dose.identificadorCaixa || '-';
    const horarioData = new Date(dose.horarioProgramado);
    const horarioFormatado = horarioData.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const diffMs = horarioData - agora;
    const diffMinutos = Math.floor(diffMs / 60000);

    const eUrgente = diffMinutos <= 30 && diffMinutos >= -120;
    const classeUrgencia = eUrgente ? 'destaque-urgente' : '';

    return `
      <div class="dose-card cor-${cor} ${classeUrgencia}" id="dose-card-${idDoseReal}">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 1.3rem; font-weight: bold; color: #2d3748;">⏰ ${horarioFormatado}h</span>
          <span class="time-badge ${eUrgente ? 'urgente' : ''}" id="badge-timer-${idDoseReal}">
            Calculando...
          </span>
        </div>

        <div style="display: flex; align-items: center; margin: 10px 0;">
          <span class="badge-gaveta" style="background-color: ${hexCor};">${letra}</span>
          <h3 style="margin: 0; color: #1a202c;">💊 ${dose.nomeMedicamento}</h3>
        </div>

        <p style="color: #4a5568; font-size: 0.95rem; margin-bottom: 8px;">
          Dose: <strong>${dose.quantidadePorDose} ${dose.unidade ? dose.unidade.toLowerCase() : ''}</strong>
        </p>

        <button class="btn-confirmar" onclick="confirmarDose(${idDoseReal})">
          ✅ Já Tomei
        </button>
      </div>
    `;
  }).join('');
}

function iniciarContagemRegressiva() {
  if (intervalTimer) clearInterval(intervalTimer);

  const atualizarRelogios = () => {
    const agora = new Date();

    if (!dosesLista || dosesLista.length === 0) return;

    // A próxima dose é sempre a primeira da lista ordenada
    const proxima = dosesLista[0];
    const dataProxima = new Date(proxima.horarioProgramado);
    const diffGeral = dataProxima - agora;

    const banner = document.getElementById('gerenciadorTempo');
    const clock = document.getElementById('clockRegressivo');
    const nomeRemedio = document.getElementById('proximoNomeRemedio');

    if (banner && clock && nomeRemedio) {
      banner.style.display = 'block';
      nomeRemedio.textContent = `💊 ${proxima.nomeMedicamento} (${proxima.quantidadePorDose} ${proxima.unidade || ''}) - Gaveta ${proxima.identificadorCaixa || ''}`;

      if (diffGeral <= 0) {
        clock.textContent = "HORA DE TOMAR!";
        banner.classList.add('urgente');
      } else {
        clock.textContent = formatarTempoMs(diffGeral);
        if (diffGeral <= 30 * 60 * 1000) {
          banner.classList.add('urgente');
        } else {
          banner.classList.remove('urgente');
        }
      }
    }

    // Atualiza individualmente o contador no badge de cada card
    dosesLista.forEach(dose => {
      const idReal = dose.id || dose.idDose;
      const elBadge = document.getElementById(`badge-timer-${idReal}`);
      if (elBadge) {
        const diff = new Date(dose.horarioProgramado) - agora;
        if (diff <= 0) {
          elBadge.textContent = "⚠️ Atrasado / No horário";
          elBadge.classList.add('urgente');
        } else {
          elBadge.textContent = `Faltam ${formatarTempoMs(diff)}`;
          if (diff <= 30 * 60 * 1000) {
            elBadge.classList.add('urgente');
          } else {
            elBadge.classList.remove('urgente');
          }
        }
      }
    });
  };

  atualizarRelogios();
  intervalTimer = setInterval(atualizarRelogios, 1000);
}

function formatarTempoMs(ms) {
  const totalSegundos = Math.floor(ms / 1000);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  const pad = (n) => String(n).padStart(2, '0');
  if (horas > 0) {
    return `${pad(horas)}h ${pad(minutos)}m ${pad(segundos)}s`;
  }
  return `${pad(minutos)}m ${pad(segundos)}s`;
}

async function confirmarDose(idDose) {
  if (!idDose || idDose === 'undefined' || isNaN(idDose)) {
    alert('Erro: ID da dose é inválido.');
    return;
  }

  try {
    const res = await fetchAutenticado(`${API_BASE_URL}/doses/${idDose}/confirmar`, {
      method: 'PUT'
    });

    if (res.ok) {
      alert('Dose confirmada com sucesso!');
      carregarDoses();
    } else {
      alert('Não foi possível confirmar a dose.');
    }
  } catch (err) {
    alert('Erro de conexão ao confirmar a dose.');
  }
}

function voltarParaHome() {
  window.location.href = 'home-idoso.html';
}

window.confirmarDose = confirmarDose;
window.voltarParaHome = voltarParaHome;
document.addEventListener('DOMContentLoaded', inicializar);