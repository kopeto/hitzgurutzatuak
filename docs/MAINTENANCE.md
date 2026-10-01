# Mantentze orria

Mantentze moduak aplikazioaren ohiko zerbitzua ordezkatzen du orri bakar batekin. Ez du datu-basea edo aplikazioaren sekretuak behar.

Abiarazteko, checkout egokia hautatu eta exekutatu:

```sh
./scripts/update-and-restart-deploy.sh --maintenance
```

Launcher-ak checkout hori eraikitzen du; ez du Git-etik pull egiten. Mantentze Compose fitxategiak ekoizpeneko aplikazio bera erabiltzen du (`127.0.0.1:3000`) eta, `--remove-orphans` erabilita, Mongo zerbitzua gelditzen du. Datu-bolumena ez da ezabatzen.

Ohiko aplikaziora itzultzeko, exekutatu:

```sh
./scripts/update-and-restart-deploy.sh --production
```
