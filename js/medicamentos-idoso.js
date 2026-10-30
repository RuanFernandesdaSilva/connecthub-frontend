import { API_BASE_URL } from './config.js';

let idosoLogado = null;

const CORES_CAIXA = {
  VERMELHO: '#e53e3e',
  LARANJA: '#dd6b20',
  AMARELO: '#ecc94b',
  VERDE: '#38a169',
  AZUL: '#3182ce',
  ROXO: '#805ad5',
  MARROM: '#7b341e',
  BRANCO: '#e2e8f0',
  PRETO: '#1a202c'
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

async function inicializar() {
  console.log('🚀 Script medicamento-idoso.js iniciado!');
  
  const usuarioRaw = localStorage.getItem('usuario');
  if (usuarioRaw) {
    try {
      idosoLogado = JSON.parse(usuarioRaw);
    } catch (e) {
      console.warn('Aviso: Erro ao ler objeto usuario do localStorage:', e);
    }
  }

  const userId = idosoLogado?.id || localStorage.getItem('userId');
  console.log('📌 ID do Idoso identificado:', userId);

  if (!userId) {
    console.warn('⚠️ Nenhum ID de idoso encontrado no localStorage. Redirecionando...');
    window.location.href = 'index.html';
    return;
  }

  await carregarMedicamentosIdoso(userId);
}

async function carregarMedicamentosIdoso(idIdoso) {
  const container = document.getElementById('gridMedicamentos');
  if (!container) {
    console.error('❌ Elemento #gridMedicamentos não encontrado no HTML.');
    return;
  }

  const baseClean = (API_BASE_URL || '').replace(/\/$/, '');
  
  const endpoints = [
    `${baseClean}/api/medicamentos/idoso/${idIdoso}`,
    `${baseClean}/medicamentos/idoso/${idIdoso}`,
    `${baseClean}/api/medicamentos?idIdoso=${idIdoso}`,
    `${baseClean}/medicamentos?idIdoso=${idIdoso}`
  ];

  let medicamentos = null;
  let ultimoStatus = null;

  for (const url of endpoints) {
    try {
      console.log('🔎 Tentando conectar em:', url);
      const res = await fetchAutenticado(url);
      ultimoStatus = res.status;

      if (res.ok) {
        const data = await res.json();
        console.log('✅ Resposta obtida da API:', data);

        if (Array.isArray(data)) {
          medicamentos = data;
        } else if (Array.isArray(data?.medicamentos)) {
          medicamentos = data.medicamentos;
        } else if (Array.isArray(data?.content)) {
          medicamentos = data.content;
        }

        if (medicamentos !== null) break;
      }
    } catch (err) {
      console.warn(`⚠️ Falha na requisição para ${url}:`, err);
    }
  }

  if (medicamentos !== null) {
    if (medicamentos.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>🎉 Nenhum medicamento cadastrado para você no momento!</p>
        </div>`;
      return;
    }

    container.innerHTML = medicamentos.map(med => renderizarCardMedicamento(med)).join('');
    configurarBotoesTomar();
  } else {
    console.error('❌ Falha total: Nenhum endpoint respondeu 200 OK. Último status:', ultimoStatus);
    container.innerHTML = `
      <div class="empty-state">
        <p>⚠️ Não foi possível carregar seus medicamentos.</p>
        <small style="color: #a0aec0; display: block; margin-top: 8px;">
          Código de resposta da API: ${ultimoStatus || 'Erro de Conexão'}
        </small>
      </div>`;
  }
}

function renderizarCardMedicamento(med) {
  const chaveCor = (med.corCaixa || '').toUpperCase();
  const corHex = CORES_CAIXA[chaveCor] || '#4a5568';
  const corTexto = (chaveCor === 'AMARELO' || chaveCor === 'BRANCO') ? '#1a202c' : '#ffffff';

  const proximoHorario = med.primeiroHorario || med.proximoHorario
    ? new Date(med.primeiroHorario || med.proximoHorario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : 'No horário';

  return `
    <div class="med-card">
      <div class="caixa-bloco" style="background-color: ${corHex}; color: ${corTexto};">
        ${med.identificadorCaixa || '?'}
      </div>

      <div class="med-info">
        <h3>${med.nome || 'Medicamento sem nome'}</h3>
        <p><strong>Dose:</strong> ${med.quantidadePorDose || 1} ${med.unidade || ''} (${med.dosagem || ''})</p>
        
        <div class="med-horario">
          ⏰ Horário: ${proximoHorario}
        </div>
      </div>

      ${med.tomadoHoje ? `
        <button class="btn-tomado-disabled" disabled>
          ✅ Já Tomado Hoje
        </button>
      ` : `
        <button class="btn-tomar" data-id="${med.id}">
          💊 Confirmar que Tomei
        </button>
      `}
    </div>
  `;
}

function configurarBotoesTomar() {
  document.querySelectorAll('.btn-tomar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idMedicamento = e.target.getAttribute('data-id');
      await confirmarDose(idMedicamento);
    });
  });
}

async function confirmarDose(idMedicamento) {
  const userId = idosoLogado?.id || localStorage.getItem('userId');
  const baseClean = (API_BASE_URL || '').replace(/\/$/, '');

  try {
    const res = await fetchAutenticado(`${baseClean}/api/medicamentos/${idMedicamento}/tomar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idIdoso: parseInt(userId, 10) })
    });

    if (res.ok) {
      alert('Parabéns! Dose confirmada com sucesso. 🎉');
      carregarMedicamentosIdoso(userId);
    } else {
      const errText = await res.text();
      alert(`Erro ao registrar dose: ${errText}`);
    }
  } catch (err) {
    alert('Erro de conexão ao confirmar a dose.');
  }
}

function voltarParaHome() {
  window.location.href = 'home-idoso.html';
}

window.voltarParaHome = voltarParaHome;

// Executa a inicialização diretamente (compatível com type="module")
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}