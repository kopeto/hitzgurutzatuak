# Xederaren arkitektura

Aplikazioaren egungo egitura: Express zerbitzaria, Pug txantiloiak eta nabigatzaileko JavaScript natiboa.

```mermaid
flowchart LR
  subgraph browser["Nabigatzailea"]
    pages["HTML orriak"]
    client["app.js<br/>orrietako eta jokoetako kontrolatzaileak"]
    shell["site.js eta i18n.js"]
    assets["CSSa, favicon-a eta baliabide estatikoak"]
    pages --> client
    pages --> shell
    pages --> assets
  end

  subgraph server["Node.js + Express"]
    middleware["Helmet · saioa · Passport<br/>flash mezuak · itzulpenak"]
    routes["HTTP bideratzaileak<br/>home · jokoak · users · master"]
    gameApi["Jokoen APIa<br/>saioak · egiaztapenak · pistak · historia"]
    externalApi["Kanpoko APIa<br/>API gakoa eta eskaera muga"]
    render["page-view.js<br/>datuak eta egoera modu seguruan serializatzen ditu"]
    pug["Pug txantiloiak<br/>app.pug · layout.pug · pages/*"]
    import["puzzle-import.js<br/>puzleak balioztatu eta normalizatzen ditu"]
    queue["puzzle-upload-queue.js<br/>karga sortak prozesatzen ditu"]
    parsers["Fitxategi irakurgailuak<br/>Gurutzegramak: PUZ eta IPUZ<br/>Espiralak: SPL"]
    grid["game-grid.js<br/>hutsik dagoen sareta prestatzen du"]

    middleware --> routes
    middleware --> gameApi
    middleware --> externalApi
    routes --> render --> pug --> pages
    gameApi --> grid
    routes --> import
    routes --> queue --> import
    externalApi --> import
    import --> parsers
  end

  subgraph persistence["Datuen biltegiratzea"]
    mongo[("MongoDB")]
    sessionStore["Express saioak<br/>MongoStore"]
    models["Mongoose ereduak<br/>Crossword · User · GameState<br/>PlaySession · PuzzleUploadBatch"]
    files["Fitxategi sistema<br/>aldi baterako fitxategiak eta deskargak"]
    mongo --- models
    mongo --- sessionStore
    files --> queue
  end

  client -- "fetch: /api/game eta /jokoak" --> gameApi
  routes --> models
  gameApi --> models
  import --> models
  routes --> files
  browser -- "HTTP" --> middleware
```

## Orrien ibilbidea

- Hasierako orria (`/`) `home.pug` txantiloiarekin errendatzen da; txantiloi horrek `layout.pug` erabiltzen du oinarri.
- Gainerako orriak `page-view.js` eta `app.pug` bidez errendatzen dira. `app.pug`-ek `views/pages/` karpetako orri egokia eta goiburua eta orri-oina txertatzen ditu.
- `app.js`-ek orriaren HTMLko atributuen arabera abiarazten ditu kontrolatzaileak. `site.js`-ek nabigazio partekatua kudeatzen du; `i18n.js`-ek, berriz, itzulpenak.

## Jokoen eta puzleen ibilbidea

- `GET /jokoak/game/:id` eskaerak puzlea kargatzen du. PUZ eta IPUZ gurutzegramak `Crossword` egitura partekatuan normalizatzen dira; SPL jokoak `SpiralPuzzle` irakurgailuak kargatzen ditu. Zerbitzariak jolasteko behar diren datuak soilik bidaltzen ditu, erantzunak bezeroari erakutsi gabe.
- Joko-ekintzek `/api/game` APIra jotzen dute. Uneko jokoaren egoera Express saioan gordetzen da; erabiltzaile-kontu bati lotutako aurrerapena `GameState` eta `PlaySession` ereduetan gordetzen da.
- Puzle-kargak `jokoak` bideratzaileetatik igarotzen dira, eta `puzzle-upload-queue.js`-k eta `importPuzzle()` funtzioak prozesatzen dituzte. Emaitza `Crossword` dokumentu gisa gordetzen da; sorta eta haren egoera `PuzzleUploadBatch` ereduan erregistratzen dira.
- `/external` APIak puzleak zerrendatu, inportatu eta ezabatzeko aukera ematen du. API gako bidez babestuta dago eta eskaera kopuruaren muga du.
