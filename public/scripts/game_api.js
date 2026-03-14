/**
 * API Client for crossword management
 * Handles all backend communication without exposing solutions
 */

const GameAPI = {
  /**
   * Verifies an individual cell
   */
  checkCell: async function(row, col, value) {
    try {
      const response = await fetch('/api/game/check-cell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ row, col, value })
      });
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Errorea zelula egiaztatzean:', err);
      return { error: true, message: 'Konexio errorea' };
    }
  },

  /**
   * Verifies a complete word — sends current cell values from DOM
   * wordDir: 'right' | 'down', wordX/wordY: start cell coordinates
   */
  checkWord: async function(wordDir, wordX, wordY, cells) {
    try {
      const response = await fetch('/api/game/check-word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wordDir, wordX, wordY, cells })
      });
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Errorea hitza egiaztatzean:', err);
      return { error: true, message: 'Konexio errorea' };
    }
  },

  /**
   * Pista eskatu (zelula bat agerian utzi)
   */
  solveCell: async function(row, col) {
    try {
      const response = await fetch('/api/game/solve-cell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ row, col })
      });
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Errorea zelula betetzean:', err);
      return { error: true, message: 'Konexio errorea' };
    }
  },

  /**
   * Koadroa egiaztatzen du — DOM-eko zelula guztien balioak bidaltzen ditu
   */
  checkGrid: async function(cells) {
    try {
      const response = await fetch('/api/game/check-grid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cells })
      });
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Errorea koadroa egiaztatzean:', err);
      return { error: true, message: 'Konexio errorea' };
    }
  },

  /**
   * Reveals a complete word
   * wordDir: 'right' | 'down', wordX/wordY: start cell coordinates
   */
  solveWord: async function(wordDir, wordX, wordY) {
    try {
      const response = await fetch('/api/game/solve-word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wordDir, wordX, wordY })
      });
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Errorea hitza betetzean:', err);
      return { error: true, message: 'Konexio errorea' };
    }
  },

  /**
   * Koadroa erabat agerian uzten du (irtenbide osoa)
   */
  solveGrid: async function() {
    try {
      const response = await fetch('/api/game/solve-grid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Errorea koadroa betetzean:', err);
      return { error: true, message: 'Konexio errorea' };
    }
  },

  /**
   * Gets current game state
   */
  getStatus: async function() {
    try {
      const response = await fetch('/api/game/status');
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Errorea egoera eskuratzean:', err);
      return { error: true, message: 'Konexio errorea' };
    }
  },

  /**
   * Ends the game
   */
  endGame: async function() {
    try {
      const response = await fetch('/api/game/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Errorea jokoa amaitzerakoan:', err);
      return { error: true, message: 'Konexio errorea' };
    }
  },

  /**
   * Loads saved grid state for a puzzle
   */
  loadState: async function(puzzleId) {
    try {
      const response = await fetch('/api/game/history/' + puzzleId);
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Errorea egoera kargatzerakoan:', err);
      return { error: true, cells: [] };
    }
  },

  /**
   * Saves current grid state for a puzzle.
   * cells = [{row, col, value}] — only non-empty cells.
   */
  saveState: async function(puzzleId, cells) {
    try {
      const response = await fetch('/api/game/history/' + puzzleId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cells })
      });
      return await response.json();
    } catch (err) {
      console.error('Errorea egoera gordetzean:', err);
      return { error: true };
    }
  },

  /**
   * Pauses the server-side game timer (jokoa gelditzerakoan)
   */
  pauseTimer: async function() {
    try {
      const response = await fetch('/api/game/timer/pause', { method: 'POST' });
      return await response.json();
    } catch (err) {
      console.error('Errorea timerra pausatzerakoan:', err);
      return { error: true };
    }
  },

  /**
   * Resumes the server-side game timer (jokora itzultzerakoan)
   */
  resumeTimer: async function() {
    try {
      const response = await fetch('/api/game/timer/resume', { method: 'POST' });
      return await response.json();
    } catch (err) {
      console.error('Errorea timerra berrabiaraztean:', err);
      return { error: true };
    }
  },

  /**
   * Resets game state so the player can start fresh.
   */
  resetGame: async function(puzzleId) {
    try {
      const response = await fetch('/api/game/reset/' + puzzleId, { method: 'DELETE' });
      return await response.json();
    } catch (err) {
      console.error('Errorea berrabiaraztean:', err);
      return { error: true };
    }
  }
};

// Visual feedback for user
const GameUI = {
  /**
   * Marks cell as correct (green) — applies to span.char inside td
   */
  markCorrect: function(row, col) {
    const td = document.getElementById(`c_${row}_${col}`);
    if (!td) return;
    td.classList.add('right');
    td.classList.remove('wrong');
    const hint = td.querySelector('.cell-hint');
    if (hint) hint.remove();
  },

  /**
   * Marks cell as incorrect (reddish background) and shows correct letter hint
   */
  markIncorrect: function(row, col, correctLetter) {
    const td = document.getElementById(`c_${row}_${col}`);
    if (!td) return;
    td.classList.add('wrong');
    td.classList.remove('right');
    const oldHint = td.querySelector('.cell-hint');
    if (oldHint) oldHint.remove();
    if (correctLetter) {
      const hint = document.createElement('span');
      hint.className = 'cell-hint';
      hint.textContent = correctLetter;
      td.appendChild(hint);
    }
  },

  /**
   * Shows game progress
   */
  showProgress: function(progress, correctCells, totalCells) {
    const statusDiv = document.getElementById('game-status');
    if (statusDiv) {
      statusDiv.innerHTML = `
        <strong>Aurrerapena:</strong> ${progress}% 
        (${correctCells}/${totalCells} zelula zuzen)
      `;
    }
  },

  /**
   * Shows victory message
   */
  showVictory: function(stats) {
    const message = `
      <div class="victory-message">
        <h2>Zorionak! 🎉</h2>
        <p>Hitzgurutzatua osatu duzu</p>
        <p>Egiaztapenak: ${stats.checks}</p>
        <p>Erabilitako pistak: ${stats.hints}</p>
      </div>
    `;
    
    // Alerta edo modala erakutsi
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = message;
    document.body.appendChild(modal);
  },

  /**
   * Shows feedback in the in-page notification bar.
   * Pass permanent=true to keep it visible indefinitely.
   */
  showNotification: function(message, type = 'info', permanent = false) {
    const el = document.getElementById('game-notification');
    if (!el) return;
    clearTimeout(el._hideTimer);
    el.textContent = message;
    el.className = 'game-notification-bar show ntf-' + type;
    if (!permanent) {
      el._hideTimer = setTimeout(() => {
        el.classList.remove('show');
      }, 3000);
    }
  }
};

// Botoi existenteekin integrazioa
document.addEventListener('DOMContentLoaded', function() {
  
  // Check Cell
  const checkCellBtn = document.getElementById('check_cell');
  if (checkCellBtn) {
    checkCellBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      
      // Use selected_cell which is the class used by cw_scripts.js
      const focusedCell = document.querySelector('td.selected_cell');
      if (!focusedCell) {
        GameUI.showNotification('Lehenengo zelula bat hautatu', 'warning');
        return;
      }
      
      const id = focusedCell.id; // formato: c_row_col
      const parts = id.split('_');
      const row = parseInt(parts[1]);
      const col = parseInt(parts[2]);
      
      // Get value from span.char using textContent and trim spaces
      const charSpan = focusedCell.querySelector('.char');
      const value = charSpan ? charSpan.textContent.trim() : '';
      
      if (!value) {
        GameUI.showNotification('Zelula hutsik dago', 'warning');
        return;
      }
      
      console.log(`Checking cell [${row}][${col}] with value: "${value}"`);
      
      const result = await GameAPI.checkCell(row, col, value);
      
      if (result.error) {
        GameUI.showNotification(result.message, 'error');
      } else if (result.correct) {
        GameUI.markCorrect(row, col);
        GameUI.showNotification('Zuzena! ✓', 'success');
      } else {
        GameUI.markIncorrect(row, col, result.correctLetter);
        GameUI.showNotification('Okerra ✗', 'error');
      }
    });
  }

  // Check Word
  const checkWordBtn = document.getElementById('check_word');
  if (checkWordBtn) {
    checkWordBtn.addEventListener('click', async function(e) {
      e.preventDefault();

      // Determine direction from focused cells
      const isAcross = document.querySelector('td.focus_across') !== null;
      const focusedCells = document.querySelectorAll(isAcross ? '.focus_across' : '.focus_down');
      if (focusedCells.length === 0) {
        GameUI.showNotification('Lehenengo hitz bat hautatu', 'warning');
        return;
      }

      // Get word index from selected clue id: clueacross_N_x_y or cluedown_N_x_y
      const activeClue = document.querySelector('.selected_clue');
      if (!activeClue) {
        GameUI.showNotification('Lehenengo pista bat hautatu', 'warning');
        return;
      }

      // Build cells array: [{row, col, value}] from DOM
      const cells = Array.from(focusedCells).map(td => {
        const parts = td.id.split('_');
        return {
          row: parseInt(parts[1]),
          col: parseInt(parts[2]),
          value: (td.querySelector('.char')?.textContent || '').trim()
        };
      });

      // Identify word by direction + start coordinates (number alone is ambiguous
      // when across and down share the same starting cell)
      const clueparts = activeClue.id.split('_');
      const wordDir = activeClue.id.startsWith('clueacross') ? 'right' : 'down';
      const wordX = parseInt(clueparts[2]);
      const wordY = parseInt(clueparts[3]);
      const result = await GameAPI.checkWord(wordDir, wordX, wordY, cells);

      if (result.error) {
        GameUI.showNotification(result.message, 'error');
      } else {
        // Apply per-cell feedback
        result.cellResults.forEach(({ row, col, correct, correctLetter }) => {
          if (correct) {
            GameUI.markCorrect(row, col);
          } else {
            GameUI.markIncorrect(row, col, correctLetter);
          }
        });

        if (result.correct) {
          GameUI.showNotification('Hitz zuzena! ✓', 'success');
        } else {
          GameUI.showNotification('Hitzak akatsak ditu ✗', 'error');
        }
      }
    });
  }

  // Solve Cell (Pista)
  const solveCellBtn = document.getElementById('solve_cell');
  if (solveCellBtn) {
    solveCellBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      
      const focusedCell = document.querySelector('td.selected_cell');
      if (!focusedCell) {
        GameUI.showNotification('Lehenengo zelula bat hautatu', 'warning');
        return;
      }
      
      const id = focusedCell.id;
      const parts = id.split('_');
      const row = parseInt(parts[1]);
      const col = parseInt(parts[2]);
      
      const result = await GameAPI.solveCell(row, col);
      
      if (result.error) {
        GameUI.showNotification(result.message, 'error');
      } else {
        const charSpan = focusedCell.querySelector('.char');
        if (charSpan) {
          charSpan.textContent = result.value;
        }
        GameUI.markCorrect(row, col);
        GameUI.showNotification('Pista agerian', 'info');
      }
    });
  }

  // Solve Word (Hitza erabat agerian)
  const solveWordBtn = document.getElementById('solve_word');
  if (solveWordBtn) {
    solveWordBtn.addEventListener('click', async function(e) {
      e.preventDefault();

      const activeClue = document.querySelector('.selected_clue');
      if (!activeClue) {
        GameUI.showNotification('Lehenengo hitz bat hautatu', 'warning');
        return;
      }

      const clueparts = activeClue.id.split('_');
      const wordDir = activeClue.id.startsWith('clueacross') ? 'right' : 'down';
      const wordX = parseInt(clueparts[2]);
      const wordY = parseInt(clueparts[3]);
      const result = await GameAPI.solveWord(wordDir, wordX, wordY);

      if (result.error) {
        GameUI.showNotification(result.message, 'error');
      } else {
        result.solvedLetters.forEach(({ row, col, value }) => {
          const cell = document.getElementById(`c_${row}_${col}`);
          if (cell) {
            const charSpan = cell.querySelector('.char');
            if (charSpan) {
              charSpan.textContent = value;
              charSpan.classList.add('right');
              charSpan.classList.remove('wrong');
            }
          }
        });
        GameUI.showNotification('Hitza erabat agerian', 'info');
      }
    });
  }

  // Check Grid
  const checkGridBtn = document.getElementById('check_grid');
  if (checkGridBtn) {
    checkGridBtn.addEventListener('click', async function(e) {
      e.preventDefault();

      // Collect all non-black cells from DOM
      const cells = [];
      document.querySelectorAll('td:not(.black)').forEach(td => {
        const parts = td.id.split('_');
        cells.push({
          row: parseInt(parts[1]),
          col: parseInt(parts[2]),
          value: (td.querySelector('.char')?.textContent || '').trim()
        });
      });

      const result = await GameAPI.checkGrid(cells);

      if (result.error) {
        GameUI.showNotification(result.message, 'error');
      } else {
        // Apply per-cell feedback
        result.cellResults.forEach(({ row, col, correct, empty, correctLetter }) => {
          const td = document.getElementById(`c_${row}_${col}`);
          if (empty && td) {
            td.classList.add('empty-warn');
            GameUI.markIncorrect(row, col, correctLetter);
          } else if (td) {
            td.classList.remove('empty-warn');
            if (correct) {
              GameUI.markCorrect(row, col);
            } else {
              GameUI.markIncorrect(row, col, correctLetter);
            }
          }
        });

        if (result.stats) {
          const s = result.stats;
          const h = Math.floor(s.durationSec / 3600);
          const m = Math.floor((s.durationSec % 3600) / 60);
          const sec = s.durationSec % 60;
          const timeStr = h > 0
            ? h + ':' + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0')
            : String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');

          window._puzzleCompleted = true;  // block any further saves
          if (window.stopGameTimer) window.stopGameTimer(s.durationSec);
          window.freezeGame();  // disable editing and show restart button

          if (result.complete) {
            GameUI.showNotification(
              '\u2713 Zorionak! ' + timeStr + ' \xb7 ' + s.errors + ' akats',
              'success',
              true
            );
          } else {
            GameUI.showNotification(
              'Bidalia: ' + timeStr + ' \xb7 ' + s.errors + ' akats',
              'info',
              true
            );
          }
        } else {
          const emptyCount = result.cellResults.filter(c => c.empty).length;
          const parts = [];
          if (result.errorCount > 0)
            parts.push(`${result.errorCount} akats${result.errorCount > 1 ? '' : ''}`);
          if (emptyCount > 0)
            parts.push(`${emptyCount} hutsune`);
          GameUI.showNotification(parts.join(' · '), 'error');
        }
      }
    });
  }

  // Solve Grid (Irtenbide osoa agerian)
  const solveGridBtn = document.getElementById('solve_grid');
  if (solveGridBtn) {
    solveGridBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      
      if (!confirm('Ziur zaude erantzun guztiak ikusi nahi dituzula? Honek jokoa amaitu egingo du.')) {
        return;
      }
      
      const result = await GameAPI.solveGrid();
      
      if (result.error) {
        GameUI.showNotification(result.message, 'error');
      } else {
        // Fill all cells
        result.solvedLetters.forEach(({ row, col, value }) => {
          const cell = document.getElementById(`c_${row}_${col}`);
          if (cell) {
            const charSpan = cell.querySelector('.char');
            if (charSpan) {
              charSpan.textContent = value;
            }
          }
        });
        GameUI.showNotification('Puzlea erabat ebatzi da', 'info');
      }
    });
  }

  // Restart button
  const restartBtn = document.getElementById('restart_btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', async function() {
      const puzzleId = document.querySelector('.game-wrapper').dataset.puzzleId;
      const result = await GameAPI.resetGame(puzzleId);
      if (!result.error) {
        window.location.reload();
      }
    });
  }

  // Auto-save progress every 30 seconds
  setInterval(async () => {
    const status = await GameAPI.getStatus();
    if (!status.error) {
      console.log('Game status:', status);
    }
  }, 30000);
});
