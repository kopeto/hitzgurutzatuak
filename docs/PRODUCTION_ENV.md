# Ingurune-aldagaiak produkzioan

`.env` garapen lokalekoa da. Ez gehitu zerbitzariko sekreturik Git-era edo Docker irudira. Produkzioan erabili zerbitzarian bakarrik dagoen ingurune-fitxategi bat edo ostatatze-hornitzailearen sekretu-kudeatzailea.

## Zerbitzariko fitxategia

Sortu fitxategia zerbitzarian, proiektu-biltegitik kanpo, eta murriztu sarbidea:

```sh
sudo install -d -m 700 /etc/hitzgurutzatuak
sudo install -m 600 /dev/null /etc/hitzgurutzatuak/app.env
sudoedit /etc/hitzgurutzatuak/app.env
```

Gehitu gutxienez aldagai hauek, benetako balioekin:

```dotenv
DB_CONNECTION=mongodb+srv://ERABILTZAILEA:PASAHITZA@KLUSTERRA/CW?retryWrites=true&w=majority
MY_SECRET=sortu_openssl_rand_base64_48_komandoarekin
EXTERNAL_API_KEY=sortu_openssl_rand_hex_32_komandoarekin
TRUST_PROXY=true
SESSION_MAX_AGE_MS=604800000
MAX_PUZ_UPLOAD_BYTES=5242880
```

Ez kopiatu adibideko balioak produkziora. Sortu `MY_SECRET` eta `EXTERNAL_API_KEY` ausaz zerbitzarian, adibidez `openssl rand -base64 48` eta `openssl rand -hex 32` erabiliz. `TRUST_PROXY=true` erabili soilik aplikazioa salto bakarreko proxy fidagarri baten atzean badago; proxy-katerako, aplikazioaren konfigurazioak salto kopuru osoa ere onartzen du. MongoDB konexioak autentifikazioa eta TLS erabili behar ditu, eta datu-baseak ez du publikoki eskuragarri egon behar.

`NODE_ENV=production` eta `PORT=3000` Docker Compose konfigurazioak ezartzen ditu. Produkzio-konfigurazioak ez du MongoDB lokaleko edukiontzirik sortzen; `DB_CONNECTION` produkzioko datu-basera zuzendu behar da.

## Abiaraztea

Proxy alderantzikatua zerbitzari berean badago, aplikazioa `127.0.0.1:3000` helbidean soilik argitaratzen da. Abiarazi edo eguneratu aplikazioa honekin:

```sh
sudo docker compose -f docker-compose.production.yml up -d --build
```

Konfigurazio honek ez du iturburu-koderik edukiontzian muntatzen eta `uploads` datuak bolumen iraunkorrean gordetzen ditu. Proxy-a beste edukiontzi batean badago, egokitu sare-konfigurazioa; ez argitaratu aplikazio-portua Internetera zuzenean.

## Git eta tokiko fitxategiak

`.env` baztertuta dago `.gitignore`-n, eta `.env.*` fitxategiak ez dira Git-era edo Docker build testuingurura gehitzen; `.env.example` da salbuespena. `.env` aurretik Git-en jarraitu izan denez, erregistroko jarraipena kendu behar da, tokiko kopia ezabatu gabe. Benetako sekretuak aurretik urruneko biltegira igo badira, aldatu produkzioan erabili aurretik.

`MASTER_USER_IDS` aldagaia `scripts/sync-masters.js` scriptak bakarrik erabiltzen du; aplikazioak ez du `MASTERS` izeneko aldagairik irakurtzen.
