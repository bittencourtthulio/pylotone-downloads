// Página de novidades (D-1055): filtros por tipo, busca, índice ativo, tema e a versão instalada
// (`?instalada=0.1.19`, enviada pelo app ao abrir a página depois de uma atualização).
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const versoes = $$(".nv-versao");
  const vazio = $(".nv-vazio");
  const busca = $(".nv-busca input");
  const filtros = $$(".nv-filtro");
  const linksIndice = $$(".nv-indice a");
  let filtro = "todos";

  // ---- tema: segue o sistema; o botão grava a escolha neste navegador
  const raiz = document.documentElement;
  const escuroAgora = () => raiz.dataset.tema ? raiz.dataset.tema === "escuro" : matchMedia("(prefers-color-scheme: dark)").matches;
  $(".nv-tema")?.addEventListener("click", () => {
    const novo = escuroAgora() ? "claro" : "escuro";
    raiz.dataset.tema = novo;
    try { localStorage.setItem("nv-tema", novo); } catch { /* sem armazenamento */ }
  });

  // ---- versão instalada
  const RE_VERSAO = /^\d+\.\d+(?:\.\d+)?(?:-[0-9a-z.]+)?$/;
  const instalada = new URLSearchParams(location.search).get("instalada");
  if (instalada && RE_VERSAO.test(instalada)) {
    const secao = document.getElementById(`v${instalada}`);
    const aviso = $(".nv-boas-vindas");
    if (aviso) { $("[data-instalada]", aviso).textContent = instalada; aviso.hidden = false; }
    if (secao) {
      secao.classList.add("nv-instalada");
      const etiqueta = $(".nv-etiqueta-instalada", secao);
      if (etiqueta) etiqueta.hidden = false;
      if (!location.hash) requestAnimationFrame(() => secao.scrollIntoView({ block: "start", behavior: "instant" }));
    }
  }

  // ---- busca e filtros
  const normalizar = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const originais = new Map();
  const blocosTexto = (el) => $$("h4, p", el);
  const destacar = (el, termo) => {
    for (const bloco of blocosTexto(el)) {
      if (!originais.has(bloco)) originais.set(bloco, bloco.innerHTML);
      const html = originais.get(bloco);
      if (!termo) { bloco.innerHTML = html; continue; }
      // só nós de texto: marcar sem tocar nas tags
      bloco.innerHTML = html;
      const caminhante = document.createTreeWalker(bloco, NodeFilter.SHOW_TEXT);
      const nos = [];
      while (caminhante.nextNode()) nos.push(caminhante.currentNode);
      for (const no of nos) {
        const t = no.nodeValue, n = normalizar(t);
        let i = n.indexOf(termo);
        if (i < 0) continue;
        const frag = document.createDocumentFragment();
        let ini = 0;
        while (i >= 0) {
          frag.append(t.slice(ini, i));
          const m = document.createElement("mark");
          m.textContent = t.slice(i, i + termo.length);
          frag.append(m);
          ini = i + termo.length;
          i = n.indexOf(termo, ini);
        }
        frag.append(t.slice(ini));
        no.replaceWith(frag);
      }
    }
  };

  function aplicar() {
    const termo = normalizar((busca?.value ?? "").trim());
    let algum = false;
    for (const secao of versoes) {
      const cabecalho = normalizar($(".nv-versao-cabecalho", secao).textContent);
      const casaVersao = termo && cabecalho.includes(termo);
      let visiveis = 0;
      for (const el of $$(".nv-destaque, .nv-item", secao)) {
        const tipoOk = filtro === "todos" || el.dataset.tipo === filtro;
        const textoOk = !termo || casaVersao || normalizar(el.textContent).includes(termo);
        el.hidden = !(tipoOk && textoOk);
        if (!el.hidden) visiveis++;
        destacar(el, el.hidden ? "" : termo);
      }
      for (const grupo of $$(".nv-destaques, .nv-itens", secao)) grupo.hidden = !$$(":scope > :not([hidden])", grupo).length;
      secao.hidden = visiveis === 0;
      const link = linksIndice.find((a) => a.dataset.alvo === secao.id);
      if (link) link.parentElement.hidden = secao.hidden;
      if (!secao.hidden) algum = true;
    }
    if (vazio) vazio.hidden = algum;
  }

  for (const b of filtros) {
    b.addEventListener("click", () => {
      filtro = b.dataset.filtro;
      for (const o of filtros) o.setAttribute("aria-pressed", String(o === b));
      aplicar();
    });
  }
  let espera = 0;
  busca?.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(aplicar, 120); });
  busca?.addEventListener("keydown", (e) => { if (e.key === "Escape") { busca.value = ""; aplicar(); } });
  addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== busca && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); busca?.focus(); }
  });

  // ---- índice: versão visível em destaque
  if ("IntersectionObserver" in window && linksIndice.length) {
    const visiveis = new Set();
    const marcar = () => {
      const atual = versoes.find((s) => visiveis.has(s.id) && !s.hidden);
      for (const a of linksIndice) a.setAttribute("aria-current", String(atual !== undefined && a.dataset.alvo === atual.id));
    };
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) e.isIntersecting ? visiveis.add(e.target.id) : visiveis.delete(e.target.id);
      marcar();
    }, { rootMargin: "-140px 0px -55% 0px" });
    versoes.forEach((s) => obs.observe(s));
  }
})();
