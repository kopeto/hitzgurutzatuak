# SPL formatua (espiral jokoa)

SPL fitxategiak JSON dira eta espiral joko baterako behar den marrazkia + erantzuna gordetzen dute.

## Gutxieneko egitura

```json
{
  "kind": "hitzgurutzatuak/spiral/v1",
  "format": "spl",
  "title": "Espiral adibidea",
  "author": "Egilea",
  "viewBox": "0 0 700 700",
  "answer": "ERANTZUNA",
  "clues": ["Pista nagusia"],
  "cells": [
    {
      "index": 1,
      "path": "M 20 20 L 80 20 L 80 80 L 20 80 Z",
      "x": 50,
      "y": 55,
      "labelX": 28,
      "labelY": 30
    }
  ]
}
```

## Arauak

- `kind`: gomendatutako bertsio markatzailea.
- `format`: beti `spl`.
- `answer`: maiuskulaz gordetzea gomendatzen da.
- `cells`: ordena numerikoan joaten dira (`index`), 1etik hasita.
- `answer` luzerak eta `cells` kopuruak berdinak izan behar dute.
- `path` balioa SVG `path d` atributua da.
- `x` eta `y`: letraren erdiguneko kokapena SVG barruan.
- `labelX`/`labelY`: ordena zenbakia marrazteko kokapena (aukerakoa; `null` izan daiteke).

## Eraikitzailea (HTML/SVG -> SPL)

Script berria:

```bash
npm run build:spl -- --input "jokoak/Espiral grida 64 erantzuna segidan idatzi.html" --output "downloads/espirala64.spl" --title "Espirala 64" --author "Nirea" --answer "HEMEN64KARAKTEREKOERANTZUNA..." --clue "Pista nagusia"
```

Script honek HTMLko `gelaxka_###`, `LETRA_###` eta `ordena_###` elementuak irakurri eta `.spl` sortzen du.
