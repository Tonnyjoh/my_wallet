import AppState from './state.js';
import { formatCurrency, formatDate } from './utils.js';
import './supabase.js'; // Initialiser Supabase
import { supabase } from './supabase.js';

const state = new AppState();

// Éléments DOM
const elements = {
  // Tableau de bord
  totalAmount: document.getElementById('totalAmount'),
  accountsGrid: document.getElementById('accountsGrid'),
  
  // Modals
  accountModal: document.getElementById('accountModal'),
  editModal: document.getElementById('editModal'),
  
  // Boutons
  addAccountBtn: document.getElementById('addAccountBtn'),
  cancelAccountBtn: document.getElementById('cancelAccountBtn'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importBtn: document.getElementById('importBtn'),
  importInput: document.getElementById('importInput'),
  clearFiltersBtn: document.getElementById('clearFilters'),
  
  // Formulaires
  accountForm: document.getElementById('accountForm'),
  expenseForm: document.getElementById('expenseForm'),
  incomeForm: document.getElementById('incomeForm'),
  editForm: document.getElementById('editForm'),
  
  // Champs de formulaire
  accountName: document.getElementById('accountName'),
  accountBalance: document.getElementById('accountBalance'),
  
  // Listes déroulantes
  expenseAccount: document.getElementById('expenseAccount'),
  incomeAccount: document.getElementById('incomeAccount'),
  editAccount: document.getElementById('editAccount'),
  filterAccount: document.getElementById('filterAccount'),
  
  // Liste des transactions
  transactionsList: document.getElementById('transactionsList'),
  
  // Filtres
  filterType: document.getElementById('filterType'),
  filterDateStart: document.getElementById('filterDateStart'),
  filterDateEnd: document.getElementById('filterDateEnd'),
  
  // Onglets
  tabs: document.querySelectorAll('.tab'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  
  // Authentification
  authBtn: document.getElementById('authBtn'),
  authUserEmail: document.getElementById('authUserEmail'),
  authModal: document.getElementById('authModal'),
  authForm: document.getElementById('authForm'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authMessage: document.getElementById('authMessage'),
  cancelAuthBtn: document.getElementById('cancelAuthBtn'),
  loginBtn: document.getElementById('loginBtn'),
  signupBtn: document.getElementById('signupBtn')
};

// Initialisation des dates par défaut
const today = new Date().toISOString().split('T')[0];
document.getElementById('expenseDate').value = today;
document.getElementById('incomeDate').value = today;

// === GESTION DES ONGLETS ===
elements.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    
    // Mettre à jour les classes actives
    elements.tabs.forEach(t => {
      t.classList.remove('active', 'bg-gray-100', 'text-gray-900');
      t.classList.add('text-gray-500');
    });
    elements.tabPanes.forEach(pane => pane.classList.remove('active'));
    
    tab.classList.add('active', 'bg-gray-100', 'text-gray-900');
    tab.classList.remove('text-gray-500');
    document.getElementById(targetTab).classList.add('active');
    
    // Rafraîchir les icônes Lucide
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  });
});

// === AUTHENTIFICATION ===
function showAuthMessage(message, type = 'info') {
  elements.authMessage.textContent = message;
  elements.authMessage.className = `text-sm ${
    type === 'success' ? 'text-green-600' : 
    type === 'error' ? 'text-red-600' : 
    'text-gray-600'
  }`;
  elements.authMessage.classList.remove('hidden');
}

function hideAuthMessage() {
  elements.authMessage.classList.add('hidden');
}

elements.authBtn.addEventListener('click', async () => {
  if (state.user) {
    // Déconnexion
    await supabase.auth.signOut();
    updateAuthUI();
  } else {
    // Ouvrir modal de connexion
    elements.authModal.classList.remove('hidden');
    elements.authModal.classList.add('flex');
    elements.authForm.reset();
    hideAuthMessage();
  }
});

elements.cancelAuthBtn.addEventListener('click', () => {
  elements.authModal.classList.add('hidden');
  elements.authModal.classList.remove('flex');
  elements.authForm.reset();
  hideAuthMessage();
});

// Connexion
elements.authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    showAuthMessage('Connexion réussie !', 'success');
    setTimeout(() => {
      elements.authModal.classList.add('hidden');
      elements.authModal.classList.remove('flex');
      updateAuthUI();
    }, 1000);
  } catch (error) {
    console.error('Erreur connexion:', error);
    showAuthMessage('Erreur: ' + error.message, 'error');
  }
});

// Inscription
elements.signupBtn.addEventListener('click', async () => {
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  
  if (!email || !password) {
    showAuthMessage('Veuillez remplir tous les champs', 'error');
    return;
  }
  
  if (password.length < 6) {
    showAuthMessage('Le mot de passe doit contenir au moins 6 caractères', 'error');
    return;
  }
  
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;
    showAuthMessage('Inscription réussie ! Connectez-vous maintenant.', 'success');
  } catch (error) {
    console.error('Erreur inscription:', error);
    showAuthMessage('Erreur: ' + error.message, 'error');
  }
});

function updateAuthUI() {
  const emailSpan = elements.authUserEmail;
  
  if (emailSpan) {
    if (state.user) {
      // Utilisateur connecté - afficher l'email tronqué
      const email = state.user.email || '';
      const emailPrefix = email.split('@')[0];
      const truncated = emailPrefix.length > 8 ? emailPrefix.substring(0, 8) + '...' : emailPrefix;
      emailSpan.textContent = '@' + truncated;
      emailSpan.classList.remove('hidden');
      elements.authBtn.title = 'Déconnexion (' + email + ')';
      
      // Masquer l'icône si elle existe
      const icon = elements.authBtn?.querySelector('i');
      if (icon) {
        icon.style.display = 'none';
      }
      const svg = elements.authBtn?.querySelector('svg');
      if (svg) {
        svg.style.display = 'none';
      }
    } else {
      // Utilisateur déconnecté - afficher icône user
      emailSpan.textContent = '';
      emailSpan.classList.add('hidden');
      elements.authBtn.title = 'Connexion';
      
      // Réafficher l'icône
      const icon = elements.authBtn?.querySelector('i');
      if (icon) {
        icon.style.display = '';
        icon.setAttribute('data-lucide', 'user');
      }
      const svg = elements.authBtn?.querySelector('svg');
      if (svg) {
        svg.style.display = '';
      }
      lucide.createIcons();
    }
  } else {
    console.error('[UI] emailSpan non trouvé');
  }
}

// Écouter les changements d'auth
supabase.auth.onAuthStateChange((event, session) => {
  state.user = session?.user || null;
  if (state.user) {
    state.loadFromSupabase();
  }
  updateAuthUI();
});

// === GESTION DES COMPTES ===
elements.addAccountBtn.addEventListener('click', () => {
  elements.accountModal.classList.remove('hidden');
  elements.accountModal.classList.add('flex');
});

elements.cancelAccountBtn.addEventListener('click', () => {
  elements.accountModal.classList.add('hidden');
  elements.accountModal.classList.remove('flex');
  elements.accountForm.reset();
});

elements.accountForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const name = elements.accountName.value.trim();
  const balance = parseFloat(elements.accountBalance.value) || 0;
  
  state.addAccount(name, balance);
  
  elements.accountModal.classList.add('hidden');
  elements.accountModal.classList.remove('flex');
  elements.accountForm.reset();
  
  showNotification('Compte créé avec succès', 'success');
});

function renderAccounts() {
  const accounts = state.getAccounts();
  
  // Mise à jour des listes déroulantes
  const accountOptions = accounts.map(acc => 
    `<option value="${acc.id}">${acc.name}</option>`
  ).join('');
  
  elements.expenseAccount.innerHTML = accountOptions || '<option value="">Aucun compte</option>';
  elements.incomeAccount.innerHTML = accountOptions || '<option value="">Aucun compte</option>';
  elements.editAccount.innerHTML = accountOptions || '<option value="">Aucun compte</option>';
  elements.filterAccount.innerHTML = '<option value="">Tous les comptes</option>' + accountOptions;
  
  // Mise à jour de la grille des comptes
  if (accounts.length === 0) {
    elements.accountsGrid.innerHTML = `
      <div class="bg-white rounded-lg p-8 text-center text-gray-500">
        <i data-lucide="wallet" class="w-12 h-12 mx-auto mb-3 text-gray-400"></i>
        <p class="text-sm">Aucun compte pour le moment.<br>Créez votre premier compte !</p>
      </div>
    `;
  } else {
    elements.accountsGrid.innerHTML = accounts.map(acc => `
      <div class="bg-white rounded-lg p-4 shadow-sm border-l-4 border-gray-700 relative">
        <button onclick="deleteAccount('${acc.id}')" class="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Supprimer">
          <i data-lucide="trash-2" class="w-4 h-4 text-gray-500"></i>
        </button>
        <h4 class="text-sm text-gray-600 mb-1">${acc.name}</h4>
        <p class="text-2xl font-bold text-gray-900">${formatCurrency(acc.balance)}</p>
      </div>
    `).join('');
  }
  
  // Mise à jour du total
  elements.totalAmount.textContent = formatCurrency(state.getTotalBalance());
  
  // Rafraîchir les icônes Lucide
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

window.deleteAccount = (id) => {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce compte ?')) {
    state.deleteAccount(id);
    showNotification('Compte supprimé', 'success');
  }
};

// === GESTION DES DÉPENSES ===
elements.expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const date = document.getElementById('expenseDate').value;
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const description = document.getElementById('expenseDescription').value.trim();
  const accountId = elements.expenseAccount.value;
  const category = document.getElementById('expenseCategory').value.trim() || null;
  
  if (!accountId) {
    showNotification('Veuillez sélectionner un compte', 'error');
    return;
  }
  
  state.addTransaction('expense', amount, description, accountId, date, category);
  
  elements.expenseForm.reset();
  document.getElementById('expenseDate').value = today;
  
  showNotification('Dépense enregistrée', 'success');
  
  // Retourner à l'onglet historique
  document.querySelector('[data-tab="transactions"]').click();
});

// === GESTION DES REVENUS ===
elements.incomeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const date = document.getElementById('incomeDate').value;
  const amount = parseFloat(document.getElementById('incomeAmount').value);
  const description = document.getElementById('incomeDescription').value.trim();
  const accountId = elements.incomeAccount.value;
  
  if (!accountId) {
    showNotification('Veuillez sélectionner un compte', 'error');
    return;
  }
  
  state.addTransaction('income', amount, description, accountId, date);
  
  elements.incomeForm.reset();
  document.getElementById('incomeDate').value = today;
  
  showNotification('Revenu enregistré', 'success');
  
  // Retourner à l'onglet historique
  document.querySelector('[data-tab="transactions"]').click();
});

// === GESTION DES TRANSACTIONS ===
function renderTransactions() {
  const filters = {
    accountId: elements.filterAccount.value,
    type: elements.filterType.value,
    dateStart: elements.filterDateStart.value,
    dateEnd: elements.filterDateEnd.value
  };
  
  const transactions = state.getTransactions(filters);
  
  if (transactions.length === 0) {
    elements.transactionsList.innerHTML = `
      <div class="bg-white rounded-lg p-8 text-center text-gray-500">
        <i data-lucide="file-text" class="w-12 h-12 mx-auto mb-3 text-gray-400"></i>
        <p class="text-sm">Aucune transaction pour le moment.</p>
      </div>
    `;
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    return;
  }
  
  elements.transactionsList.innerHTML = transactions.map(t => {
    const accountName = t.account_name || t.accountName || 'Compte inconnu';
    const balanceAfter = t.balance_after || t.balanceAfter || 0;
    return `
    <div class="bg-white rounded-lg p-4 shadow-sm">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <div class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100' : 'bg-red-100'}">
            <i data-lucide="${t.type === 'income' ? 'arrow-down-left' : 'arrow-up-right'}" class="w-5 h-5 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-gray-900 text-sm truncate">${t.description}</h4>
            <p class="text-xs text-gray-500 mt-0.5">
              ${formatDate(t.date)} • ${accountName}${t.category ? ` • ${t.category}` : ''}
            </p>
            <p class="text-xs text-gray-400 mt-1">Solde: ${formatCurrency(balanceAfter)}</p>
          </div>
        </div>
        <div class="flex flex-col items-end gap-2">
          <p class="text-lg font-bold whitespace-nowrap ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}">
            ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
          </p>
          <div class="flex gap-1">
            <button onclick="editTransaction('${t.id}')" class="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Modifier">
              <i data-lucide="edit" class="w-4 h-4 text-gray-500"></i>
            </button>
            <button onclick="deleteTransaction('${t.id}')" class="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Supprimer">
              <i data-lucide="trash-2" class="w-4 h-4 text-gray-500"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `}).join('');
  
  // Rafraîchir les icônes Lucide
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

window.editTransaction = (id) => {
  const transactions = state.getTransactions();
  const transaction = transactions.find(t => t.id === id);
  
  if (!transaction) return;
  
  document.getElementById('editTransactionId').value = id;
  document.getElementById('editDate').value = transaction.date;
  document.getElementById('editAmount').value = transaction.amount;
  document.getElementById('editDescription').value = transaction.description;
  elements.editAccount.value = transaction.accountId;
  
  const categoryGroup = document.getElementById('editCategoryGroup');
  const categoryInput = document.getElementById('editCategory');
  
  if (transaction.type === 'expense') {
    categoryGroup.style.display = 'block';
    categoryInput.value = transaction.category || '';
  } else {
    categoryGroup.style.display = 'none';
  }
  
  elements.editModal.classList.remove('hidden');
  elements.editModal.classList.add('flex');
};

window.deleteTransaction = async (id) => {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
    await state.deleteTransaction(id);
    showNotification('Transaction supprimée', 'success');
  }
};

elements.cancelEditBtn.addEventListener('click', () => {
  elements.editModal.classList.add('hidden');
  elements.editModal.classList.remove('flex');
  elements.editForm.reset();
});

elements.editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const id = document.getElementById('editTransactionId').value;
  const transaction = state.getTransactions().find(t => t.id === id);
  
  const updates = {
    date: document.getElementById('editDate').value,
    amount: parseFloat(document.getElementById('editAmount').value),
    description: document.getElementById('editDescription').value.trim(),
    accountId: elements.editAccount.value,
    type: transaction.type,
    category: transaction.type === 'expense' ? document.getElementById('editCategory').value.trim() || null : null
  };
  
  state.updateTransaction(id, updates);
  
  elements.editModal.classList.add('hidden');
  elements.editModal.classList.remove('flex');
  elements.editForm.reset();
  
  showNotification('Transaction modifiée', 'success');
});

// === FILTRES ===
elements.filterAccount.addEventListener('change', renderTransactions);
elements.filterType.addEventListener('change', renderTransactions);
elements.filterDateStart.addEventListener('change', renderTransactions);
elements.filterDateEnd.addEventListener('change', renderTransactions);

elements.clearFiltersBtn.addEventListener('click', () => {
  elements.filterAccount.value = '';
  elements.filterType.value = '';
  elements.filterDateStart.value = '';
  elements.filterDateEnd.value = '';
  renderTransactions();
});

// === EXPORT/IMPORT ===
elements.exportBtn.addEventListener('click', () => {
  const data = state.exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `my-wallet-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('Données exportées avec succès', 'success');
});

elements.importBtn.addEventListener('click', () => {
  elements.importInput.click();
});

elements.importInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      
      if (confirm('Attention: Cette action va écraser toutes vos données actuelles. Continuer ?')) {
        state.importData(data);
        showNotification('Données importées avec succès', 'success');
      }
    } catch (error) {
      showNotification('Erreur lors de l\'import du fichier', 'error');
    }
    
    elements.importInput.value = '';
  };
  reader.readAsText(file);
});

// === NOTIFICATIONS ===
function showNotification(message, type = 'info') {
  const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-gray-800';
  
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-[9999] animate-slide-in-right font-medium text-sm max-w-sm`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('animate-slide-out-right');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// === INITIALISATION ===
function init() {
  renderAccounts();
  renderTransactions();
}

// Observer pour mettre à jour l'UI automatiquement
state.subscribe(() => {
  renderAccounts();
  renderTransactions();
});

// Démarrage de l'application
init();
