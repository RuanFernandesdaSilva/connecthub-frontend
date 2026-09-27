import { API_BASE_URL } from './config.js';

// Cache dos elementos DOM
const btnAdicionarFoto = document.getElementById("btnAdicionarFoto");
const inputFoto = document.getElementById("inputFoto");
const fotoPerfil = document.getElementById("fotoPerfil");
const btnSalvar = document.getElementById("btnSalvar");
const btnAlterarSenha = document.getElementById("btnAlterarSenha");
const btnSair = document.getElementById("btnSair");
const btnExcluirConta = document.getElementById("btnExcluirConta");

/**
 * Obtém os dados do usuário atual salvos na sessão local.
 */
function getUsuarioSessao() {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  const userId = usuario.id || localStorage.getItem("userId");
  return { usuario, userId };
}

/**
 * Redireciona para o login em caso de falha de autenticação.
 */
function redirecionarLogin() {
  localStorage.clear();
  alert("Sessão expirada ou inválida. Faça login novamente.");
  window.location.href = "index.html";
}

// 1. CARREGAR DADOS DO PERFIL AO ENTRAR
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
      
      const perfilFormatado = (data.perfil || usuario.tipo || "FAMILIAR").replace("ROLE_", "");
      if (tipoUsuarioElem) tipoUsuarioElem.textContent = perfilFormatado;
      
      if (data.imagemUrl && fotoPerfil) {
        fotoPerfil.src = data.imagemUrl;
      }
    } else {
      console.error("Não foi possível carregar as informações do perfil.");
    }
  } catch (err) {
    console.error("Erro de conexão ao carregar perfil:", err);
  }
});

// 2. ABRIR SELEÇÃO DE FOTO
btnAdicionarFoto?.addEventListener("click", () => {
  inputFoto?.click();
});

// 3. SELECIONAR E PRÉ-VISUALIZAR FOTO
inputFoto?.addEventListener("change", () => {
  const arquivo = inputFoto.files?.[0];
  if (!arquivo) return;

  // Validação simples de tipo
  if (!arquivo.type.startsWith("image/")) {
    alert("Por favor, selecione um arquivo de imagem válido.");
    inputFoto.value = "";
    return;
  }

  const leitor = new FileReader();
  leitor.onload = (evento) => {
    if (fotoPerfil && evento.target?.result) {
      fotoPerfil.src = evento.target.result;
    }
  };
  leitor.readAsDataURL(arquivo);
});

// 4. SALVAR ALTERAÇÕES (NOME, E-MAIL, TELEFONE)
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

  try {
    // Requisições paralelas para otimização de tempo de resposta
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

    if (resNome.ok && resEmail.ok && resTelefone.ok) {
      // Atualizar cache local
      const usuarioAtualizado = { ...usuario, nome: novoNome, email: novoEmail };
      localStorage.setItem("usuario", JSON.stringify(usuarioAtualizado));
      localStorage.setItem("userNome", novoNome);

      alert("Perfil atualizado com sucesso!");
    } else {
      alert("Alguns dados podem não ter sido salvos. Verifique as informações.");
    }
  } catch (err) {
    console.error("Erro ao salvar alterações do perfil:", err);
    alert("Erro de conexão ao atualizar o perfil.");
  }
});

// 5. ALTERAR SENHA
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
      alert(msg || "Erro ao alterar a senha. Verifique a senha atual.");
    }
  } catch (err) {
    console.error("Erro ao alterar senha:", err);
    alert("Erro de conexão ao alterar a senha.");
  }
});

// 6. SAIR DA CONTA
btnSair?.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

// 7. EXCLUIR CONTA
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