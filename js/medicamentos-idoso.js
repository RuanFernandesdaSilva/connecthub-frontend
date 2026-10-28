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
    } catch (e) {}
  }

  const userId = idosoLogado?.id || localStorage.getItem('userId');
  if (!userId) {
    window.location.href = 'index.html';
    return;
  }

  carregarMedicamentosIdoso(userId);
}

async function carregarMedicamentosIdoso(idIdoso) {
  const container = document.getElementById('gridMedicamentos');

  try {
    const res = await fetchAutenticado(`${API_BASE_URL}/medicamentos/idoso/${idIdoso}`);
    
    if (res.ok) {
      const medicamentos = await res.json();

      if (!Array.isArray(medicamentos) || medicamentos.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>🎉 Nenhum medicamento cadastrado no momento!</p>
          </div>`;
        return;
      }

      container.innerHTML = medicamentos.map(med => renderizarCardMedicamento(med)).join('');
      configurarBotoesTomar();
    } else {
      container.innerHTML = `<p class="empty-state">Erro ao carregar medicamentos. Tente novamente mais tarde.</p>`;
    }
  } catch (err) {
    console.error('Erro ao buscar medicamentos:', err);
    container.innerHTML = `<p class="empty-state">Erro de conexão com o servidor.</p>`;
  }
}

function renderizarCardMedicamento(med) {
  // Define a cor HEX correspondente ou usa cinza escuro por padrão
  const corHex = CORES_CAIXA[med.corCaixa] || '#4a5568';
  
  // Trata a cor da fonte caso o fundo seja amarelo ou branco para garantir legibilidade
  const corTexto = (med.corCaixa === 'AMARELO' || med.corCaixa === 'BRANCO') ? '#1a202c' : '#ffffff';

  const proximoHorario = med.proximoHorario 
    ? new Date(med.proximoHorario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : 'No horário';

  return `
    <div class="med-card">
      <!-- BLOCO VISUAL DA CAIXA ORGANIZADORA -->
      <div class="caixa-bloco" style="background-color: ${corHex}; color: ${corTexto};">
        ${med.identificadorCaixa || '?'}
      </div>

      <div class="med-info">
        <h3>${med.nome}</h3>
        <p><strong>Dose:</strong> ${med.quantidadePorDose} ${med.unidade} (${med.dosagem})</p>
        
        <div class="med-horario">
          ⏰ Próximo: ${proximoHorario}
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
    const res = await fetchAutenticado(`${API_BASE_URL}/medicamentos/${idMedicamento}/tomar`, {
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