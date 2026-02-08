// Gestion du stockage local
import { supabase } from './supabase.js';

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
    this.user = null;
    this.initSupabase();
  }

  async initSupabase() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('[AppState] Erreur getUser:', error);
    }
    this.user = user;
    if (user) {
      await this.loadFromSupabase();
    }
  }

  async loadFromSupabase() {
    if (!this.user) {
      return;
    }
    try {
      const { data: accounts, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', this.user.id);
      if (accError) console.error('[AppState] Erreur chargement accounts:', accError);
      this.accounts = accounts || [];

      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', this.user.id)
        .order('created_at', { ascending: false });
      if (transError) console.error('[AppState] Erreur chargement transactions:', transError);
      this.transactions = transactions || [];

      this.notify();
    } catch (error) {
      console.error('Erreur chargement Supabase:', error);
    }
  }

  // Pattern Observer pour mettre à jour l'UI
  subscribe(callback) {
    this.observers.push(callback);
  }

  notify() {
    this.observers.forEach(callback => callback());
  }

  // Gestion des comptes
  async addAccount(name, initialBalance = 0) {
    const account = {
      id: Date.now().toString(),
      name,
      balance: parseFloat(initialBalance),
      created_at: new Date().toISOString(),
      user_id: this.user?.id
    };
    this.accounts.push(account);
    Storage.set('accounts', this.accounts);
    if (this.user) {
      try {
        const { error } = await supabase.from('accounts').upsert(account);
        if (error) throw error;
      } catch (error) {
        console.error('[AppState] Erreur ajout compte Supabase:', error);
      }
    }
    this.notify();
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
      Storage.set('accounts', this.accounts);
    }
  }

  async deleteAccount(id) {
    this.accounts = this.accounts.filter(acc => acc.id !== id);
    Storage.set('accounts', this.accounts);
    
    // Supprimer de Supabase
    if (this.user) {
      try {
        const { error } = await supabase.from('accounts').delete().eq('id', id).eq('user_id', this.user.id);
        if (error) throw error;
      } catch (error) {
        console.error('[AppState] Erreur suppression compte Supabase:', error);
      }
    }
    
    this.notify();
  }

  // Gestion des transactions
  async addTransaction(type, amount, description, accountId, date, category = null) {
    const account = this.getAccount(accountId);
    if (!account) return null;

    const transaction = {
      id: Date.now().toString(),
      type, // 'income' ou 'expense'
      amount: parseFloat(amount),
      description,
      account_id: accountId,
      account_name: account.name,
      category,
      date: date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      user_id: this.user?.id
    };

    // Calculer le nouveau solde
    const balanceChange = type === 'income' ? amount : -amount;
    transaction.balance_after = account.balance + parseFloat(balanceChange);

    // Mettre à jour le solde du compte
    this.updateAccountBalance(accountId, balanceChange);

    this.transactions.unshift(transaction);
    this.save();
    if (this.user) {
      try {
        await supabase.from('transactions').insert(transaction);
      } catch (error) {
        console.error('Erreur ajout transaction Supabase:', error);
      }
    }
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

  async deleteTransaction(id) {
    const transaction = this.transactions.find(t => t.id === id);
    if (!transaction) {
      console.error('[AppState] Transaction non trouvée:', id);
      return false;
    }

    // Annuler l'effet de la transaction sur le solde
    const balanceChange = transaction.type === 'income' 
      ? -transaction.amount 
      : transaction.amount;
    this.updateAccountBalance(transaction.accountId || transaction.account_id, balanceChange);

    this.transactions = this.transactions.filter(t => t.id !== id);
    Storage.set('transactions', this.transactions);
    
    // Supprimer de Supabase
    if (this.user) {
      try {
        const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', this.user.id);
        if (error) throw error;
      } catch (error) {
        console.error('[AppState] Erreur suppression transaction Supabase:', error);
      }
    }
    
    this.notify();
    return true;
  }

  // Calcul du total
  getTotalBalance() {
    return this.accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }

  // Sauvegarde
  async save() {
    Storage.set('accounts', this.accounts);
    Storage.set('transactions', this.transactions);
    
    if (this.user) {
      try {
        // Utiliser upsert au lieu de delete+insert
        if (this.accounts.length > 0) {
          const accountsToInsert = this.accounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            balance: parseFloat(acc.balance),
            created_at: acc.created_at || acc.createdAt || new Date().toISOString(),
            user_id: this.user.id
          }));
          const { error: insAccError } = await supabase.from('accounts').upsert(accountsToInsert, { onConflict: 'id' });
          if (insAccError) {
            console.error('[AppState] Erreur upsert accounts:', insAccError);
          }
        }
        
        if (this.transactions.length > 0) {
          const transactionsToInsert = this.transactions.map(trans => ({
            id: trans.id,
            user_id: this.user.id,
            type: trans.type,
            amount: parseFloat(trans.amount),
            description: trans.description,
            account_id: trans.account_id || trans.accountId,
            account_name: trans.account_name || trans.accountName,
            category: trans.category,
            date: trans.date,
            balance_after: parseFloat(trans.balance_after || trans.balanceAfter || 0),
            created_at: trans.created_at || trans.createdAt || new Date().toISOString()
          }));
          const { error: insTransError } = await supabase.from('transactions').upsert(transactionsToInsert, { onConflict: 'id' });
          if (insTransError) {
            console.error('[AppState] Erreur upsert transactions:', insTransError);
          }
        }
      } catch (error) {
        console.error('[AppState] Erreur sauvegarde Supabase:', error);
      }
    }
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

  async importData(data) {
    if (data.accounts && data.transactions) {
      // Normaliser les données importées pour utiliser snake_case
      this.accounts = data.accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        balance: parseFloat(acc.balance),
        created_at: acc.created_at || acc.createdAt || new Date().toISOString(),
        user_id: this.user?.id
      }));
      
      this.transactions = data.transactions.map(trans => ({
        id: trans.id,
        type: trans.type,
        amount: parseFloat(trans.amount),
        description: trans.description,
        account_id: trans.account_id || trans.accountId,
        account_name: trans.account_name || trans.accountName,
        category: trans.category,
        date: trans.date,
        balance_after: parseFloat(trans.balance_after || trans.balanceAfter || 0),
        created_at: trans.created_at || trans.createdAt || new Date().toISOString(),
        user_id: this.user?.id
      }));
      
      await this.save();
      return true;
    }
    console.error('[AppState] Données d\'import invalides');
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
