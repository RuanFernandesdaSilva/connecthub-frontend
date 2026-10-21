import { API_BASE_URL } from './config.js';

let familiarLogado = null;

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
      familiarLogado = JSON.parse(usuarioRaw);
    } catch (e) {}
  }

  const userId = familiarLogado?.id || localStorage.getItem('userId');
  if (!userId) {
    window.location.href = 'index.html';
    return;
  }

  carregarIdosos(userId);
  configurarEventos();
}

async function carregarIdosos(idFamiliar) {
  const select = document.getElementById('selectIdoso');
  try {
    const res = await fetchAutenticado(`${API_BASE_URL}/api/vinculos/familiar/${idFamiliar}/idosos`);
    if (res.ok) {
      const dados = await res.json();
      if (!Array.isArray(dados) || dados.length === 0) {
        select.innerHTML = '<option value="">Nenhum idoso vinculado encontrado</option>';
        return;
      }

      select.innerHTML = '<option value="">-- Selecione o Idoso --</option>' +
        dados.map(item => {
          const idoso = item.idoso || item;
          return `<option value="${idoso.id}">${idoso.nome || 'Idoso #' + idoso.id}</option>`;
        }).join('');
    }
  } catch (err) {
    console.error('Erro ao carregar idosos:', err);
  }
}

function configurarEventos() {
  const tipoTratamentoSelect = document.getElementById('tipoTratamento');
  const campoDuracao = document.getElementById('campoDuracao');
  const selectIdoso = document.getElementById('selectIdoso');

  tipoTratamentoSelect.addEventListener('change', (e) => {
    campoDuracao.style.display = e.target.value === 'CONTINUO' ? 'none' : 'flex';
  });

  selectIdoso.addEventListener('change', (e) => {
    if (e.target.value) {
      carregarHistorico(familiarLogado?.id || localStorage.getItem('userId'), e.target.value);
    }
  });

  document.getElementById('formMedicamento').addEventListener('submit', cadastrarMedicamento);
}

async function cadastrarMedicamento(e) {
  e.preventDefault();

  const idIdoso = document.getElementById('selectIdoso').value;
  if (!idIdoso) {
    alert('Selecione um idoso.');
    return;
  }

  const tipo = document.getElementById('tipoTratamento').value;

  const dto = {
    idIdoso: parseInt(idIdoso, 10),
    nome: document.getElementById('nome').value,
    dosagem: document.getElementById('dosagem').value,
    unidade: document.getElementById('unidade').value,
    quantidadePorDose: parseFloat(document.getElementById('quantidadePorDose').value),
    primeiroHorario: document.getElementById('primeiroHorario').value,
    intervaloHoras: parseInt(document.getElementById('intervaloHoras').value, 10),
    corCaixa: document.getElementById('corCaixa').value,
    identificadorCaixa: document.getElementById('identificadorCaixa').value,
    tipoTratamento: tipo,
    unidadeDuracao: tipo === 'CONTINUO' ? null : document.getElementById('unidadeDuracao').value,
    valorDuracao: tipo === 'CONTINUO' ? null : parseInt(document.getElementById('valorDuracao').value, 10)
  };

  try {
    const res = await fetchAutenticado(`${API_BASE_URL}/medicamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto)
    });

    if (res.ok) {
      alert('Medicamento cadastrado com sucesso!');
      document.getElementById('formMedicamento').reset();
      carregarHistorico(familiarLogado?.id || localStorage.getItem('userId'), idIdoso);
    } else {
      const errText = await res.text();
      alert(`Erro ao cadastrar: ${errText}`);
    }
  } catch (err) {
    alert('Erro de conexão com o servidor.');
  }
}

async function carregarHistorico(idFamiliar, idIdoso) {
  const container = document.getElementById('listaHistorico');
  try {
    const res = await fetchAutenticado(`${API_BASE_URL}/historico-doses?idFamiliar=${idFamiliar}&idIdoso=${idIdoso}`);
    if (res.ok) {
      const historico = await res.json();
      if (!Array.isArray(historico) || historico.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 0.9rem;">Nenhuma dose confirmada recentemente.</p>';
        return;
      }

      container.innerHTML = historico.map(item => `
        <div style="border-bottom: 1px solid #e2e8f0; padding: 10px 0; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #2d3748;">${item.nomeMedicamento}</strong>
            <br>
            <small style="color: #718096;">Tomado em: ${new Date(item.horarioConfirmado).toLocaleString('pt-BR')}</small>
          </div>
          <span style="background: #c6f6d5; color: #22543d; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.8rem;">
            ✅ Tomado
          </span>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Erro ao buscar histórico:', err);
  }
}

function voltarParaHome() {
  window.location.href = 'home-familiar.html';
}

window.voltarParaHome = voltarParaHome;
document.addEventListener('DOMContentLoaded', inicializar);