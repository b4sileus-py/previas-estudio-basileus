/* Latos Mídia · Criado por Roberto Siqueira · Estúdio Basileus
   Ideia central: as três faixas do logo viram as trilhas de uma linha do tempo de edição. */
(function () {
  'use strict';

  var raiz = document.documentElement;
  var css = getComputedStyle(raiz);
  function token(nome) { return css.getPropertyValue(nome).trim(); }
  function ms(nome) { return parseFloat(token(nome)) / 1000; }

  gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
  /* Curvas da página (as mesmas de --curva-saida e --curva-corte) */
  gsap.registerEase('saida', function (p) { return 1 - Math.pow(1 - p, 4); });
  gsap.registerEase('corte', function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; });

  /* ---------- Material da linha do tempo ---------- */
  var CLIPES = [
    { img: 'churrasco-hamburguer', rotulo: 'Gastronomia', larg: 3 },
    { img: 'luta-chute', rotulo: 'Esporte', larg: 2.2 },
    { img: 'palco-guitarrista', rotulo: 'Música ao vivo', larg: 3.4 },
    { img: 'churrasco-tempero', rotulo: 'Gastronomia', larg: 2.4 },
    { img: 'luta-treino', rotulo: 'Esporte', larg: 2.8 },
    { img: 'palco-maos', rotulo: 'Música ao vivo', larg: 1.6 },
    { img: 'churrasco-cortes', rotulo: 'Gastronomia', larg: 2.6 },
    { img: 'palco-bateria', rotulo: 'Música ao vivo', larg: 2.4 },
    { img: 'luta-imobilizacao', rotulo: 'Esporte', larg: 2.6 },
    { img: 'palco-guitarra', rotulo: 'Música ao vivo', larg: 3 }
  ];
  var DIGITAL = ['Instagram profissional', 'Google Perfil', 'Mini site', 'Página web'];
  var VISUAL = ['Cartões de visita', 'Panfletos', 'Banner de lona'];

  var linhaTempo = document.getElementById('linhaTempo');
  var fitas = {
    conteudo: document.getElementById('fitaConteudo'),
    digital: document.getElementById('fitaDigital'),
    visual: document.getElementById('fitaVisual')
  };
  var regua = document.getElementById('regua');
  var monitorA = document.getElementById('monitorA');
  var monitorB = document.getElementById('monitorB');
  var monitorRotulo = document.getElementById('monitorRotulo');
  var monitorProgresso = document.getElementById('monitorProgresso');
  var botaoPlay = document.getElementById('monitorPlay');

  var periodo = 0;          /* largura de um ciclo da linha do tempo, em px */
  var trechos = { conteudo: [], digital: [], visual: [] }; /* [início, fim] de cada clipe dentro do ciclo */
  var pistaLarg = 0;
  var PX_POR_SEGUNDO = 120; /* escala da régua */
  var VEL_REPRODUCAO = 38;  /* px por segundo com a reprodução ligada */

  function montarFitas() {
    var pista = fitas.conteudo.parentElement;
    pistaLarg = pista.clientWidth;
    var quadro = pista.clientHeight * .75; /* largura de um quadro da tira de filme */

    /* Conteúdo: tiras de filme com as fotos */
    var html = ''; var x = 0; trechos.conteudo = [];
    CLIPES.forEach(function (c, i) {
      var w = Math.round(quadro * c.larg);
      trechos.conteudo.push([x, x + w]);
      html += '<span class="clipe clipe-filme" data-i="' + i + '" style="width:' + w + 'px;background-image:url(img/' + c.img + '-p.webp)"></span>';
      x += w + 3;
    });
    periodo = x;

    /* Digital e Visual: blocos distribuídos pelo mesmo ciclo, para as três trilhas andarem juntas */
    function blocos(lista, deslocInicial, chave) {
      var passo = periodo / lista.length; var h = ''; trechos[chave] = [];
      var inicio = Math.round(passo * deslocInicial);
      lista.forEach(function (nome, i) {
        var w = Math.round(passo * .62);
        var x0 = inicio + Math.round(passo * i);
        trechos[chave].push([x0, x0 + w]);
        h += '<span class="clipe clipe-bloco" data-i="' + i + '" style="position:absolute;top:0;bottom:0;left:' + x0 + 'px;width:' + w + 'px">' + nome + '</span>';
      });
      return h;
    }
    var d = blocos(DIGITAL, .2, 'digital'), v = blocos(VISUAL, .45, 'visual');

    /* Repete o ciclo o bastante para cobrir a pista enquanto anda */
    var copias = Math.ceil(pistaLarg / periodo) + 2;
    fitas.conteudo.innerHTML = repetir(html, copias);
    fitas.digital.innerHTML = repetirAbsoluto(d, copias);
    fitas.visual.innerHTML = repetirAbsoluto(v, copias);

    /* Régua: marcas de segundo */
    var r = ''; var n = Math.ceil(pistaLarg / PX_POR_SEGUNDO) + 2;
    for (var i = 0; i < n; i++) r += '<span></span>';
    regua.innerHTML = r;
    rotulosRegua = regua.querySelectorAll('span');
    ultimoSegundo = -1;
    ativos = { conteudo: -1, digital: -1, visual: -1 };
  }
  function repetir(s, n) { var o = ''; for (var i = 0; i < n; i++) o += s; return o; }
  function repetirAbsoluto(s, n) {
    var o = '';
    for (var i = 0; i < n; i++) o += '<span class="copia" style="position:absolute;top:0;bottom:0;left:' + (i * periodo) + 'px;width:' + periodo + 'px">' + s + '</span>';
    return o;
  }

  /* ---------- Estado da linha do tempo ---------- */
  var pos = { x: 0 };       /* posição da linha do tempo, em px (objeto para o GSAP poder deslizar) */
  var velArraste = 0;
  var arrastando = false;
  var deslizando = false;   /* indo até um clipe tocado */
  var pausaAte = 0;         /* a reprodução espera um pouco depois de mexer na linha */
  var reproducaoPermitida = false; /* movimento ligado */
  var pausado = false;      /* botão do monitor */
  var visivel = true;
  var lenis = null;
  var rotulosRegua = [];
  var ultimoSegundo = -1;
  var ativos = { conteudo: -1, digital: -1, visual: -1 };
  var laco = 0, ultimoT = 0;

  function tc(segundos) {
    var s = Math.floor(segundos);
    return '00:' + dois(Math.floor(s / 60) % 60) + ':' + dois(s % 60) + ':00';
  }
  function dois(n) { return (n < 10 ? '0' : '') + n; }
  function noCiclo(x) { return ((x % periodo) + periodo) % periodo; }
  function acharTrecho(lista, x) {
    for (var i = 0; i < lista.length; i++) if (x >= lista[i][0] && x <= lista[i][1]) return i;
    return -1;
  }

  function desenhar() {
    var p = noCiclo(pos.x);
    var t = 'translate3d(' + (-p).toFixed(2) + 'px,0,0)';
    fitas.conteudo.style.transform = t;
    fitas.digital.style.transform = t;
    fitas.visual.style.transform = t;

    /* Régua */
    var resto = ((pos.x % PX_POR_SEGUNDO) + PX_POR_SEGUNDO) % PX_POR_SEGUNDO;
    regua.style.backgroundPosition = (-resto) + 'px 100%';
    var seg = Math.floor(pos.x / PX_POR_SEGUNDO);
    for (var i = 0; i < rotulosRegua.length; i++) rotulosRegua[i].style.transform = 'translateX(' + (i * PX_POR_SEGUNDO - resto) + 'px)';
    if (seg !== ultimoSegundo) {
      ultimoSegundo = seg;
      for (var j = 0; j < rotulosRegua.length; j++) rotulosRegua[j].textContent = tc(Math.max(0, seg + j));
    }

    /* O que está sob o cabeçote, em cada trilha */
    var cab = noCiclo(p + pistaLarg / 2);
    var idx = acharTrecho(trechos.conteudo, cab);
    if (idx < 0) idx = ativos.conteudo; /* no vão de 3 px entre clipes, mantém o atual */
    if (idx !== ativos.conteudo) { marcar('conteudo', idx); mostrar(idx); }
    if (idx >= 0) {
      var tr = trechos.conteudo[idx];
      monitorProgresso.style.transform = 'scaleX(' + Math.min(Math.max((cab - tr[0]) / (tr[1] - tr[0]), 0), 1).toFixed(3) + ')';
    }
    var di = acharTrecho(trechos.digital, cab); if (di !== ativos.digital) marcar('digital', di);
    var vi = acharTrecho(trechos.visual, cab); if (vi !== ativos.visual) marcar('visual', vi);
  }

  function marcar(trilha, idx) {
    var ant = ativos[trilha];
    ativos[trilha] = idx;
    if (ant >= 0) fitas[trilha].querySelectorAll('.clipe[data-i="' + ant + '"]').forEach(function (el) { el.classList.remove('ativo'); });
    if (idx >= 0) fitas[trilha].querySelectorAll('.clipe[data-i="' + idx + '"]').forEach(function (el) { el.classList.add('ativo'); });
  }

  /* Transição do monitor: a próxima imagem entra por cima, se dissolvendo e assentando,
     depois segue com uma aproximação lenta, como uma câmera respirando */
  var pedido = 0;
  function mostrar(idx) {
    var c = CLIPES[idx];
    var meu = ++pedido;
    var ativa = monitorA.classList.contains('ativa') ? monitorA : monitorB;
    var outra = ativa === monitorA ? monitorB : monitorA;
    outra.src = 'img/' + c.img + '.webp';
    var trocar = function () {
      if (meu !== pedido) return;
      monitorRotulo.textContent = c.rotulo;
      outra.classList.add('ativa'); ativa.classList.remove('ativa');
      gsap.killTweensOf([outra, ativa]);
      if (reproducaoPermitida) {
        gsap.set(outra, { zIndex: 1 }); gsap.set(ativa, { zIndex: 0 });
        gsap.fromTo(outra, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: .75, ease: 'saida' });
        gsap.to(outra, { scale: 1.05, duration: 7, ease: 'none', delay: .75 });
        gsap.to(ativa, { opacity: 0, duration: .75, delay: .1, ease: 'none' });
      } else {
        gsap.set(outra, { opacity: 1, scale: 1 }); gsap.set(ativa, { opacity: 0, scale: 1 });
      }
    };
    if (outra.decode) outra.decode().then(trocar, trocar); else trocar();
  }

  function passo(agora) {
    laco = 0;
    var dt = ultimoT ? Math.min((agora - ultimoT) / 1000, .05) : 0;
    ultimoT = agora;
    var seguir = arrastando || deslizando;

    if (!arrastando && !deslizando) {
      if (Math.abs(velArraste) > 4) {            /* inércia depois de soltar */
        pos.x += velArraste * dt;
        velArraste *= Math.pow(.05, dt);
        seguir = true;
      } else velArraste = 0;
      if (reproducaoPermitida && !pausado && visivel) {
        seguir = true;
        if (agora > pausaAte) pos.x += VEL_REPRODUCAO * dt; /* ritmo constante: só o arraste muda a posição */
      }
    }
    desenhar();
    if (seguir) pedirQuadro(); else ultimoT = 0;
  }
  function pedirQuadro() { if (!laco && !document.hidden) laco = requestAnimationFrame(passo); }

  /* ---------- Arrastar e tocar ---------- */
  var xIni = 0, xAnt = 0, tAnt = 0, moveu = false;
  linhaTempo.addEventListener('pointerdown', function (e) {
    arrastando = true; moveu = false; xIni = xAnt = e.clientX; tAnt = performance.now(); velArraste = 0;
    gsap.killTweensOf(pos); deslizando = false;
    linhaTempo.classList.add('arrastando');
    linhaTempo.setPointerCapture(e.pointerId);
    pedirQuadro();
  });
  linhaTempo.addEventListener('pointermove', function (e) {
    if (!arrastando) return;
    var agora = performance.now();
    var dx = e.clientX - xAnt;
    if (Math.abs(e.clientX - xIni) > 6) moveu = true;
    pos.x -= dx;
    velArraste = velArraste * .6 + (-dx / Math.max(agora - tAnt, 1) * 1000) * .4;
    xAnt = e.clientX; tAnt = agora; pausaAte = agora + 1400;
  });
  linhaTempo.addEventListener('pointerup', function (e) {
    if (!arrastando) return;
    soltar();
    if (!moveu) tocar(e);
  });
  linhaTempo.addEventListener('pointercancel', soltar);
  function soltar() {
    arrastando = false; pausaAte = performance.now() + 1400;
    linhaTempo.classList.remove('arrastando');
    pedirQuadro();
  }

  /* Toque num clipe: a linha do tempo desliza até ele ficar sob o cabeçote */
  function tocar(e) {
    velArraste = 0;
    var alvo = document.elementsFromPoint(e.clientX, e.clientY).filter(function (el) { return el.classList && el.classList.contains('clipe'); })[0];
    if (!alvo) return;
    var fita = alvo.closest('.trilha-fita').id;
    var trilha = fita === 'fitaConteudo' ? 'conteudo' : fita === 'fitaDigital' ? 'digital' : 'visual';
    var tr = trechos[trilha][+alvo.dataset.i];
    var centro = (tr[0] + tr[1]) / 2;
    var cabAtual = noCiclo(pos.x + pistaLarg / 2);
    var delta = centro - cabAtual;
    if (delta > periodo / 2) delta -= periodo;
    if (delta < -periodo / 2) delta += periodo;
    if (!reproducaoPermitida) { pos.x += delta; desenhar(); return; }
    deslizando = true;
    pedirQuadro();
    gsap.to(pos, {
      x: pos.x + delta, duration: Math.min(.5 + Math.abs(delta) / 900, 1.1), ease: 'corte',
      onComplete: function () { deslizando = false; pausaAte = performance.now() + 2200; pedirQuadro(); }
    });
  }

  /* Pausar e continuar */
  botaoPlay.addEventListener('click', function () {
    pausado = !pausado;
    botaoPlay.setAttribute('aria-pressed', String(!pausado));
    botaoPlay.setAttribute('aria-label', pausado ? 'Continuar a linha do tempo' : 'Pausar a linha do tempo');
    pedirQuadro();
  });

  /* Só anda quando aparece na tela e com a aba visível */
  var vistos = new Set();
  var io = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (en) { if (en.isIntersecting) vistos.add(en.target); else vistos.delete(en.target); });
    visivel = vistos.size > 0;
    if (visivel) pedirQuadro();
  });
  io.observe(linhaTempo); io.observe(document.querySelector('.monitor'));
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(laco); laco = 0; ultimoT = 0; } else pedirQuadro();
  });

  /* ---------- Medidor de áudio do topo: o "som" da página sobe quando ela se mexe ---------- */
  var barrasVu = document.querySelectorAll('#vu i');
  var nivelVu = [.2, .3, .25, .18, .12, .08];
  var REPOUSO_VU = [.55, .8, .68, .5, .34, .22];
  function vuParado() { barrasVu.forEach(function (b, i) { b.style.setProperty('--nivel', REPOUSO_VU[i]); }); }
  function vuQuadro() {
    var energia = lenis ? Math.min(Math.abs(lenis.velocity) / 22, 1) : 0;
    var t = performance.now() / 1000;
    barrasVu.forEach(function (b, i) {
      /* repouso: respiração baixa e irregular; rolando: as barras de cima acendem */
      var base = .32 + .3 * Math.abs(Math.sin(t * (2.1 + i * .7) + i * 1.3)) * (1 - i * .12);
      var alvo = Math.min(base * (1 - i * .1) + energia * (1.05 - i * .08) * (.7 + .3 * Math.random()), 1);
      nivelVu[i] += (alvo - nivelVu[i]) * (alvo > nivelVu[i] ? .55 : .12); /* sobe rápido, desce devagar */
      b.style.setProperty('--nivel', nivelVu[i].toFixed(3));
    });
  }
  vuParado();

  /* ---------- Pacotes: medidas que dependem dos dados ---------- */
  document.querySelectorAll('.pacote[data-horas]').forEach(function (p) {
    var horas = +p.dataset.horas, videos = +p.dataset.videos;
    p.querySelector('.barra i').style.setProperty('--horas-fracao', horas / 4);
    var q = ''; for (var i = 0; i < videos; i++) q += '<i></i>';
    p.querySelector('.quadros').innerHTML = q;
  });

  /* ---------- Movimento (ligado/desligado + reduzir movimento) ---------- */
  var chave = document.getElementById('chaveMov');
  var chaveLigada = true;
  try { chaveLigada = localStorage.getItem('latos-movimento') !== 'off'; } catch (e) {}
  chave.setAttribute('aria-pressed', String(chaveLigada));
  var introFeita = !raiz.classList.contains('com-entrada');
  var voo = document.querySelectorAll('.voo i');
  var mm;

  function ligar() {
    reproducaoPermitida = true; botaoPlay.hidden = false; pedirQuadro();

    lenis = new Lenis({ lerp: .11 });
    lenis.on('scroll', ScrollTrigger.update);
    var tick = function (t) { lenis.raf(t * 1000); };
    gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    gsap.ticker.add(vuQuadro);

    /* REC piscando */
    gsap.to('.rec-ponto', { opacity: .2, duration: .6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    /* Cabeçote pulsa de leve enquanto toca */
    gsap.to('.cabecote i', { scale: 1.25, duration: .5, repeat: -1, yoyo: true, ease: 'sine.inOut', transformOrigin: '50% 0' });

    if (!introFeita) entrada();

    /* Pacotes entram como clipes caindo na trilha */
    gsap.utils.toArray('.pacote').forEach(function (p, i) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 85%', once: true } });
      tl.from(p, { y: 48, opacity: 0, clearProps: 'transform,opacity', duration: ms('--dur-lenta'), ease: 'saida', delay: (innerWidth >= 900 ? i * .08 : 0) })
        .from(p, { '--faixa-pacote': 0, duration: .7, ease: 'corte' }, '<.1');
      var barras = p.querySelectorAll('.barra i'), quadros = p.querySelectorAll('.quadros i');
      if (barras.length) tl.from(barras, { scaleX: 0, duration: 1, stagger: .12, ease: 'corte' }, '<.15');
      if (quadros.length) tl.from(quadros, { scaleY: 0, opacity: 0, transformOrigin: '50% 100%', duration: .25, stagger: .035, ease: 'back.out(3)' }, '<.2');
      var selo = p.querySelector('.selo');
      if (selo) {
        var faixasSelo = selo.querySelectorAll('.selo-faixas i');
        tl.from(faixasSelo, { scaleX: 0, transformOrigin: 'left', duration: .45, stagger: .08, ease: 'corte' }, '<');
        /* depois de entrar, as três faixas dão pulinhos em onda, de tempos em tempos */
        tl.add(function () {
          gsap.timeline({ repeat: -1, repeatDelay: 1.4 })
            .to(faixasSelo, { y: -5, duration: .2, ease: 'power2.out', stagger: .09 })
            .to(faixasSelo, { y: 0, duration: .45, ease: 'bounce.out', stagger: .09 }, .2);
        });
      }
    });
    /* Galeria: as fotos entram em sequência, como clipes importados */
    ScrollTrigger.batch('.trabalho', { start: 'top 90%', once: true, onEnter: function (lote) {
      gsap.from(lote, { y: 30, opacity: 0, scale: .96, duration: .7, stagger: .06, ease: 'saida', clearProps: 'transform,opacity' });
    } });
    gsap.from('.pasta', { scrollTrigger: { trigger: '.pastas', start: 'top 90%', once: true }, y: 12, opacity: 0, duration: .5, stagger: .05, ease: 'saida', clearProps: 'transform,opacity' });
    /* Fora da trilha: os itens entram um a um e o ícone gira para o lugar */
    gsap.from('.fora-item', { scrollTrigger: { trigger: '.fora-lista', start: 'top 88%', once: true }, y: 20, opacity: 0, duration: .6, stagger: .07, ease: 'saida', clearProps: 'transform,opacity' });
    gsap.from('.fora-icone', { scrollTrigger: { trigger: '.fora-lista', start: 'top 88%', once: true }, scale: .6, rotate: -12, duration: .6, stagger: .07, delay: .1, ease: 'back.out(2.2)', clearProps: 'transform' });
    /* Como funciona: a rolagem leva o cabeçote pela trilha e acende as cenas (efeito ligado à rolagem) */
    var cenasLista = document.querySelector('.cenas');
    var trilhaCenas = document.querySelector('.cenas-trilha');
    cenasLista.classList.add('cenas-ativas');
    ScrollTrigger.create({
      trigger: '.cenas-area', start: 'top 65%', end: 'bottom 65%', scrub: .6,
      onUpdate: function (st) {
        trilhaCenas.style.setProperty('--progresso-cenas', st.progress.toFixed(4));
        trilhaCenas.style.setProperty('--cabecote-y', (st.progress * trilhaCenas.offsetHeight).toFixed(1) + 'px');
      }
    });
    gsap.utils.toArray('.cena').forEach(function (cena) {
      ScrollTrigger.create({
        trigger: cena, start: 'top 65%',
        onEnter: function () {
          cena.classList.add('ativa');
          /* a claquete bate e treme de leve */
          gsap.fromTo(cena.querySelector('.cena-marcador'), { scale: .9 }, { scale: 1, duration: .5, ease: 'back.out(4)', delay: .12 });
        },
        onLeaveBack: function () { cena.classList.remove('ativa'); }
      });
    });
    /* Quem conduz: a foto principal entra em foco e os cantos fecham; a tira de bastidor anda devagar com a rolagem */
    gsap.timeline({ scrollTrigger: { trigger: '.quem-principal', start: 'top 80%', once: true } })
      .from('.quem-principal img', { filter: 'blur(14px)', scale: 1.12, duration: 1.2, ease: 'saida', clearProps: 'filter,transform' })
      .from('.quem-principal .canto', { scale: 2, opacity: 0, duration: .6, stagger: .05, ease: 'corte' }, .5)
      .from('.quem-rec', { opacity: 0, x: -10, duration: .4 }, .9);
    gsap.utils.toArray('.quem-tira img').forEach(function (img, i) {
      gsap.fromTo(img, { yPercent: -10 + i * 3 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.quem-tira', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.from('.quem-cartao, .quem-dados div, .quem-botao', { scrollTrigger: { trigger: '.quem-cartao', start: 'top 88%', once: true }, y: 18, opacity: 0, duration: .6, stagger: .07, ease: 'saida', clearProps: 'transform,opacity' });
    gsap.from('.duvida', { scrollTrigger: { trigger: '.duvidas-lista', start: 'top 88%', once: true }, y: 16, opacity: 0, duration: .5, stagger: .05, ease: 'saida', clearProps: 'transform,opacity' });
    gsap.from('.passo', { scrollTrigger: { trigger: '.pedir-passos', start: 'top 85%', once: true }, y: 24, opacity: 0, duration: .6, stagger: .1, ease: 'saida', clearProps: 'transform,opacity' });
    /* Cartela final: as faixas do logo se desenham uma última vez, como no fim de um vídeo */
    gsap.timeline({ scrollTrigger: { trigger: '.cartela', start: 'top 75%', once: true } })
      .from('.cartela-logo img', { y: 30, opacity: 0, duration: .8, ease: 'saida' })
      .from('.cartela-faixas .faixa', { scaleX: 0, duration: .6, stagger: .1, ease: 'corte' }, '<.3')
      .from('.cartela-titulo, .cartela-acoes, .cartela-contatos', { y: 20, opacity: 0, duration: .6, stagger: .08, ease: 'saida', clearProps: 'transform,opacity' }, '<.2');
    /* Atalhos: a faixa de cada trilha se estica e a linha entra */
    gsap.utils.toArray('.atalho').forEach(function (at, i) {
      gsap.timeline({ scrollTrigger: { trigger: at, start: 'top 90%', once: true } })
        .from(at, { '--faixa-atalho': 0, duration: .8, ease: 'corte', delay: i * .08 })
        .from(at.querySelectorAll('.atalho-num, .atalho-corpo, .atalho-preco, .frente-seta'), { y: 18, opacity: 0, duration: .6, stagger: .06, ease: 'saida', clearProps: 'transform,opacity' }, '<.15');
    });
    gsap.from('.frentes-faixas i', { scrollTrigger: { trigger: '.frentes', start: 'top 85%', once: true }, scaleX: 0, transformOrigin: 'left', duration: .5, stagger: .08, ease: 'corte' });
    gsap.utils.toArray('.frente-titulo').forEach(function (t) {
      gsap.from(t, { scrollTrigger: { trigger: t, start: 'top 88%', once: true }, y: 30, opacity: 0, duration: ms('--dur-lenta'), ease: 'saida' });
    });

    return function desligar() {
      reproducaoPermitida = false; botaoPlay.hidden = true;
      gsap.ticker.remove(tick); gsap.ticker.remove(vuQuadro); vuParado();
      lenis.destroy(); lenis = null;
      raiz.classList.remove('com-entrada');
      introFeita = true;
      gsap.killTweensOf([monitorA, monitorB, pos]); deslizando = false;
      gsap.set([monitorA, monitorB], { scale: 1 });
      gsap.set(monitorA.classList.contains('ativa') ? monitorA : monitorB, { opacity: 1 });
      gsap.set(voo, { opacity: 0 });
      gsap.set('.realce', { '--realce': 1 }); gsap.set('.realce-voo', { opacity: 0 });
      cenasLista.classList.remove('cenas-ativas');
      trilhaCenas.style.removeProperty('--progresso-cenas'); trilhaCenas.style.removeProperty('--cabecote-y');
      document.querySelectorAll('.cena').forEach(function (c) { c.classList.remove('ativa'); });
    };
  }

  function entrada() {
    introFeita = true;
    /* Texto da abertura */
    var linhas = new SplitText('.titulo', { type: 'lines,words', mask: 'lines' });
    var tl = gsap.timeline({ defaults: { ease: 'saida' }, onComplete: function () { raiz.classList.remove('com-entrada'); } });
    /* fromTo: o estado inicial vem do CSS (.com-entrada esconde), então o destino é explícito */
    tl.set('.titulo, .acoes', { opacity: 1 })
      .fromTo('.sobretitulo', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .6 }, .1)
      .from(linhas.words, { yPercent: 110, duration: .9, stagger: .06 }, .15)
      .fromTo('.abertura-sub', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .7 }, .55)
      .from('.acoes > *', { y: 18, opacity: 0, duration: .6, stagger: .08 }, .7)
      /* O monitor liga: a tela acende e os cantos de enquadramento fecham */
      .fromTo('.monitor', { scale: .94, opacity: 0 }, { scale: 1, opacity: 1, duration: 1 }, .35)
      .from('.canto', { scale: 2.2, opacity: 0, duration: .7, stagger: .05, ease: 'corte' }, .75)
      .from('.monitor-play', { scale: 0, duration: .5, ease: 'back.out(2.5)' }, 1.1);
    ligarPalavras(tl, 1.05);

    /* As faixas do logo voam até as trilhas quando a linha do tempo aparece */
    gsap.set('.trilha-fita, .trilha-nome, .regua, .editor-dica', { opacity: 0 });
    ScrollTrigger.create({ trigger: linhaTempo, start: 'top 88%', once: true, onEnter: voarFaixas });
  }

  /* "grava" ganha a faixa laranja; a faixa voa até "aparece", virando amarelo no caminho */
  function ligarPalavras(tl, inicio) {
    var grava = document.querySelector('.realce-grava');
    var aparece = document.querySelector('.realce-aparece');
    var voo1 = document.querySelector('.realce-voo');
    var caixa = document.querySelector('.abertura-texto');
    function faixa(el) {
      var fs = parseFloat(getComputedStyle(el).fontSize);
      var r = el.getBoundingClientRect(), c = caixa.getBoundingClientRect();
      return { x: r.left - c.left - fs * .06, y: r.bottom - c.top - fs * .36, width: r.width + fs * .12, height: fs * .3 };
    }
    gsap.set([grava, aparece], { '--realce': 0 });
    tl.to(grava, { '--realce': 1, duration: .5, ease: 'corte' }, inicio)
      .add(function () {
        var de = faixa(grava), para = faixa(aparece);
        gsap.set(voo1, { x: de.x, y: de.y, width: de.width, height: de.height, opacity: .9, skewX: token('--faixa-inclinacao'), backgroundColor: token('--cor-laranja') });
        gsap.timeline()
          .to(voo1, { x: para.x, y: para.y, width: para.width, backgroundColor: token('--cor-amarelo'), duration: .85, ease: 'corte' })
          .set(aparece, { '--realce': 1 })
          .to(voo1, { opacity: 0, duration: .2 });
      }, inicio + .55);
  }

  function voarFaixas() {
    var origem = document.querySelectorAll('.marca-faixas .faixa');
    var ordem = [1, 2, 0]; /* laranja → Conteúdo, azul → Digital, amarelo → Visual */
    var pistas = document.querySelectorAll('.trilha-pista');
    var tl = gsap.timeline({ defaults: { ease: 'corte' } });
    pistas.forEach(function (pista, i) {
      var de = origem[ordem[i]].getBoundingClientRect();
      var para = pista.getBoundingClientRect();
      var el = voo[i];
      gsap.set(el, { x: de.left, y: de.top, width: de.width, height: de.height, opacity: 1, skewX: token('--faixa-inclinacao') });
      tl.to(el, { x: para.left, y: para.top, width: para.width, height: para.height, skewX: 0, duration: .95 }, i * .09)
        .to(el, { height: 3, duration: .35, ease: 'saida' }, '>-.02')
        .to(el, { opacity: 0, duration: .3 }, '>');
    });
    tl.to('.regua, .trilha-nome', { opacity: 1, duration: .4, stagger: .05, ease: 'saida' }, .7)
      .fromTo('.trilha-fita', { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: .8, stagger: .08, ease: 'saida', clearProps: 'x' }, 1.05)
      .to('.editor-dica', { opacity: 1, duration: .4 }, 1.5);
    /* Se a pessoa rolar durante o voo, as faixas acompanham a página */
    var y0 = scrollY;
    var seguir = function () { gsap.set('.voo', { y: y0 - scrollY }); };
    addEventListener('scroll', seguir, { passive: true });
    tl.eventCallback('onComplete', function () { removeEventListener('scroll', seguir); gsap.set('.voo', { y: 0 }); });
  }

  function montarMovimento() {
    raiz.classList.toggle('sem-movimento', !chaveLigada);
    mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      if (!chaveLigada) { parado(); return; }
      return ligar();
    });
    mm.add('(prefers-reduced-motion: reduce)', function () { parado(); });
  }
  function parado() {
    raiz.classList.remove('com-entrada');
    introFeita = true;
    reproducaoPermitida = false; botaoPlay.hidden = true;
    vuParado();
    gsap.set('.trilha-fita, .trilha-nome, .regua, .editor-dica, .titulo, .sobretitulo, .abertura-sub, .acoes, .monitor', { clearProps: 'opacity,transform' });
  }

  chave.addEventListener('click', function () {
    chaveLigada = !chaveLigada;
    chave.setAttribute('aria-pressed', String(chaveLigada));
    try { localStorage.setItem('latos-movimento', chaveLigada ? 'on' : 'off'); } catch (e) {}
    mm.revert();
    montarMovimento();
  });

  /* ---------- Trabalhos: filtro por pasta ---------- */
  var galeria = document.getElementById('galeria');
  var itensGaleria = gsap.utils.toArray('.trabalho');
  var pastas = document.querySelectorAll('.pasta');
  pastas.forEach(function (pasta) {
    pasta.addEventListener('click', function () {
      if (pasta.getAttribute('aria-pressed') === 'true') return;
      pastas.forEach(function (p) { p.setAttribute('aria-pressed', String(p === pasta)); });
      var filtro = pasta.dataset.filtro;
      var estado = reproducaoPermitida ? Flip.getState(itensGaleria) : null;
      var alturaAntes = galeria.offsetHeight;
      itensGaleria.forEach(function (it) { it.hidden = filtro !== 'todos' && it.dataset.cat !== filtro; });
      if (estado) {
        /* a altura da galeria anda junto com as fotos, para a seção de baixo não subir antes da hora */
        var alturaDepois = galeria.offsetHeight;
        gsap.killTweensOf(galeria);
        gsap.fromTo(galeria, { height: alturaAntes }, {
          height: alturaDepois, duration: .6, ease: 'corte',
          onComplete: function () { gsap.set(galeria, { clearProps: 'height' }); ScrollTrigger.refresh(); }
        });
        Flip.from(estado, {
          duration: .6, ease: 'corte', scale: true, absolute: true, nested: true,
          onEnter: function (els) { return gsap.fromTo(els, { opacity: 0, scale: .85 }, { opacity: 1, scale: 1, duration: .45, ease: 'saida' }); },
          onLeave: function (els) { return gsap.to(els, { opacity: 0, scale: .85, duration: .3 }); }
        });
      }
    });
  });

  /* ---------- Foto ampliada ---------- */
  var visor = document.getElementById('visor');
  var visorImg = document.getElementById('visorImg');
  var visorLegenda = document.getElementById('visorLegenda');
  var visorContagem = document.getElementById('visorContagem');
  var listaVisor = [], posVisor = 0, origemVisor = null;

  function dadosDe(botao) {
    var img = botao.querySelector('img');
    return { foto: botao.dataset.foto, alt: img.alt, rotulo: botao.querySelector('.trabalho-info').lastChild.textContent, botao: botao };
  }
  function mostrarNoVisor(i, direcao) {
    posVisor = (i + listaVisor.length) % listaVisor.length;
    var d = listaVisor[posVisor];
    var trocar = function () {
      visorImg.src = 'img/' + d.foto + '.webp'; visorImg.alt = d.alt;
      visorLegenda.textContent = d.rotulo + ' · ' + d.alt;
      visorContagem.textContent = (posVisor + 1) + ' / ' + listaVisor.length;
    };
    if (direcao && reproducaoPermitida) {
      gsap.to(visorImg, { x: -40 * direcao, opacity: 0, duration: .18, ease: 'power1.in', onComplete: function () {
        trocar();
        var entrar = function () { gsap.fromTo(visorImg, { x: 40 * direcao, opacity: 0 }, { x: 0, opacity: 1, duration: .4, ease: 'saida' }); };
        visorImg.decode ? visorImg.decode().then(entrar, entrar) : entrar();
      } });
    } else trocar();
  }
  function abrirVisor(lista, i, origem) {
    listaVisor = lista; origemVisor = origem;
    mostrarNoVisor(i);
    visor.showModal();
    raiz.classList.add('visor-aberto');
    if (lenis) lenis.stop();
    if (!reproducaoPermitida) return;
    /* a foto sai do lugar onde foi tocada e cresce até o centro */
    var cresce = function () {
      var de = origem.getBoundingClientRect(), para = visorImg.getBoundingClientRect();
      if (!para.width) return;
      var esc = de.width / para.width;
      gsap.fromTo(visorImg,
        { x: (de.left + de.width / 2) - (para.left + para.width / 2), y: (de.top + de.height / 2) - (para.top + para.height / 2), scale: esc, opacity: .6 },
        { x: 0, y: 0, scale: 1, opacity: 1, duration: .6, ease: 'corte' });
      gsap.fromTo('.visor-controles, .visor-fechar, .visor-legenda', { opacity: 0 }, { opacity: 1, duration: .4, delay: .35 });
    };
    gsap.set(visorImg, { opacity: 0 });
    visorImg.decode ? visorImg.decode().then(cresce, cresce) : cresce();
  }
  function fecharVisor() {
    if (!visor.open) return;
    var terminar = function () {
      visor.close();
      raiz.classList.remove('visor-aberto');
      if (lenis) lenis.start();
      gsap.set(visorImg, { clearProps: 'all' });
      if (origemVisor) origemVisor.focus({ preventScroll: true });
    };
    if (reproducaoPermitida) gsap.to(visorImg, { scale: .92, opacity: 0, duration: .22, ease: 'power1.in', onComplete: terminar });
    else terminar();
  }

  galeria.addEventListener('click', function (e) {
    var botao = e.target.closest('.trabalho-botao');
    if (!botao) return;
    var visiveis = itensGaleria.filter(function (it) { return !it.hidden; }).map(function (it) { return dadosDe(it.querySelector('.trabalho-botao')); });
    var i = visiveis.findIndex(function (d) { return d.botao === botao; });
    abrirVisor(visiveis, i, botao);
  });
  document.getElementById('monitorAmpliar').addEventListener('click', function (e) {
    var todos = itensGaleria.map(function (it) { return dadosDe(it.querySelector('.trabalho-botao')); });
    var atual = CLIPES[Math.max(ativos.conteudo, 0)].img;
    var i = Math.max(todos.findIndex(function (d) { return d.foto === atual; }), 0);
    abrirVisor(todos, i, e.currentTarget);
  });
  document.getElementById('visorAnt').addEventListener('click', function () { mostrarNoVisor(posVisor - 1, -1); });
  document.getElementById('visorProx').addEventListener('click', function () { mostrarNoVisor(posVisor + 1, 1); });
  document.getElementById('visorFechar').addEventListener('click', fecharVisor);
  visor.addEventListener('cancel', function (e) { e.preventDefault(); fecharVisor(); }); /* Esc */
  visor.addEventListener('click', function (e) { if (e.target === visor) fecharVisor(); }); /* toque fora da foto */
  visor.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') mostrarNoVisor(posVisor - 1, -1);
    if (e.key === 'ArrowRight') mostrarNoVisor(posVisor + 1, 1);
  });
  /* deslizar o dedo para os lados troca a foto */
  var xToque = null;
  visorImg.addEventListener('pointerdown', function (e) { xToque = e.clientX; });
  visorImg.addEventListener('pointerup', function (e) {
    if (xToque === null) return;
    var dx = e.clientX - xToque; xToque = null;
    if (Math.abs(dx) > 45) mostrarNoVisor(posVisor + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });

  /* ---------- Soluções Digitais: montar o pedido com um ou mais serviços ---------- */
  var painelPedido = document.getElementById('pedidoDigital');
  var pedidoResumo = document.getElementById('pedidoResumo');
  var pedidoBotao = document.getElementById('pedidoBotao');
  var servicos = gsap.utils.toArray('.servico');
  function real(n) { return 'R$ ' + n.toLocaleString('pt-BR'); }
  function atualizarPedido() {
    var escolhidos = servicos.filter(function (sv) { return sv.classList.contains('escolhido'); });
    var vazio = escolhidos.length === 0;
    painelPedido.dataset.vazio = String(vazio);
    if (vazio) {
      pedidoResumo.textContent = 'Escolha um ou mais serviços acima.';
      pedidoBotao.setAttribute('aria-disabled', 'true'); pedidoBotao.setAttribute('href', '#digital');
      pedidoBotao.setAttribute('tabindex', '-1');
      return;
    }
    var total = escolhidos.reduce(function (t, sv) { return t + +sv.dataset.preco; }, 0);
    var nomes = escolhidos.map(function (sv) { return sv.dataset.nome; });
    pedidoResumo.innerHTML = '<strong>' + escolhidos.length + (escolhidos.length > 1 ? ' serviços' : ' serviço') + '</strong> · a partir de <strong>' + real(total) + '</strong>';
    var msg = 'Olá! Vim pelo site da Latos e tenho interesse em: ' +
      escolhidos.map(function (sv) { return sv.dataset.nome + ' (a partir de ' + real(+sv.dataset.preco) + ')'; }).join(', ') +
      '. Pode me passar um orçamento?';
    pedidoBotao.setAttribute('href', 'https://wa.me/5521992220681?text=' + encodeURIComponent(msg));
    pedidoBotao.removeAttribute('aria-disabled'); pedidoBotao.removeAttribute('tabindex');
    if (reproducaoPermitida) gsap.fromTo(painelPedido, { scale: .97 }, { scale: 1, duration: .4, ease: 'back.out(3)', clearProps: 'transform' });
  }
  servicos.forEach(function (sv) {
    var b = sv.querySelector('.servico-escolher');
    b.addEventListener('click', function () {
      var ligado = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(ligado));
      b.querySelector('.escolher-texto').textContent = ligado ? 'Adicionado' : 'Adicionar ao pedido';
      sv.classList.toggle('escolhido', ligado);
      atualizarPedido();
    });
  });
  atualizarPedido();

  /* ---------- Monte seu pedido: a mensagem se escreve conforme a pessoa toca ---------- */
  var escolhas = { servicos: [], negocio: '', lugar: '' };
  var balao = document.getElementById('balao');
  var pedirBotao = document.getElementById('pedirBotao');
  var pedirAviso = document.getElementById('pedirAviso');
  var nomeNegocio = document.getElementById('nomeNegocio');
  function listaFalada(itens) {
    if (itens.length < 2) return itens.join('');
    return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
  }
  function esc(t) { return t.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function montarMensagem(comMarcas) {
    var m = function (t) { return comMarcas ? '<mark>' + esc(t) + '</mark>' : t; };
    var nome = nomeNegocio.value.trim();
    var partes = ['Olá! Vim pelo site da Latos.'];
    /* cada ramo já traz a frase pronta (data-valor), para a mensagem soar natural */
    var sobre = '';
    if (escolhas.negocio) sobre = m(escolhas.negocio) + (nome ? ' (' + m(nome) + ')' : '');
    else if (nome) sobre = 'Meu negócio se chama ' + m(nome);
    if (escolhas.lugar) sobre += sobre ? ' ' + m(escolhas.lugar) : 'Meu negócio fica ' + m(escolhas.lugar);
    if (sobre) partes.push(sobre + '.');
    var querAjuda = escolhas.servicos.indexOf('ajuda para escolher') > -1;
    var outros = escolhas.servicos.filter(function (s) { return s !== 'ajuda para escolher'; });
    if (outros.length) partes.push('Tenho interesse em ' + listaFalada(outros.map(m)) + '.');
    if (querAjuda) partes.push(outros.length ? 'E queria ajuda para ver o que mais faz sentido.' : 'Ainda não sei qual serviço é o ideal. Pode me ajudar a escolher?');
    else if (outros.length) partes.push('Pode me passar um orçamento?');
    return partes.join(' ');
  }
  function atualizarMensagem() {
    if (typeof resumoPedido === 'function') resumoPedido();
    var pronto = escolhas.servicos.length > 0;
    if (!pronto) {
      balao.innerHTML = '<span class="vazio">A mensagem aparece aqui conforme você escolhe.</span>';
      pedirBotao.setAttribute('aria-disabled', 'true'); pedirBotao.setAttribute('tabindex', '-1'); pedirBotao.setAttribute('href', '#contato');
      pedirAviso.textContent = 'Escolha pelo menos um serviço no passo 1.';
      return;
    }
    balao.innerHTML = montarMensagem(true);
    pedirBotao.setAttribute('href', 'https://wa.me/5521992220681?text=' + encodeURIComponent(montarMensagem(false)));
    pedirBotao.removeAttribute('aria-disabled'); pedirBotao.removeAttribute('tabindex');
    pedirAviso.textContent = '';
  }
  document.querySelectorAll('.chips').forEach(function (grupo) {
    var chave = grupo.dataset.grupo, multiplo = grupo.dataset.multiplo === 'true';
    grupo.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c) return;
      var ligado = c.getAttribute('aria-pressed') !== 'true';
      if (multiplo) {
        c.setAttribute('aria-pressed', String(ligado));
        escolhas[chave] = Array.prototype.filter.call(grupo.querySelectorAll('.chip'), function (x) { return x.getAttribute('aria-pressed') === 'true'; }).map(function (x) { return x.dataset.valor; });
      } else {
        grupo.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c && ligado)); });
        escolhas[chave] = ligado ? c.dataset.valor : '';
      }
      atualizarMensagem();
      if (reproducaoPermitida) {
        gsap.fromTo(c, { scale: .9 }, { scale: 1, duration: .35, ease: 'back.out(3)', clearProps: 'transform' });
        gsap.fromTo(balao, { y: 4, opacity: .6 }, { y: 0, opacity: 1, duration: .3, ease: 'saida', clearProps: 'transform,opacity' });
      }
    });
  });
  nomeNegocio.addEventListener('input', atualizarMensagem);
  atualizarMensagem();

  /* ---------- Assinatura do estúdio: a claquete bate "Corta!" e as três faixas atravessam o rodapé ---------- */
  document.getElementById('assinatura').addEventListener('click', function () {
    if (!reproducaoPermitida) return;
    var claq = document.querySelector('.assinatura-claquete');
    var braco = document.querySelector('.assinatura-braco');
    var faixasFim = document.querySelectorAll('.assinatura-faixas i');
    gsap.killTweensOf([claq, braco, faixasFim, '.assinatura .coroa']);
    gsap.timeline()
      .set(braco, { rotate: -28 })
      .fromTo(claq, { opacity: 0, y: 8, scale: .8, xPercent: -50 }, { opacity: 1, y: 0, scale: 1, xPercent: -50, duration: .3, ease: 'back.out(2.5)' })
      .to(braco, { rotate: 0, duration: .14, ease: 'power3.in' }, '+=.1')
      .to('.assinatura .coroa', { y: -6, rotate: -10, scale: 1.2, duration: .18, ease: 'power2.out' }, '<.1')
      .to('.assinatura .coroa', { y: 0, rotate: 0, scale: 1, duration: .5, ease: 'back.out(3)' })
      .fromTo(faixasFim, { scaleX: 0 }, { scaleX: 1, duration: .45, stagger: .07, ease: 'corte' }, '<-.35')
      .to(faixasFim, { scaleX: 0, transformOrigin: function (i) { return i === 1 ? 'left' : 'right'; }, duration: .4, stagger: .07, ease: 'corte' }, '+=.35')
      .to(claq, { opacity: 0, y: -6, duration: .3, ease: 'power1.in' }, '<')
      .set(faixasFim, { clearProps: 'transformOrigin' });
  });

  /* ---------- Menu: marca a seção que está na tela ---------- */
  var linksMenu = Array.prototype.slice.call(document.querySelectorAll('.menu-lista a'));
  var menuLista = document.getElementById('menuLista');
  var secoesMenu = linksMenu.map(function (l) { return document.querySelector(l.getAttribute('href')); });
  var atualMenu = null;
  function marcarMenu(link) {
    if (link === atualMenu) return;
    if (atualMenu) atualMenu.removeAttribute('aria-current');
    atualMenu = link;
    if (!link) return;
    link.setAttribute('aria-current', 'location');
    /* no celular, a lista anda para o item atual ficar à vista */
    if (menuLista.scrollWidth <= menuLista.clientWidth) return; /* em grade, nada a rolar */
    var li = link.parentElement;
    var alvo = li.offsetLeft - (menuLista.clientWidth - li.offsetWidth) / 2;
    menuLista.scrollTo({ left: Math.max(alvo, 0), behavior: reproducaoPermitida ? 'smooth' : 'auto' });
  }
  var visiveisMenu = new Map();
  var ioMenu = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (en) { visiveisMenu.set(en.target, en.isIntersecting); });
    var ativa = null;
    secoesMenu.forEach(function (sec, i) { if (visiveisMenu.get(sec)) ativa = linksMenu[i]; });
    marcarMenu(ativa);
  }, { rootMargin: '-40% 0px -55% 0px' });
  secoesMenu.forEach(function (sec) { if (sec) ioMenu.observe(sec); });

  /* ---------- Voltar ao início e barra "Ver mensagem" ---------- */
  var voltarTopo = document.getElementById('voltarTopo');
  var voltarAnel = document.getElementById('voltarAnel');
  var verMensagem = document.getElementById('verMensagem');
  var verResumo = document.getElementById('verResumo');
  var verBotao = document.getElementById('verBotao');
  var CIRC = 131.95; /* 2 × π × 21, o raio do anel */
  var naTela = { digital: false, passos: false, previa: false, pedir: false };
  var ioBarras = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (en) { naTela[en.target.dataset.vigia] = en.isIntersecting; });
    atualizarFlutuantes();
  });
  [['digital', '#digital .pedido'], ['passos', '.pedir-passos'], ['previa', '#previaPedido'], ['pedir', '#contato']].forEach(function (par) {
    var el = document.querySelector(par[1]); el.dataset.vigia = par[0]; ioBarras.observe(el);
  });
  function mostrar_(el, sim) {
    el.classList.toggle('visivel', sim);
    el.setAttribute('aria-hidden', String(!sim));
    var foco = el.matches('button') ? el : el.querySelector('a');
    if (sim) foco.removeAttribute('tabindex'); else foco.setAttribute('tabindex', '-1');
  }
  function atualizarFlutuantes() {
    var celular = innerWidth < 900;
    var barraVer = celular && naTela.passos && !naTela.previa;
    mostrar_(verMensagem, barraVer);
    /* o botão sai do caminho do painel de pedido e da barra "Ver mensagem" */
    mostrar_(voltarTopo, scrollY > innerHeight * .9 && !naTela.digital && !(celular && naTela.pedir));
  }
  function progressoPagina() {
    var max = document.documentElement.scrollHeight - innerHeight;
    var p = max > 0 ? Math.min(Math.max(scrollY / max, 0), 1) : 0;
    voltarAnel.style.strokeDashoffset = (CIRC * (1 - p)).toFixed(2);
    atualizarFlutuantes();
  }
  addEventListener('scroll', progressoPagina, { passive: true });
  addEventListener('resize', progressoPagina);
  voltarTopo.addEventListener('click', function () {
    if (lenis) lenis.scrollTo(0, { duration: 1.6, easing: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; } });
    else window.scrollTo({ top: 0, behavior: 'auto' });
    document.querySelector('.marca').focus({ preventScroll: true });
  });
  function resumoPedido() {
    var n = escolhas.servicos.length;
    document.getElementById('verResumo').textContent = n === 0 ? 'Nenhum serviço escolhido ainda' : 'Mensagem pronta · ' + n + (n > 1 ? ' escolhas' : ' escolha');
  }

  /* ---------- Links internos: rolagem suave até o destino ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (link.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return; }
      if (!link.getAttribute('href').startsWith('#')) return;
      var alvo = document.querySelector(link.getAttribute('href'));
      if (!alvo) return;
      e.preventDefault();
      /* folga: altura do topo + um respiro, para o selo do Pro não ficar colado */
      var folga = document.querySelector('.topo').offsetHeight + 40;
      if (lenis) lenis.scrollTo(alvo, { offset: -folga, duration: 1.4, easing: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; } });
      else window.scrollTo({ top: alvo.getBoundingClientRect().top + scrollY - folga, behavior: 'auto' });
      /* o foco vai junto, para quem navega pelo teclado */
      alvo.setAttribute('tabindex', '-1'); alvo.focus({ preventScroll: true });
    });
  });

  /* ---------- Início ---------- */
  function iniciar() {
    montarFitas();
    montarMovimento();
    desenhar();
    /* Pré-carrega as fotos do monitor depois da abertura */
    setTimeout(function () { CLIPES.forEach(function (c) { var i = new Image(); i.src = 'img/' + c.img + '.webp'; }); }, 1500);
  }
  var larguraAnt = innerWidth;
  addEventListener('resize', function () {
    if (innerWidth === larguraAnt) return; /* ignora a barra do navegador do celular */
    larguraAnt = innerWidth; montarFitas(); desenhar();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(iniciar); else iniciar();
})();
