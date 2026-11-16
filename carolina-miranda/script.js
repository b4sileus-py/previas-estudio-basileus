/* Carolina Miranda — protótipo de direção visual.
   Movimento com GSAP + ScrollTrigger e rolagem amortecida com Lenis (ver TOOLKIT.md).
   Tudo aqui nasce do ofício: o brilho do iluminador, a pincelada de blush,
   a mecha que alisa quando a prancha passa. */
(function () {
  'use strict';

  var G = window.gsap, ST = window.ScrollTrigger;
  var raiz = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  function guardar(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function ler(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var escolha = /parado/.test(location.hash) ? 'nao' : /vivo/.test(location.hash) ? 'sim' : ler('cm-movimento');
  var vivo = !!(G && ST) && (escolha ? escolha === 'sim' : !reduz);
  raiz.classList.toggle('vivo', vivo);
  raiz.classList.toggle('parado', !vivo);
  if (G && ST) G.registerPlugin(ST);

  /* ---------- Chaves: movimento e tema (make de noite / make de dia) ---------- */
  var chaveMov = $('#chaveMov');
  chaveMov.setAttribute('aria-pressed', vivo ? 'true' : 'false');
  chaveMov.addEventListener('click', function () {
    guardar('cm-movimento', vivo ? 'nao' : 'sim');
    location.hash = vivo ? 'parado' : 'vivo';
    window.scrollTo(0, 0);
    location.reload();
  });

  var chaveTema = $('#chaveTema');
  function aplicarTema(t) {
    raiz.dataset.tema = t;
    chaveTema.setAttribute('aria-pressed', t === 'noite' ? 'true' : 'false');
    $('span', chaveTema).textContent = t === 'noite' ? 'Noite' : 'Dia';
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.content = t === 'noite' ? '#1A0F16' : '#FBF0EC';
    lerCores();
  }
  chaveTema.addEventListener('click', function () {
    var t = raiz.dataset.tema === 'noite' ? 'dia' : 'noite';
    guardar('cm-tema', t); aplicarTema(t);
  });

  /* ---------- Brilho: pó de iluminador atrás da página, que foge e acende no toque ---------- */
  var tela = $('#brilho'), ctx = tela.getContext('2d');
  var L = 0, A = 0, dpr = 1, graos = [], faiscas = [], cores = ['#F8DFC0', '#E6A999', '#FFFFFF'];
  var dedo = { x: -999, y: -999, ativo: 0 };
  var rastro = [];   // caminho recente do dedo: vira um risco de luz que se apaga

  function lerCores() {
    var cs = getComputedStyle(raiz);
    cores = [cs.getPropertyValue('--champanhe').trim(), cs.getPropertyValue('--rose').trim(),
      raiz.dataset.tema === 'dia' ? cs.getPropertyValue('--batom').trim() : '#FFFFFF'];
    if (!vivo) desenharBrilho(0);
  }
  function medir() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    L = window.innerWidth; A = window.innerHeight;
    tela.width = Math.round(L * dpr); tela.height = Math.round(A * dpr);
    var n = Math.round(Math.min(150, Math.max(60, L * A / 6500)));
    graos = [];
    for (var i = 0; i < n; i++) graos.push(novoGrao(true));
    if (!vivo) desenharBrilho(0);
  }
  function novoGrao() {
    var grande = Math.random() < .14;
    return {
      x: Math.random() * L, y: Math.random() * A,
      vx: 0, vy: 0,
      r: grande ? 1.6 + Math.random() * 1.6 : .5 + Math.random() * .9,
      estrela: grande,
      fase: Math.random() * 6.28, ritmo: .6 + Math.random() * 1.6,
      deriva: (Math.random() - .5) * .12, sobe: -.04 - Math.random() * .1,
      cor: Math.floor(Math.random() * 3), aceso: 0
    };
  }
  function estrela(x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2.6); ctx.quadraticCurveTo(x, y, x + r * 2.6, y);
    ctx.quadraticCurveTo(x, y, x, y + r * 2.6); ctx.quadraticCurveTo(x, y, x - r * 2.6, y);
    ctx.quadraticCurveTo(x, y, x, y - r * 2.6); ctx.fill();
  }
  function desenharBrilho(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, L, A);
    var dia = raiz.dataset.tema === 'dia';
    for (var i = 0; i < graos.length; i++) {
      var g = graos[i];
      if (vivo) {
        var dx = g.x - dedo.x, dy = g.y - dedo.y, d2 = dx * dx + dy * dy;
        if (dedo.ativo > 0 && d2 < 16900) {
          var d = Math.sqrt(d2) || 1, f = (1 - d / 130) * .9;
          g.vx += dx / d * f; g.vy += dy / d * f; g.aceso = 1;
        }
        g.vx *= .93; g.vy *= .93; g.aceso *= .965;
        g.x += g.vx + g.deriva; g.y += g.vy + g.sobe;
        if (g.y < -8) { g.y = A + 8; g.x = Math.random() * L; }
        if (g.x < -8) g.x = L + 8; else if (g.x > L + 8) g.x = -8;
      }
      var pisca = vivo ? .5 + .5 * Math.sin(t * .001 * g.ritmo + g.fase) : .6;
      var alfa = (dia ? .22 : .16) + pisca * (dia ? .4 : .55) + g.aceso * .4;
      ctx.globalAlpha = Math.min(1, alfa);
      ctx.fillStyle = cores[g.cor];
      if (g.estrela) estrela(g.x, g.y, g.r * (.7 + pisca * .5 + g.aceso * .5));
      else { ctx.beginPath(); ctx.arc(g.x, g.y, g.r * (1 + g.aceso * .6), 0, 6.283); ctx.fill(); }
    }
    for (var j = faiscas.length - 1; j >= 0; j--) {
      var s = faiscas[j];
      s.vida -= .02; if (s.vida <= 0) { faiscas.splice(j, 1); continue; }
      s.vy += .035; s.vx *= .97; s.x += s.vx; s.y += s.vy;
      ctx.globalAlpha = Math.min(1, s.vida * 1.2);
      ctx.fillStyle = cores[s.cor];
      if (s.estrela) estrela(s.x, s.y, s.r * s.vida); else { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * s.vida, 0, 6.283); ctx.fill(); }
    }
    desenharRastro();
    ctx.globalAlpha = 1;
    if (dedo.ativo > 0) dedo.ativo -= .03;
  }
  // Rastro de luz: uma passada de iluminador que acompanha o dedo e some em meio segundo.
  function desenharRastro() {
    for (var i = rastro.length - 1; i >= 0; i--) { rastro[i].vida -= .035; if (rastro[i].vida <= 0) rastro.splice(i, 1); }
    if (rastro.length < 2) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var passo = 0; passo < 2; passo++) {
      ctx.strokeStyle = cores[passo ? 0 : 1];
      for (var k = 1; k < rastro.length; k++) {
        var a = rastro[k - 1], b = rastro[k];
        if (b.novo) continue;                           // não liga um toque ao toque anterior
        var v = Math.min(a.vida, b.vida);
        ctx.globalAlpha = passo ? v * .75 : v * .16;
        ctx.lineWidth = passo ? .6 + v * 2.6 : 4 + v * 16;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
  }
  function riscar(x, y, novo) {
    if (!vivo) return;
    var u = rastro[rastro.length - 1];
    if (!novo && u && Math.abs(u.x - x) + Math.abs(u.y - y) < 3) return;
    rastro.push({ x: x, y: y, vida: 1, novo: !!novo });
    if (rastro.length > 90) rastro.shift();
  }
  function soltar(x, y, n, forca) {
    if (!vivo) return;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, v = Math.random() * forca;
      faiscas.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - forca * .35, r: .8 + Math.random() * 2, vida: .6 + Math.random() * .6, cor: Math.floor(Math.random() * 3), estrela: Math.random() < .3 });
    }
    if (faiscas.length > 260) faiscas.splice(0, faiscas.length - 260);
  }
  var ultimoRastro = 0;
  function aoMover(e) {
    dedo.x = e.clientX; dedo.y = e.clientY; dedo.ativo = 1;
    riscar(e.clientX, e.clientY, e.type !== 'pointermove' && e.type !== 'touchmove');
    var agora = performance.now();
    if (agora - ultimoRastro > 45) { ultimoRastro = agora; soltar(e.clientX, e.clientY, 2, 1.1); }
    raiz.style.setProperty('--reflexo', (20 + e.clientX / Math.max(1, L) * 60).toFixed(1) + '%');
  }
  window.addEventListener('pointermove', aoMover, { passive: true });
  window.addEventListener('pointerdown', function (e) { aoMover(e); soltar(e.clientX, e.clientY, 14, 2.6); }, { passive: true });
  // No celular, quando o dedo arrasta para rolar, o navegador para de mandar 'pointermove'.
  // O 'touchmove' continua chegando, então o rastro segue o dedo durante a rolagem.
  window.addEventListener('touchmove', function (e) {
    var t = e.touches[0]; if (t) aoMover({ clientX: t.clientX, clientY: t.clientY, type: 'touchmove' });
  }, { passive: true });
  window.addEventListener('resize', function () { if (Math.abs(window.innerWidth - L) > 2) medir(); });

  medir();
  aplicarTema(ler('cm-tema') || 'noite');
  if (vivo) {
    var rodando = true;
    document.addEventListener('visibilitychange', function () { rodando = !document.hidden; });
    (function laco(t) { if (rodando) desenharBrilho(t || 0); requestAnimationFrame(laco); })(0);
  }

  /* ---------- WhatsApp: a mensagem já vai escrita ---------- */
  // Número divulgado pela própria profissional na arte dela (formato 55DDDNÚMERO).
  var NUMERO = '5521998118122';
  var MOMENTOS = { 'casamento': ' para o meu casamento', 'quinze': ' para os meus 15 anos', 'festa': ' para uma festa', 'porque-sim': '', '': '' };
  var SERVICOS = { '': 'cabelo e make', 'progressiva': 'uma progressiva', 'cabelo': 'hidratação, escova ou prancha', 'make': 'uma make' };
  var servicoAtual = '';
  function textoMensagem() {
    var sim = momentoAtual === 'porque-sim';
    return 'Oi, Carolina! Vi sua página e quero agendar ' + SERVICOS[servicoAtual] + MOMENTOS[momentoAtual] +
      (sim ? ', só porque sim' : '') + '. Você tem ' + (sim ? 'horário' : 'data') + ' disponível?';
  }
  function textoResumo() {
    var t = SERVICOS[servicoAtual] + (momentoAtual === 'porque-sim' ? ', só porque sim' : MOMENTOS[momentoAtual]);
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  var recado = $('#recado'), momentoAtual = ler('cm-momento') || '', digitacao = null;
  if (!MOMENTOS.hasOwnProperty(momentoAtual)) momentoAtual = '';
  function atualizarLinks() {
    var url = 'https://wa.me/' + NUMERO + '?text=' + encodeURIComponent(textoMensagem());
    var res = $('#resumo'); if (res) res.textContent = textoResumo();
    $$('.zap').forEach(function (a) { a.href = url; });
  }
  function escreverRecado(animar) {
    var texto = textoMensagem();
    clearInterval(digitacao);
    recado.setAttribute('aria-label', texto);
    if (!vivo || !animar) { recado.textContent = texto; recado.classList.remove('digitando'); return; }
    var i = 0; recado.textContent = ''; recado.classList.add('digitando');
    digitacao = setInterval(function () {
      i += 2; recado.textContent = texto.slice(0, i);
      if (i >= texto.length) { clearInterval(digitacao); recado.classList.remove('digitando'); }
    }, 22);
  }
  var botoes = $$('.pincelada');
  function marcar(id, animar, origem) {
    momentoAtual = MOMENTOS.hasOwnProperty(id) ? id : '';
    guardar('cm-momento', momentoAtual);
    botoes.forEach(function (b) { b.setAttribute('aria-checked', b.dataset.momento === momentoAtual ? 'true' : 'false'); });
    atualizarLinks(); escreverRecado(animar);
    if (origem && animar) { var r = origem.getBoundingClientRect(); soltar(r.left + r.width * .5, r.top + r.height * .5, 22, 2.8); }
  }
  botoes.forEach(function (b, i) {
    b.addEventListener('click', function () { marcar(b.dataset.momento === momentoAtual ? '' : b.dataset.momento, true, b); });
    b.addEventListener('keydown', function (e) {
      var passo = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : (e.key === 'ArrowUp' || e.key === 'ArrowLeft') ? -1 : 0;
      if (!passo) return;
      e.preventDefault(); botoes[(i + passo + botoes.length) % botoes.length].focus();
    });
  });
  marcar(momentoAtual, false);

  /* ---------- Reserva: a conta dos 25% com o valor inicial divulgado ---------- */
  var pilulas = $$('.pilula'), elReserva = $('#contaReserva'), elResto = $('#contaResto'), conta = { v: 65 };
  function reais(n) { return 'R$ ' + n.toFixed(2).replace('.', ','); }
  function mostrarConta() { elReserva.textContent = reais(conta.v * .25); elResto.textContent = reais(conta.v * .75); }
  function escolherServico(b, animar) {
    pilulas.forEach(function (p) { p.setAttribute('aria-checked', p === b ? 'true' : 'false'); });
    servicoAtual = b.dataset.servico;
    var alvo = +b.dataset.valor;
    if (vivo && animar) G.to(conta, { v: alvo, duration: .6, ease: 'power2.out', onUpdate: mostrarConta });
    else { conta.v = alvo; mostrarConta(); }
    atualizarLinks(); escreverRecado(false);
  }
  pilulas.forEach(function (b) { b.addEventListener('click', function () { escolherServico(b, true); }); });
  mostrarConta();

  /* ---------- Make: o pó esfuma onde o pincel e o dedo passam ---------- */
  var palco = $('#makePalco'), telaPo = $('#po'), cPo = telaPo.getContext('2d'), pincel = $('#pincel');
  var poAtual = 'blush', poL = 0, poA = 0, poDpr = 1, ultimoPo = null;
  function corPo(nome) {
    var cs = getComputedStyle(raiz);
    return cs.getPropertyValue(nome === 'blush' ? '--batom' : nome === 'iluminador' ? '--champanhe' : '--sombra').trim();
  }
  function medirPo() {
    var r = palco.getBoundingClientRect();
    poDpr = Math.min(window.devicePixelRatio || 1, 3); poL = r.width; poA = r.height;
    telaPo.width = Math.round(poL * poDpr); telaPo.height = Math.round(poA * poDpr);
    cPo.setTransform(poDpr, 0, 0, poDpr, 0, 0);
    if (!vivo) pintarPoParado(); else progPo = -1;
  }
  // Uma batida de pincel: mancha macia mais alguns grãos soltos em volta.
  function baterPo(x, y, nome, forca) {
    var cor = corPo(nome), raio = 30 + forca * 16;
    var g = cPo.createRadialGradient(x, y, 0, x, y, raio);
    g.addColorStop(0, cor); g.addColorStop(1, 'rgba(0,0,0,0)');
    cPo.globalAlpha = .13 + forca * .07; cPo.fillStyle = g;
    cPo.beginPath(); cPo.arc(x, y, raio, 0, 6.283); cPo.fill();
    cPo.fillStyle = cor;
    for (var i = 0; i < 5; i++) {
      var a = Math.random() * 6.283, d = Math.random() * raio * 1.25;
      cPo.globalAlpha = .18 + Math.random() * .3;
      cPo.beginPath(); cPo.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, .4 + Math.random() * .9, 0, 6.283); cPo.fill();
    }
    cPo.globalAlpha = 1;
  }
  function riscarPo(x, y, nome, forca) {
    if (ultimoPo && ultimoPo.nome === nome) {
      var dx = x - ultimoPo.x, dy = y - ultimoPo.y, n = Math.min(12, Math.ceil(Math.sqrt(dx * dx + dy * dy) / 12));
      for (var i = 1; i <= n; i++) baterPo(ultimoPo.x + dx * i / n, ultimoPo.y + dy * i / n, nome, forca);
    } else baterPo(x, y, nome, forca);
    ultimoPo = { x: x, y: y, nome: nome };
  }
  // Caminho do pincel conforme a rolagem: três passadas em S pelo palco.
  function pontoPincel(p) {
    return { x: poL * (.14 + .72 * (.5 - .5 * Math.cos(p * Math.PI * 3))), y: poA * (.16 + .66 * p) };
  }
  function pintarPoParado() {
    cPo.clearRect(0, 0, poL, poA); ultimoPo = null;
    var nomes = ['blush', 'iluminador', 'sombra'];
    for (var i = 0; i <= 90; i++) { var q = pontoPincel(i / 90); riscarPo(q.x, q.y, nomes[Math.min(2, Math.floor(i / 31))], .6); }
    ultimoPo = null;
  }
  var potes = $$('.pote');
  potes.forEach(function (b) {
    b.addEventListener('click', function () {
      poAtual = b.dataset.po; ultimoPo = null;
      potes.forEach(function (o) { o.setAttribute('aria-checked', o === b ? 'true' : 'false'); });
      var r = $('i', b).getBoundingClientRect(); soltar(r.left + r.width / 2, r.top + r.height / 2, 18, 2.4);
    });
  });
  var progPo = -1;
  function dedoNoPo(x, y) {
    if (!vivo) return;
    var r = palco.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) { if (ultimoPo && ultimoPo.dedo) ultimoPo = null; return; }
    riscarPo(x - r.left, y - r.top, poAtual, 1); ultimoPo.dedo = true;
  }
  window.addEventListener('pointermove', function (e) { dedoNoPo(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) dedoNoPo(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('pointerdown', function (e) { ultimoPo = null; dedoNoPo(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('resize', function () { if (Math.abs(palco.getBoundingClientRect().width - poL) > 2) medirPo(); });
  medirPo();
  if (!vivo) pincel.style.display = 'none';

  /* ---------- Espelho: as lâmpadas do camarim ---------- */
  var espelho = $('#espelhoPeca'), caixaLamp = $('#lampadas'), lampadas = [];
  (function criarLampadas() {
    // Contorno do espelho em proporção 3:4: lateral esquerda, arco de cima, lateral direita.
    var W = 3, H = 4, ry = H * .375, rx = W / 2, reta = H - ry - .25, arco = Math.PI * (rx + ry) / 2, total = reta * 2 + arco, N = 17;
    for (var i = 0; i < N; i++) {
      var d = total * i / (N - 1), x, y;
      if (d <= reta) { x = 0; y = H - .25 - d; }
      else if (d <= reta + arco) { var a = Math.PI - (d - reta) / arco * Math.PI; x = rx + Math.cos(a) * rx; y = ry - Math.sin(a) * ry; }
      else { x = W; y = ry + (d - reta - arco); }
      var el = document.createElement('i'); el.className = 'lampada';
      el.style.left = (x / W * 100).toFixed(2) + '%'; el.style.top = (y / H * 100).toFixed(2) + '%';
      caixaLamp.appendChild(el); lampadas.push(el);
    }
  })();
  var acendendo = [];
  function acender(liga) {
    acendendo.forEach(clearTimeout); acendendo = [];
    if (!liga) { lampadas.forEach(function (l) { l.classList.remove('acesa'); }); espelho.classList.remove('aceso'); return; }
    // Acende das pontas para o alto do arco, como um camarim ligando.
    var meio = (lampadas.length - 1) / 2;
    lampadas.forEach(function (l, i) {
      acendendo.push(setTimeout(function () { l.classList.add('acesa'); }, vivo ? (meio - Math.abs(i - meio)) * 85 : 0));
    });
    acendendo.push(setTimeout(function () {
      espelho.classList.add('aceso');
      var r = espelho.getBoundingClientRect(); soltar(r.left + r.width / 2, r.top + r.height * .2, 40, 3.6);
    }, vivo ? meio * 85 + 150 : 0));
  }
  if (!vivo) acender(true);

  /* ---------- Barra de ação: aparece quando o botão da abertura sai da tela ---------- */
  var barra = $('#barra'), zapBarra = $('#zapBarra');
  if ('IntersectionObserver' in window) {
    var aVista = {};
    var olho = new IntersectionObserver(function (es) {
      es.forEach(function (e) { aVista[e.target.id] = e.isIntersecting; });
      var fora = !Object.keys(aVista).some(function (k) { return aVista[k]; });
      barra.classList.toggle('visivel', fora);
      barra.setAttribute('aria-hidden', fora ? 'false' : 'true');
      zapBarra.tabIndex = fora ? 0 : -1;
    });
    // O recado é para a profissional: ali a barra da cliente não aparece.
    ['#zapTopo', '#zapRecado', '#zapFim', '#bilhete'].forEach(function (id) { olho.observe($(id)); });
  }

  /* ---------- A mecha: ondulada antes da prancha, lisa depois ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var gFios = $('#fios'), gLuzes = $('#luzes'), prancha = $('#prancha'), svgMecha = $('#mecha');
  var tesoura = $('#tesoura'), laminaA = $('#laminaA'), laminaB = $('#laminaB'), CORTE = 786;
  var ALT = 900, N = 46, fios = [], luzes = [];
  var Y0 = 40, Y1 = 876;
  (function criarFios() {
    for (var i = 0; i < N; i++) {
      var u = i / (N - 1) - .5;                       // -0.5 a 0.5 dentro da mecha
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('class', 'f' + (1 + (i * 7) % 4));
      p.setAttribute('stroke-width', (.75 + ((i * 13) % 5) * .24).toFixed(2));
      p.setAttribute('opacity', (.62 + ((i * 3) % 4) * .12).toFixed(2));
      gFios.appendChild(p);
      fios.push({ el: p, u: u, amp: 15 + ((i * 17) % 9) * 2.2, k: .017 + ((i * 5) % 7) * .0016, fase: i * 1.37, frizz: ((i * 11) % 6) * .9, fim: 792 + (i * 29) % 76, cortado: false });
    }
    for (var j = 0; j < 4; j++) {
      var q = document.createElementNS(NS, 'path');
      q.setAttribute('stroke-width', j % 2 ? '1.1' : '1.8');
      gLuzes.appendChild(q);
      luzes.push({ el: q, u: -.3 + j * .2 });
    }
  })();
  function suave(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  // x de um fio na altura y. yp = altura da prancha. Acima dela o fio já está liso.
  function xFio(f, y, yp, t) {
    var liso = 150 + f.u * (78 + Math.max(0, y) * .03);
    var solto = suave(yp - 6, yp + 70, y);
    if (solto <= 0) return liso;
    var ponta = .35 + (Math.max(0, y) / ALT) * 1.1;
    var onda = Math.sin(y * f.k + f.fase + t * .7) * f.amp * ponta
             + Math.sin(y * .051 + f.fase * 2.3 + t * 1.1) * f.frizz * ponta
             + f.u * 46 * (Math.max(0, y) / ALT);
    return liso + onda * solto;
  }
  function lim(x) { return Math.max(0, Math.min(1, x)); }
  // prog 0 a 1: até 0,8 a prancha desce; de 0,84 a 0,98 a tesoura atravessa e apara as pontas.
  function desenharMecha(prog, t) {
    var yp = Y0 + (Y1 - Y0) * lim(prog / .8);
    var c = lim((prog - .84) / .14);
    var xt = 345 - c * 330, frente = xt - 40;          // posição da tesoura e ponto onde ela corta
    for (var i = 0; i < fios.length; i++) {
      var f = fios[i], d = '', px = 0, py = 0;
      var xNoCorte = 150 + f.u * (78 + CORTE * .03);
      var cortado = c > 0 && xNoCorte > frente;
      if (cortado && !f.cortado && c < 1) {
        var m = svgMecha.getScreenCTM();
        if (m) soltar(m.a * xNoCorte + m.e, m.d * CORTE + m.f, 2, 1.2);
      }
      f.cortado = cortado;
      var fim = cortado ? CORTE : f.fim;
      for (var y = -260; ; y += 16) {
        if (y > fim) y = fim;
        var x = xFio(f, y, yp, t);
        if (y === -260) d = 'M' + x.toFixed(1) + ' ' + y;
        else d += ' Q' + px.toFixed(1) + ' ' + py + ' ' + ((px + x) / 2).toFixed(1) + ' ' + ((py + y) / 2);
        px = x; py = y;
        if (y >= fim) break;
      }
      f.el.setAttribute('d', d + ' L' + px.toFixed(1) + ' ' + py);
    }
    // Reflexos de brilho só no trecho já alisado
    for (var j = 0; j < luzes.length; j++) {
      var l = luzes[j], fimL = Math.min(CORTE - 30, Math.max(0, yp - 14)), ini = Math.max(0, fimL - 260 - j * 40);
      var xa = 150 + l.u * (78 + ini * .03), xb = 150 + l.u * (78 + fimL * .03);
      l.el.setAttribute('d', fimL > 12 ? 'M' + xa.toFixed(1) + ' ' + ini.toFixed(1) + ' L' + xb.toFixed(1) + ' ' + fimL.toFixed(1) : '');
    }
    prancha.setAttribute('transform', 'translate(0 ' + yp.toFixed(1) + ')');
    prancha.setAttribute('opacity', (1 - lim((prog - .8) / .035)).toFixed(2));
    var abre = 4 + 15 * Math.abs(Math.sin(c * Math.PI * 6));
    tesoura.setAttribute('transform', 'translate(' + xt.toFixed(1) + ' ' + CORTE + ')');
    tesoura.setAttribute('opacity', (lim(c / .06) * (1 - lim((c - .94) / .06))).toFixed(2));
    laminaA.setAttribute('transform', 'rotate(' + abre.toFixed(1) + ')');
    laminaB.setAttribute('transform', 'rotate(' + (-abre).toFixed(1) + ')');
  }

  var etapas = $$('.valores li');
  function mostrarValores(prog) {
    etapas.forEach(function (li) {
      var n = +li.dataset.mostra, limite = n === 1 ? .16 : n === 2 ? .42 : .97;
      li.classList.toggle('visivel', prog >= limite);
    });
  }

  if (!vivo) {
    desenharMecha(1, 0);
    mostrarValores(1);
    return;
  }

  /* ---------- Rolagem amortecida ---------- */
  var lenis = new Lenis({ lerp: .1 });
  lenis.on('scroll', ST.update);
  G.ticker.add(function (t) { lenis.raf(t * 1000); });
  G.ticker.lagSmoothing(0);

  /* ---------- Abertura: um momento só, orquestrado ---------- */
  var fio = $('#fioAbertura'), comp = fio.getTotalLength();
  fio.style.strokeDasharray = comp; fio.style.strokeDashoffset = comp;
  var entrada = G.timeline({ defaults: { ease: 'power3.out' } });
  entrada
    .from('.oficio', { opacity: 0, y: 12, duration: .7 }, .15)
    .from('#nome .linha', { yPercent: 60, opacity: 0, letterSpacing: '.08em', duration: 1.3, stagger: .16, ease: 'expo.out' }, .25)
    .to(fio, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut' }, .5)
    .from('.frase', { opacity: 0, y: 18, duration: .9 }, 1)
    .from('.apoio, .abertura-acao > *', { opacity: 0, y: 14, duration: .8, stagger: .1 }, 1.25)
    .from('.dica-rolar', { opacity: 0, duration: .8 }, 2);
  entrada.call(function () { soltar(L * .5, A * .34, 36, 3.4); }, null, .7);

  // O reflexo do ouro rosé anda com a rolagem; o nome sobe mais devagar que o resto.
  G.to(raiz, { '--reflexo': '95%', ease: 'none', scrollTrigger: { trigger: '#abertura', start: 'top top', end: 'bottom top', scrub: true } });
  G.to('#nome', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '#abertura', start: 'top top', end: 'bottom top', scrub: true } });
  G.to('.dica-rolar', { opacity: 0, scrollTrigger: { trigger: '#abertura', start: 'top top', end: '18% top', scrub: true } });

  /* ---------- Momento: as opções entram como passadas de pincel ---------- */
  G.from('.momento h2, .momento-apoio', { opacity: 0, y: 26, duration: .9, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '#momento', start: 'top 78%' } });
  G.from('.pincelada', { opacity: 0, x: -34, duration: .8, stagger: .09, ease: 'power3.out', scrollTrigger: { trigger: '.momentos', start: 'top 86%' } });
  G.from('.recado', { opacity: 0, y: 24, scale: .96, transformOrigin: '0 100%', duration: .7, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.recado', start: 'top 92%' } });

  /* ---------- Cabelo: a seção prende e a rolagem passa a prancha ---------- */
  var estado = { p: 0 }, tempo = 0, visivel = false, ultimoP = -1, quenteAte = 0;
  ST.create({
    trigger: '#cabelo', start: 'top top', end: '+=220%', pin: '.cabelo-palco', scrub: .4,
    animation: G.to(estado, { p: 1, ease: 'none' })
  });
  ST.create({ trigger: '#cabelo', start: 'top bottom', end: 'bottom top', onToggle: function (s) { visivel = s.isActive; } });
  G.from('.cabelo-texto', { opacity: 0, y: 30, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '#cabelo', start: 'top 60%' } });
  G.ticker.add(function (t) {
    if (!visivel) return;
    tempo = t;
    if (Math.abs(estado.p - ultimoP) > .0008) { quenteAte = t + .5; ultimoP = estado.p; }
    prancha.classList.toggle('quente', t < quenteAte && estado.p > .01 && estado.p < .8);
    desenharMecha(estado.p, tempo);
    mostrarValores(estado.p);
  });
  desenharMecha(0, 0);

  /* ---------- Make: o pincel percorre o palco com a rolagem ---------- */
  G.from('.make h2, .make-apoio', { opacity: 0, y: 26, duration: .9, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '#make', start: 'top 78%' } });
  var nomesPo = ['blush', 'iluminador', 'sombra'], tocouPote = false;
  potes.forEach(function (b) { b.addEventListener('click', function () { tocouPote = true; }); });
  ST.create({
    trigger: '#makePalco', start: 'top 82%', end: 'bottom 30%', scrub: .5,
    onUpdate: function (st) {
      var p = st.progress, q = pontoPincel(p), antes = pontoPincel(Math.max(0, p - .012));
      var inclina = Math.max(-24, Math.min(24, (q.x - antes.x) * 5));
      pincel.style.transform = 'translate(' + (q.x - 22).toFixed(1) + 'px,' + q.y.toFixed(1) + 'px) rotate(' + (180 + inclina).toFixed(1) + 'deg)';
      if (p > progPo) {                                   // só pinta descendo: o que já foi esfumado fica
        var nome = tocouPote ? poAtual : nomesPo[Math.min(2, Math.floor(p * 3))];
        if (ultimoPo && ultimoPo.dedo) ultimoPo = null;
        riscarPo(q.x, q.y, nome, .7); progPo = p;
      }
    }
  });
  G.from('.valores-make li', { opacity: 0, y: 18, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: '.valores-make', start: 'top 88%' } });

  /* ---------- Reserva ---------- */
  G.from('.reserva h2, .passos li', { opacity: 0, y: 24, duration: .8, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: '#reserva', start: 'top 78%' } });
  G.from('.conta', { opacity: 0, y: 24, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.conta', start: 'top 86%' } });

  /* ---------- Espelho: acende quando chega ao meio da tela ---------- */
  ST.create({ trigger: '#espelhoPeca', start: 'top 62%', onEnter: function () { acender(true); }, onLeaveBack: function () { acender(false); } });
  G.fromTo(espelho, { '--luz-vidro': '85%' }, { '--luz-vidro': '10%', ease: 'none', scrollTrigger: { trigger: '#espelho', start: 'top bottom', end: 'bottom top', scrub: true } });
  G.from('.bilhete', { opacity: 0, y: 30, rotation: -1.5, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '#bilhete', start: 'top 82%' } });

  /* ---------- Assinatura: a coroa solta brilho ---------- */
  var ass = $('#assinatura');
  ass.addEventListener('click', function () {
    var r = $('svg', ass).getBoundingClientRect();
    soltar(r.left + r.width / 2, r.top + r.height / 2, 46, 4.2);
    ass.classList.add('brilhou');
    setTimeout(function () { ass.classList.remove('brilhou'); }, 900);
  });

  window.addEventListener('load', function () { ST.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
})();
