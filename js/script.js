// Campo Minado – funcional com configurações e compatível com GitHub Pages

(() => {
  const setupEl = document.getElementById('setup');
  const setupForm = document.getElementById('setup-form');

  const hudEl = document.getElementById('hud');
  const mineCountEl = document.getElementById('mine-count');
  const flagsUsedEl = document.getElementById('flags-used');
  const revealedCountEl = document.getElementById('revealed-count');

  const resetBtn = document.getElementById('reset-btn');
  const backBtn = document.getElementById('back-btn');

  const boardContainerEl = document.getElementById('board-container');
  const statusEl = document.getElementById('status');
  const boardEl = document.getElementById('board');

  // Estado do jogo
  let rows = 10;
  let cols = 10;
  let mines = 20;
  let seed = null;

  let grid = []; // cada célula: {row, col, mine, revealed, flag, neighbors}
  let firstClick = true;
  let flagsUsed = 0;
  let revealedCount = 0;
  let gameOver = false;

  // Util: Seeded PRNG para gerar tabuleiro determinístico (opcional)
  function mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStringToSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function randInt(max, rng) {
    return Math.floor(rng() * max);
  }

  // Cria a grade vazia
  function createEmptyGrid(r, c) {
    const g = [];
    for (let i = 0; i < r; i++) {
      const row = [];
      for (let j = 0; j < c; j++) {
        row.push({
          row: i,
          col: j,
          mine: false,
          revealed: false,
          flag: 0, // 0: none, 1: flag, 2: question
          neighbors: 0,
          el: null
        });
      }
      g.push(row);
    }
    return g;
  }

  // Distribui minas, garantindo que a primeira célula clicada não seja mina
  function placeMines(safeRow, safeCol) {
    const rng = seed ? mulberry32(hashStringToSeed(seed)) : Math.random;
    let placed = 0;
    const totalCells = rows * cols;
    // Lista de índices disponíveis (evita colocar mina na primeira célula)
    const indices = [];
    for (let idx = 0; idx < totalCells; idx++) {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      if (r === safeRow && c === safeCol) continue;
      indices.push(idx);
    }
    // Embaralhar e pegar os primeiros "mines"
    for (let i = indices.length - 1; i > 0; i--) {
      const j = rng === Math.random ? Math.floor(Math.random() * (i + 1)) : randInt(i + 1, rng);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let k = 0; k < Math.min(mines, indices.length); k++) {
      const idx = indices[k];
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      grid[r][c].mine = true;
      placed++;
    }
    // Calcula vizinhos
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[r][c].neighbors = countNeighbors(r, c);
      }
    }
  }

  function inBounds(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
  }

  function countNeighbors(r, c) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && grid[nr][nc].mine) count++;
      }
    }
    return count;
  }

  function updateHUD() {
    mineCountEl.textContent = mines;
    flagsUsedEl.textContent = flagsUsed;
    revealedCountEl.textContent = revealedCount;
  }

  function showStatus(msg) {
    statusEl.textContent = msg || '';
  }

  function buildBoard() {
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const el = document.createElement('button');
        el.className = 'cell';
        el.setAttribute('role', 'gridcell');
        el.setAttribute('aria-label', 'célula');
        el.dataset.row = r;
        el.dataset.col = c;

        // Eventos
        el.addEventListener('click', onCellLeftClick);
        el.addEventListener('contextmenu', onCellRightClick);
        el.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); }); // evita clique do meio

        cell.el = el;
        boardEl.appendChild(el);
      }
    }
  }

  function onCellLeftClick(e) {
    e.preventDefault();
    if (gameOver) return;

    const el = e.currentTarget;
    const r = +el.dataset.row;
    const c = +el.dataset.col;
    const cell = grid[r][c];

    if (cell.flag === 1 || cell.revealed) return;

    // Na primeira jogada, posicionar minas garantindo célula segura
    if (firstClick) {
      placeMines(r, c);
      firstClick = false;
      showStatus('Boa sorte!');
    }

    revealCell(r, c);

    checkWin();
  }

  function onCellRightClick(e) {
    e.preventDefault();
    if (gameOver || firstClick) return; // só permite marcar após posicionar minas

    const el = e.currentTarget;
    const r = +el.dataset.row;
    const c = +el.dataset.col;
    const cell = grid[r][c];

    if (cell.revealed) return;

    // Ciclo: vazio -> bandeira -> interrogação -> vazio
    if (cell.flag === 0) {
      cell.flag = 1;
      flagsUsed++;
      el.classList.add('flag');
      el.setAttribute('aria-label', 'bandeira');
    } else if (cell.flag === 1) {
      cell.flag = 2;
      flagsUsed--;
      el.classList.remove('flag');
      el.classList.add('question');
      el.setAttribute('aria-label', 'interrogação');
    } else {
      cell.flag = 0;
      el.classList.remove('question');
      el.setAttribute('aria-label', 'célula');
    }

    updateHUD();
  }

  function revealCell(r, c) {
    const cell = grid[r][c];
    if (cell.revealed) return;

    cell.revealed = true;
    revealedCount++;
    updateHUD();

    const el = cell.el;
    el.classList.add('revealed');

    if (cell.mine) {
      el.classList.add('mine');
      el.textContent = '💣';
      endGame(false);
      return;
    }

    if (cell.neighbors > 0) {
      el.textContent = String(cell.neighbors);
      el.classList.add(`number-${cell.neighbors}`);
    } else {
      el.textContent = '';
      // Expansão flood fill
      floodReveal(r, c);
    }
  }

  function floodReveal(r, c) {
    const queue = [[r, c]];
    while (queue.length) {
      const [cr, cc] = queue.shift();
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cr + dr, nc = cc + dc;
          if (!inBounds(nr, nc)) continue;
          if (dr === 0 && dc === 0) continue;

          const ncell = grid[nr][nc];
          if (ncell.revealed || ncell.flag === 1) continue;

          ncell.revealed = true;
          revealedCount++;
          const nel = ncell.el;
          nel.classList.add('revealed');

          if (ncell.mine) continue;

          if (ncell.neighbors > 0) {
            nel.textContent = String(ncell.neighbors);
            nel.classList.add(`number-${ncell.neighbors}`);
          } else {
            nel.textContent = '';
            queue.push([nr, nc]);
          }
        }
      }
    }
    updateHUD();
  }

  function chordReveal(r, c) {
    // Se a célula revelada tem número e o número de bandeiras ao redor == número,
    // revela automaticamente vizinhos não marcados.
    const cell = grid[r][c];
    if (!cell.revealed || cell.neighbors === 0) return;

    const flagged = countFlaggedNeighbors(r, c);
    if (flagged !== cell.neighbors) return;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (!inBounds(nr, nc) || (dr === 0 && dc === 0)) continue;
        const ncell = grid[nr][nc];
        if (!ncell.revealed && ncell.flag !== 1) {
          revealCell(nr, nc);
        }
      }
    }
  }

  function countFlaggedNeighbors(r, c) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (!inBounds(nr, nc) || (dr === 0 && dc === 0)) continue;
        if (grid[nr][nc].flag === 1) count++;
      }
    }
    return count;
  }

  function checkWin() {
    const safeCells = rows * cols - mines;
    if (revealedCount >= safeCells && !gameOver) {
      endGame(true);
    }
  }

  function endGame(won) {
    gameOver = true;
    if (won) {
      showStatus('Você venceu! 🎉');
    } else {
      showStatus('Game over! 💥');
      // Revela todas as minas
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c];
          if (cell.mine) {
            cell.el.classList.add('revealed', 'mine');
            cell.el.textContent = '💣';
          }
        }
      }
    }
    // Desabilita interação
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[r][c].el.disabled = true;
      }
    }
  }

  function resetGame() {
    firstClick = true;
    flagsUsed = 0;
    revealedCount = 0;
    gameOver = false;
    grid = createEmptyGrid(rows, cols);
    updateHUD();
    showStatus('Clique em uma célula para começar.');
    buildBoard();
    enableChord();
  }

  function enableChord() {
    // Duplo clique/chord: se número e bandeiras batem, revela vizinhos
    boardEl.addEventListener('dblclick', e => {
      const target = e.target;
      if (!target.classList.contains('cell')) return;
      const r = +target.dataset.row;
      const c = +target.dataset.col;
      chordReveal(r, c);
      checkWin();
    });
  }

  // Handlers UI
  setupForm.addEventListener('submit', e => {
    e.preventDefault();
    const formData = new FormData(setupForm);
    rows = clamp(parseInt(formData.get('rows'), 10), 5, 40);
    cols = clamp(parseInt(formData.get('cols'), 10), 5, 40);
    mines = parseInt(formData.get('mines'), 10);
    seed = (formData.get('seed') || '').trim() || null;

    const maxMines = Math.max(1, rows * cols - 1);
    mines = clamp(mines, 1, maxMines);

    setupEl.classList.add('hidden');
    hudEl.classList.remove('hidden');
    boardContainerEl.classList.remove('hidden');

    resetGame();
  });

  resetBtn.addEventListener('click', () => {
    resetGame();
  });

  backBtn.addEventListener('click', () => {
    // Volta para tela inicial
    boardContainerEl.classList.add('hidden');
    hudEl.classList.add('hidden');
    setupEl.classList.remove('hidden');
    showStatus('');
    boardEl.innerHTML = '';
  });

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  // Acessibilidade: teclado
  boardEl.addEventListener('keydown', e => {
    const target = e.target;
    if (!target.classList.contains('cell')) return;

    const r = +target.dataset.row;
    const c = +target.dataset.col;

    // Navegação com setas
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      let nr = r, nc = c;
      if (e.key === 'ArrowUp') nr = r - 1;
      if (e.key === 'ArrowDown') nr = r + 1;
      if (e.key === 'ArrowLeft') nc = c - 1;
      if (e.key === 'ArrowRight') nc = c + 1;
      if (inBounds(nr, nc)) grid[nr][nc].el.focus();
    }

    // Enter/Space: revelar
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      grid[r][c].el.click();
    }

    // F: alterna bandeira
    if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      const fakeEvent = { preventDefault() {}, currentTarget: grid[r][c].el };
      onCellRightClick(fakeEvent);
    }

    // D: chord (duplo clique)
    if (e.key.toLowerCase() === 'd') {
      e.preventDefault();
      chordReveal(r, c);
      checkWin();
    }
  });

  // Inicial: mostra setup
  showStatus('');
})();
