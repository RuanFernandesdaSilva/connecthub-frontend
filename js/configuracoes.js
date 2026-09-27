// js/perfil.js
import { API_BASE_URL } from './config.js';

const btnAdicionarFoto = document.getElementById("btnAdicionarFoto");
const inputFoto = document.getElementById("inputFoto");
const fotoPerfil = document.getElementById("fotoPerfil");
const btnSalvar = document.getElementById("btnSalvar");
const btnAlterarSenha = document.getElementById("btnAlterarSenha");
const btnSair = document.getElementById("btnSair");
const btnExcluirConta = document.getElementById("btnExcluirConta");

// CARREGAR DADOS DO PERFIL AO ENTRAR
document.addEventListener("DOMContentLoaded", async () => {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    const userId = usuario.id || localStorage.getItem("userId");

    if (!userId) {
        alert("Sessão expirada. Faça login novamente.");
        window.location.href = "auth.html";
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/usuarios/${userId}`);
        if (res.ok) {
            const data = await res.json();
            const nomeInput = document.getElementById("nome");
            const emailInput = document.getElementById("email");
            const telefoneInput = document.getElementById("telefone");
            const tipoUsuarioElem = document.getElementById("tipoUsuario");

            if (nomeInput) nomeInput.value = data.nome || "";
            if (emailInput) emailInput.value = data.email || "";
            if (telefoneInput) telefoneInput.value = data.telefone || "";
            if (tipoUsuarioElem) tipoUsuarioElem.textContent = data.perfil || usuario.tipo || "Familiar";
            if (data.imagemUrl && fotoPerfil) fotoPerfil.src = data.imagemUrl;
        }
    } catch (err) {
        console.error("Erro ao carregar perfil:", err);
    }
});

// ABRIR SELEÇÃO DE FOTO
if (btnAdicionarFoto) {
    btnAdicionarFoto.addEventListener("click", () => {
        if (inputFoto) inputFoto.click();
    });
}

// SELECIONAR FOTO
if (inputFoto) {
    inputFoto.addEventListener("change", () => {
        const arquivo = inputFoto.files[0];
        if (arquivo) {
            const leitor = new FileReader();
            leitor.onload = (evento) => {
                if (fotoPerfil) fotoPerfil.src = evento.target.result;
            };
            leitor.readAsDataURL(arquivo);
        }
    });
}

// SALVAR ALTERAÇÕES DO PERFIL (NOME, E-MAIL, TELEFONE)
if (btnSalvar) {
    btnSalvar.addEventListener("click", async () => {
        const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
        const userId = usuario.id || localStorage.getItem("userId");

        const novoNome = document.getElementById("nome")?.value;
        const novoEmail = document.getElementById("email")?.value;
        const novoTelefone = document.getElementById("telefone")?.value;

        try {
            // Atualizar Nome
            await fetch(`${API_BASE_URL}/usuarios/${userId}/nome`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome: novoNome })
            });

            // Atualizar Email
            await fetch(`${API_BASE_URL}/usuarios/${userId}/email`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: novoEmail })
            });

            // Atualizar Telefone
            await fetch(`${API_BASE_URL}/usuarios/${userId}/telefone`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ telefone: novoTelefone })
            });

            alert("Perfil atualizado com sucesso!");
        } catch (err) {
            alert("Erro ao atualizar o perfil.");
        }
    });
}

// ALTERAR SENHA
if (btnAlterarSenha) {
    btnAlterarSenha.addEventListener("click", async () => {
        const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
        const userId = usuario.id || localStorage.getItem("userId");

        const senhaAtual = prompt("Digite sua senha atual:");
        if (!senhaAtual) return;

        const novaSenha = prompt("Digite sua nova senha:");
        if (!novaSenha) return;

        try {
            const res = await fetch(`${API_BASE_URL}/usuarios/${userId}/senha`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ senhaAtual, novaSenha })
            });

            if (res.ok) {
                alert("Senha alterada com sucesso!");
            } else {
                const msg = await res.text();
                alert(msg || "Erro ao alterar a senha.");
            }
        } catch (err) {
            alert("Erro de conexão ao alterar a senha.");
        }
    });
}

// SAIR DA CONTA
if (btnSair) {
    btnSair.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "auth.html";
    });
}

// EXCLUIR CONTA
if (btnExcluirConta) {
    btnExcluirConta.addEventListener("click", async () => {
        if (!confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.")) {
            return;
        }

        const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
        const userId = usuario.id || localStorage.getItem("userId");

        try {
            const res = await fetch(`${API_BASE_URL}/usuarios/${userId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                alert("Conta excluída com sucesso.");
                localStorage.clear();
                window.location.href = "auth.html";
            }
        } catch (err) {
            alert("Erro ao excluir a conta.");
        }
    });
}