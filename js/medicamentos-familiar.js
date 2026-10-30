import { API_BASE_URL, API_AUTH_URL } from './config.js';

document.addEventListener("DOMContentLoaded", async () => {

    /* =====================================================
       ELEMENTOS DA PÁGINA
       ===================================================== */
    const btnAdicionar = document.getElementById("btn-adicionar");
    const btnRemover = document.getElementById("btn-remover");
    const btnCorGaveta = document.getElementById("btn-cor-gaveta");
    const btnLista = document.getElementById("btn-lista");

    const nomeIdosoElement = document.getElementById("nome-idoso");
    const idosoLabel = document.getElementById("idoso-label");
    const nomeFamiliar = document.getElementById("nome-familiar");
    const avatarContainer = document.getElementById("avatar-container");

    let usuarioLogado = null;

    /* =====================================================
       MÉTODOS AUXILIARES E AUTENTICAÇÃO
       ===================================================== */
    function escaparHTML(texto) {
        const div = document.createElement("div");
        div.textContent = texto ?? "";
        return div.innerHTML;
    }

    function carregarSessaoLocal() {
        const usuarioSalvo = localStorage.getItem('usuario');
        if (usuarioSalvo) {
            try {
                usuarioLogado = JSON.parse(usuarioSalvo);
            } catch (e) {
                usuarioLogado = null;
            }
        }
        if (!usuarioLogado || !usuarioLogado.id) {
            const idSalvo = localStorage.getItem('userId');
            if (idSalvo) {
                usuarioLogado = {
                    id: parseInt(idSalvo, 10),
                    nome: localStorage.getItem('userNome') || 'Familiar',
                    fotoUrl: localStorage.getItem('userFoto') || null
                };
            }
        }
    }

    carregarSessaoLocal();

    if (nomeFamiliar && usuarioLogado) {
        nomeFamiliar.textContent = usuarioLogado.nome || "Familiar";
    }

    if (avatarContainer && usuarioLogado?.fotoUrl) {
        avatarContainer.innerHTML = `<img src="${usuarioLogado.fotoUrl}" alt="Avatar">`;
    }

    /* =====================================================
       DADOS DO IDOSO SELECIONADO
       ===================================================== */
    function pegarIdosoAtual() {
        const selecionado = JSON.parse(localStorage.getItem("selectedIdoso"));
        if (selecionado && selecionado.id) {
            return {
                id: selecionado.id,
                nome: selecionado.nome || "Idoso Vinculado"
            };
        }
        return {
            id: localStorage.getItem("userIdidoso") || "1",
            nome: "Miquéias de Sousa"
        };
    }

    const idoso = pegarIdosoAtual();

    if (nomeIdosoElement) {
        nomeIdosoElement.textContent = idoso.nome;
    }
    if (idosoLabel) {
        idosoLabel.textContent = `Idoso: ${idoso.nome} (ID: #${idoso.id})`;
    }

    /* =====================================================
       CHAVES DE ARMAZENAMENTO LOCAL
       ===================================================== */
    const chaveRemedios = `zelo_remedios_${idoso.id}`;
    const chaveGavetas = `zelo_gavetas_${idoso.id}`;

    function pegarRemedios() {
        return JSON.parse(localStorage.getItem(chaveRemedios)) || [];
    }

    function salvarRemedios(remedios) {
        localStorage.setItem(chaveRemedios, JSON.stringify(remedios));
        atualizarDadosDashboard();
    }

    function pegarGavetas() {
        return JSON.parse(localStorage.getItem(chaveGavetas)) || {};
    }

    function salvarGavetas(gavetas) {
        localStorage.setItem(chaveGavetas, JSON.stringify(gavetas));
    }

    /* =====================================================
       GERENCIAMENTO DE MODAIS (PADRÃO ZELO)
       ===================================================== */
    function criarModal(conteudo) {
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.innerHTML = `<div class="modal">${conteudo}</div>`;
        document.body.appendChild(overlay);
        return overlay;
    }

    function fecharModal(modal) {
        if (modal) modal.remove();
    }

    /* =====================================================
       1. ADICIONAR REMÉDIO
       ===================================================== */
    function adicionarRemedio() {
        const modal = criarModal(`
            <h2>Adicionar remédio</h2>

            <label for="nome-remedio">Nome do remédio</label>
            <input id="nome-remedio" type="text" placeholder="Ex.: Dipirona">

            <label for="dosagem-remedio">Dosagem</label>
            <input id="dosagem-remedio" type="text" placeholder="Ex.: 500mg - 1 comprimido">

            <label for="horario-remedio">Horário</label>
            <input id="horario-remedio" type="time">

            <label for="gaveta-remedio">Número da gaveta</label>
            <select id="gaveta-remedio">
                <option value="1">Gaveta 1</option>
                <option value="2">Gaveta 2</option>
                <option value="3">Gaveta 3</option>
                <option value="4">Gaveta 4</option>
                <option value="5">Gaveta 5</option>
                <option value="6">Gaveta 6</option>
            </select>

            <div class="modal-buttons">
                <button class="modal-btn cancel" id="cancelar-adicionar">Cancelar</button>
                <button class="modal-btn confirm" id="confirmar-adicionar">Adicionar</button>
            </div>
        `);

        modal.querySelector("#cancelar-adicionar").addEventListener("click", () => fecharModal(modal));

        modal.querySelector("#confirmar-adicionar").addEventListener("click", () => {
            const nome = modal.querySelector("#nome-remedio").value.trim();
            const dosagem = modal.querySelector("#dosagem-remedio").value.trim();
            const horario = modal.querySelector("#horario-remedio").value;
            const gaveta = modal.querySelector("#gaveta-remedio").value;

            if (!nome) {
                alert("Digite o nome do remédio.");
                return;
            }

            const remedios = pegarRemedios();
            const novoRemedio = {
                id: Date.now(),
                nome: nome,
                dosagem: dosagem || "Não informada",
                horario: horario || "Não informado",
                gaveta: gaveta,
                tomado: false
            };

            remedios.push(novoRemedio);
            salvarRemedios(remedios);
            fecharModal(modal);

            alert("Remédio adicionado com sucesso!");
        });
    }

    /* =====================================================
       2. REMOVER REMÉDIO
       ===================================================== */
    function removerRemedio() {
        const remedios = pegarRemedios();

        if (remedios.length === 0) {
            alert("Não existem remédios cadastrados.");
            return;
        }

        let listaHTML = "";
        remedios.forEach((remedio, index) => {
            listaHTML += `
                <div class="remedio-item">
                    <div class="remedio-info">
                        <strong>${index + 1}. ${escaparHTML(remedio.nome)}</strong>
                        <span>${escaparHTML(remedio.dosagem)} | Horário: ${escaparHTML(remedio.horario)}</span>
                        <span>Gaveta ${remedio.gaveta}</span>
                    </div>
                    <button class="modal-btn confirm" style="background:#e53e3e;" data-remedio-id="${remedio.id}">
                        Remover
                    </button>
                </div>
            `;
        });

        const modal = criarModal(`
            <h2>Remover remédio</h2>
            <p style="margin-bottom:15px; color:#666;">Escolha qual remédio deseja remover:</p>
            <div style="max-height: 250px; overflow-y: auto;">${listaHTML}</div>
            <div class="modal-buttons">
                <button class="modal-btn cancel" id="fechar-remover">Fechar</button>
            </div>
        `);

        modal.querySelector("#fechar-remover").addEventListener("click", () => fecharModal(modal));

        modal.querySelectorAll("[data-remedio-id]").forEach(botao => {
            botao.addEventListener("click", () => {
                const id = Number(botao.dataset.remedioId);
                const remedio = pegarRemedios().find(r => r.id === id);

                if (!remedio) return;

                if (confirm(`Deseja remover "${remedio.nome}"?`)) {
                    const novaLista = pegarRemedios().filter(r => r.id !== id);
                    salvarRemedios(novaLista);
                    fecharModal(modal);
                    alert("Remédio removido com sucesso!");
                }
            });
        });
    }

    /* =====================================================
       3. DEFINIR COR DA GAVETA
       ===================================================== */
    function definirCorGaveta() {
        const gavetas = pegarGavetas();

        const modal = criarModal(`
            <h2>Definir cor de gaveta</h2>

            <label for="numero-gaveta">Escolha a gaveta</label>
            <select id="numero-gaveta">
                <option value="1">Gaveta 1</option>
                <option value="2">Gaveta 2</option>
                <option value="3">Gaveta 3</option>
                <option value="4">Gaveta 4</option>
                <option value="5">Gaveta 5</option>
                <option value="6">Gaveta 6</option>
            </select>

            <label for="cor-gaveta">Escolha a cor</label>
            <input id="cor-gaveta" type="color" value="#c4d0ff" style="height:50px; padding:2px; cursor:pointer;">

            <div class="modal-buttons">
                <button class="modal-btn cancel" id="cancelar-cor">Cancelar</button>
                <button class="modal-btn confirm" id="salvar-cor">Salvar cor</button>
            </div>
        `);

        const selectGaveta = modal.querySelector("#numero-gaveta");
        const inputCor = modal.querySelector("#cor-gaveta");

        function carregarCorAtual() {
            const gaveta = selectGaveta.value;
            if (gavetas[gaveta]) inputCor.value = gavetas[gaveta];
        }

        selectGaveta.addEventListener("change", carregarCorAtual);
        carregarCorAtual();

        modal.querySelector("#cancelar-cor").addEventListener("click", () => fecharModal(modal));

        modal.querySelector("#salvar-cor").addEventListener("click", () => {
            const gaveta = selectGaveta.value;
            const cor = inputCor.value;

            gavetas[gaveta] = cor;
            salvarGavetas(gavetas);
            fecharModal(modal);

            alert(`Cor da gaveta ${gaveta} definida!`);
        });
    }

    /* =====================================================
       4. VER LISTA DE REMÉDIOS
       ===================================================== */
    function verLista() {
        const remedios = pegarRemedios();
        const gavetas = pegarGavetas();

        let conteudo = "";

        if (remedios.length === 0) {
            conteudo = `
                <div class="lista-vazia">
                    <div style="font-size:45px;">💊</div>
                    <p>Nenhum remédio cadastrado.</p>
                </div>
            `;
        } else {
            remedios.forEach(remedio => {
                const cor = gavetas[remedio.gaveta] || "#c4d0ff";

                conteudo += `
                    <div class="remedio-item">
                        <div class="remedio-info">
                            <strong>💊 ${escaparHTML(remedio.nome)}</strong>
                            <span>Dosagem: ${escaparHTML(remedio.dosagem)}</span>
                            <span>Horário: ${escaparHTML(remedio.horario)}</span>
                            <span>Gaveta: ${remedio.gaveta}</span>
                        </div>
                        <div class="remedio-gaveta" title="Cor da gaveta ${remedio.gaveta}" style="background-color:${cor};"></div>
                    </div>
                `;
            });
        }

        const modal = criarModal(`
            <h2>Lista de remédios</h2>
            <p style="margin-bottom:15px; color:#555;">Remédios cadastrados para <strong>${escaparHTML(idoso.nome)}</strong></p>
            <div style="max-height: 280px; overflow-y: auto;">${conteudo}</div>
            <div class="modal-buttons">
                <button class="modal-btn cancel" id="fechar-lista">Fechar</button>
            </div>
        `);

        modal.querySelector("#fechar-lista").addEventListener("click", () => fecharModal(modal));
    }

    /* =====================================================
       ATUALIZAR DASHBOARD E NAVEGAÇÃO
       ===================================================== */
    function atualizarDadosDashboard() {
        const remedios = pegarRemedios();
        localStorage.setItem(`zelo_total_remedios_${idoso.id}`, remedios.length);

        window.dispatchEvent(
            new CustomEvent("zeloRemediosAtualizados", {
                detail: { idosoId: idoso.id, total: remedios.length }
            })
        );
    }

    btnAdicionar.addEventListener("click", adicionarRemedio);
    btnRemover.addEventListener("click", removerRemedio);
    btnCorGaveta.addEventListener("click", definirCorGaveta);
    btnLista.addEventListener("click", verLista);

    window.irParaPerfilIdoso = function(event) {
        if (event) event.preventDefault();
        window.location.href = "home-idoso.html";
    };

    window.sair = function(event) {
        if (event) event.preventDefault();
        localStorage.removeItem("usuario");
        localStorage.removeItem("userId");
        window.location.href = "index.html";
    };

    /* =====================================================
       SISTEMA DE NOTIFICAÇÕES (SININHO)
       ===================================================== */
    const btnSininho = document.getElementById("btn-sininho");
    const notifDropdown = document.getElementById("notif-dropdown");
    const notifLista = document.getElementById("notif-lista");
    const notifBadge = document.getElementById("notif-badge");
    const btnLimpar = document.getElementById("btn-limpar-notif");

    let notificacoes = JSON.parse(localStorage.getItem("zelo_notificacoes_salvas")) || [];

    function renderizarNotificacoes() {
        if (!notifLista) return;
        notifLista.innerHTML = "";

        if (notificacoes.length === 0) {
            notifLista.innerHTML = `<p class="notif-empty">Nenhuma notificação no momento.</p>`;
            if (notifBadge) notifBadge.style.display = "none";
            return;
        }

        if (notifBadge) {
            notifBadge.textContent = notificacoes.length;
            notifBadge.style.display = "block";
        }

        notificacoes.forEach(notif => {
            const item = document.createElement("div");
            item.className = "notif-item";
            item.innerHTML = `
                <div class="notif-item-text">💊 ${escaparHTML(notif.mensagem)}</div>
                <div class="notif-item-time">${escaparHTML(notif.hora)}</div>
            `;
            notifLista.appendChild(item);
        });
    }

    if (btnSininho) {
        btnSininho.addEventListener("click", event => {
            event.stopPropagation();
            notifDropdown.classList.toggle("is-open");
        });
    }

    document.addEventListener("click", () => {
        if (notifDropdown) notifDropdown.classList.remove("is-open");
    });

    if (btnLimpar) {
        btnLimpar.addEventListener("click", event => {
            event.stopPropagation();
            notificacoes = [];
            localStorage.removeItem("zelo_notificacoes_salvas");
            renderizarNotificacoes();
        });
    }

    if (typeof ZeloSync !== "undefined") {
        ZeloSync.escutarEventos(dados => {
            if (dados.tipo === "REMEDIO_TOMADO") {
                const novaNotif = {
                    mensagem: dados.mensagem || "O idoso tomou o remédio!",
                    hora: dados.dataHora || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                };
                notificacoes.unshift(novaNotif);
                localStorage.setItem("zelo_notificacoes_salvas", JSON.stringify(notificacoes));
                renderizarNotificacoes();
            }
        });
    }

    renderizarNotificacoes();
    atualizarDadosDashboard();
});