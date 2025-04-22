const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const { sequelize, Book } = require("./models/index");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pour le logging des requêtes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Configuration CORS permissive pour tests
app.use(cors());

// Middleware pour parser le JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir les fichiers statiques
console.log("Dossier public servi :", path.join(__dirname, "public"));
app.use(express.static(path.join(__dirname, "public")));

// Initialiser la base de données
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log("Connexion à la base de données établie");
    await sequelize.sync();
    console.log("Table books synchronisée");
  } catch (error) {
    console.error("Erreur de connexion à la base de données:", error);
    process.exit(1);
  }
}
initializeDatabase();

// Route de test
app.get("/test", (req, res) => {
  console.log("Requête reçue pour GET /test");
  res.json({ message: "Serveur fonctionne" });
});

// Route pour récupérer tous les livres
app.get("/api/books", async (req, res) => {
  console.log("Requête reçue pour GET /api/books");
  try {
    const books = await Book.findAll({ order: [["id", "DESC"]] });
    console.log(`Livres récupérés: ${books.length}`);
    res.json(books);
  } catch (err) {
    console.error("Erreur lors de la récupération des livres:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// Route pour récupérer un livre par ID
app.get("/api/books/:id", async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Livre non trouvé" });
    }
    res.json(book);
  } catch (err) {
    console.error(`Erreur lors de la récupération du livre ${req.params.id}:`, err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// Route pour ajouter un livre
app.post("/api/books", async (req, res) => {
  try {
    const { title, author, isbn, publication_year, genre } = req.body;
    if (!title || !author || !isbn) {
      return res.status(400).json({ message: "Les champs title, author et isbn sont requis" });
    }
    const existingBook = await Book.findOne({ where: { isbn } });
    if (existingBook) {
      return res.status(400).json({ message: "Un livre avec cet ISBN existe déjà" });
    }
    const newBook = await Book.create({
      title,
      author,
      isbn,
      publication_year: publication_year || null,
      genre: genre || null,
    });
    res.status(201).json(newBook);
  } catch (err) {
    console.error("Erreur lors de l'ajout du livre:", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// Route pour mettre à jour un livre
app.put("/api/books/:id", async (req, res) => {
  try {
    const { title, author, isbn, publication_year, genre } = req.body;
    if (!title || !author || !isbn) {
      return res.status(400).json({ message: "Les champs title, author et isbn sont requis" });
    }
    const book = await Book.findByPk(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Livre non trouvé" });
    }
    const existingBook = await Book.findOne({
      where: { isbn, id: { [sequelize.Sequelize.Op.ne]: req.params.id } },
    });
    if (existingBook) {
      return res.status(400).json({ message: "Un autre livre avec cet ISBN existe déjà" });
    }
    await book.update({ title, author, isbn, publication_year, genre });
    res.json(book);
  } catch (err) {
    console.error(`Erreur lors de la mise à jour du livre ${req.params.id}:`, err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// Route pour supprimer un livre
app.delete("/api/books/:id", async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Livre non trouvé" });
    }
    await book.destroy();
    res.json({ message: "Livre supprimé avec succès" });
  } catch (err) {
    console.error(`Erreur lors de la suppression du livre ${req.params.id}:`, err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// Route pour servir index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Middleware pour routes non trouvées
app.use((req, res) => {
  console.log(`Route non trouvée: ${req.method} ${req.url}`);
  res.status(404).json({ message: "Route non trouvée" });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error("Erreur non gérée:", err);
  res.status(500).json({ message: "Erreur serveur", error: err.message });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});