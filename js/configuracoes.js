import { API_BASE_URL } from './config.js';

const inputFoto = document.getElementById("inputFoto");
const fotoPerfil = document.getElementById("fotoPerfil");
const btnSalvar = document.getElementById("btnSalvar");
const btnAlterarSenha = document.getElementById("btnAlterarSenha");
const btnSair = document.getElementById("btnSair");
const btnExcluirConta = document.getElementById("btnExcluirConta");

const AVATAR_PADRAO = 'https://ui-avatars.com/api/?name=User&background=cbd5e0&color=fff';
let arquivoFotoSelecionado = null;
let fotoBase64Data = null;

function getUsuarioSessao() {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  const userId = usuario.id || localStorage.getItem("userId");
  return { usuario, userId };
}

function redirecionarLogin() {
  localStorage.clear();
  sessionStorage.clear();
  alert("Sessão expirada ou inválida. Faça login novamente.");
  window.location.href = "index.html";
}

// 1. CARREGAR DADOS DO PERFIL
document.addEventListener("DOMContentLoaded", async () => {
  const { usuario, userId } = getUsuarioSessao();

  if (!userId) {
    redirecionarLogin();
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/usuarios/${userId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    if (res.status === 401 || res.status === 403) {
      redirecionarLogin();
      return;
    }

    if (res.ok) {
      const data = await res.json();
      
      const nomeInput = document.getElementById("nome");
      const emailInput = document.getElementById("email");
      const telefoneInput = document.getElementById("telefone");
      const tipoUsuarioElem = document.getElementById("tipoUsuario");

      if (nomeInput) nomeInput.value = data.nome || "";
      if (emailInput) emailInput.value = data.email || "";
      if (telefoneInput) telefoneInput.value = data.telefone || "";
      
      const perfilFormatado = (data.perfil || data.tipo || usuario.tipo || "FAMILIAR").replace("ROLE_", "");
      if (tipoUsuarioElem) tipoUsuarioElem.textContent = perfilFormatado;
      
      const fotoUrl = data.imagemUrl || data.fotoUrl || usuario.fotoUrl || usuario.imagemUrl || AVATAR_PADRAO;
      if (fotoPerfil) {
        fotoPerfil.src = fotoUrl;
      }
    }
  } catch (err) {
    console.error("Erro de conexão ao carregar perfil:", err);
  }
});

// 2. PRÉ-VISUALIZAÇÃO E CONVERSÃO EM BASE64
inputFoto?.addEventListener("change", () => {
  const arquivo = inputFoto.files?.[0];
  if (!arquivo) return;

  if (!arquivo.type.startsWith("image/")) {
    alert("Por favor, selecione um arquivo de imagem válido.");
    inputFoto.value = "";
    return;
  }

  arquivoFotoSelecionado = arquivo;

  const leitor = new FileReader();
  leitor.onload = (evento) => {
    if (fotoPerfil && evento.target?.result) {
      fotoBase64Data = evento.target.result;
      fotoPerfil.src = fotoBase64Data;
    }
  };
  leitor.readAsDataURL(arquivo);
});

// 3. SALVAR ALTERAÇÕES (DADOS E FOTO)
btnSalvar?.addEventListener("click", async () => {
  const { usuario, userId } = getUsuarioSessao();
  if (!userId) return redirecionarLogin();

  const novoNome = document.getElementById("nome")?.value.trim();
  const novoEmail = document.getElementById("email")?.value.trim();
  const novoTelefone = document.getElementById("telefone")?.value.trim();

  if (!novoNome || !novoEmail) {
    alert("Nome e E-mail são campos obrigatórios.");
    return;
  }

  let novaFotoUrl = fotoBase64Data || fotoPerfil?.src || usuario.fotoUrl;

  try {
    // 1. Tenta o envio via Multipart/FormData
    if (arquivoFotoSelecionado) {
      const formData = new FormData();
      formData.append("foto", arquivoFotoSelecionado);

      try {
        const resFoto = await fetch(`${API_BASE_URL}/usuarios/${userId}/foto`, {
          method: "POST",
          credentials: "include",
          body: formData
        });

        if (resFoto.ok) {
          const resFotoData = await resFoto.json().catch(() => null);
          if (resFotoData && (resFotoData.imagemUrl || resFotoData.fotoUrl)) {
            novaFotoUrl = resFotoData.imagemUrl || resFotoData.fotoUrl;
          }
        }
      } catch (errFoto) {
        console.warn("Upload Multipart falhou, salvando foto em Base64 fallback.", errFoto);
      }
    }

    // 2. Atualização dos campos textuais e URL de Imagem no Spring Boot
    const payload = {
      nome: novoNome,
      email: novoEmail,
      telefone: novoTelefone,
      imagemUrl: novaFotoUrl,
      fotoUrl: novaFotoUrl
    };

    const [resNome, resEmail, resTelefone] = await Promise.all([
      fetch(`${API_BASE_URL}/usuarios/${userId}/nome`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nome: novoNome })
      }),
      fetch(`${API_BASE_URL}/usuarios/${userId}/email`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: novoEmail })
      }),
      fetch(`${API_BASE_URL}/usuarios/${userId}/telefone`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ telefone: novoTelefone })
      })
    ]);

    // 3. Tenta salvar a imagem também no endpoint geral do usuário caso exista
    fetch(`${API_BASE_URL}/usuarios/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    }).catch(() => {});

    // Sincronização completa do localStorage local
    const usuarioAtualizado = { 
      ...usuario, 
      nome: novoNome, 
      email: novoEmail,
      telefone: novoTelefone,
      fotoUrl: novaFotoUrl,
      imagemUrl: novaFotoUrl
    };
    
    localStorage.setItem("usuario", JSON.stringify(usuarioAtualizado));
    localStorage.setItem("userNome", novoNome);

    alert("Perfil atualizado com sucesso!");
  } catch (err) {
    console.error("Erro ao salvar alterações do perfil:", err);
    alert("Erro de conexão ao atualizar o perfil.");
  }
});

// 4. ALTERAR SENHA
btnAlterarSenha?.addEventListener("click", async () => {
  const { userId } = getUsuarioSessao();
  if (!userId) return redirecionarLogin();

  const senhaAtual = prompt("Digite sua senha atual:");
  if (!senhaAtual) return;

  const novaSenha = prompt("Digite sua nova senha:");
  if (!novaSenha) return;

  if (novaSenha.length < 6) {
    alert("A nova senha deve ter no mínimo 6 caracteres.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/usuarios/${userId}/senha`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ senhaAtual, novaSenha })
    });

    if (res.ok) {
      alert("Senha alterada com sucesso!");
    } else {
      const msg = await res.text();
      alert(msg || "Erro ao alterar a senha.");
    }
  } catch (err) {
    console.error("Erro ao alterar senha:", err);
    alert("Erro de conexão ao alterar a senha.");
  }
});

// 5. SAIR DA CONTA
btnSair?.addEventListener("click", () => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "index.html";
});

// 6. EXCLUIR CONTA
btnExcluirConta?.addEventListener("click", async () => {
  const { userId } = getUsuarioSessao();
  if (!userId) return redirecionarLogin();

  const confirmacao = confirm("Tem certeza de que deseja excluir sua conta? Esta ação é irreversível.");
  if (!confirmacao) return;

  try {
    const res = await fetch(`${API_BASE_URL}/usuarios/${userId}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (res.ok) {
      alert("Sua conta foi excluída com sucesso.");
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "index.html";
    } else {
      const msg = await res.text();
      alert(msg || "Não foi possível excluir a conta.");
    }
  } catch (err) {
    console.error("Erro ao excluir conta:", err);
    alert("Erro de conexão ao tentar excluir a conta.");
  }
});