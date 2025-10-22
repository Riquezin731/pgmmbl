// Inicialização simples do Sudoku
function initSudoku() {
  const boardEl = document.getElementById("sudokuBoard");
  const diffEl = document.getElementById("sudokuDifficulty");
  const btnNew = document.getElementById("sudokuNew");
  const btnValidate = document.getElementById("sudokuValidate");
  const btnClearCell = document.getElementById("sudokuClearCell");
  const btnClearAll = document.getElementById("sudokuClearAll");
  const timerEl = document.getElementById("sudokuTimer");
  const stateEl = document.getElementById("sudokuState");

  let grid = Array(81).fill(0);
  let fixed = Array(81).fill(false);
  let selected = -1;
  let startTime = null, timerInterval = null;

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

  function render() {
    const gridEl = document.createElement("div");
    gridEl.className = "sudoku-grid";
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const i = r * 9 + c;
        const cell = document.createElement("div");
        cell.className = "s-cell";
        if (fixed[i]) cell.classList.add("fixed");
        // Aplicar bordas grossas nas linhas 1,4,7 (top) e 3,6,9 (bottom)
        if (r % 3 === 0) cell.classList.add("s-row-top");
        if ((r + 1) % 3 === 0) cell.classList.add("s-row-bottom");
        cell.textContent = grid[i] ? grid[i] : "";
        cell.setAttribute("data-idx", i);
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
    // Reset de background das células
    cells.forEach((el, i) => {
      el.style.background = fixed[i] ? "#1c2139" : "var(--cell)";
    });

    if (selected >= 0) {
      const r = Math.floor(selected / 9), c = selected % 9;
      const gridEl = boardEl.querySelector(".sudoku-grid");
      const idx = (rr, cc) => rr * 9 + cc;

      // Selecionada
      cells[selected].classList.add("selected");

      // Destaque linha, coluna e bloco 3x3
      for (let i = 0; i < 9; i++) {
        cells[idx(r, i)].classList.add("highlight");
        cells[idx(i, c)].classList.add("highlight");
      }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let rr = br; rr < br + 3; rr++) {
        for (let cc = bc; cc < bc + 3; cc++) {
          cells[idx(rr, cc)].classList.add("highlight");
        }
      }
    }
  }

  function handleKey(e) {
    if (selected < 0) return;
    const i = selected;
    if (fixed[i]) return;
    if (e.key >= "1" && e.key <= "9") {
      grid[i] = parseInt(e.key, 10);
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

  function isValidPlacement(idx, val) {
    const r = Math.floor(idx / 9), c = idx % 9;
    for (let i = 0; i < 9; i++) {
      if (grid[r * 9 + i] === val && i !== c) return false;
      if (grid[i * 9 + c] === val && i !== r) return false;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) {
      const ii = rr * 9 + cc;
      if (grid[ii] === val && ii !== idx) return false;
    }
    return true;
  }

  function validateBoard() {
    const cells = boardEl.querySelectorAll(".s-cell");
    let ok = true;
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

  // Gerador simples (placeholders): você pode trocar por um gerador com solução única
  function generatePuzzle(difficulty) {
    // Exemplo: começa vazio e define algumas pistas aleatórias para demonstrar o estilo
    const clues = difficulty === "easy" ? 30 : difficulty === "medium" ? 24 : 18;
    const puzzle = Array(81).fill(0);
    let placed = 0;
    while (placed < clues) {
      const i = Math.floor(Math.random() * 81);
      const val = Math.floor(Math.random() * 9) + 1;
      if (puzzle[i] === 0) {
        puzzle[i] = val;
        placed++;
      }
    }
    return puzzle;
  }

  function newGame() {
    const puzzle = generatePuzzle(diffEl.value);
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

  // Inicializa
  newGame();
}
