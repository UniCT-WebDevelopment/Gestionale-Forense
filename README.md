# Gestionale_forense

L'obiettivo del presente progetto è quello di costruire un gestionale forense che abbia sia l'interfaccia lato Admin che lato cliente. Relativamente al lato Admin, dopo aver eseguito l'accesso tramite login, è possibile creare una nuova pratica compilando i seguenti campi:
 - Tipologia (Acquisizione chat, Recupero targa, Ricostruzione incidente stradale);
 - Nome dell'Operatore che ha in carico la pratica;
 - Nome del cliente;
 - Email del cliente;
 - Upload di eventuali file.

Al completamento della compilazione dei campi, viene creata una tabella contenente quest'ultimi e una colonna riportante lo status della pratica. Ogni riga è cliccabile: al click è possibile avere accesso alla scheda con i dettagli della pratica. Nella scheda è possibile aggiungere delle note relativamente al caso associato,  modificare lo status della pratica (studio di fattibilità, approvazione preventivo, fase di analisi, in consegna, consegnato) tramite dei pulsanti radio ed aggiungere eventuali file.

Il cliente, dopo aver eseguito registrazione e in un secondo momento il login, ha la possibilità di prendere visione delle pratiche a lui associate attraverso la sola visualizzazione della tabella.


## Getting started

Al fine di avviare il progetto è necessario eseguire i seguenti comandi: 
```
npm init -y
```
Installare le librerie necessarie:

```
npm install package.json
```

Eseguire il comando :
```
node server.js
```

Per modificare la porta cambiare il parametro 'port' all'interno del file server.js

### Library and version
- "bcrypt": "^5.1.1",
- "dotenv": "^16.4.5",
- "express": "^4.19.2",
- "fs": "^0.0.1-security",
- "multer": "^1.4.5-lts.1",
- "socket.io": "^4.7.5"
