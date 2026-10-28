import { API_BASE_URL } from './config.js';

let idosoId = null;
let intervalTimer = null;
let dosesLista = [];

const MAPA_CORES = {
  'VERMELHO': '#ff3b30', 'RED': '#ff3b30',
  'AZUL': '#0093b2', 'BLUE': '#0093b2',
  'AMARELO': '#ffdc52', 'YELLOW': '#ffdc52',
  'VERDE': '#00be63', 'GREEN': '#00be63',
  'ROXO': '#d175f0', 'PURPLE': '#d175f0',
  'LARANJA': '#ff7315', 'ORANGE': '#ff7315',
  'CIANO': '#3ee2eb', 'CYAN': '#3ee2eb',
  'MARROM': '#7a4300', 'BROWN': '#7a4300',
  'CINZA': '#929292', 'GREY': '#929292'
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
    } catch (e) {
      console.warn('Falha ao ler objeto usuario do localStorage', e);
    }
  }

  if (!idosoId || idosoId === 'undefined') {
    idosoId = localStorage.getItem('userId');
  }

  if (!idosoId || idosoId === 'undefined') {
    console.error('ID do idoso não encontrado na sessão.');
    window.location.href = 'index.html';
    return;
  }

  carregarDoses();
}

async function carregarDoses() {
  const containerDoses = document.getElementById('listaDoses');
  const gridGavetas = document.getElementById('gridGavetas');

  try {
    const res = await fetchAutenticado(`${API_BASE_URL}/doses/idoso/${idosoId}`);
    
    if (res.ok) {
      dosesLista = await res.json();
      
      if (!Array.isArray(dosesLista) || dosesLista.length === 0) {
        if (containerDoses) {
          containerDoses.innerHTML = '<div class="card"><p style="color: #4a5568; text-align: center;">🎉 Nenhuma dose pendente no momento!</p></div>';
        }
        if (gridGavetas) {
          gridGavetas.innerHTML = '<p style="color: #718096; grid-column: span 3; text-align: center;">Nenhuma gaveta cadastrada.</p>';
        }
        const bannerTempo = document.getElementById('gerenciadorTempo');
        if (bannerTempo) bannerTempo.style.display = 'none';
        return;
      }

      // Ordena cronologicamente por horário
      dosesLista.sort((a, b) => new Date(a.horarioProgramado) - new Date(b.horarioProgramado));

      renderizarGavetas(dosesLista);
      renderizarCardsDoses();
      iniciarContagemRegressiva();
    } else {
      console.error(`Erro na API (${res.status}):`, await res.text());
      if (containerDoses) {
        containerDoses.innerHTML = `<p style="color: #e53e3e; text-align: center;">Não foi possível carregar suas doses. (Erro ${res.status})</p>`;
      }
      if (gridGavetas) {
        gridGavetas.innerHTML = '<p style="color: #e53e3e; grid-column: span 3; text-align: center;">Erro nos dados das gavetas.</p>';
      }
    }
  } catch (err) {
    console.error('Erro de conexão ao carregar doses:', err);
    if (containerDoses) {
      containerDoses.innerHTML = '<p style="color: #e53e3e; text-align: center;">Erro de conexão com o servidor.</p>';
    }
    if (gridGavetas) {
      gridGavetas.innerHTML = '<p style="color: #e53e3e; grid-column: span 3; text-align: center;">Erro de conexão.</p>';
    }
  }
}

function renderizarGavetas(doses) {
  const grid = document.getElementById('gridGavetas');
  if (!grid) return;

  if (!Array.isArray(doses) || doses.length === 0) {
    grid.innerHTML = '<p style="color: #718096; grid-column: span 3; text-align: center;">Nenhuma gaveta em uso.</p>';
    return;
  }

  const gavetasUnicas = {};
  doses.forEach(d => {
    // Mapeamento seguro das propriedades vindas do backend DTO
    const cor = (d.corCaixa || d.cor || 'CINZA').toUpperCase();
    const letra = (d.identificadorCaixa || d.identificador || d.letra || '?').toUpperCase();
    const chave = `${cor}_${letra}`;

    if (!gavetasUnicas[chave]) {
      gavetasUnicas[chave] = { 
        cor, 
        letra, 
        medicamento: d.nomeMedicamento || d.medicamentoNome || 'Medicamento' 
      };
    }
  });

  grid.innerHTML = Object.values(gavetasUnicas).map(g => {
    return `
      <div class="gaveta-item gaveta-cor-${g.cor}" title="${g.medicamento}">
        ${g.letra}
      </div>
    `;
  }).join('');
}

function renderizarCardsDoses() {
  const container = document.getElementById('listaDoses');
  if (!container) return;

  const agora = new Date();

  container.innerHTML = dosesLista.map(dose => {
    const idDoseReal = dose.id || dose.idDose;
    const cor = (dose.corCaixa || dose.cor || 'CINZA').toUpperCase();
    const hexCor = MAPA_CORES[cor] || '#929292';
    const letra = (dose.identificadorCaixa || dose.identificador || dose.letra || '-').toUpperCase();
    
    const horarioData = new Date(dose.horarioProgramado);
    const horarioFormatado = isNaN(horarioData.getTime()) ? '--:--' : horarioData.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const diffMs = horarioData - agora;
    const diffMinutos = Math.floor(diffMs / 60000);

    const eUrgente = diffMinutos <= 30 && diffMinutos >= -120;
    const classeUrgencia = eUrgente ? 'destaque-urgente' : '';

    const nomeMed = dose.nomeMedicamento || dose.medicamentoNome || 'Medicamento';
    const qtd = dose.quantidadePorDose || dose.quantidade || 1;
    const unidade = dose.unidade ? dose.unidade.toLowerCase() : 'dose';

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
          <h3 style="margin: 0; color: #1a202c;">💊 ${nomeMed}</h3>
        </div>

        <p style="color: #4a5568; font-size: 0.95rem; margin-bottom: 8px;">
          Dose: <strong>${qtd} ${unidade}</strong>
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

    const proxima = dosesLista[0];
    const dataProxima = new Date(proxima.horarioProgramado);
    const diffGeral = dataProxima - agora;

    const banner = document.getElementById('gerenciadorTempo');
    const clock = document.getElementById('clockRegressivo');
    const nomeRemedio = document.getElementById('proximoNomeRemedio');

    if (banner && clock && nomeRemedio) {
      banner.style.display = 'block';
      const nomeMed = proxima.nomeMedicamento || proxima.medicamentoNome || 'Medicamento';
      const qtd = proxima.quantidadePorDose || proxima.quantidade || 1;
      const unid = proxima.unidade || 'dose';
      const letra = proxima.identificadorCaixa || proxima.identificador || '-';

      nomeRemedio.textContent = `💊 ${nomeMed} (${qtd} ${unid}) - Gaveta ${letra}`;

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