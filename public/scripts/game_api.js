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
   */
  checkWord: async function(wordIndex, cells) {
    try {
      const response = await fetch('/api/game/check-word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wordIndex, cells })
      });
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Errorea hitza egiaztatzean:', err);
      return { error: true, message: 'Konexio errorea' };
    }
  },

  /**
   * Solicita pista (revela una celda)
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
   * Verifica el grid completo — sends all cell values from DOM
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
   */
  solveWord: async function(wordIndex) {
    try {
      const response = await fetch('/api/game/solve-word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wordIndex })
      });
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Errorea hitza betetzean:', err);
      return { error: true, message: 'Konexio errorea' };
    }
  },

  /**
   * Revela el grid completo (solución completa)
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
  }
};

// Visual feedback for user
const GameUI = {
  /**
   * Marks cell as correct (green) — applies to span.char inside td
   */
  markCorrect: function(row, col) {
    const charSpan = document.querySelector(`#c_${row}_${col} .char`);
    if (charSpan) {
      charSpan.classList.add('right');
      charSpan.classList.remove('wrong');
    }
  },

  /**
   * Marks cell as incorrect (red) — applies to span.char inside td
   */
  markIncorrect: function(row, col) {
    const charSpan = document.querySelector(`#c_${row}_${col} .char`);
    if (charSpan) {
      charSpan.classList.add('wrong');
      charSpan.classList.remove('right');
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
        (${correctCells}/${totalCells} celdas correctas)
      `;
    }
  },

  /**
   * Shows victory message
   */
  showVictory: function(stats) {
    const message = `
      <div class="victory-message">
        <h2>¡Zorionak! 🎉</h2>
        <p>Has completado el crucigrama</p>
        <p>Verificaciones: ${stats.checks}</p>
        <p>Pistas usadas: ${stats.hints}</p>
      </div>
    `;
    
    // Mostrar modal o alerta
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = message;
    document.body.appendChild(modal);
  },

  /**
   * Shows notification temporal
   */
  showNotification: function(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
};

// Integración con los botones existentes
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
        GameUI.markIncorrect(row, col);
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

      const wordIndex = parseInt(activeClue.id.split('_')[1]);
      const result = await GameAPI.checkWord(wordIndex, cells);

      if (result.error) {
        GameUI.showNotification(result.message, 'error');
      } else {
        // Apply per-cell feedback
        result.cellResults.forEach(({ row, col, correct }) => {
          const charSpan = document.querySelector(`#c_${row}_${col} .char`);
          if (charSpan) {
            if (correct) {
              charSpan.classList.add('right');
              charSpan.classList.remove('wrong');
            } else {
              charSpan.classList.add('wrong');
              charSpan.classList.remove('right');
            }
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

  // Solve Word (Revelar palabra completa)
  const solveWordBtn = document.getElementById('solve_word');
  if (solveWordBtn) {
    solveWordBtn.addEventListener('click', async function(e) {
      e.preventDefault();

      const activeClue = document.querySelector('.selected_clue');
      if (!activeClue) {
        GameUI.showNotification('Lehenengo hitz bat hautatu', 'warning');
        return;
      }

      const wordIndex = parseInt(activeClue.id.split('_')[1]);
      const result = await GameAPI.solveWord(wordIndex);

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
        result.cellResults.forEach(({ row, col, correct, empty }) => {
          const charSpan = document.querySelector(`#c_${row}_${col} .char`);
          if (charSpan && !empty) {
            if (correct) {
              charSpan.classList.add('right');
              charSpan.classList.remove('wrong');
            } else {
              charSpan.classList.add('wrong');
              charSpan.classList.remove('right');
            }
          }
        });

        GameUI.showProgress(result.progress, result.correctCells, result.totalCells);


      }
    });
  }

  // Solve Grid (Revelar solución completa)
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

  // Auto-save progress every 30 seconds
  setInterval(async () => {
    const status = await GameAPI.getStatus();
    if (!status.error) {
      console.log('Game status:', status);
    }
  }, 30000);
});
