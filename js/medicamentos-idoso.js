import { API_BASE_URL } from './config.js';

let idosoId = null;

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
      const doses = await res.json();
      if (!Array.isArray(doses) || doses.length === 0) {
        container.innerHTML = '<div class="card"><p style="color: #4a5568;">🎉 Nenhuma dose pendente no momento!</p></div>';
        return;
      }

      container.innerHTML = doses.map(dose => {
        const cor = dose.corCaixa ? dose.corCaixa.toUpperCase() : 'PADRAO';
        const horario = new Date(dose.horarioProgramado).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
          <div class="dose-card cor-${cor}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 1.4rem; font-weight: bold; color: #2d3748;">⏰ ${horario}h</span>
              <span style="font-size: 0.85rem; font-weight: bold; color: #718096;">Caixa ${dose.corCaixa || ''} - ${dose.identificadorCaixa || ''}</span>
            </div>
            <h3 style="margin: 8px 0; color: #1a202c;">💊 ${dose.nomeMedicamento}</h3>
            <p style="color: #4a5568; font-size: 0.95rem;">
              Dose: <strong>${dose.quantidadePorDose} ${dose.unidade ? dose.unidade.toLowerCase() : ''}</strong>
            </p>
            <button class="btn-confirmar" onclick="confirmarDose(${dose.idDose})">
              ✅ Já Tomei
            </button>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Erro ao carregar doses:', err);
    container.innerHTML = '<p style="color: #e53e3e;">Erro ao buscar informações das doses.</p>';
  }
}

async function confirmarDose(idDose) {
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