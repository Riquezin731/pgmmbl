// Campo Minado - JS puro
// Regras: clique esquerdo revela, direito marca bandeira.
// Vitória ao revelar todas as células seguras; derrota ao clicar em mina.

(() => {
  const boardEl = document.getElementById("board");
  const difficultyEl = document.getElementById("difficulty");
  const rowsEl = document.getElementById("rows");
  const colsEl = document.getElementById("cols");
  const minesEl = document.getElementById("mines");
  const startBtn = document.getElementById("startBtn");

  const mineCountEl = document.getElementById("mineCount");
  const flagsCountEl = document.getElementById("flagsCount");
  const timerEl = document.getElementById("timer");
  const gameStateEl = document.getElementById("gameState");

  let grid = [];
  let rows = 9;
  let cols = 9;
  let totalMines = 10;
  let flags = 0;
  let revealedSafeCells = 0;
  let firstClickDone = false;
  let gameOver = false;

  let timerInterval = null;
  let startTime = null;

  // Utilidades
  const inBounds = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const idx = (r, c) => r * cols + c;

  function resetTimer() {
    if (timerInterval) clearInterval(timerInterval);
    startTime = null;
    timerEl.textContent = "00:00";
  }

  function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
      const ss = String(elapsed % 60).padStart(2, "0");
      timerEl.textContent = `${mm}:${ss}`;
    }, 250);
  }

  function setState(text) {
    gameStateEl.textContent = text;
  }

  // Construção da grade
  function createGrid() {
    grid = Array.from({ length: rows * cols }, () => ({
      mine: false,
      open: false,
      flag: false,
      adj: 0,
      el: null,
      r: 0, c: 0
    }));

    const gridEl = document.createElement("div");
    gridEl.className = "grid";
    gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[idx(r, c)];
        cell.r = r; cell.c = c;

        const cellEl = document.createElement("button");
        cellEl.className = "cell";
        cellEl.setAttribute("data-r", r);
        cellEl.setAttribute("data-c", c);
        cellEl.setAttribute("aria-label", "célula fechada");
        cellEl.addEventListener("click", handleLeftClick);
        cellEl.addEventListener("contextmenu", handleRightClick);
        cell.el = cellEl;

        gridEl.appendChild(cellEl);
      }
    }

    boardEl.innerHTML = "";
    boardEl.appendChild(gridEl);
  }

  // Plantar minas assegurando que primeira jogada seja segura
  function plantMines(safeR, safeC) {
    let planted = 0;
    const safeIndex = idx(safeR, safeC);
    while (planted < totalMines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      const i = idx(r, c);
      if (i === safeIndex || grid[i].mine) continue;
      grid[i].mine = true;
      planted++;
    }
    computeAdjacency();
  }

  function neighbors(r, c) {
    const ns = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc)) ns.push(grid[idx(nr, nc)]);
      }
    }
    return ns;
  }

  function computeAdjacency() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[idx(r, c)];
        if (cell.mine) {
          cell.adj = 0;
          continue;
        }
        cell.adj = neighbors(r, c).filter(n => n.mine).length;
      }
    }
  }

  // Interações
  function handleLeftClick(e) {
    e.preventDefault();
    if (gameOver) return;

    const el = e.currentTarget;
    const r = parseInt(el.getAttribute("data-r"), 10);
    const c = parseInt(el.getAttribute("data-c"), 10);
    const cell = grid[idx(r, c)];

    if (cell.open || cell.flag) return;

    // Garante que a primeira jogada seja segura
    if (!firstClickDone) {
      plantMines(r, c);
      firstClickDone = true;
      resetTimer();
      startTimer();
      setState("Jogando");
      updateCounters();
    }

    openCell(cell);

    checkWin();
  }

  function handleRightClick(e) {
    e.preventDefault();
    if (gameOver) return;

    const el = e.currentTarget;
    const r = parseInt(el.getAttribute("data-r"), 10);
    const c = parseInt(el.getAttribute("data-c"), 10);
    const cell = grid[idx(r, c)];

    if (cell.open) return;

    cell.flag = !cell.flag;
    if (cell.flag) {
      flags++;
      cell.el.classList.add("flag");
      cell.el.setAttribute("aria-label", "célula marcada com bandeira");
    } else {
      flags--;
      cell.el.classList.remove("flag");
      cell.el.setAttribute("aria-label", "célula fechada");
    }

    updateCounters();
  }

  function openCell(cell) {
    if (cell.open) return;
    cell.open = true;
    cell.el.classList.add("open");
    cell.el.setAttribute("aria-label", "célula aberta");

    if (cell.mine) {
      revealAllMines();
      endGame(false);
      return;
    }

    revealedSafeCells++;
    if (cell.adj > 0) {
      cell.el.textContent = cell.adj;
      cell.el.classList.add(`number-${cell.adj}`);
    } else {
      // Flood fill para zeros
      floodReveal(cell.r, cell.c);
    }
  }

  function floodReveal(r, c) {
    const queue = [{ r, c }];
    while (queue.length) {
      const { r: cr, c: cc } = queue.shift();
      const cell = grid[idx(cr, cc)];
      if (!cell.open) {
        cell.open = true;
        cell.el.classList.add("open");
        revealedSafeCells++;
      }
      if (cell.flag) {
        cell.flag = false;
        cell.el.classList.remove("flag");
        flags--;
      }
      const adjCount = cell.adj;
      if (adjCount > 0) {
        cell.el.textContent = adjCount;
        cell.el.classList.add(`number-${adjCount}`);
      } else {
        const ns = neighbors(cr, cc);
        for (const n of ns) {
          if (!n.open && !n.mine) {
            queue.push({ r: n.r, c: n.c });
          }
        }
      }
    }
    updateCounters();
  }

  function revealAllMines() {
    grid.forEach(cell => {
      if (cell.mine) {
        cell.el.classList.add("open", "mine");
        cell.el.textContent = "💣";
      }
    });
  }

  function checkWin() {
    const totalSafe = rows * cols - totalMines;
    if (revealedSafeCells >= totalSafe && !gameOver) {
      endGame(true);
    }
  }

  function endGame(won) {
    gameOver = true;
    clearInterval(timerInterval);
    setState(won ? "Vitória!" : "Derrota");
    // Desabilita cliques
    grid.forEach(cell => {
      cell.el.disabled = true;
    });
  }

  function updateCounters() {
    mineCountEl.textContent = totalMines;
    flagsCountEl.textContent = flags;
  }

  function readInputsFromUI() {
    const diff = difficultyEl.value;
    if (diff === "easy") {
      rows = 9; cols = 9; totalMines = 10;
      rowsEl.value = rows; colsEl.value = cols; minesEl.value = totalMines;
    } else if (diff === "medium") {
      rows = 16; cols = 16; totalMines = 40;
      rowsEl.value = rows; colsEl.value = cols; minesEl.value = totalMines;
    } else if (diff === "hard") {
      rows = 16; cols = 30; totalMines = 99;
      rowsEl.value = rows; colsEl.value = cols; minesEl.value = totalMines;
    } else {
      rows = clamp(parseInt(rowsEl.value || "9", 10), 5, 50);
      cols = clamp(parseInt(colsEl.value || "9", 10), 5, 50);
      const maxMines = Math.max(5, Math.floor(rows * cols * 0.9));
      totalMines = clamp(parseInt(minesEl.value || "10", 10), 5, maxMines);
      rowsEl.value = rows; colsEl.value = cols; minesEl.value = totalMines;
    }
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function resetGame() {
    readInputsFromUI();
    flags = 0;
    revealedSafeCells = 0;
    firstClickDone = false;
    gameOver = false;
    resetTimer();
    setState("Pronto");
    createGrid();
    updateCounters();
  }

  // Eventos UI
  startBtn.addEventListener("click", resetGame);
  difficultyEl.addEventListener("change", () => {
    if (difficultyEl.value !== "custom") {
      readInputsFromUI();
    }
  });

  // Previne menu de contexto no tabuleiro (manter apenas bandeira)
  boardEl.addEventListener("contextmenu", (e) => e.preventDefault());

  // Inicializa
  resetGame();
})();
