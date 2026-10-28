import { API_BASE_URL } from './config.js';

let idosoLogado = null;

// MAPEAMENTO COMPLETO DE CORES DO FORMULÁRIO PARA CÓDIGOS HEXADECIMAIS
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

function inicializar() {
  const usuarioRaw = localStorage.getItem('usuario');
  if (usuarioRaw) {
    try {
      idosoLogado = JSON.parse(usuarioRaw);
    } catch (e) {
      console.warn('Erro ao parsear usuario do localStorage:', e);
    }
  }

  const userId = idosoLogado?.id || localStorage.getItem('userId');
  console.log('ID do Idoso Identificado:', userId);

  if (!userId) {
    console.warn('Nenhum ID encontrado. Redirecionando para login...');
    window.location.href = 'index.html';
    return;
  }

  carregarMedicamentosIdoso(userId);
}

async function carregarMedicamentosIdoso(idIdoso) {
  const container = document.getElementById('gridMedicamentos');
  if (!container) {
    console.error('Elemento #gridMedicamentos não foi encontrado na página HTML.');
    return;
  }

  // URLs possíveis de fallback de acordo com a controller Spring Boot
  const endpoints = [
    `${API_BASE_URL}/api/medicamentos/idoso/${idIdoso}`,
    `${API_BASE_URL}/medicamentos/idoso/${idIdoso}`,
    `${API_BASE_URL}/api/medicamentos?idIdoso=${idIdoso}`,
    `${API_BASE_URL}/medicamentos?idIdoso=${idIdoso}`
  ];

  let medicamentos = null;
  let ultimoStatus = null;

  for (const url of endpoints) {
    try {
      console.log('Tentando buscar medicamentos via:', url);
      const res = await fetchAutenticado(url);
      ultimoStatus = res.status;

      if (res.ok) {
        const data = await res.json();
        console.log('Dados recebidos da API:', data);

        // Normalização de array caso venha encapsulado (ex: { content: [...] })
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
      console.warn(`Falha na requisição para ${url}:`, err);
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
    console.error('Nenhum endpoint retornou sucesso. Último status:', ultimoStatus);
    container.innerHTML = `
      <div class="empty-state">
        <p>⚠️ Não foi possível carregar os medicamentos.</p>
        <small style="color: #a0aec0;">Verifique no console F12 ou tente recarregar a página. (Status: ${ultimoStatus || 'Erro de Rede'})</small>
      </div>`;
  }
}

function renderizarCardMedicamento(med) {
  // Trata maiúsculas/minúsculas da cor cadastrada no banco
  const chaveCor = (med.corCaixa || '').toUpperCase();
  const corHex = CORES_CAIXA[chaveCor] || '#4a5568';
  
  // Cor do texto do bloco para manter contraste
  const corTexto = (chaveCor === 'AMARELO' || chaveCor === 'BRANCO') ? '#1a202c' : '#ffffff';

  const proximoHorario = med.primeiroHorario || med.proximoHorario
    ? new Date(med.primeiroHorario || med.proximoHorario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : 'No horário';

  return `
    <div class="med-card">
      <!-- BLOCO VISUAL DA CAIXA ORGANIZADORA -->
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

  try {
    const res = await fetchAutenticado(`${API_BASE_URL}/api/medicamentos/${idMedicamento}/tomar`, {
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
document.addEventListener('DOMContentLoaded', inicializar);