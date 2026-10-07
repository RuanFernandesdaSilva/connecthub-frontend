import { API_BASE_URL } from './config.js';

const inputFoto = document.getElementById("inputFoto");
const fotoPerfil = document.getElementById("fotoPerfil");
const btnSalvar = document.getElementById("btnSalvar");
const btnAlterarSenha = document.getElementById("btnAlterarSenha");
const btnSair = document.getElementById("btnSair");
const btnExcluirConta = document.getElementById("btnExcluirConta");

const AVATAR_PADRAO = 'https://ui-avatars.com/api/?name=User&background=cbd5e0&color=fff';
let arquivoFotoSelecionado = null;
let fotoBase64Comprimida = null;

function getUsuarioSessao() {
  const usuarioRaw = localStorage.getItem("usuario");
  let usuario = {};
  if (usuarioRaw) {
    try {
      usuario = JSON.parse(usuarioRaw);
    } catch (e) {
      console.warn("Erro ao ler usuario do localStorage:", e);
    }
  }
  const userId = usuario.id || localStorage.getItem("userId");
  return { usuario, userId };
}

function redirecionarLogin() {
  localStorage.clear();
  sessionStorage.clear();
  alert("Sessão expirada ou inválida. Faça login novamente.");
  window.location.href = "index.html";
}

function comprimirImagem(file, maxWidth = 200, maxHeight = 200, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
}

// 1. CARREGAR DADOS DO PERFIL
document.addEventListener("DOMContentLoaded", async () => {
  const { usuario, userId } = getUsuarioSessao();

  if (!userId) {
    redirecionarLogin();
    return;
  }

  const nomeInput = document.getElementById("nome");
  const emailInput = document.getElementById("email");
  const telefoneInput = document.getElementById("telefone");
  const tipoUsuarioElem = document.getElementById("tipoUsuario");

  if (nomeInput) nomeInput.value = usuario.nome || localStorage.getItem("userNome") || "";
  if (emailInput) emailInput.value = usuario.email || "";
  if (telefoneInput) telefoneInput.value = usuario.telefone || "";

  const perfilFormatado = (usuario.tipo || usuario.perfil || localStorage.getItem("userTipo") || "FAMILIAR").replace("ROLE_", "");
  if (tipoUsuarioElem) tipoUsuarioElem.textContent = perfilFormatado;

  const fotoPersistidaId = localStorage.getItem(`user_foto_${userId}`);
  const fotoInicial = fotoPersistidaId || usuario.fotoUrl || usuario.imagemUrl || localStorage.getItem("userFoto") || AVATAR_PADRAO;
  
  if (fotoPerfil) fotoPerfil.src = fotoInicial;

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

      if (nomeInput && data.nome) nomeInput.value = data.nome;
      if (emailInput && data.email) emailInput.value = data.email;
      if (telefoneInput && data.telefone) telefoneInput.value = data.telefone;

      const fotoApi = data.imagemUrl || data.fotoUrl || fotoInicial;
      if (fotoPerfil) fotoPerfil.src = fotoApi;

      const usuarioAtualizado = { ...usuario, ...data, fotoUrl: fotoApi, imagemUrl: fotoApi };
      localStorage.setItem("usuario", JSON.stringify(usuarioAtualizado));
      localStorage.setItem("userFoto", fotoApi);
      localStorage.setItem(`user_foto_${userId}`, fotoApi);
    }
  } catch (err) {
    console.warn("API indisponível, utilizando dados da sessão local:", err);
  }
});

// 2. PRÉ-VISUALIZAÇÃO DA FOTO E COMPRESSÃO
inputFoto?.addEventListener("change", async () => {
  const arquivo = inputFoto.files?.[0];
  if (!arquivo) return;

  if (!arquivo.type.startsWith("image/")) {
    alert("Por favor, selecione um arquivo de imagem válido.");
    inputFoto.value = "";
    return;
  }

  arquivoFotoSelecionado = arquivo;
  fotoBase64Comprimida = await comprimirImagem(arquivo, 200, 200, 0.7);

  if (fotoPerfil && fotoBase64Comprimida) {
    fotoPerfil.src = fotoBase64Comprimida;
  }
});

// 3. SALVAR ALTERAÇÕES (USANDO AtualizarFotoDto NO SPRING BOOT)
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

  const novaFotoUrl = fotoBase64Comprimida || fotoPerfil?.src || usuario.fotoUrl || AVATAR_PADRAO;

  try {
    const requisicoes = [
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
    ];

    // Se houve uma foto selecionada/modificada, envia usando a estrutura exata do AtualizarFotoDto
    if (fotoBase64Comprimida) {
      requisicoes.push(
        fetch(`${API_BASE_URL}/usuarios/${userId}/foto`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ imagemUrl: novaFotoUrl })
        })
      );
    }

    await Promise.allSettled(requisicoes);

    const usuarioAtualizado = {
      ...usuario,
      id: parseInt(userId, 10),
      nome: novoNome,
      email: novoEmail,
      telefone: novoTelefone,
      fotoUrl: novaFotoUrl,
      imagemUrl: novaFotoUrl
    };

    localStorage.setItem("usuario", JSON.stringify(usuarioAtualizado));
    localStorage.setItem("userNome", novoNome);
    localStorage.setItem("userFoto", novaFotoUrl);
    localStorage.setItem(`user_foto_${userId}`, novaFotoUrl);

    alert("Perfil e foto salvos com sucesso!");
    
    const tipo = (usuario.tipo || localStorage.getItem("userTipo") || "").toUpperCase();
    if (tipo.includes("IDOSO")) {
      window.location.href = "home-idoso.html";
    } else {
      window.location.href = "home-familiar.html";
    }
  } catch (err) {
    console.error("Erro ao salvar alterações do perfil:", err);
    alert("Erro de conexão ao atualizar o perfil.");
  }
});

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

btnSair?.addEventListener("click", () => {
  limparSessaoManterFotos();
  window.location.href = "index.html";
});

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

function limparSessaoManterFotos() {
  const chavesFotos = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("user_foto_")) {
      chavesFotos[key] = localStorage.getItem(key);
    }
  }
  
  localStorage.clear();
  sessionStorage.clear();

  Object.keys(chavesFotos).forEach(k => {
    localStorage.setItem(k, chavesFotos[k]);
  });
}