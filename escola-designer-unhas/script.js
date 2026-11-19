/* Escola Designer de Unhas — página demonstrativa de afiliado
   Criado por Roberto Siqueira · Estúdio Basileus

   A página já nasce completa e parada (unha pronta, textos visíveis). Com movimento ligado,
   o JavaScript leva os elementos ao estado inicial e anima até o estado de repouso.
   Todas as animações vivem dentro de gsap.matchMedia(): "reduzir movimento" e a chave
   "Movimento" desfazem tudo na hora. */

(function () {
  "use strict";

  const raiz = document.documentElement;
  const token = (nome) => getComputedStyle(raiz).getPropertyValue(nome).trim();
  const segundos = (nome) => parseFloat(token(nome)) || 0;

  /* Curvas: o CSS guarda cubic-bezier(); aqui viram funções que o GSAP aceita como ease. */
  function curva(nome) {
    const n = (token(nome).match(/-?[\d.]+/g) || [0, 0, 1, 1]).map(Number);
    const [x1, y1, x2, y2] = n;
    const bx = (t) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
    const by = (t) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 24; i++) { // busca binária: precisão de sobra para a tela
        t = (lo + hi) / 2;
        if (bx(t) < x) lo = t; else hi = t;
      }
      return by(t);
    };
  }

  const EASE = {
    saida: curva("--curva-saida"),
    entrada: curva("--curva-entrada"),
    mola: curva("--curva-mola"),
  };
  const DUR = { entrada: segundos("--dur-entrada"), saida: segundos("--dur-saida") };

  /* ---------- WhatsApp com mensagem pronta ---------- */
  const zap = document.getElementById("linkZap");
  const mensagem = "Oi, Roberto! Vi a página do curso Escola Designer de Unhas e quero tirar uma dúvida antes de me inscrever.";
  zap.href = "https://wa.me/5521959009892?text=" + encodeURIComponent(mensagem);

  /* ---------- Janela do checkout (demonstração) ---------- */
  const janela = document.getElementById("janela");
  let origemFoco = null;
  let lenis = null;

  document.querySelectorAll("[data-checkout]").forEach((botao) => {
    botao.addEventListener("click", () => {
      origemFoco = botao;
      raiz.classList.add("janela-aberta");
      if (lenis) lenis.stop();
      janela.showModal(); // o navegador prende o foco dentro e fecha com Esc
    });
  });
  document.getElementById("fecharJanela").addEventListener("click", () => janela.close());
  janela.addEventListener("click", (e) => { if (e.target === janela) janela.close(); }); // toque fora
  janela.addEventListener("keydown", (e) => { // o foco circula só dentro da janela
    if (e.key !== "Tab") return;
    const focaveis = [...janela.querySelectorAll("a[href], button:not([disabled])")];
    const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  });
  janela.addEventListener("close", () => {
    raiz.classList.remove("janela-aberta");
    if (lenis) lenis.start();
    if (origemFoco) origemFoco.focus();
  });

  /* ---------- Links internos (#ancora): rolagem suave até a seção ----------
     Com a rolagem amortecida ligada, usa o Lenis; sem ela, o "smooth" do navegador; com "reduzir movimento", salta. */
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const alvo = document.querySelector(link.getAttribute("href"));
    if (!alvo) return;
    e.preventDefault();
    const suave = document.getElementById("chaveMov").getAttribute("aria-pressed") === "true"
      && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const focar = () => { // leva o foco junto, para quem usa teclado ou leitor de tela
      if (!alvo.hasAttribute("tabindex")) alvo.setAttribute("tabindex", "-1");
      alvo.focus({ preventScroll: true });
    };
    if (suave && lenis) lenis.scrollTo(alvo, { offset: -12, duration: 1.3, easing: EASE.saida, onComplete: focar });
    else { alvo.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" }); focar(); }
    history.replaceState(null, "", link.getAttribute("href"));
  });

  /* ---------- Barra fixa do celular ---------- */
  const barra = document.getElementById("barra");
  const botaoBarra = barra.querySelector("button");
  const alvoBarra = document.querySelector(".abertura .acoes");
  let passouAbertura = false;
  const grandesVisiveis = new Set(); // botões grandes de compra na tela: a barra sai para não repetir
  function mostrarBarra() {
    const ver = passouAbertura && grandesVisiveis.size === 0;
    barra.classList.toggle("visivel", ver);
    barra.setAttribute("aria-hidden", String(!ver));
    botaoBarra.tabIndex = ver ? 0 : -1;
  }
  new IntersectionObserver(([item]) => {
    passouAbertura = !item.isIntersecting && item.boundingClientRect.top < 0;
    mostrarBarra();
  }).observe(alvoBarra);
  const vigia = new IntersectionObserver((itens) => {
    itens.forEach((i) => (i.isIntersecting ? grandesVisiveis.add(i.target) : grandesVisiveis.delete(i.target)));
    mostrarBarra();
  });
  document.querySelectorAll(".botao-grande, #resultado .botao-compra").forEach((b) => vigia.observe(b));

  /* ---------- 2. Estúdio: monte a sua unha ----------
     Funciona com ou sem animação. Com movimento ligado, cada escolha mostra o gesto do ofício:
     a lixa muda o formato, o gel sobe da cutícula, o carimbo aperta o desenho, a cabine de LED cura. */
  (function estudio() {
    const FORMAS = {
      quadrado: { nome: "Quadrado", ponta: 64, d: "M112 64 L188 64 Q204 64 204 80 L204 282 Q204 302 184 302 L116 302 Q96 302 96 282 L96 80 Q96 64 112 64 Z" },
      squoval: { nome: "Squoval", ponta: 62, d: "M128 62 L172 62 C196 62 204 76 204 100 L204 282 Q204 302 184 302 L116 302 Q96 302 96 282 L96 100 C96 76 104 62 128 62 Z" },
      almond: { nome: "Almond", ponta: 60, d: "M150 60 C186 60 204 124 204 176 L204 282 Q204 302 184 302 L116 302 Q96 302 96 282 L96 176 C96 124 114 60 150 60 Z" },
      bailarina: { nome: "Bailarina", ponta: 56, d: "M130 56 L170 56 Q178 56 180 64 L204 178 L204 282 Q204 302 184 302 L116 302 Q96 302 96 282 L96 178 L120 64 Q122 56 130 56 Z" },
      stiletto: { nome: "Stiletto", ponta: 30, d: "M150 30 C164 84 204 150 204 200 L204 282 Q204 302 184 302 L116 302 Q96 302 96 282 L96 200 C96 150 136 84 150 30 Z" },
    };
    const CORES = { rosa: "Rosa", nude: "Nude", vermelho: "Vermelho", vinho: "Vinho", lilas: "Lilás", leitoso: "Leitoso" };
    const CLARAS = ["nude", "lilas", "leitoso"]; // nelas o carimbo usa tinta vinho
    const CARIMBOS = { flores: "flores", coracoes: "corações", folhagem: "folhagem" };

    const svg = document.getElementById("desenho");
    const desc = document.getElementById("desenho-desc");
    const formas = svg.querySelectorAll(".forma-unha");
    const gelAtual = document.getElementById("gelAtual");
    const gelNovo = document.getElementById("gelNovo");
    const lixa = document.getElementById("lixa");
    const po = document.getElementById("po");
    const carimbo = document.getElementById("carimbo");
    const cabeca = document.getElementById("carimboCabeca");
    const cabine = document.getElementById("cabine");
    const glitter = document.getElementById("glitter");
    const resultado = document.getElementById("resultado");
    const NS = "http://www.w3.org/2000/svg";
    const estado = { formato: "almond", cor: "rosa", acabamento: "liso", carimbo: "nenhum" };
    const anims = {};

    const anima = () => window.gsap && document.getElementById("chaveMov").getAttribute("aria-pressed") === "true"
      && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const corGel = (v) => `var(--cor-gel-${v})`;
    const terminar = (tipo) => { if (anims[tipo]) anims[tipo].progress(1).kill(); anims[tipo] = null; };

    /* glitter: pontos fixos (sempre os mesmos), mais densos perto da ponta */
    let semente = 7;
    const sorteio = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 80; i++) {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", (88 + sorteio() * 124).toFixed(1));
      c.setAttribute("cy", (26 + Math.pow(sorteio(), 1.7) * 270).toFixed(1));
      c.setAttribute("r", (0.8 + sorteio() * 1.8).toFixed(1));
      glitter.appendChild(c);
    }

    function descrever() {
      const partes = [`Unha ${FORMAS[estado.formato].nome.toLowerCase()} esmaltada em gel ${CORES[estado.cor].toLowerCase()}`];
      if (estado.acabamento === "francesinha") partes.push("com francesinha");
      if (estado.acabamento === "glitter") partes.push("com glitter");
      partes.push(estado.carimbo === "nenhum" ? "sem desenho" : `com carimbo de ${CARIMBOS[estado.carimbo]}`);
      desc.textContent = partes.join(", ") + ".";
    }

    function tinta() {
      const clara = CLARAS.includes(estado.cor);
      svg.style.setProperty("--tinta", clara ? "var(--cor-fundo)" : "var(--cor-texto)");
      svg.style.setProperty("--tinta-miolo", clara ? "var(--cor-acao)" : "var(--cor-fundo)");
    }

    /* botão da cabine: convida (LEDs em sequência), cura (LEDs acesos), pronta */
    const botaoFinal = document.getElementById("finalizar");
    const textoFinal = document.getElementById("finalizarTexto");
    function estadoBotao(qual) {
      botaoFinal.classList.toggle("convida", qual === "convida");
      botaoFinal.classList.toggle("curando", qual === "curando");
      botaoFinal.classList.toggle("pronta", qual === "pronta");
      botaoFinal.setAttribute("aria-disabled", String(qual === "curando"));
      textoFinal.textContent = { convida: "Finalizar na cabine de LED", curando: "Curando na cabine…", pronta: "Unha pronta!" }[qual];
    }
    /* começa a convidar quando o estúdio aparece na tela */
    new IntersectionObserver(([item], obs) => {
      if (item.isIntersecting) { estadoBotao("convida"); obs.disconnect(); }
    }, { threshold: 0.3 }).observe(botaoFinal);

    function editando() { // qualquer mudança depois de pronta volta ao modo de edição
      svg.classList.remove("pronta");
      resultado.hidden = true;
      if (!botaoFinal.classList.contains("curando")) estadoBotao("convida");
    }

    /* formato: a lixa passa pela ponta e o formato muda no meio da passada */
    function formato(v, anterior) {
      terminar("formato");
      const trocar = () => formas.forEach((f) => f.setAttribute("d", FORMAS[v].d));
      if (!anima()) { trocar(); return; }
      const y = Math.min(FORMAS[anterior].ponta, FORMAS[v].ponta) + 18;
      const tl = gsap.timeline({ defaults: { ease: EASE.saida } });
      tl.set(lixa, { x: 40, y, rotation: -6, opacity: 0 })
        .to(lixa, { x: 110, opacity: 1, duration: 0.25 })
        .to(lixa, { x: 190, duration: 0.22, ease: "sine.inOut" })
        .call(() => { trocar(); poeira(y); })
        .to(lixa, { x: 120, duration: 0.2, ease: "sine.inOut" })
        .to(lixa, { x: 260, opacity: 0, duration: 0.3, ease: EASE.entrada });
      anims.formato = tl;
    }

    function poeira(y) {
      for (let i = 0; i < 10; i++) {
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("r", (1 + Math.random() * 1.6).toFixed(1));
        c.setAttribute("cx", 120 + Math.random() * 60);
        c.setAttribute("cy", y);
        po.appendChild(c);
        gsap.to(c, {
          y: 30 + Math.random() * 60, x: (Math.random() - 0.5) * 60, opacity: 0,
          duration: 0.7 + Math.random() * 0.4, ease: "power1.in", onComplete: () => c.remove(),
        });
      }
    }

    /* cor: a camada nova sobe da cutícula até a ponta, como o gel sendo pincelado */
    function cor(v) {
      terminar("cor");
      tinta();
      if (!anima()) { gelAtual.style.setProperty("--gel-cor", corGel(v)); return; }
      gelNovo.style.setProperty("--gel-cor", corGel(v));
      anims.cor = gsap.timeline()
        .fromTo(gelNovo, { attr: { y: 302, height: 0 } }, { attr: { y: 20, height: 290 }, duration: DUR.entrada, ease: EASE.saida })
        .call(() => {
          gelAtual.style.setProperty("--gel-cor", corGel(v));
          gsap.set(gelNovo, { attr: { y: 302, height: 0 } });
        });
    }

    /* acabamento: a francesinha é pintada a partir da ponta; o glitter cai e assenta */
    function acabamento(v) {
      terminar("acabamento");
      svg.dataset.acabamento = v;
      if (!anima()) return;
      if (v === "francesinha") anims.acabamento = gsap.fromTo("#ponta", { y: -80 }, { y: 0, duration: DUR.entrada, ease: EASE.saida });
      if (v === "glitter") {
        anims.acabamento = gsap.fromTo(glitter.children, { opacity: 0, y: -14, scale: 0, transformOrigin: "50% 50%" },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: EASE.mola, stagger: { each: 0.006, from: "random" } });
      }
    }

    /* carimbo: desce, aperta (a cabeça de silicone achata), deixa o desenho e sobe */
    function carimbar(v) {
      terminar("carimbo");
      const aplicar = () => { svg.dataset.carimbo = v; };
      if (v === "nenhum" || !anima()) {
        if (v === "nenhum" && anima() && svg.dataset.carimbo) {
          anims.carimbo = gsap.to("#carimbos", { opacity: 0, duration: DUR.saida, ease: EASE.entrada,
            onComplete: () => { aplicar(); gsap.set("#carimbos", { opacity: 1 }); } });
        } else aplicar();
        return;
      }
      const estampa = svg.querySelector(`.estampa[data-carimbo="${v}"]`);
      const tl = gsap.timeline({ defaults: { ease: EASE.saida } });
      tl.set(carimbo, { x: 150, y: -40, opacity: 0 })
        .set(cabeca, { scaleY: 1, svgOrigin: "0 6" })
        .to(carimbo, { y: 40, opacity: 1, duration: 0.3 })
        .to(carimbo, { y: 196, duration: 0.35, ease: EASE.entrada })
        .to(cabeca, { scaleY: 0.55, duration: 0.12, ease: "power2.out" })
        .call(aplicar)
        .fromTo(estampa, { opacity: 0, scale: 1.08, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.4 }, "<")
        .to(cabeca, { scaleY: 1, duration: 0.25, ease: EASE.mola }, "+=0.08")
        .to(carimbo, { y: -40, opacity: 0, duration: 0.45, ease: EASE.entrada }, "<");
      anims.carimbo = tl;
    }

    /* finalizar: cabine de LED desce, acende, sobe; o reflexo passa e o brilho aparece */
    function finalizar() {
      if (botaoFinal.classList.contains("curando")) return;
      botaoFinal.classList.remove("apertou");
      void botaoFinal.offsetWidth; // reinicia a onda do clique
      botaoFinal.classList.add("apertou");
      ["formato", "cor", "acabamento", "carimbo", "final"].forEach(terminar);
      const mostrar = () => {
        svg.classList.add("pronta");
        const itens = [
          [`Formato ${FORMAS[estado.formato].nome.toLowerCase()}`, "Módulo 2"],
          [`Esmaltação em gel ${CORES[estado.cor].toLowerCase()}`, "Módulo 7"],
        ];
        if (estado.acabamento === "francesinha") itens.push(["Francesinha", "No curso"]);
        if (estado.acabamento === "glitter") itens.push(["Chuva de glitter", "Módulo 10"]);
        if (estado.carimbo !== "nenhum") itens.push([`Técnica do carimbo (${CARIMBOS[estado.carimbo]})`, "Módulo 10"]);
        itens.push(["Cura na cabine de LED", "Módulo 1"]);
        document.getElementById("resultadoQtd").textContent = `${itens.length} técnicas`;
        const lista = document.getElementById("resultadoLista");
        lista.replaceChildren(...itens.map(([t, m]) => {
          const li = document.createElement("li");
          li.textContent = t + " ";
          const s = document.createElement("span");
          s.textContent = m;
          li.appendChild(s);
          return li;
        }));
        resultado.hidden = false;
        estadoBotao("pronta");
        if (anima()) gsap.from(resultado.children, { opacity: 0, y: 16, duration: DUR.entrada, ease: EASE.saida, stagger: 0.08 });
      };
      if (!anima()) { mostrar(); return; }
      editando();
      estadoBotao("curando");
      gsap.fromTo(botaoFinal, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: EASE.mola, clearProps: "transform" });
      const tl = gsap.timeline({ defaults: { ease: EASE.saida } });
      tl.set(cabine, { y: -190, opacity: 0 })
        .set("#reflexo", { x: -140 })
        .set("#brilho", { scale: 0, rotate: -90, svgOrigin: "240 42" })
        .to(cabine, { y: 0, opacity: 1, duration: 0.6 })
        .call(() => cabine.classList.add("acesa"))
        .to(".cabine-luz", { opacity: 0.85, duration: 0.3, ease: EASE.entrada })
        .to({}, { duration: 0.7 }) // pausa: curando
        .call(() => cabine.classList.remove("acesa"))
        .to(".cabine-luz", { opacity: 0, duration: 0.2 })
        .to(cabine, { y: -190, opacity: 0, duration: 0.5, ease: EASE.entrada }, "<")
        .call(() => svg.classList.add("pronta"))
        .to("#reflexo", { x: 200, duration: 0.8, ease: "none" }, "-=0.1")
        .to("#brilho", { scale: 1, rotate: 0, duration: 0.6, ease: EASE.mola }, "<0.3")
        .call(mostrar);
      anims.final = tl;
    }

    /* escolhas */
    const acoes = { formato, cor, acabamento, carimbo: carimbar };
    svg.dataset.acabamento = "liso";
    svg.dataset.carimbo = "nenhum";
    tinta();
    document.querySelectorAll(".opcoes").forEach((grupo) => {
      grupo.addEventListener("click", (e) => {
        const botao = e.target.closest(".opcao");
        if (!botao || botao.getAttribute("aria-pressed") === "true") return;
        grupo.querySelectorAll(".opcao").forEach((b) => b.setAttribute("aria-pressed", String(b === botao)));
        const tipo = grupo.dataset.grupo;
        const anterior = estado[tipo];
        estado[tipo] = botao.dataset.valor; // o estado muda antes: a tinta e a descrição leem o valor novo
        editando();
        acoes[tipo](botao.dataset.valor, anterior);
        descrever();
      });
    });
    document.getElementById("finalizar").addEventListener("click", finalizar);

    /* abas: clique ou setas do teclado */
    const abas = [...document.querySelectorAll(".aba")];
    const abrirAba = (aba, focar) => {
      abas.forEach((a) => {
        const sim = a === aba;
        a.setAttribute("aria-selected", String(sim));
        a.tabIndex = sim ? 0 : -1;
        document.getElementById(a.getAttribute("aria-controls")).hidden = !sim;
      });
      if (focar) aba.focus();
    };
    abas.forEach((aba, i) => {
      aba.addEventListener("click", () => abrirAba(aba));
      aba.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") abrirAba(abas[(i + 1) % abas.length], true);
        if (e.key === "ArrowLeft") abrirAba(abas[(i - 1 + abas.length) % abas.length], true);
      });
    });
  })();

  /* ---------- Purpurina: glitter flutuante, rastro de luz e punhado no toque ----------
     Desenho próprio em canvas, atrás do conteúdo. Para com a aba escondida, com "reduzir movimento"
     e com a chave "Movimento" desligada. */
  (function purpurina() {
    const tela = document.getElementById("purpurina");
    const ctx = tela.getContext("2d");
    const chaveMov = document.getElementById("chaveMov");
    const reduzir = matchMedia("(prefers-reduced-motion: reduce)");
    const CORES = ["--cor-texto", "--cor-rosa", "--cor-acao"].map(token);
    const LUZ = token("--cor-luz");
    const TRILHA_MS = 380;   // quanto tempo o rastro de luz dura
    const RAIO_DESVIO = 90;  // distância em que a purpurina foge do cursor
    const MAX_GRAOS = 420;
    const RAIO_HALO = 140;   // luz macia que acompanha o cursor ou o dedo
    const ROSA = token("--cor-acao");

    let L = 0, A = 0, ambiente = [], graos = [], trilha = [], foguetes = [];
    let ligado = false, ultimo = 0, quadro = 0, halo = 0;
    let rolagemAnterior = scrollY, velRolagem = 0;
    const ponteiro = { x: -999, y: -999, ativo: false };

    const sorteiaCor = () => CORES[Math.floor(Math.random() * CORES.length)];

    function criarAmbiente() {
      const z = 0.3 + Math.random() * 0.7; // profundidade: os de perto são maiores, mais claros e mais rápidos
      return {
        x: Math.random() * L, y: Math.random() * A, z,
        r: 0.8 + z * 2,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -(0.04 + Math.random() * 0.12) * z,
        fase: Math.random() * Math.PI * 2,
        pisca: 0.5 + Math.random() * 1.2,
        cor: sorteiaCor(),
        estrela: Math.random() < 0.32,
      };
    }

    function medir() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      L = innerWidth; A = innerHeight;
      tela.width = Math.round(L * dpr);
      tela.height = Math.round(A * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(110, (L * A) / 7000));
      ambiente = Array.from({ length: n }, criarAmbiente);
    }

    function estrela(x, y, r) { // brilho de quatro pontas, como o do logo
      const k = r * 2.6;
      ctx.beginPath();
      ctx.moveTo(x, y - k);
      ctx.quadraticCurveTo(x, y, x + k, y);
      ctx.quadraticCurveTo(x, y, x, y + k);
      ctx.quadraticCurveTo(x, y, x - k, y);
      ctx.quadraticCurveTo(x, y, x, y - k);
      ctx.fill();
    }
    function ponto(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

    /* fogos: cada foguete sobe deixando rastro e explode num estouro de purpurina */
    function explodir(x, y) {
      const n = 38;
      for (let i = 0; i < n; i++) {
        if (graos.length >= MAX_GRAOS) graos.shift();
        const ang = (i / n) * Math.PI * 2 + Math.random() * 0.2;
        const v = 1.3 + Math.random() * 1.8; // estouro compacto, para caber no vão acima do rodapé
        graos.push({
          x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
          r: 1.1 + Math.random() * 1.8, vida: 1, dur: 55 + Math.random() * 45,
          cor: sorteiaCor(), estrela: Math.random() < 0.45, cintila: true,
        });
      }
    }
    /* sete foguetes saem da assinatura, um atrás do outro, e explodem na faixa [topo, base] da tela */
    function lancarFogos(x, y, topo, base) {
      if (!ligado) return;
      const QTD = 7;
      for (let i = 0; i < QTD; i++) {
        const alvoX = L * (0.14 + 0.72 * ((i * 3) % QTD) / (QTD - 1)); // espalhados pela largura, fora de ordem
        const alvoY = topo + Math.random() * Math.max(10, base - topo);
        const subida = Math.max(40, y - alvoY);
        const vy = -Math.sqrt(2 * 0.16 * subida) * 1.25; // força para chegar ao alvo ainda subindo
        const tempo = subida / (-vy * 0.8);
        foguetes.push({
          x: x + (Math.random() - 0.5) * 30, y, vx: (alvoX - x) / tempo, vy, alvoY,
          espera: i * 7, cor: sorteiaCor(),
        });
      }
    }
    window.basileusFogos = lancarFogos;

    function soltar(x, y, n, forca, vx = 0, vy = 0) {
      for (let i = 0; i < n; i++) {
        if (graos.length >= MAX_GRAOS) graos.shift();
        const ang = Math.random() * Math.PI * 2;
        const v = Math.random() * forca;
        graos.push({
          x, y,
          vx: Math.cos(ang) * v + vx * 0.12,
          vy: Math.sin(ang) * v + vy * 0.12 - 0.3,
          r: 1 + Math.random() * 2.2,
          vida: 1,
          dur: 40 + Math.random() * 40, // em quadros
          cor: sorteiaCor(),
          estrela: Math.random() < 0.3,
        });
      }
    }

    function passo(t) {
      if (!ligado) return;
      const dt = Math.min((t - ultimo) / 16.67, 3) || 1;
      ultimo = t;
      const sy = scrollY;
      velRolagem += ((sy - rolagemAnterior) - velRolagem) * 0.2;
      rolagemAnterior = sy;
      ctx.clearRect(0, 0, L, A);

      /* purpurina do ambiente */
      for (const p of ambiente) {
        p.fase += 0.03 * p.pisca * dt;
        p.x += p.vx * dt;
        p.y += (p.vy - velRolagem * 0.3 * p.z) * dt; // escorre com a rolagem
        if (ponteiro.ativo) {
          const dx = p.x - ponteiro.x, dy = p.y - ponteiro.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < RAIO_DESVIO * RAIO_DESVIO) {
            const d = Math.sqrt(d2) || 1;
            const f = ((RAIO_DESVIO - d) / RAIO_DESVIO) * 1.8 * dt;
            p.x += (dx / d) * f;
            p.y += (dy / d) * f;
          }
        }
        if (p.y < -12) p.y = A + 12;
        if (p.y > A + 12) p.y = -12;
        if (p.x < -12) p.x = L + 12;
        if (p.x > L + 12) p.x = -12;
        ctx.globalAlpha = (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(p.fase))) * p.z;
        ctx.fillStyle = p.cor;
        (p.estrela ? estrela : ponto)(p.x, p.y, p.r);
      }

      /* halo: luz rosa macia onde está o ponteiro (some quando ele sai) */
      halo += ((ponteiro.ativo ? 1 : 0) - halo) * 0.08 * dt;
      if (halo > 0.01) {
        const g = ctx.createRadialGradient(ponteiro.x, ponteiro.y, 0, ponteiro.x, ponteiro.y, RAIO_HALO);
        g.addColorStop(0, ROSA);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.16 * halo;
        ctx.fillStyle = g;
        ctx.fillRect(ponteiro.x - RAIO_HALO, ponteiro.y - RAIO_HALO, RAIO_HALO * 2, RAIO_HALO * 2);
        ctx.globalAlpha = 1;
      }

      /* rastro de luz: fio fino que some em menos de meio segundo */
      trilha = trilha.filter((q) => t - q.t < TRILHA_MS);
      if (trilha.length > 1) {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        ctx.strokeStyle = LUZ;
        for (let i = 1; i < trilha.length; i++) {
          const idade = (t - trilha[i].t) / TRILHA_MS;
          ctx.globalAlpha = (1 - idade) * 0.5;
          ctx.lineWidth = 1.5 + (1 - idade) * 6;
          ctx.beginPath();
          ctx.moveTo(trilha[i - 1].x, trilha[i - 1].y);
          ctx.lineTo(trilha[i].x, trilha[i].y);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      }

      /* foguetes: sobem perdendo força e explodem no alto */
      for (let i = foguetes.length - 1; i >= 0; i--) {
        const f = foguetes[i];
        if (f.espera > 0) { f.espera -= dt; continue; }
        f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 0.16 * dt;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = f.cor;
        ponto(f.x, f.y, 2.2);
        if (Math.random() < 0.8) soltar(f.x, f.y, 1, 0.4);
        if (f.y <= f.alvoY || f.vy >= -1.2) { explodir(f.x, f.y); foguetes.splice(i, 1); }
      }

      /* grãos soltos pelo dedo ou pelo mouse: espalham, caem e somem */
      for (let i = graos.length - 1; i >= 0; i--) {
        const g = graos[i];
        g.vida -= dt / g.dur;
        if (g.vida <= 0) { graos.splice(i, 1); continue; }
        g.vx *= 0.96;
        g.vy = g.vy * 0.96 + 0.05 * dt; // gravidade leve: o glitter cai
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        ctx.globalAlpha = g.cintila ? g.vida * (0.55 + 0.45 * Math.sin(t / 45 + g.r * 9)) : g.vida;
        ctx.fillStyle = g.cor;
        (g.estrela ? estrela : ponto)(g.x, g.y, g.r * (0.4 + 0.6 * g.vida));
      }
      ctx.globalAlpha = 1;
      quadro = requestAnimationFrame(passo);
    }

    function mover(x, y) {
      if (ponteiro.ativo) {
        const dx = x - ponteiro.x, dy = y - ponteiro.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 2) soltar(x, y, Math.min(6, 2 + Math.floor(dist / 10)), 1.1, dx, dy);
      }
      trilha.push({ x, y, t: performance.now() });
      ponteiro.x = x; ponteiro.y = y; ponteiro.ativo = true;
    }

    /* mouse e caneta: pointermove; dedo: touchmove (continua valendo enquanto a página rola) */
    addEventListener("pointermove", (e) => { if (ligado && e.pointerType !== "touch") mover(e.clientX, e.clientY); }, { passive: true });
    addEventListener("touchmove", (e) => { if (ligado && e.touches[0]) mover(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    addEventListener("pointerdown", (e) => {
      if (!ligado) return;
      ponteiro.x = e.clientX; ponteiro.y = e.clientY; ponteiro.ativo = true;
      soltar(e.clientX, e.clientY, 22, 3.2);
    }, { passive: true });
    const soltarPonteiro = () => { ponteiro.ativo = false; trilha = []; };
    addEventListener("touchend", soltarPonteiro, { passive: true });
    document.documentElement.addEventListener("pointerleave", soltarPonteiro);

    function atualizar() {
      const deve = chaveMov.getAttribute("aria-pressed") === "true" && !reduzir.matches && !document.hidden;
      if (deve && !ligado) {
        ligado = true;
        tela.hidden = false;
        medir();
        ultimo = performance.now();
        rolagemAnterior = scrollY;
        quadro = requestAnimationFrame(passo);
      } else if (!deve && ligado) {
        ligado = false;
        cancelAnimationFrame(quadro);
        graos = []; trilha = []; foguetes = [];
        ctx.clearRect(0, 0, L, A);
        tela.hidden = true;
      }
    }
    addEventListener("resize", () => { if (ligado) medir(); });
    document.addEventListener("visibilitychange", atualizar);
    reduzir.addEventListener("change", atualizar);
    new MutationObserver(atualizar).observe(chaveMov, { attributes: true, attributeFilter: ["aria-pressed"] });
    atualizar();
  })();

  /* ---------- 3b. Uma vez, para sempre: os 12 meses de salão contra uma parcela única ---------- */
  (function umaVez() {
    const PRECO_CURSO = 79.9;
    const gasto = document.getElementById("gastoSalao");
    const saida = document.getElementById("gastoSaida");
    const ano = document.getElementById("gastoAno");
    const frase = document.getElementById("gastoFrase");
    const meses = [...document.querySelectorAll(".mes")];
    const reais = (v) => "R$ " + Math.round(v).toLocaleString("pt-BR");
    const anima = () => window.gsap && document.getElementById("chaveMov").getAttribute("aria-pressed") === "true"
      && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    function atualizar() {
      const v = Number(gasto.value);
      gasto.style.setProperty("--progresso", ((v - gasto.min) / (gasto.max - gasto.min)) * 100 + "%");
      gasto.setAttribute("aria-valuetext", `${v} reais por mês`);
      saida.textContent = reais(v);
      ano.textContent = reais(v * 12);
      meses.forEach((m) => { m.querySelector(".mes-valor").textContent = reais(v); });
      const n = Math.ceil(PRECO_CURSO / v);
      frase.textContent = n <= 1
        ? "O curso custa menos que 1 mês de salão. Depois, as suas unhas são feitas por você, para sempre."
        : `O curso custa menos que ${n} meses de salão. Depois, as suas unhas são feitas por você, para sempre.`;
    }
    gasto.addEventListener("input", atualizar);
    atualizar();

    /* os meses "cobram" um a um quando o quadro aparece; a cliente dá voltas no laço do negócio */
    const quadro = document.getElementById("meses");
    new IntersectionObserver(([item], obs) => {
      if (!item.isIntersecting) return;
      obs.disconnect();
      if (!anima()) { meses.forEach((m) => m.classList.add("cobrado")); return; }
      meses.forEach((m, i) => setTimeout(() => {
        m.classList.add("cobrado");
        gsap.fromTo(m, { scale: 0.85 }, { scale: 1, duration: 0.4, ease: EASE.mola });
      }, 140 * i));
    }, { threshold: 0.5 }).observe(quadro);
    const caminho = document.querySelector(".voltas-caminho");
    const cliente = document.querySelector(".voltas-cliente");
    let voltas = null;
    new IntersectionObserver(([item]) => {
      if (!anima() || !caminho.getTotalLength) return;
      if (item.isIntersecting && !voltas) {
        const L = caminho.getTotalLength();
        const p = { t: 0 };
        voltas = gsap.to(p, {
          t: 1, duration: 4.5, ease: "none", repeat: -1, // velocidade constante: é uma volta, não uma entrada
          onUpdate: () => { const q = caminho.getPointAtLength(p.t * L); cliente.setAttribute("cx", q.x); cliente.setAttribute("cy", q.y); },
        });
      } else if (!item.isIntersecting && voltas) { voltas.kill(); voltas = null; }
    }).observe(caminho);
  })();

  /* ---------- 4. Quanto você pode ganhar: a agenda enche conforme ela arrasta ----------
     Valores de exemplo dos anúncios (R$ 60, 22 dias úteis). Simulação, não promessa. */
  (function ganhos() {
    const DIAS = 22;
    const PRECO_CURSO = 79.9;
    const clientes = document.getElementById("clientesDia");
    const valor = document.getElementById("valorAtendimento");
    const agenda = document.getElementById("agendaDias");
    const saidaClientes = document.getElementById("clientesSaida");
    const saidaValor = document.getElementById("valorSaida");
    const conta = document.getElementById("ganhosConta");
    const total = document.getElementById("ganhosValor");
    const paga = document.getElementById("ganhosPaga");
    const reais = (v) => "R$ " + Math.round(v).toLocaleString("pt-BR");
    const anima = () => window.gsap && document.getElementById("chaveMov").getAttribute("aria-pressed") === "true"
      && !matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* monta os 22 dias, cada um com 10 lugares */
    const dias = [];
    for (let d = 0; d < DIAS; d++) {
      const dia = document.createElement("div");
      dia.className = "dia";
      for (let c = 0; c < 10; c++) dia.appendChild(document.createElement("i"));
      agenda.appendChild(dia);
      dias.push([...dia.children]);
    }

    const mostrado = { v: 0 };
    let animTotal = null;

    function progresso(input) {
      const p = ((input.value - input.min) / (input.max - input.min)) * 100;
      input.style.setProperty("--progresso", p + "%");
    }

    function atualizar() {
      const n = Number(clientes.value);
      const v = Number(valor.value);
      const mes = n * v * DIAS;
      progresso(clientes);
      progresso(valor);
      saidaClientes.textContent = n;
      saidaValor.textContent = reais(v);
      clientes.setAttribute("aria-valuetext", `${n} ${n === 1 ? "cliente" : "clientes"} por dia`);
      valor.setAttribute("aria-valuetext", `${v} reais`);
      conta.textContent = `${n} ${n === 1 ? "cliente" : "clientes"} × ${reais(v)} × ${DIAS} dias úteis`;
      const atend = Math.ceil(PRECO_CURSO / v);
      paga.textContent = atend === 1
        ? "Com 1 atendimento, o curso já se pagou."
        : `Com ${atend} atendimentos, o curso já se pagou.`;

      /* bolinhas: as novas aparecem dia após dia; as que saem somem rápido */
      const novas = [], saem = [];
      dias.forEach((lugares) => lugares.forEach((b, i) => {
        const deve = i < n;
        if (deve && !b.classList.contains("cheia")) novas.push(b);
        if (!deve && b.classList.contains("cheia")) saem.push(b);
      }));
      if (anima()) {
        gsap.killTweensOf([...novas, ...saem]);
        novas.forEach((b) => b.classList.add("cheia"));
        saem.forEach((b) => b.classList.remove("cheia"));
        if (novas.length) gsap.fromTo(novas, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: EASE.mola, stagger: { amount: 0.35 } });
        if (saem.length) gsap.fromTo(saem, { scale: 1, opacity: 1 }, { scale: 0, opacity: 0, duration: 0.2, ease: EASE.entrada, clearProps: "transform,opacity" });
        if (animTotal) animTotal.kill();
        animTotal = gsap.to(mostrado, { v: mes, duration: 0.6, ease: EASE.saida, onUpdate: () => { total.textContent = reais(mostrado.v); } });
      } else {
        novas.forEach((b) => { b.classList.add("cheia"); b.style.cssText = ""; });
        saem.forEach((b) => { b.classList.remove("cheia"); b.style.cssText = ""; });
        mostrado.v = mes;
        total.textContent = reais(mes);
      }
    }

    clientes.addEventListener("input", atualizar);
    valor.addEventListener("input", atualizar);
    atualizar();
  })();

  /* ---------- 5. Comentários: faixas que correm sozinhas e param para ler ---------- */
  (function comentarios() {
    const faixas = [...document.querySelectorAll(".faixa")];
    const chaveMov = document.getElementById("chaveMov");
    const reduzir = matchMedia("(prefers-reduced-motion: reduce)");
    const copias = faixas.map((f) => {
      const trilho = f.querySelector(".faixa-trilho");
      const original = [...trilho.children];
      return () => original.map((li) => { // segundo conjunto, só para o laço visual
        const c = li.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        c.setAttribute("inert", "");
        c.classList.add("copia");
        trilho.appendChild(c);
        return c;
      });
    });
    let ligadas = false;
    function atualizar() {
      const deve = chaveMov.getAttribute("aria-pressed") === "true" && !reduzir.matches;
      if (deve === ligadas) return;
      ligadas = deve;
      faixas.forEach((f, i) => {
        if (deve) { copias[i](); f.classList.add("corre"); f.scrollLeft = 0; }
        else { f.classList.remove("corre", "parada"); f.querySelectorAll(".copia").forEach((c) => c.remove()); }
      });
    }
    /* no celular: o dedo segura a faixa parada enquanto está nela */
    faixas.forEach((f) => {
      f.addEventListener("touchstart", () => f.classList.add("parada"), { passive: true });
      f.addEventListener("touchend", () => setTimeout(() => f.classList.remove("parada"), 1500), { passive: true });
    });
    reduzir.addEventListener("change", atualizar);
    new MutationObserver(atualizar).observe(chaveMov, { attributes: true, attributeFilter: ["aria-pressed"] });
    atualizar();
  })();

  /* ---------- Perguntas: abrem e fecham com altura animada (sem movimento, o comportamento nativo) ---------- */
  (function perguntas() {
    const anima = () => window.gsap && document.getElementById("chaveMov").getAttribute("aria-pressed") === "true"
      && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll(".pergunta").forEach((d) => {
      const resp = d.querySelector(".resposta");
      d.querySelector("summary").addEventListener("click", (e) => {
        if (!anima()) return;
        e.preventDefault();
        gsap.killTweensOf(resp);
        if (d.open) {
          gsap.to(resp, { height: 0, opacity: 0, duration: DUR.saida, ease: EASE.entrada,
            onComplete: () => { d.open = false; gsap.set(resp, { clearProps: "height,opacity" }); } });
        } else {
          d.open = true;
          gsap.fromTo(resp, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: DUR.entrada, ease: EASE.saida, clearProps: "height" });
        }
      });
    });
  })();

  /* WhatsApp do fechamento usa a mesma mensagem pronta */
  document.querySelectorAll("[data-zap]").forEach((a) => { a.href = zap.href; });

  /* ---------- Assinatura: a coroa dá um pulo (a purpurina do toque faz o resto) ---------- */
  document.getElementById("assinatura").addEventListener("click", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    /* os fogos explodem no vão entre o botão do WhatsApp e o texto do rodapé */
    const acima = document.querySelector(".fechamento-acoes").getBoundingClientRect().bottom;
    const abaixo = document.querySelector(".rodape p").getBoundingClientRect().top;
    const topo = Math.max(40, acima + 24), base = Math.max(topo + 10, abaixo - 24);
    if (window.basileusFogos) window.basileusFogos(r.left + r.width / 2, r.top, topo, base);
    if (!window.gsap || document.getElementById("chaveMov").getAttribute("aria-pressed") !== "true"
      || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.timeline()
      .to(".coroa", { y: -10, rotate: -12, scale: 1.25, duration: 0.25, ease: EASE.saida })
      .to(".coroa", { y: 0, rotate: 0, scale: 1, duration: 0.6, ease: EASE.mola });
  });

  /* ---------- Movimento ---------- */
  if (!window.gsap || !window.ScrollTrigger) return; // sem biblioteca, a página fica parada e completa
  gsap.registerPlugin(ScrollTrigger);

  const chave = document.getElementById("chaveMov");
  let movimento = true;
  let mm = gsap.matchMedia();

  function montar() {
    mm.add(
      { pode: "(prefers-reduced-motion: no-preference)", larga: "(min-width: 900px)" },
      (ctx) => {
        if (!ctx.conditions.pode || !movimento) return;

        /* rolagem amortecida */
        lenis = window.Lenis ? new Lenis({ lerp: 0.12 }) : null;
        const passo = (t) => lenis && lenis.raf(t * 1000);
        if (lenis) {
          lenis.on("scroll", ScrollTrigger.update);
          gsap.ticker.add(passo);
          gsap.ticker.lagSmoothing(0);
        }

        const soltarAbertura = entradaAbertura(ctx.conditions.larga);
        const soltarGaleria = galeria();
        revelar();

        return () => {
          if (soltarAbertura) soltarAbertura();
          soltarGaleria();
          gsap.ticker.remove(passo);
          if (lenis) { lenis.destroy(); lenis = null; }
        };
      }
    );
  }

  /* 1. Abertura: a foto de fundo entra num zoom lento; os textos entram em camadas por cima. */
  function entradaAbertura(larga) {
    const foto = document.querySelector(".abertura-fundo img");
    const tl = gsap.timeline({ defaults: { ease: EASE.saida, duration: DUR.entrada } });

    tl.fromTo(foto, { scale: 1.18, opacity: 0 }, { scale: 1.04, opacity: 1, duration: DUR.entrada * 2.4 }, 0)
      .from(".abertura-legenda", { opacity: 0, y: -8 }, 1.2)
      .from(".abertura .sobretitulo", { y: 16, opacity: 0, duration: DUR.entrada * 0.7 }, 0.25)
      .from("h1 .linha", { yPercent: 60, opacity: 0, scale: 0.94, transformOrigin: "0% 100%", stagger: 0.12 }, 0.32)
      .from("h1 em", { scale: 0.6, rotate: -6, opacity: 0, ease: EASE.mola, transformOrigin: "20% 80%" }, 0.65)
      .from(".apoio", { y: 18, opacity: 0 }, 0.7)
      .from(".preco > *", { y: 22, opacity: 0, scale: 0.96, transformOrigin: "0% 50%", stagger: 0.1 }, 0.82)
      .from(".acoes > *", { y: 18, opacity: 0, stagger: 0.12 }, 1.05);

    /* A foto reage: acompanha o cursor de leve (computador) e sobe mais devagar que a página (celular e computador). */
    gsap.to(foto, {
      yPercent: 12, ease: "none",
      scrollTrigger: { trigger: ".abertura", start: "top top", end: "bottom top", scrub: true },
    });
    if (larga) {
      const moverX = gsap.quickTo(foto, "x", { duration: 1.2, ease: EASE.saida });
      const moverY = gsap.quickTo(foto, "y", { duration: 1.2, ease: EASE.saida });
      const abertura = document.querySelector(".abertura");
      const aoMover = (e) => {
        const r = abertura.getBoundingClientRect();
        moverX(((e.clientX - r.left) / r.width - 0.5) * -24);
        moverY(((e.clientY - r.top) / r.height - 0.5) * -16);
      };
      const aoSair = () => { moverX(0); moverY(0); };
      abertura.addEventListener("pointermove", aoMover);
      abertura.addEventListener("pointerleave", aoSair);
      return () => { // chamado pelo matchMedia ao desfazer
        abertura.removeEventListener("pointermove", aoMover);
        abertura.removeEventListener("pointerleave", aoSair);
      };
    }
  }

  /* Seções finais: itens entram em camadas quando aparecem; o preço tem o risco desenhado e o valor que cresce. */
  function revelar() {
    ScrollTrigger.batch("[data-revela]", {
      start: "top 88%",
      once: true,
      onEnter: (lote) => gsap.fromTo(lote, { opacity: 0, y: 28, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: DUR.entrada, ease: EASE.saida, stagger: 0.1, overwrite: true }),
    });
    gsap.set("[data-revela]", { opacity: 0 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: ".oferta", start: "top 70%", once: true } });
    tl.fromTo(".riscado", { "--risco": 0 }, { "--risco": 1, duration: 0.5, ease: EASE.entrada }, 0.2)
      .from(".ancora-por", { scale: 0.7, opacity: 0, duration: DUR.entrada, ease: EASE.mola }, 0.55)
      .from(".ancora-parcela, .economia", { y: 16, opacity: 0, duration: DUR.entrada, ease: EASE.saida, stagger: 0.1 }, 0.8)
      .from(".sempre, .oferta .botao-grande, .garantia-bloco", { y: 20, opacity: 0, duration: DUR.entrada, ease: EASE.saida, stagger: 0.1 }, 1);
    gsap.from(".fechamento-miolo > *", {
      y: 24, opacity: 0, duration: DUR.entrada, ease: EASE.saida, stagger: 0.1,
      scrollTrigger: { trigger: ".fechamento", start: "top 75%", once: true },
    });
  }

  /* 3. Galeria em leque: a foto da frente encara a pessoa, as outras giram em perspectiva para os lados.
     Arrastar, setas, teclado ou tocar numa foto lateral. Em repouso (sem movimento) é uma faixa com encaixe. */
  function galeria() {
    const caixa = document.getElementById("galeria");
    const trilho = document.getElementById("galeriaTrilho");
    const itens = gsap.utils.toArray(".galeria-item");
    const fotos = itens.map((i) => i.querySelector(".galeria-foto"));
    const nomes = itens.map((i) => i.querySelector(".galeria-nome").textContent);
    const atual = document.getElementById("galeriaAtual");
    const nomeAtual = document.getElementById("galeriaNomeAtual");
    const n = itens.length;
    const estado = { pos: 0, leque: 0 }; // pos: índice contínuo; leque: 0 fechado, 1 aberto
    let largura = 0;
    let frente = -1;
    let anim = null;

    caixa.classList.add("leque");
    trilho.tabIndex = 0;
    const medir = () => { largura = itens[0].offsetWidth; };
    medir();

    const distancia = (i) => { // menor caminho, porque a galeria dá a volta
      let d = (i - estado.pos) % n;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      return d;
    };

    function desenhar() {
      itens.forEach((item, i) => {
        const d = distancia(i) * estado.leque;
        const a = Math.abs(d);
        const passo = Math.min(a, 1) * 0.62 + Math.max(a - 1, 0) * 0.3;
        gsap.set(item, {
          x: Math.sign(d) * passo * largura,
          z: -a * 150,
          rotationY: -gsap.utils.clamp(-1, 1, d) * 46,
          scale: 1 - Math.min(a, 3) * 0.05,
          opacity: a > 3.4 ? 0 : 1 - Math.max(a - 2, 0) * 0.7,
          zIndex: Math.round(100 - a * 10),
        });
      });
      const f = ((Math.round(estado.pos) % n) + n) % n;
      if (f !== frente) {
        if (frente >= 0) itens[frente].classList.remove("frente");
        frente = f;
        itens[f].classList.add("frente");
        atual.textContent = f + 1;
        nomeAtual.textContent = ": " + nomes[f];
      }
    }

    const brilhar = () => gsap.fromTo(fotos[frente], { "--reflexo": "-150%" }, { "--reflexo": "550%", duration: DUR.entrada, ease: EASE.saida });

    function ir(alvo) {
      if (anim) anim.kill();
      anim = gsap.to(estado, { pos: alvo, duration: DUR.entrada, ease: EASE.saida, onUpdate: desenhar, onComplete: brilhar });
    }
    const vizinha = (lado) => ir(Math.round(estado.pos) + lado);

    /* o leque abre quando a seção entra na tela */
    desenhar();
    gsap.to(estado, {
      leque: 1, duration: DUR.entrada * 1.6, ease: EASE.saida, onUpdate: desenhar, onComplete: brilhar,
      scrollTrigger: { trigger: caixa, start: "top 75%", once: true },
    });

    /* arrastar (dedo ou mouse) */
    let inicioX = 0, inicioPos = 0, arrastando = false, moveu = 0;
    const aoApertar = (e) => {
      arrastando = true; moveu = 0;
      inicioX = e.clientX; inicioPos = estado.pos;
      if (anim) anim.kill();
      trilho.setPointerCapture(e.pointerId);
    };
    const aoMover = (e) => {
      if (!arrastando) return;
      const dx = e.clientX - inicioX;
      moveu = Math.max(moveu, Math.abs(dx));
      estado.pos = inicioPos - dx / (largura * 0.62);
      desenhar();
    };
    const aoSoltar = (e) => {
      if (!arrastando) return;
      arrastando = false;
      if (moveu < 6) { // toque: traz a foto tocada para a frente
        const alvo = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.classList && el.classList.contains("galeria-item"));
        const i = itens.indexOf(alvo);
        ir(i >= 0 ? Math.round(estado.pos) + Math.round(distancia(i)) : Math.round(estado.pos));
        return;
      }
      let alvo = Math.round(estado.pos);
      if (alvo === Math.round(inicioPos) && moveu > largura * 0.12) alvo += estado.pos > inicioPos ? 1 : -1;
      ir(alvo);
    };
    const aoTeclar = (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); vizinha(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); vizinha(-1); }
    };
    const anterior = () => vizinha(-1);
    const proxima = () => vizinha(1);
    const aoRedimensionar = () => { medir(); desenhar(); };
    const bAnt = document.getElementById("galeriaAnterior");
    const bProx = document.getElementById("galeriaProxima");

    trilho.addEventListener("pointerdown", aoApertar);
    trilho.addEventListener("pointermove", aoMover);
    trilho.addEventListener("pointerup", aoSoltar);
    trilho.addEventListener("pointercancel", aoSoltar);
    caixa.addEventListener("keydown", aoTeclar);
    bAnt.addEventListener("click", anterior);
    bProx.addEventListener("click", proxima);
    window.addEventListener("resize", aoRedimensionar);

    return () => { // volta à faixa simples
      if (anim) anim.kill();
      trilho.removeEventListener("pointerdown", aoApertar);
      trilho.removeEventListener("pointermove", aoMover);
      trilho.removeEventListener("pointerup", aoSoltar);
      trilho.removeEventListener("pointercancel", aoSoltar);
      caixa.removeEventListener("keydown", aoTeclar);
      bAnt.removeEventListener("click", anterior);
      bProx.removeEventListener("click", proxima);
      window.removeEventListener("resize", aoRedimensionar);
      caixa.classList.remove("leque");
      trilho.removeAttribute("tabindex");
      itens.forEach((i) => i.classList.remove("frente"));
      gsap.set(itens, { clearProps: "all" });
      gsap.set(fotos, { clearProps: "--reflexo" });
    };
  }

  chave.addEventListener("click", () => {
    movimento = !movimento;
    chave.setAttribute("aria-pressed", String(movimento));
    mm.revert();
    mm = gsap.matchMedia();
    montar();
    ScrollTrigger.refresh();
  });

  montar();
})();
