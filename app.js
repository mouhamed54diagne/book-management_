let books = [];
let isEditing = false;
let isLoading = false;

const bookForm = document.getElementById("book-form");
const bookIdInput = document.getElementById("book-id");
const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const isbnInput = document.getElementById("isbn");
const publicationYearInput = document.getElementById("publication_year");
const genreInput = document.getElementById("genre");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const formTitle = document.getElementById("form-title");
const booksTableBody = document.querySelector("#books-table tbody");
const messageContainer = document.getElementById("message-container");
const loadingIndicator = document.getElementById("loading-indicator");

function showMessage(message, type = "success") {
  messageContainer.innerHTML = `<div class="message ${type}">${message}</div>`;
  setTimeout(() => {
    messageContainer.innerHTML = "";
  }, 5000);
}

function showLoading(show = true) {
  isLoading = show;
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? "block" : "none";
  }
  if (submitBtn) {
    submitBtn.disabled = show;
    submitBtn.textContent = isEditing ? (show ? "Mise à jour..." : "Mettre à jour") : (show ? "Ajout..." : "Ajouter");
  }
}

async function loadBooks() {
  try {
    showLoading(true);
    console.log("Envoi de la requête GET à http://localhost:3000/api/books");
    const response = await fetch("http://localhost:3000/api/books", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur ${response.status} lors de la récupération des livres: ${errorText}`);
    }

    books = await response.json();
    console.log("Livres reçus:", books);
    renderBooks();
  } catch (error) {
    console.error("Erreur dans loadBooks:", error);
    showMessage(`Impossible de charger les livres: ${error.message}`, "error");
  } finally {
    showLoading(false);
  }
}

function renderBooks() {
  booksTableBody.innerHTML = "";
  if (books.length === 0) {
    booksTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Aucun livre trouvé</td></tr>';
    return;
  }

  books.forEach((book) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${book.id}</td>
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${book.isbn}</td>
      <td>${book.publication_year || ""}</td>
      <td>${book.genre || ""}</td>
      <td class="action-buttons">
        <button class="edit-btn" data-id="${book.id}">Modifier</button>
        <button class="delete-btn" data-id="${book.id}">Supprimer</button>
      </td>
    `;
    booksTableBody.appendChild(row);
  });

  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      editBook(id);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      deleteBook(id);
    });
  });
}

function editBook(id) {
  const book = books.find((b) => b.id == id);
  if (!book) return;

  isEditing = true;
  bookIdInput.value = book.id;
  titleInput.value = book.title;
  authorInput.value = book.author;
  isbnInput.value = book.isbn;
  publicationYearInput.value = book.publication_year || "";
  genreInput.value = book.genre || "";

  formTitle.textContent = "Modifier le livre";
  submitBtn.textContent = "Mettre à jour";
  cancelBtn.style.display = "inline-block";
}

function cancelEdit() {
  isEditing = false;
  bookForm.reset();
  bookIdInput.value = "";

  formTitle.textContent = "Ajouter un livre";
  submitBtn.textContent = "Ajouter";
  cancelBtn.style.display = "none";
}

async function submitForm(e) {
  e.preventDefault();
  if (isLoading) return;

  const bookData = {
    title: titleInput.value,
    author: authorInput.value,
    isbn: isbnInput.value,
    publication_year: publicationYearInput.value ? Number.parseInt(publicationYearInput.value) : null,
    genre: genreInput.value,
  };

  try {
    showLoading(true);
    const id = bookIdInput.value;
    const isUpdate = !!id;
    const url = isUpdate ? `http://localhost:3000/api/books/${id}` : "http://localhost:3000/api/books";
    const method = isUpdate ? "PUT" : "POST";

    console.log(`Envoi de requête ${method} à ${url}`, bookData);

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookData),
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (error) {
      console.error("Erreur lors du parsing de la réponse JSON:", error);
      const text = await response.text();
      throw new Error(`Erreur de format de réponse: ${text.substring(0, 100)}...`);
    }

    if (!response.ok) {
      throw new Error(
        responseData?.message ||
          `Erreur ${response.status} lors de ${isUpdate ? "la mise à jour" : "l'ajout"} du livre`
      );
    }

    showMessage(isUpdate ? "Livre mis à jour avec succès" : "Livre ajouté avec succès");
    cancelEdit();
    await loadBooks();
  } catch (error) {
    console.error("Erreur dans submitForm:", error);
    showMessage(`Erreur: ${error.message}`, "error");
  } finally {
    showLoading(false);
  }
}

async function deleteBook(id) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce livre ?")) {
    return;
  }

  try {
    showLoading(true);
    const response = await fetch(`http://localhost:3000/api/books/${id}`, {
      method: "DELETE",
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (error) {
      console.error("Erreur lors du parsing de la réponse JSON:", error);
      const text = await response.text();
      throw new Error(`Erreur de format de réponse: ${text.substring(0, 100)}...`);
    }

    if (!response.ok) {
      throw new Error(responseData?.message || `Erreur ${response.status} lors de la suppression du livre`);
    }

    showMessage(responseData?.message || "Livre supprimé avec succès");
    await loadBooks();
  } catch (error) {
    console.error("Erreur dans deleteBook:", error);
    showMessage(`Erreur: ${error.message}`, "error");
  } finally {
    showLoading(false);
  }
}

// Fonction pour créer l'indicateur de chargement
function createLoadingIndicator() {
  if (!document.getElementById("loading-indicator")) {
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "loading-indicator";
    loadingDiv.innerHTML = `
      <div class="spinner"></div>
      <span>Chargement en cours...</span>
    `;
    loadingDiv.style.display = "none";
    loadingDiv.style.textAlign = "center";
    loadingDiv.style.margin = "10px 0";

    const style = document.createElement("style");
    style.textContent = `
      .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        animation: spin 2s linear infinite;
        display: inline-block;
        margin-right: 10px;
        vertical-align: middle;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    const messageContainer = document.getElementById("message-container");
    if (messageContainer) {
      messageContainer.parentNode.insertBefore(loadingDiv, messageContainer.nextSibling);
    } else {
      document.body.insertBefore(loadingDiv, document.body.firstChild);
    }

    return loadingDiv;
  }
  return document.getElementById("loading-indicator");
}

// Événements
bookForm.addEventListener("submit", submitForm);
cancelBtn.addEventListener("click", cancelEdit);

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
  const loadingIndicator = createLoadingIndicator();
  window.loadingIndicator = loadingIndicator;
  cancelEdit();
  loadBooks();
});