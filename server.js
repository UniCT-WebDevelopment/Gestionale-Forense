const Datastore = require('nedb');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;
app.use(express.static(path.join(__dirname, 'public')));

// Configurazione dei database NeDB
const praticheDB = new Datastore({ filename: path.join(__dirname, 'pratiche.db'), autoload: true });
const usersDB = new Datastore({ filename: path.join(__dirname, 'users.db'), autoload: true });

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Esporre i file dalla cartella "pratiche" per permettere il download
app.use('/pratiche', express.static(path.join(__dirname, 'pratiche')));


// Configura multer per gestire l'upload dei file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'upload');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Simulazione degli utenti con ruolo (admin/client)
const defaultUsers = [
    { firstName: 'Admin', lastName: 'User', email: 'admin@example.com', password: 'adminpass', role: 'admin' }
];

// Inizializzazione degli utenti di default
usersDB.count({}, (err, count) => {
    if (count === 0) {
        usersDB.insert(defaultUsers, (err) => {
            if (err) console.error('Errore nell\'inserimento di default:', err);
        });
    }
});

io.on('connection', (socket) => {
    console.log('Nuova connessione');

    // Login utente
    socket.on('login', (data) => {
        const { email, password} = data;
        usersDB.findOne({ email, password}, (err, user) => {
            if (user) {
                socket.emit('loginResponse', {
                    success: true,
                    role: user.role
                });
            } else {
                socket.emit('loginResponse', { success: false });
            }
        });
    });

    // Registrazione utente
    socket.on('register', (data) => {
        const { firstName, lastName, email, password, role } = data;
        usersDB.findOne({ email }, (err, userExists) => {
            if (userExists) {
                socket.emit('registerResponse', { success: false, message: 'Email già in uso.' });
            } else {
                const newUser = { firstName, lastName, email, password, role };
                usersDB.insert(newUser, (err) => {
                    if (err) {
                        socket.emit('registerResponse', { success: false, message: 'Errore durante la registrazione.' });
                    } else {
                        socket.emit('registerResponse', { success: true });
                    }
                });
            }
        });
    });

    // Gestione di una nuova pratica
    socket.on('nuovaPratica', (data) => {
        let pratica = {
            nomeC: data.nomeC,
            tipologia: data.tipologia,
            operatore: data.operatore,
            file: data.file || 'N/A',
            note: '', // Inizializza il campo note vuoto
            emailC: data.emailC,
            status: data.status || 'Non specificato' // Campo di stato
        };

        praticheDB.insert(pratica, (err, newPratica) => {
            if (err) {
                socket.emit('praticaAggiunta', { success: false });
            } else {
                console.log('Nuova pratica aggiunta:', newPratica);

                // Crea la cartella per la nuova pratica
                const praticaFolder = path.join(__dirname, 'pratiche', newPratica._id);
                
                fs.mkdir(praticaFolder, { recursive: true }, (err) => {
                    if (err) {
                        console.error('Errore durante la creazione della cartella della pratica:', err);
                        socket.emit('praticaAggiunta', { success: false, message: 'Errore nella creazione della cartella' });
                    } else {
                        console.log('Cartella per la pratica creata:', praticaFolder);
                        socket.emit('praticaAggiunta', { success: true, praticaId: newPratica._id });
                    }
                });
            }
        });
    });

    // Cerca pratiche per email cliente
    socket.on('cercaPratichePerEmail', (email) => {
        praticheDB.find({ emailC: email }, (err, praticheCliente) => {
            socket.emit('praticheTrovate', praticheCliente);
        });
    });
});

// API per ottenere i dettagli di una pratica in base all'ID
app.get('/api/pratica/:id', (req, res) => {
    const praticaId = req.params.id;
    praticheDB.findOne({ _id: praticaId }, (err, pratica) => {
        if (pratica) {
            res.json(pratica);
        } else {
            res.status(404).send('Pratica non trovata');
        }
    });
});

// API per ottenere tutte le pratiche
app.get('/api/pratiche', (req, res) => {
    praticheDB.find({}, (err, pratiche) => {
        res.json(pratiche);
    });
});

// API per aggiungere una nuova pratica
app.post('/api/pratiche', upload.array('files[]', 10), (req, res) => {
    const nuovaPratica = {
        tipologia: req.body.tipologia,
        operatore: req.body.operatore,
        nomeCliente: req.body.nomeCliente,
        files: [], // Inizializza la lista dei file vuota, verrà popolata dopo l'upload
        note: req.body.note || '',
        emailC: req.body.emailC,
        status: req.body.status || 'Non specificato' // Campo di stato
    };

    praticheDB.insert(nuovaPratica, (err, nuovaPraticaSalvata) => {
        if (err) {
            return res.status(500).json({ success: false });
        }

        // Crea la cartella per la pratica
        const praticaFolder = path.join(__dirname, 'pratiche', nuovaPraticaSalvata._id);

        fs.mkdir(praticaFolder, { recursive: true }, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Errore nella creazione della cartella' });
            }

            // Sposta i file caricati nella cartella della pratica
            req.files.forEach((file) => {
                const filePath = path.join(praticaFolder, file.originalname);
                fs.renameSync(file.path, filePath); // Sposta il file nella cartella della pratica
                nuovaPraticaSalvata.files.push(file.originalname); // Aggiungi il nome del file alla lista
            });

            // Aggiorna la pratica con i nomi dei file caricati
            praticheDB.update({ _id: nuovaPraticaSalvata._id }, { $set: { files: nuovaPraticaSalvata.files } }, {}, (err) => {
                if (err) {
                    return res.status(500).json({ success: false });
                }
                res.status(201).json(nuovaPraticaSalvata);
            });
        });
    });
});
// API per aggiornare una pratica
app.put('/api/pratiche/:id', (req, res) => {
    const praticaId = req.params.id;
    console.log('Ricevuto aggiornamento per pratica:', praticaId, 'Dati:', req.body);
    const aggiornamenti = {
        note: req.body.note,
        status: req.body.status
    };

    praticheDB.update({ _id: praticaId }, { $set: aggiornamenti }, {}, (err, numReplaced) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Errore durante l\'aggiornamento della pratica.' });
        }

        if (numReplaced === 0) {
            return res.status(404).json({ success: false, message: 'Pratica non trovata.' });
        }

        res.json({ success: true, message: 'Pratica aggiornata con successo.' });
    });
    // const praticaFolder = path.join(__dirname, 'pratiche', nuovaPraticaSalvata._id);

    //         fs.mkdir(praticaFolder, { recursive: true }, (err) => {
    //             if (err) {
    //                 return res.status(500).json({ success: false, message: 'Errore nella creazione della cartella' });
    //             }

    //             // Salva i file caricati nella cartella della pratica
    //             req.files.forEach((file) => {
    //                 const filePath = path.join(praticaFolder, file.originalname);
    //                 fs.renameSync(file.path, filePath); // Sposta il file nella cartella specifica
    //                 nuovaPraticaSalvata.files.push(file.originalname); // Aggiunge il nome del file alla lista dei file
    //             });
                
    //             // Aggiorna la pratica con i file salvati
    //             praticheDB.update({ _id: nuovaPraticaSalvata._id } ,{ $set: { files: nuovaPraticaSalvata.files } }, {}, (err) => {
    //                 if (err) {
    //                     return res.status(500).json({ success: false });
    //                 }
    //                 res.status(201).json(nuovaPraticaSalvata);
    //             });
    //         });


    });
        
    


// API per cancellare pratiche selezionate
// API per cancellare pratiche selezionate e rimuovere la cartella corrispondente
// API per cancellare pratiche selezionate e rimuovere la cartella corrispondente
app.delete('/api/pratiche', (req, res) => {
    const idsToDelete = req.body.ids; // Array di ID delle pratiche da cancellare
    console.log("le pratiche da cancellare lato server", idsToDelete)
    if (!Array.isArray(idsToDelete) || idsToDelete.length === 0) {
        return res.status(400).json({ success: false, message: 'Nessun ID fornito per la cancellazione.' });
    }

    // Trova tutte le pratiche da cancellare
    praticheDB.find({ _id: { $in: idsToDelete } }, (err, pratiche) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Errore nella ricerca delle pratiche.' });
        }

        // Cancella le pratiche dal database
        praticheDB.remove({ _id: { $in: idsToDelete } }, { multi: true }, (err, numRemoved) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Errore nella cancellazione delle pratiche.' });
            }

            // Rimuovi le cartelle delle pratiche cancellate
            pratiche.forEach(pratica => {
                const praticaFolder = path.join(__dirname, 'pratiche', pratica._id);

                // Verifica se la cartella esiste prima di cancellarla
                if (fs.existsSync(praticaFolder)) {
                    fs.rm(praticaFolder, { recursive: true, force: true }, (err) => {
                        if (err) {
                            console.error(`Errore durante la cancellazione della cartella per la pratica ${pratica._id}:`, err);
                        } else {
                            console.log(`Cartella per la pratica ${pratica._id} cancellata.`);
                        }
                    });
                } else {
                    console.warn(`Cartella per la pratica ${pratica._id} non trovata.`);
                }
            });

            res.json({ success: true, numRemoved });
        });
    });
});

server.listen(port, () => {
    console.log(`Server in ascolto su http://localhost:${port}`);
});
