// Gestion du stockage local
class Storage {
  static get(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  static set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  static clear() {
    localStorage.clear();
  }
}

// Gestion de l'état de l'application
class AppState {
  constructor() {
    this.accounts = Storage.get('accounts', []);
    this.transactions = Storage.get('transactions', []);
    this.observers = [];
  }

  // Pattern Observer pour mettre à jour l'UI
  subscribe(callback) {
    this.observers.push(callback);
  }

  notify() {
    this.observers.forEach(callback => callback());
  }

  // Gestion des comptes
  addAccount(name, initialBalance = 0) {
    const account = {
      id: Date.now().toString(),
      name,
      balance: parseFloat(initialBalance),
      createdAt: new Date().toISOString()
    };
    this.accounts.push(account);
    this.save();
    return account;
  }

  getAccounts() {
    return this.accounts;
  }

  getAccount(id) {
    return this.accounts.find(acc => acc.id === id);
  }

  updateAccountBalance(accountId, amount) {
    const account = this.getAccount(accountId);
    if (account) {
      account.balance += parseFloat(amount);
      this.save();
    }
  }

  deleteAccount(id) {
    this.accounts = this.accounts.filter(acc => acc.id !== id);
    this.save();
  }

  // Gestion des transactions
  addTransaction(type, amount, description, accountId, date, category = null) {
    const account = this.getAccount(accountId);
    if (!account) return null;

    const transaction = {
      id: Date.now().toString(),
      type, // 'income' ou 'expense'
      amount: parseFloat(amount),
      description,
      accountId,
      accountName: account.name,
      category,
      date: date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    // Calculer le nouveau solde
    const balanceChange = type === 'income' ? amount : -amount;
    transaction.balanceAfter = account.balance + parseFloat(balanceChange);

    // Mettre à jour le solde du compte
    this.updateAccountBalance(accountId, balanceChange);

    this.transactions.unshift(transaction);
    this.save();
    return transaction;
  }

  getTransactions(filters = {}) {
    let filtered = [...this.transactions];

    if (filters.accountId) {
      filtered = filtered.filter(t => t.accountId === filters.accountId);
    }

    if (filters.type) {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    if (filters.dateStart) {
      filtered = filtered.filter(t => t.date >= filters.dateStart);
    }

    if (filters.dateEnd) {
      filtered = filtered.filter(t => t.date <= filters.dateEnd);
    }

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  updateTransaction(id, updates) {
    const transactionIndex = this.transactions.findIndex(t => t.id === id);
    if (transactionIndex === -1) return false;

    const oldTransaction = this.transactions[transactionIndex];
    const oldAccount = this.getAccount(oldTransaction.accountId);

    // Annuler l'ancienne transaction
    const oldBalanceChange = oldTransaction.type === 'income' 
      ? -oldTransaction.amount 
      : oldTransaction.amount;
    this.updateAccountBalance(oldTransaction.accountId, oldBalanceChange);

    // Appliquer la nouvelle transaction
    const newAccount = this.getAccount(updates.accountId);
    const newBalanceChange = updates.type === 'income' 
      ? updates.amount 
      : -updates.amount;
    this.updateAccountBalance(updates.accountId, newBalanceChange);

    // Mettre à jour la transaction
    this.transactions[transactionIndex] = {
      ...oldTransaction,
      ...updates,
      accountName: newAccount.name,
      balanceAfter: newAccount.balance
    };

    this.save();
    return true;
  }

  deleteTransaction(id) {
    const transaction = this.transactions.find(t => t.id === id);
    if (!transaction) return false;

    // Annuler l'effet de la transaction sur le solde
    const balanceChange = transaction.type === 'income' 
      ? -transaction.amount 
      : transaction.amount;
    this.updateAccountBalance(transaction.accountId, balanceChange);

    this.transactions = this.transactions.filter(t => t.id !== id);
    this.save();
    return true;
  }

  // Calcul du total
  getTotalBalance() {
    return this.accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }

  // Sauvegarde
  save() {
    Storage.set('accounts', this.accounts);
    Storage.set('transactions', this.transactions);
    this.notify();
  }

  // Export/Import
  exportData() {
    return {
      accounts: this.accounts,
      transactions: this.transactions,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }

  importData(data) {
    if (data.accounts && data.transactions) {
      this.accounts = data.accounts;
      this.transactions = data.transactions;
      this.save();
      return true;
    }
    return false;
  }

  clearAllData() {
    this.accounts = [];
    this.transactions = [];
    Storage.clear();
    this.save();
  }
}

export default AppState;
