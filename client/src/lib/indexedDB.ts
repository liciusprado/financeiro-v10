/**
 * IndexedDB Manager para armazenamento offline
 */

const DB_NAME = 'financeiro-pwa';
const DB_VERSION = 1;

interface PendingItem {
  id?: number;
  type: 'expense' | 'income' | 'goal' | 'project' | 'alert';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para itens pendentes de sincronização
        if (!db.objectStoreNames.contains('pending')) {
          const pendingStore = db.createObjectStore('pending', {
            keyPath: 'id',
            autoIncrement: true,
          });
          pendingStore.createIndex('type', 'type', { unique: false });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para cache de dados
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para transações offline
        if (!db.objectStoreNames.contains('transactions')) {
          db.createObjectStore('transactions', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      };
    });
  }

  async addPending(item: Omit<PendingItem, 'id' | 'timestamp'>) {
    const db = await this.getDB();
    const transaction = db.transaction(['pending'], 'readwrite');
    const store = transaction.objectStore('pending');

    const pendingItem: Omit<PendingItem, 'id'> = {
      ...item,
      timestamp: Date.now(),
    };

    return new Promise<number>((resolve, reject) => {
      const request = store.add(pendingItem);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getPending(): Promise<PendingItem[]> {
    const db = await this.getDB();
    const transaction = db.transaction(['pending'], 'readonly');
    const store = transaction.objectStore('pending');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePending(id: number) {
    const db = await this.getDB();
    const transaction = db.transaction(['pending'], 'readwrite');
    const store = transaction.objectStore('pending');

    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async setCache(key: string, value: any, ttl: number = 3600000) {
    const db = await this.getDB();
    const transaction = db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    const cacheItem = {
      key,
      value,
      timestamp: Date.now(),
      ttl,
    };

    return new Promise<void>((resolve, reject) => {
      const request = store.put(cacheItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache(key: string): Promise<any | null> {
    const db = await this.getDB();
    const transaction = db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const item = request.result;
        if (!item) {
          resolve(null);
          return;
        }

        // Verificar TTL
        const now = Date.now();
        if (now - item.timestamp > item.ttl) {
          // Expirado
          this.removeCache(key);
          resolve(null);
          return;
        }

        resolve(item.value);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeCache(key: string) {
    const db = await this.getDB();
    const transaction = db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    return new Promise<void>((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache() {
    const db = await this.getDB();
    const transaction = db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');

    return new Promise<void>((resolve, reject) => {
      const request = store.openCursor();
      const now = Date.now();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const item = cursor.value;
          if (now - item.timestamp > item.ttl) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveTransaction(transaction: any) {
    const db = await this.getDB();
    const tx = db.transaction(['transactions'], 'readwrite');
    const store = tx.objectStore('transactions');

    return new Promise<number>((resolve, reject) => {
      const request = store.add(transaction);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getTransactions(): Promise<any[]> {
    const db = await this.getDB();
    const transaction = db.transaction(['transactions'], 'readonly');
    const store = transaction.objectStore('transactions');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }
}

export const indexedDBManager = new IndexedDBManager();

// Inicializar automaticamente
indexedDBManager.init().catch(console.error);

// Limpar cache expirado a cada 1 hora
setInterval(() => {
  indexedDBManager.clearExpiredCache().catch(console.error);
}, 60 * 60 * 1000);
