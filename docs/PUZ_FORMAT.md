# Formato de archivos .PUZ

## 📋 Descripción general

El formato `.puz` es un formato binario propietario creado por **Across Lite** para almacenar crucigramas. Es el estándar de facto para distribuir puzzles de crucigramas en formato digital.

## 🔍 Estructura del archivo

Basado en la implementación de tu parser en `cw/crossword.js`:

### Header (primeros 0x34 bytes)

```
Offset  Tamaño  Descripción
------  ------  -----------
0x00    2       Checksum (CRC)
0x02    12      Identificador "ACROSS&DOWN"
0x0E    2       CRC de checksums
0x10    8       Checksums mascarados (0x10-0x17)
0x18    8       Version string (e.g., "1.2\0")
0x1C    2       Reserved
0x1E    2       Scrambled checksum
0x20    12      Reserved
0x2C    1       Width (ancho del crucigrama)
0x2D    1       Height (alto del crucigrama)
0x2E    2       Número de pistas
0x30    2       Bitmask flags
0x32    2       Scrambled tag
```

### Grids (después del header)

**Posición:** `0x34`

1. **Filled Grid** (solución completa)
   - Tamaño: `width × height` bytes
   - Cada celda: 1 byte ASCII
   - Letra = celda con respuesta
   - `.` = celda negra (bloqueada)

2. **Void Grid** (plantilla para el jugador)
   - Tamaño: `width × height` bytes
   - Cada celda: 1 byte ASCII
   - `-` = celda vacía (a rellenar)
   - `.` = celda negra (bloqueada)
   - Letra = celda pre-rellenada (opcional)

### Metadata (después de los grids)

Strings terminados en `\0` (null-terminated):

1. **Título del crucigrama**
2. **Autor**
3. **Copyright**

### Clues (pistas)

- Secuencia de strings terminados en `\0`
- Orden: primero horizontales (across), luego verticales (down)
- Una pista por cada palabra del crucigrama

## 📊 Ejemplo de lectura

Para un crucigrama de **12×12**:

```
0x34            → Inicio filled_grid (144 bytes)
0x34 + 144      → Inicio void_grid (144 bytes)
0x34 + 288      → Inicio metadata (strings)
metadata_end    → Inicio clues (strings hasta EOF)
```

## 💡 Características extraídas por tu parser

Tu clase `Crossword` extrae:

```javascript
{
  filename: string,          // Ruta del archivo
  filesize: number,          // Tamaño total en bytes
  width: number,             // Ancho (0x2C)
  height: number,            // Alto (0x2D)
  filled_grid: string[][],   // Solución completa
  void_grid: string[][],     // Plantilla vacía
  cw_name: string,           // Título
  cw_author: string,         // Autor
  cw_copyright: string,      // Copyright
  clues: string[],           // Array de pistas
  words: Word[]              // Palabras detectadas con metadata
}

// Estructura Word:
{
  word: string,    // La palabra (ej: "HOLA")
  dir: string,     // Dirección: 'right' o 'down'
  x: number,       // Fila inicial
  y: number,       // Columna inicial
  length: number   // Longitud de la palabra
}
```

## 🧩 Algoritmo de detección de palabras

Tu implementación en `words_from_grid()`:

1. **Horizontales (across):**
   - Detecta si celda actual es inicio de palabra (anterior es `.` o borde)
   - Recorre hasta encontrar `.` o fin de fila
   - Guarda si longitud ≥ 2

2. **Verticales (down):**
   - Detecta si celda actual es inicio de palabra (anterior es `.` o borde)
   - Recorre hacia abajo hasta encontrar `.` o fin de columna
   - Guarda si longitud ≥ 2

## 📦 Archivos de ejemplo en tu repo

```
puz/
├── 12x12_litetik.puz                    # 12×12
├── EHHG TXAPELKETA 2007 FINALA 15x15.puz # 15×15 (torneo)
├── hika adizkiak 20161005.puz           # Verbos Hika
├── Martxoak 23 6 x 6 *.puz              # Mini 6×6 (x4)
├── Martxoak 23 12 x 12 *.puz            # Standard 12×12 (x2)
├── test1212.puz / test1512.puz          # Tests
└── txap2010_finala.puz                  # Final campeonato 2010
```

## 🔗 Referencias

- **Especificación oficial:** [.PUZ file format](https://code.google.com/archive/p/puz/wikis/FileFormat.wiki)
- **Across Lite:** Software original de Literate Software Systems
- **Uso común:** New York Times, WSJ, y otros publishers usan este formato

## ⚠️ Limitaciones conocidas

- No soporta rebuses (múltiples letras por celda)
- No lee extensiones (círculos, shading, etc.)
- No valida checksums
- Asume encoding ASCII/Latin-1

## 🚀 Mejoras sugeridas

```javascript
// Validar checksum
validateChecksum(buffer) { /* ... */ }

// Detectar encoding (UTF-8 vs Latin-1)
detectEncoding(buffer) { /* ... */ }

// Manejar extensiones (.GEXT, .RTBL, etc.)
parseExtensions(buffer) { /* ... */ }
```

---

**Nota:** Tu implementación actual es funcional para crucigramas estándar en euskera/castellano sin características avanzadas.
