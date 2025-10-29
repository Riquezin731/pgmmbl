document.addEventListener("DOMContentLoaded", () => {
  // Alternância de abas
  const tabBtns = document.querySelectorAll(".tab-btn");
  const panels = {
    mines: document.getElementById("panel-mines"),
    sudoku: document.getElementById("panel-sudoku"),
  };
  const showPanel = (name) => {
    Object.keys(panels).forEach(k => panels[k].classList.toggle("hidden", k !== name));
    tabBtns.forEach(b => b.setAttribute("aria-pressed", b.dataset.tab === name ? "true" : "false"));
  };
  tabBtns.forEach(btn => btn.addEventListener("click", () => showPanel(btn.dataset.tab)));
  showPanel("mines"); // padrão: Campo Minado

  initMinesweeper(); // Mantido exatamente como enviado
  initSudoku();      // Aperfeiçoado para números 1–9 com geração válida
});

/* ===================== Campo Minado ===================== */
/* Mantido exatamente como nos seus códigos enviados */

function initMinesweeper() {
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
  let rows = 9, cols = 9, totalMines = 10;
  let flags = 0, revealedSafeCells = 0;
  let firstClickDone = false, gameOver = false;
  let timerInterval = null, startTime = null;

  const idx = (r, c) => r * cols + c;
  const inBounds = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;

  function resetTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerEl.textContent = "00:00";
    startTime = null;
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
  function setState(text) { gameStateEl.textContent = text; }
  function neighbors(r, c) {
    const ns = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc)) ns.push(grid[idx(nr, nc)]);
    }
    return ns;
  }
  function computeAdjacency() {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cell = grid[idx(r, c)];
      if (cell.mine) { cell.adj = 0; continue; }
      cell.adj = neighbors(r, c).filter(n => n.mine).length;
    }
  }
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

  function createGrid() {
    grid = Array.from({ length: rows * cols }, () => ({
      mine: false, open: false, flag: false, adj: 0, el: null, r: 0, c: 0
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
        cellEl.addEventListener("click", handleLeftClick);
        cellEl.addEventListener("contextmenu", handleRightClick);
        cell.el = cellEl;
        gridEl.appendChild(cellEl);
      }
    }
    boardEl.innerHTML = "";
    boardEl.appendChild(gridEl);
  }

  function handleLeftClick(e) {
    e.preventDefault();
    if (gameOver) return;
    const el = e.currentTarget;
    const r = parseInt(el.getAttribute("data-r"), 10);
    const c = parseInt(el.getAttribute("data-c"), 10);
    const cell = grid[idx(r, c)];
    if (cell.open || cell.flag) return;
    if (!firstClickDone) {
      plantMines(r, c);
      firstClickDone = true;
      resetTimer(); startTimer(); setState("Jogando"); updateCounters();
    }
    openCell(cell); checkWin();
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
    if (cell.flag) { flags++; el.classList.add("flag"); }
    else { flags--; el.classList.remove("flag"); }
    updateCounters();
  }

  function floodReveal(r, c) {
    const queue = [{ r, c }];
    while (queue.length) {
      const { r: cr, c: cc } = queue.shift();
      const cell = grid[idx(cr, cc)];
      if (!cell.open) {
        cell.open = true; cell.el.classList.add("open"); revealedSafeCells++;
        if (cell.flag) { cell.flag = false; cell.el.classList.remove("flag"); flags--; }
      }
      if (cell.adj > 0) {
        cell.el.textContent = cell.adj;
        cell.el.classList.add(`number-${cell.adj}`);
      } else {
        const ns = neighbors(cr, cc);
        for (const n of ns) if (!n.open && !n.mine) queue.push({ r: n.r, c: n.c });
      }
    }
    updateCounters();
  }
  function openCell(cell) {
    if (cell.open) return;
    cell.open = true; cell.el.classList.add("open");
    if (cell.mine) { revealAllMines(); endGame(false); return; }
    revealedSafeCells++;
    if (cell.adj > 0) {
      cell.el.textContent = cell.adj;
      cell.el.classList.add(`number-${cell.adj}`);
    } else {
      floodReveal(cell.r, cell.c);
    }
  }
  function revealAllMines() {
    grid.forEach(cell => { if (cell.mine) { cell.el.classList.add("open", "mine"); cell.el.textContent = "💣"; } });
  }
  function checkWin() {
    const totalSafe = rows * cols - totalMines;
    if (revealedSafeCells >= totalSafe && !gameOver) endGame(true);
  }
  function endGame(won) {
    gameOver = true;
    if (timerInterval) clearInterval(timerInterval);
    setState(won ? "Vitória!" : "Derrota");
    grid.forEach(cell => { cell.el.disabled = true; });
  }
  function updateCounters() {
    mineCountEl.textContent = totalMines;
    flagsCountEl.textContent = flags;
  }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function readInputsFromUI() {
    const diff = difficultyEl.value;
    if (diff === "easy") { rows = 9; cols = 9; totalMines = 10; }
    else if (diff === "medium") { rows = 16; cols = 16; totalMines = 40; }
    else if (diff === "hard") { rows = 16; cols = 30; totalMines = 99; }
    else {
      rows = clamp(parseInt(rowsEl.value || "9", 10), 5, 50);
      cols = clamp(parseInt(colsEl.value || "9", 10), 5, 50);
      const maxMines = Math.max(5, Math.floor(rows * cols * 0.9));
      totalMines = clamp(parseInt(minesEl.value || "10", 10), 5, maxMines);
    }
    rowsEl.value = rows; colsEl.value = cols; minesEl.value = totalMines;
  }
  function resetGame() {
    readInputsFromUI();
    flags = 0; revealedSafeCells = 0; firstClickDone = false; gameOver = false;
    resetTimer(); setState("Pronto"); createGrid(); updateCounters();
  }

  startBtn.addEventListener("click", resetGame);
  difficultyEl.addEventListener("change", () => { if (difficultyEl.value !== "custom") readInputsFromUI(); });
  boardEl.addEventListener("contextmenu", e => e.preventDefault());
  resetGame();
}

/* ===================== Sudoku ===================== */
/* Aperfeiçoado: usa números 1–9, valida conflitos e gera puzzles válidos */

function initSudoku() {
  const boardEl = document.getElementById("sudokuBoard");
  const diffEl = document.getElementById("sudokuDifficulty");
  const btnNew = document.getElementById("sudokuNew");
  const btnValidate = document.getElementById("sudokuValidate");
  const btnClearCell = document.getElementById("sudokuClearCell");
  const btnClearAll = document.getElementById("sudokuClearAll");
  const timerEl = document.getElementById("sudokuTimer");
  const stateEl = document.getElementById("sudokuState");

  let grid = Array(81).fill(0);   // números do jogador
  let fixed = Array(81).fill(false); // posições dadas (fixas)
  let selected = -1;
  let startTime = null, timerInterval = null;

  // Timer
  function startTimer() {
    stopTimer();
    startTime = Date.now();
    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
      const ss = String(elapsed % 60).padStart(2, "0");
      timerEl.textContent = `${mm}:${ss}`;
    }, 250);
  }
  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  // Renderização
  function render() {
    const gridEl = document.createElement("div");
    gridEl.className = "sudoku-grid";
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const i = r * 9 + c;
        const cell = document.createElement("div");
        cell.className = "s-cell";
        if (fixed[i]) cell.classList.add("fixed");
        if (r % 3 === 0) cell.classList.add("s-row-top");
        if ((r + 1) % 3 === 0) cell.classList.add("s-row-bottom");
        cell.textContent = grid[i] ? grid[i] : "";
        cell.setAttribute("data-idx", i);
        cell.tabIndex = 0;
        cell.addEventListener("click", () => selectCell(i));
        gridEl.appendChild(cell);
      }
    }
    boardEl.innerHTML = "";
    boardEl.appendChild(gridEl);
    highlightSelection();
  }

  function selectCell(i) {
    selected = i;
    highlightSelection();
    stateEl.textContent = "Jogando";
  }

  function highlightSelection() {
    const cells = boardEl.querySelectorAll(".s-cell");
    cells.forEach(c => c.classList.remove("selected", "highlight", "error"));
    cells.forEach((el, i) => { el.style.background = fixed[i] ? "#1c2139" : "var(--cell)"; });

    if (selected >= 0) {
      const r = Math.floor(selected / 9), c = selected % 9;
      const idx = (rr, cc) => rr * 9 + cc;
      cells[selected].classList.add("selected");
      for (let i = 0; i < 9; i++) {
        cells[idx(r, i)].classList.add("highlight");
        cells[idx(i, c)].classList.add("highlight");
      }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) {
        cells[idx(rr, cc)].classList.add("highlight");
      }
    }
  }

  // Entrada por teclado
  function handleKey(e) {
    if (selected < 0) return;
    const i = selected;
    if (fixed[i]) return;
    if (e.key >= "1" && e.key <= "9") {
      const val = parseInt(e.key, 10);
      grid[i] = val;
      render();
    } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
      grid[i] = 0;
      render();
    }
  }

  function clearCell() {
    if (selected < 0 || fixed[selected]) return;
    grid[selected] = 0; render();
  }
  function clearAll() {
    for (let i = 0; i < 81; i++) if (!fixed[i]) grid[i] = 0;
    render();
  }

  // Validação
  function isValidPlacement(idx, val, arr = grid) {
    const r = Math.floor(idx / 9), c = idx % 9;
    for (let i = 0; i < 9; i++) {
      if (arr[r * 9 + i] === val && i !== c) return false;
      if (arr[i * 9 + c] === val && i !== r) return false;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) {
      const ii = rr * 9 + cc;
      if (arr[ii] === val && ii !== idx) return false;
    }
    return true;
  }

  function validateBoard() {
    const cells = boardEl.querySelectorAll(".s-cell");
    let ok = true;
    cells.forEach(c => c.classList.remove("error"));
    for (let i = 0; i < 81; i++) {
      const v = grid[i];
      if (v === 0) continue;
      if (!isValidPlacement(i, v)) {
        cells[i].classList.add("error");
        ok = false;
      }
    }
    stateEl.textContent = ok ? "Sem conflitos" : "Conflitos encontrados";
  }

  // ---------- Geração de tabuleiro válido com solução única ----------
  // Utilitários
  const digits = [1,2,3,4,5,6,7,8,9];

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function findEmpty(arr) {
    for (let i = 0; i < 81; i++) if (arr[i] === 0) return i;
    return -1;
  }

  function canPlace(arr, idx, val) {
    const r = Math.floor(idx / 9), c = idx % 9;
    for (let i = 0; i < 9; i++) {
      if (arr[r * 9 + i] === val) return false;
      if (arr[i * 9 + c] === val) return false;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) {
      if (arr[rr * 9 + cc] === val) return false;
    }
    return true;
  }

  // Resolve com backtracking (retorna boolean)
  function solve(arr) {
    const idx = findEmpty(arr);
    if (idx === -1) return true;
    const order = shuffle(digits.slice());
    for (const d of order) {
      if (canPlace(arr, idx, d)) {
        arr[idx] = d;
        if (solve(arr)) return true;
        arr[idx] = 0;
      }
    }
    return false;
  }

  // Conta soluções (limita a 2 para checar unicidade)
  function countSolutions(arr, limit = 2) {
    let count = 0;
    function dfs(a) {
      if (count >= limit) return;
      const idx = findEmpty(a);
      if (idx === -1) { count++; return; }
      const order = digits; // ordem fixa para rapidez
      for (const d of order) {
        if (canPlace(a, idx, d)) {
          a[idx] = d;
          dfs(a);
          a[idx] = 0;
          if (count >= limit) return;
        }
      }
    }
    dfs(arr.slice());
    return count;
  }

  // Gera uma grade completa válida
  function generateSolvedBoard() {
    const a = Array(81).fill(0);
    // Preenche diagonal de blocos 3x3 para acelerar
    for (let b = 0; b < 3; b++) {
      const base = b * 27 + b * 3;
      const nums = shuffle(digits.slice());
      let k = 0;
      for (let rr = 0; rr < 3; rr++) for (let cc = 0; cc < 3; cc++) {
        a[base + rr * 9 + cc] = nums[k++];
      }
    }
    solve(a);
    return a;
  }

  // Remove valores para formar puzzle com solução única conforme dificuldade
  function generatePuzzle(difficulty) {
    const solved = generateSolvedBoard();
    let puzzle = solved.slice();

    const removalsTarget = difficulty === "easy" ? 40 : difficulty === "medium" ? 50 : 56; // números removidos
    const positions = shuffle([...Array(81)].map((_, i) => i));
    let removed = 0;

    for (const pos of positions) {
      if (removed >= removalsTarget) break;
      const backup = puzzle[pos];
      puzzle[pos] = 0;

      // Checa unicidade (máx 1 solução)
      const solutions = countSolutions(puzzle.slice(), 2);
      if (solutions !== 1) {
        puzzle[pos] = backup; // reverte se perder unicidade
      } else {
        removed++;
      }
    }

    // Garantia de ter pelo menos X pistas (clues)
    const minClues = 81 - removalsTarget;
    const clues = puzzle.filter(v => v !== 0).length;
    if (clues < minClues) {
      // Se por alguma razão ficarem menos que o mínimo, repõe alguns
      const empties = puzzle.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0);
      for (let i = 0; i < (minClues - clues) && i < empties.length; i++) {
        const p = empties[i];
        puzzle[p] = solved[p];
      }
    }

    return { puzzle, solved };
  }

  function newGame() {
    stateEl.textContent = "Gerando...";
    // Geração
    const { puzzle } = generatePuzzle(diffEl.value);
    grid = puzzle.slice();
    fixed = grid.map(v => v !== 0);
    stateEl.textContent = "Pronto";
    render();
    startTimer();
  }

  // Eventos
  document.addEventListener("keydown", handleKey);
  btnNew.addEventListener("click", newGame);
  btnValidate.addEventListener("click", validateBoard);
  btnClearCell.addEventListener("click", clearCell);
  btnClearAll.addEventListener("click", clearAll);

  // Inicialização
  newGame();
}
