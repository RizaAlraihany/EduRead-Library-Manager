// --- STATE MANAGEMENT ---
const STORAGE_KEY = "BOOKSHELF_PRO_DATA";
let books = [];
let editingId = null;
let readingId = null;
let currentRating = 0;
let bookToDelete = null; 

// --- INIT & UTILS ---
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  initTheme();
  renderAll();
});

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  renderAll();
}

function loadData() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) books = JSON.parse(data);
}

// --- THEME ---
function initTheme() {
  const theme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);
}

document.getElementById("themeToggle").addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const newTheme = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
  document.getElementById("themeToggle").innerText =
    theme === "light" ? "🌙" : "☀️";
}

// --- CORE LOGIC ---
function addOrUpdateBook(e) {
  e.preventDefault();

  const title = document.getElementById("inputTitle").value;
  const author = document.getElementById("inputAuthor").value;
  const year = parseInt(document.getElementById("inputYear").value);
  const category = document.getElementById("inputCategory").value;
  const totalPages = parseInt(document.getElementById("inputTotalPages").value);
  const isComplete = document.getElementById("inputIsComplete").checked;

  if (editingId) {
    // Update
    const index = books.findIndex((b) => b.id === editingId);
    if (index !== -1) {
      books[index] = {
        ...books[index],
        title,
        author,
        year,
        category,
        totalPages,
        isComplete,
      };
      if (isComplete) books[index].progress = totalPages;
    }
  } else {
    // Add New
    const newBook = {
      id: Date.now(),
      title,
      author,
      year,
      category,
      totalPages,
      isComplete,
      progress: isComplete ? totalPages : 0,
      isFavorite: false,
      rating: 0,
      notes: "",
      dateAdded: new Date().toISOString(),
    };
    books.unshift(newBook);
  }

  saveData();
  closeModal("bookModal");
  e.target.reset();
}

// --- DELETE LOGIC  ---
function requestDelete(id) {
  bookToDelete = id;
  openModal("deleteModal");
}

document.getElementById("confirmDeleteBtn").addEventListener("click", () => {
  if (bookToDelete) {
    books = books.filter((b) => b.id !== bookToDelete);
    saveData();
    bookToDelete = null;
    closeModal("deleteModal");
  }
});

function toggleFavorite(id) {
  const index = books.findIndex((b) => b.id === id);
  if (index !== -1) {
    books[index].isFavorite = !books[index].isFavorite;
    saveData();
  }
}

function toggleComplete(id) {
  const index = books.findIndex((b) => b.id === id);
  if (index !== -1) {
    books[index].isComplete = !books[index].isComplete;
    // Auto adjust progress
    books[index].progress = books[index].isComplete
      ? books[index].totalPages
      : 0;
    saveData();
  }
}

// --- READING MODE LOGIC ---
function openReadingMode(id) {
  readingId = id;
  const book = books.find((b) => b.id === id);

  document.getElementById("readTitle").innerText = book.title;
  document.getElementById("readAuthor").innerText = book.author;

  // Mengatur input number dan total halaman
  const pageInput = document.getElementById("readPageInput");
  pageInput.max = book.totalPages;
  pageInput.value = book.progress || 0;

  document.getElementById("readTotalPages").innerText = book.totalPages;
  document.getElementById("readNotes").value = book.notes || "";

  currentRating = book.rating || 0;
  renderStars(currentRating);

  openModal("readingModal");
}

function saveReadingProgress() {
  const index = books.findIndex((b) => b.id === readingId);
  if (index !== -1) {
    // Mengambil nilai dari input number
    let newProgress = parseInt(document.getElementById("readPageInput").value);
    const notes = document.getElementById("readNotes").value;
    const maxPage = books[index].totalPages;

    // Validasi input
    if (isNaN(newProgress) || newProgress < 0) newProgress = 0;
    if (newProgress > maxPage) newProgress = maxPage;

    books[index].progress = newProgress;
    books[index].notes = notes;
    books[index].rating = currentRating;

    // Auto complete jika halaman = total halaman
    if (newProgress >= maxPage) {
      books[index].isComplete = true;
    } else {
      books[index].isComplete = false;
    }

    saveData();
    closeModal("readingModal");
  }
}

// --- RENDER FUNCTIONS ---
function renderAll() {
  renderBooks();
  renderStats();
}

function renderStats() {
  document.getElementById("statTotal").innerText = books.length;
  document.getElementById("statFinished").innerText = books.filter(
    (b) => b.isComplete
  ).length;

  const totalRead = books.reduce(
    (acc, curr) => acc + (parseInt(curr.progress) || 0),
    0
  );
  document.getElementById("statPages").innerText = totalRead;

  // Find fav genre
  const genres = {};
  books.forEach((b) => {
    genres[b.category] = (genres[b.category] || 0) + 1;
  });
  const topGenre = Object.keys(genres).reduce(
    (a, b) => (genres[a] > genres[b] ? a : b),
    "-"
  );
  document.getElementById("statFav").innerText = topGenre;
}

function renderBooks() {
  const incompleteList = document.getElementById("incompleteList");
  const completeList = document.getElementById("completeList");
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  const filterCat = document.getElementById("filterCategory").value;

  incompleteList.innerHTML = "";
  completeList.innerHTML = "";

  const filteredBooks = books.filter((b) => {
    const matchSearch =
      b.title.toLowerCase().includes(keyword) ||
      b.author.toLowerCase().includes(keyword);
    const matchCat = filterCat === "all" || b.category === filterCat;
    return matchSearch && matchCat;
  });

  if (filteredBooks.length === 0) {
    incompleteList.innerHTML = `<div class="empty-state">Buku tidak ditemukan 😔</div>`;
    return;
  }

  filteredBooks.forEach((book) => {
    const element = createBookElement(book);
    if (book.isComplete) {
      completeList.append(element);
    } else {
      incompleteList.append(element);
    }
  });
}

function createBookElement(book) {
  const percent = Math.round((book.progress / book.totalPages) * 100) || 0;
  const card = document.createElement("div");
  card.className = "book-card";

  // Genre Class
  const catClass = `cat-${book.category.toLowerCase().replace(" ", "-")}`;

  card.innerHTML = `
                <div class="card-header">
                    <span class="book-category ${catClass}">${
    book.category
  }</span>
                    <button class="btn-icon" onclick="toggleFavorite(${
                      book.id
                    })" style="border:none; background:transparent;">
                        <svg class="icon ${
                          book.isFavorite ? "fav-active" : ""
                        }" width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                </div>
                
                <div>
                    <h3 class="book-title">${book.title}</h3>
                    <p class="book-meta">${book.author} • ${book.year}</p>
                </div>

                <div style="margin-top:auto;">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percent}%"></div>
                    </div>
                    <div class="progress-text">${book.progress}/${
    book.totalPages
  } Hal (${percent}%)</div>
                </div>
                
                ${
                  book.rating > 0
                    ? `<div style="color: var(--accent-color);">${"★".repeat(
                        book.rating
                      )}</div>`
                    : ""
                }

                <div class="card-actions">
                    <button class="btn-icon btn-focus" onclick="openReadingMode(${
                      book.id
                    })">
                        📝 Catatan
                    </button>
                    <button class="btn-icon" onclick="toggleComplete(${
                      book.id
                    })" title="Pindah Rak">
                        ${book.isComplete ? "↩️" : "✅"}
                    </button>
                    <button class="btn-icon" onclick="editBookMode(${
                      book.id
                    })" title="Edit">
                        ✏️
                    </button>
                    <button class="btn-icon" onclick="requestDelete(${
                      book.id
                    })" title="Hapus" style="color: var(--danger);">
                        🗑️
                    </button>
                </div>
            `;
  return card;
}

// --- DOM EVENTS & HELPERS ---
document.getElementById("bookForm").addEventListener("submit", addOrUpdateBook);
document.getElementById("searchInput").addEventListener("input", renderBooks);
document
  .getElementById("filterCategory")
  .addEventListener("change", renderBooks);
document
  .getElementById("saveProgressBtn")
  .addEventListener("click", saveReadingProgress);

// Star Rating Logic
document.querySelectorAll("#readRating span").forEach((star) => {
  star.addEventListener("click", function () {
    currentRating = parseInt(this.dataset.val);
    renderStars(currentRating);
  });
});

function renderStars(rating) {
  document.querySelectorAll("#readRating span").forEach((star) => {
    const val = parseInt(star.dataset.val);
    star.classList.toggle("active", val <= rating);
  });
}

function openModal(id) {
  document.getElementById(id).classList.add("active");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("active");
  if (id === "bookModal") {
    document.getElementById("bookForm").reset();
    editingId = null;
    document.getElementById("modalTitle").innerText = "Tambah Buku Baru";
  }
}

function openAddModal() {
  editingId = null;
  document.getElementById("modalTitle").innerText = "Tambah Buku Baru";
  openModal("bookModal");
}

function editBookMode(id) {
  editingId = id;
  const book = books.find((b) => b.id === id);

  document.getElementById("inputTitle").value = book.title;
  document.getElementById("inputAuthor").value = book.author;
  document.getElementById("inputYear").value = book.year;
  document.getElementById("inputCategory").value = book.category;
  document.getElementById("inputTotalPages").value = book.totalPages;
  document.getElementById("inputIsComplete").checked = book.isComplete;

  document.getElementById("modalTitle").innerText = "Edit Buku";
  openModal("bookModal");
}

// Close modal on outside click
window.onclick = function (event) {
  if (event.target.classList.contains("modal-overlay")) {
    event.target.classList.remove("active");
  }
};
