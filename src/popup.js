const passwordList = document.getElementById("password-list");
const noPasswordList = document.getElementById("Nopassword-list");
const form = document.getElementById("form");
const btn = document.getElementById("btnPassword");
const apiUrl = "http://localhost:3000/password";
const nextIdUrl = "http://localhost:3000/nextId";
let passwordsCache = [];

// Gestion de l'ouverture du formulaire
document.getElementById("open-form-button").addEventListener("click", () => {
    form.removeAttribute('hidden');
    btn.setAttribute('hidden', '');
    passwordList.setAttribute('hidden');
});

// Gestion du retour au menu principal
document.querySelector(".goBack").addEventListener("click", (e) => {
    e.preventDefault();
    form.setAttribute('hidden', '');
    btn.removeAttribute('hidden');
    passwordList.removeAttribute('hidden');
    passwordList.classList.add('password-list-large');
});

// Fonction pour tronquer un texte
function truncate(text, maxLength) {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

// Récupérer la liste des mots de passe depuis l'API
async function fetchPasswords() {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Erreur lors de la récupération des mots de passe depuis l'API");
        const passwords = await response.json();
        passwordsCache = passwords.filter((p) => !p.deleted);
        return passwordsCache;
    } catch (error) {
        console.error("Erreur : Impossible de récupérer les mots de passe depuis l'API.");
        return [];
    }
}

// Récupérer le prochain ID pour les mots de passe
async function getNextId() {
    try {
        const response = await fetch(nextIdUrl);
        if (!response.ok) throw new Error("Erreur lors de la récupération du prochain ID");
        const { nextId } = await response.json();
        await fetch(nextIdUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nextId: nextId + 1 }),
        });
        return nextId;
    } catch (error) {
        console.error("Erreur : Impossible de récupérer ou d'incrémenter le prochain ID.");
        return null;
    }
}

// Ajouter un mot de passe dans l'API
async function addPassword(site, username, password) {
    try {
        const nextId = await getNextId();
        if (nextId === null) throw new Error("ID non défini");

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: `${nextId}`, site, username, password, deleted: false }),
        });

        if (!response.ok) throw new Error("Erreur lors de l'ajout dans l'API");
        console.log(`Mot de passe ajouté avec ID "${nextId}" dans l'API.`);
    } catch (error) {
        console.error("Erreur : Impossible d'ajouter le mot de passe dans l'API.", error);
    }
}

// Marquer un mot de passe comme supprimé
async function markAsDeleted(id) {
    try {
        const response = await fetch(`${apiUrl}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deleted: true }),
        });
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
        console.log(`Mot de passe avec ID ${id} marqué comme supprimé.`);
    } catch (error) {
        console.error("Erreur : Impossible de marquer le mot de passe comme supprimé dans l'API.", error);
    }
}

// Supprimer un mot de passe
async function deletePassword(id) {
    await markAsDeleted(id);
    passwordsCache = await fetchPasswords();
    updatePasswordList();
}

function updatePasswordList() {
    if (passwordsCache.length === 0) {
        noPasswordList.style.display = "flex";
        passwordList.style.display = "none";
    } else {
        noPasswordList.style.display = "none";
        passwordList.style.display = "block";

        passwordList.innerHTML = passwordsCache.map((p) => `
            <li id="password-item-${p.id}" class="password-item">
                <strong style="display: flex; align-items: center; gap: 10px;">${p.site}<button title="Aller a l'adresse" class="goto-btn"><img src="../icons/gotourl.svg"></button></strong><br>
                <span title="Copier identifiant" class="copyable" data-copy="${p.username}">${truncate(p.username, 10)}</span>
                <span title="Copier mot de passe" class="copyable" data-copy="${p.password}">${truncate(p.password, 10)}</span>
                <button title="Supprimer mot de passe" class="delete-btn" data-id="${p.id}"><img data-id="${p.id}" src="../icons/trash-icone.svg"></button>
            </li>
        `).join("");

        document.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'), 10);
                deletePassword(id);
            });
        });

        document.querySelectorAll('.copyable').forEach(item => {
            item.addEventListener('click', (e) => {
                const valueToCopy = item.getAttribute('data-copy');
                navigator.clipboard.writeText(valueToCopy).catch(err => {
                    console.error('Erreur lors de la copie :', err);
                });
            });
        });
    }
}

document.getElementById("password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const site = document.getElementById("site").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    form.setAttribute('hidden', '');
    btn.removeAttribute('hidden');
    await addPassword(site, username, password);
    passwordsCache = await fetchPasswords();
    updatePasswordList();
    e.target.reset();
});

(async () => {
    passwordsCache = await fetchPasswords();
    updatePasswordList();
})();
