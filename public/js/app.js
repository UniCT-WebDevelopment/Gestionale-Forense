document.addEventListener('DOMContentLoaded', function () {
    let praticheDatabase = [];
    let userRole = null;  // Per memorizzare il ruolo dell'utente loggato
    let loggedInUser = null;  // Per memorizzare i dettagli dell'utente loggato
    const socket = io();

    // Funzione per mostrare una specifica sezione
    function showSection(sectionId) {
        const sections = document.querySelectorAll('.form-section, .admin-container, .container');
        sections.forEach(section => section.classList.add('hidden'));
        document.getElementById(sectionId).classList.remove('hidden');
    }

    // Mostra la sezione di login all'avvio
    showSection('loginSection');

    socket.on('loginResponse', function (response) {
        if (response.success) {
            console.log('sono al login')
            // Inizializza loggedInUser con i dati del login
            loggedInUser = {
                email: document.getElementById('loginEmail').value, 
                role: response.role
            };
            console.log('Login riuscito:', loggedInUser);
    
            // Ora carica le pratiche dell'utente
            if (loggedInUser.role === 'admin') {
                showSection('adminSection');
            } else if (loggedInUser.role === 'client') {
                showSection('clientSection');
                loadClientPratiche();
            }else if(loggedInUser.role === 'operator'){
                showSection('adminSection');

            }

        } else {
            console.error('Login fallito');
            document.getElementById('loginErrorMessage').innerText = 'Credenziali non valide.';
        }
    });
    
    // Gestione del click sul bottone di login
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', function () {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
    
            if (email && password) {
                socket.emit('login', { email, password });
            } else {
                document.getElementById('loginErrorMessage').innerText = 'Inserisci email e password.';
            }
        });
    } else {
        console.error('Pulsante di login non trovato.');
    }

    // Gestione del click sul bottone di registrazione
    const registerButton = document.getElementById('registerButton');
    if (registerButton) {
        registerButton.addEventListener('click', function () {
            const firstName = document.getElementById('registerFirstName').value;
            const lastName = document.getElementById('registerLastName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            const role = document.getElementById('role').value;

            if (password === confirmPassword) {
                socket.emit('register', { firstName, lastName, email, password, role });

                socket.on('registerResponse', function (data) {
                    if (data.success) {
                        showSection('loginSection');
                    } else {
                        document.getElementById('registerErrorMessage').innerText = data.message;
                    }
                });
            } else {
                document.getElementById('registerErrorMessage').innerText = 'Le password non coincidono.';
            }
        });
    } else {
        console.error('Pulsante di registrazione non trovato.');
    }

    // Gestione del passaggio dalla schermata di login a quella di registrazione
    const showRegister = document.getElementById('showRegister');
    if (showRegister) {
        showRegister.addEventListener('click', function () {
            showSection('registerSection');
        });
    } else {
        console.error('Pulsante di passaggio a registrazione non trovato.');
    }

    // Gestione del passaggio dalla schermata di registrazione a quella di login
    const showLogin = document.getElementById('showLogin');
    if (showLogin) {
        showLogin.addEventListener('click', function () {
            showSection('loginSection');
        });
    } else {
        console.error('Pulsante di passaggio a login non trovato.');
    }

    

    // Gestione del clic sul pulsante "Visualizza le mie Pratiche"
    const showClientPraticheButton = document.getElementById('showClientPratiche');
    if (showClientPraticheButton) {
        showClientPraticheButton.addEventListener('click', function () {
            //loadClientPratiche(); // Carica le pratiche del cliente
            updateClientPraticheTable();
        });
    } else {
        console.error('Pulsante "Visualizza le mie Pratiche" non trovato.');
    }

    
    function loadClientPratiche() {
        console.log("loggedUser",loggedInUser)
        if (loggedInUser) {
            socket.emit('cercaPratichePerEmail', loggedInUser.email);

            socket.on('praticheTrovate', function (pratiche) {
                praticheDatabase = pratiche; // Aggiorna il database delle pratiche con quelle trovate
               // updateClientPraticheTable(); // Aggiorna la tabella delle pratiche sul client
            });
        } else {
            console.error('Utente non loggato o email mancante.');
        }
    }

    function updateClientPraticheTable() {
        const tableContainerClient = document.getElementById('clientPraticheTableContainer');
        tableContainerClient.innerHTML = '';

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');


        thead.innerHTML = `
            <tr>
                <th>Tipologia</th>
                <th>Operatore</th>
                <th>Nome Cliente</th>
                <th>File</th>
                <th>Email</th>
                <th>Stato</th>
            </tr>
        `;

        praticheDatabase.forEach(pratica => {
            const row = document.createElement('tr');
            const fileList = Array.isArray(pratica.files) ? pratica.files.join(', ') : 'Nessun file';
            console.log("lo status è:", pratica.status)

            row.innerHTML = `
                <td>${pratica.tipologia}</td>
                <td>${pratica.operatore}</td>
                <td>${pratica.nomeCliente}</td>
                <td>${fileList}</td>
                <td>${pratica.emailC}</td>
                <td>${pratica.status || 'Non specificato'}</td>
            `;

            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainerClient.appendChild(table);
    }

    // Navigazione all'interno del pannello admin
    const sidebarLinks = document.querySelectorAll('.sidebar ul li a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            const sectionId = event.target.getAttribute('data-section');
            showSection(sectionId + 'Section');
        });
    });

    // Caricamento dinamico dei dettagli della pratica
    function loadPratiche() {
        fetch('http://localhost:3000/api/pratiche')
            .then(response => response.json())
            .then(data => {
                praticheDatabase = data;
                updatePraticheTable();
            });
    }

    // Funzione per inviare i dati del form al server
    document.getElementById('adminForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const timestamp = Date.now();
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        const seconds = String(today.getSeconds()).padStart(2, '0');

        const formData = new FormData();
    
        formData.append('tipologia', document.getElementById('tipologia').value);
        formData.append('operatore', document.getElementById('operatore').value);
        formData.append('nomeCliente', document.getElementById('nomeC').value);
        formData.append('emailC', document.getElementById('emailC').value);
    
        // Ottieni i file selezionati dall'input
        const files = document.getElementById('fileUp').files;
    
        // Rinomina files
        Array.from(files).forEach((file, index) => {
            const newFileName = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}_${file.name}`; 
            const renamedFile = new File([file], newFileName, { type: file.type });
            formData.append('files[]', renamedFile);
        });
    
        // Effettua la richiesta al server con il formData
        fetch('http://localhost:3000/api/pratiche', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            praticheDatabase.push(data);
            updatePraticheTable();
            document.getElementById('adminForm').reset();
            alert('Pratica salvata con successo!');
        })
        .catch(error => {
            console.error('Errore durante l\'upload:', error);
        });
    });
    
    // Carica le pratiche quando si mostra la tabella
    document.getElementById('showPratiche').addEventListener('click', function(event) {
        event.preventDefault();
        showSection('praticheSection');
        loadPratiche();
    });

    // Funzione per aggiornare la tabella delle pratiche e rendere le righe cliccabili
    function updatePraticheTable() {
        console.log('sono nella tabella')
        const tableContainer = document.getElementById('tableContainer');
        console.log(tableContainer)
        if (!tableContainer) {
            console.error('Container della tabella non trovato.');
            return;
        }
    
    
        tableContainer.innerHTML = '';
    
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
    
        thead.innerHTML = `
            <tr>
                <th>Seleziona</th>
                <th>Tipologia</th>
                <th>Operatore</th>
                <th>Nome Cliente</th>
                <th>File</th>
                <th>Email</th>
                <th>Stato</th>
            </tr>
        `;
    
        praticheDatabase.forEach(pratica => {
            console.log(pratica.emailC);
            const row = document.createElement('tr');
            
            console.log('Pratica ID:', pratica._id);
            console.log('Pratica Files:', pratica.files);
            const fileList = Array.isArray(pratica.files) ? pratica.files.join(', ') : 'Nessun file';
            console.log(fileList)
            row.innerHTML = `
                <td><input type="checkbox" class="delete-checkbox" data-id="${pratica._id}" data-files="${pratica.files ? pratica.files.join(',') : ''}"></td>
                <td>${pratica.tipologia}</td>
                <td>${pratica.operatore}</td>
                <td>${pratica.nomeCliente}</td>
                <td>${fileList}</td>
                <td>${pratica.emailC}</td>
                <td>${pratica.status || 'Non specificato'}</td>
            `;
            console.log(row)
            row.addEventListener('click', function(event) {
                if (!event.target.classList.contains('delete-checkbox')) {
                    showSection('dettagliSection');
                    populatePraticaDetails(pratica);
                }
            });
            
        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.appendChild(table);

        

        
    


         tbody.appendChild(row);
 });
    // Aggiungi il pulsante di cancellazione sotto la tabella
        const deleteButton = document.createElement('button');
        deleteButton.id = 'deleteButton';
        deleteButton.className = 'deleteButton';
        deleteButton.textContent = 'Cancella Selezionati';
        tableContainer.appendChild(deleteButton);
    // Funzione per popolare i dettagli della pratica
    function populatePraticaDetails(pratica) {
        const praticaDetails = document.getElementById('praticaDetails');
        const fileLinks = Array.isArray(pratica.files) && pratica.files.length > 0 
        ? pratica.files.map(file => `<a href="/pratiche/${pratica._id}/${file}" target="_blank">${file}</a>`).join('<br>') 
        : 'Nessun file';
    
        praticaDetails.innerHTML = `
            <h2>Dettagli Pratica</h2>
            <p><strong>Nome Cliente:</strong> ${pratica.nomeCliente}</p>
            <p><strong>Operatore:</strong> ${pratica.operatore}</p>
            <p><strong>Tipologia:</strong> ${pratica.tipologia}</p>
            <p><strong>File:</strong> ${fileLinks} </p>
            <p><strong>Note:</strong></p>
            <textarea id="note" placeholder="Aggiungi note qui...">${pratica.note || ''}</textarea>
            <div id="statusSection">
                <label for="status">Status:</label>
                <select name="status" id="status">
                    <option value="studio di fattibilità" ${pratica.status === 'studio di fattibilità' ? 'selected' : ''}>Studio di fattibilità</option>
                    <option value="accettazione preventivo" ${pratica.status === 'accettazione preventivo' ? 'selected' : ''}>Accettazione preventivo</option>
                    <option value="fase di analisi" ${pratica.status === 'fase di analisi' ? 'selected' : ''}>Fase di analisi</option>
                    <option value="in consegna" ${pratica.status === 'in consegna' ? 'selected' : ''}>In consegna</option>
                    <option value="consegnato" ${pratica.status === 'consegnato' ? 'selected' : ''}>Consegnato</option>
                </select>           
            </div>
            <button id="uploadNewFileButton">Carica Nuovo File</button>
        `;

        // Modifica lo stato della pratica quando cambia il valore nel menu a tendina
        document.querySelector('#status').addEventListener('change', function () {
            console.log("sto cambiando lo stato")
            // Ottieni il valore selezionato dal menu a tendina
            const selectedStatus = this.value;
            pratica.status = selectedStatus;
            console.log(pratica.status)
            // Aggiorna localmente la pratica nel praticheDatabase
            const praticaIndex = praticheDatabase.findIndex(p => p._id === pratica._id);
            if (praticaIndex !== -1) {
                praticheDatabase[praticaIndex].status = selectedStatus;  
            }

            // Invia una richiesta PUT per aggiornare lo stato della pratica nel server
            fetch(`http://localhost:3000/api/pratiche/${pratica._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: pratica.status })
            })
            .then(response => response.json())
            .then(data => {
                alert('Stato della pratica aggiornato con successo!');
                loadPratiche()
                // Aggiorna la tabella delle pratiche
               // updatePraticheTable();  // Aggiorna manualmente la tabella
            })
            .catch(error => {
                console.error('Errore durante l\'aggiornamento dello stato:', error);
            });
        });

        document.getElementById('uploadNewFileButton').addEventListener('click', function() {
            alert('Nuovo file caricato');
        });

        document.getElementById('note').addEventListener('blur', function() {
            pratica.note = this.value;
            fetch(`http://localhost:3000/api/pratiche/${pratica._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ note: pratica.note })
            }).then(response => response.json())
              .then(data => {
                  alert('Nota aggiornata con successo!');
                  loadPratiche()

              });
        });
    }

    document.getElementById("homeButton").addEventListener('click', function(event) {
        event.preventDefault();
        showSection("adminSection");
    });

    document.getElementById("homeButtonPratiche").addEventListener('click', function(event){
        event.preventDefault();
        showSection("adminSection");
    });

    document.getElementById("homeButtonDet").addEventListener('click', function(event){
        event.preventDefault();
        showSection("adminSection");
    });

    document.getElementById('tableContainer').addEventListener('click', function(event) {
        if (event.target && event.target.id === 'deleteButton') {
            console.log('Ho cliccato il pulsante di cancellazione')
            const checkboxes = document.querySelectorAll('.delete-checkbox:checked');
            //const idsToDelete = Array.from(checkboxes).map(checkbox => parseInt(checkbox.getAttribute('data-id')));
            const idsToDelete = Array.from(checkboxes).map(checkbox => checkbox.getAttribute('data-id'));

            const filesToDelete = Array.from(checkboxes).map(checkbox => checkbox.getAttribute('data-file'));

            console.log('ID delle pratiche da cancellare:', idsToDelete);  // Debug
            console.log('File delle pratiche da cancellare:', filesToDelete);  // Debug

            if (idsToDelete.length > 0 && confirm('Sei sicuro di voler cancellare le pratiche selezionate?')) {
                fetch('http://localhost:3000/api/pratiche', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ids: idsToDelete, files: filesToDelete })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Pratiche cancellate con successo!');
                        loadPratiche();
                    } else {
                        alert('Errore durante la cancellazione delle pratiche.');
                    }
                });
            }
        }
    });


}});




