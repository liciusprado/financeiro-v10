import axios from 'axios';

const BELVO_API_URL = process.env.BELVO_ENVIRONMENT === 'production'
  ? 'https://api.belvo.com'
  : 'https://sandbox.belvo.com';

const BELVO_SECRET_ID = process.env.BELVO_SECRET_ID || '';
const BELVO_SECRET_PASSWORD = process.env.BELVO_SECRET_PASSWORD || '';

/**
 * Serviço de Open Banking com Belvo
 */
export class BelvoService {
  private apiClient;

  constructor() {
    this.apiClient = axios.create({
      baseURL: BELVO_API_URL,
      auth: {
        username: BELVO_SECRET_ID,
        password: BELVO_SECRET_PASSWORD,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Listar instituições financeiras disponíveis
   */
  async listInstitutions(country: string = 'BR') {
    try {
      const response = await this.apiClient.get('/api/institutions/', {
        params: { country },
      });
      return response.data.results || [];
    } catch (error) {
      console.error('Erro ao listar instituições:', error);
      return [];
    }
  }

  /**
   * Criar link de conta bancária
   */
  async createLink(institution: string, username: string, password: string, userId: number) {
    try {
      const response = await this.apiClient.post('/api/links/', {
        institution,
        username,
        password,
        external_id: `user_${userId}`,
      });
      return { success: true, link: response.data };
    } catch (error: any) {
      console.error('Erro ao criar link:', error);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  /**
   * Listar links do usuário
   */
  async listLinks(userId: number) {
    try {
      const response = await this.apiClient.get('/api/links/', {
        params: { external_id: `user_${userId}` },
      });
      return response.data.results || [];
    } catch (error) {
      console.error('Erro ao listar links:', error);
      return [];
    }
  }

  /**
   * Deletar link
   */
  async deleteLink(linkId: string) {
    try {
      await this.apiClient.delete(`/api/links/${linkId}/`);
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar link:', error);
      return { success: false };
    }
  }

  /**
   * Buscar contas bancárias
   */
  async getAccounts(linkId: string) {
    try {
      const response = await this.apiClient.get('/api/accounts/', {
        params: { link: linkId },
      });
      return response.data.results || [];
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      return [];
    }
  }

  /**
   * Buscar transações
   */
  async getTransactions(linkId: string, dateFrom?: string, dateTo?: string) {
    try {
      const response = await this.apiClient.get('/api/transactions/', {
        params: {
          link: linkId,
          date_from: dateFrom,
          date_to: dateTo,
        },
      });
      return response.data.results || [];
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      return [];
    }
  }

  /**
   * Categorizar transação com IA
   */
  categorizeTransaction(description: string, amount: number): {
    category: string;
    confidence: number;
  } {
    // Regras simples de categorização (pode ser expandido com ML)
    const desc = description.toLowerCase();

    const rules = [
      { keywords: ['mercado', 'supermercado', 'extra', 'carrefour', 'pão'], category: 'Mercado', confidence: 0.9 },
      { keywords: ['uber', 'taxi', '99', 'cabify', 'transporte'], category: 'Transporte', confidence: 0.9 },
      { keywords: ['ifood', 'rappi', 'restaurante', 'lanche'], category: 'Alimentação', confidence: 0.85 },
      { keywords: ['netflix', 'spotify', 'prime', 'youtube'], category: 'Entretenimento', confidence: 0.95 },
      { keywords: ['farmácia', 'drogaria', 'saúde', 'médico'], category: 'Saúde', confidence: 0.9 },
      { keywords: ['luz', 'energia', 'água', 'internet', 'telefone'], category: 'Contas', confidence: 0.95 },
      { keywords: ['aluguel', 'condomínio'], category: 'Moradia', confidence: 0.95 },
      { keywords: ['salário', 'pagamento'], category: 'Renda', confidence: 0.9 },
    ];

    for (const rule of rules) {
      if (rule.keywords.some(keyword => desc.includes(keyword))) {
        return { category: rule.category, confidence: rule.confidence };
      }
    }

    return { category: 'Outros', confidence: 0.5 };
  }

  /**
   * Importar transações e categorizar
   */
  async importAndCategorize(linkId: string, dateFrom: string, dateTo: string) {
    const transactions = await this.getTransactions(linkId, dateFrom, dateTo);

    return transactions.map((tx: any) => {
      const categorization = this.categorizeTransaction(tx.description, tx.amount);
      
      return {
        id: tx.id,
        description: tx.description,
        amount: Math.abs(tx.amount) * 100, // Converter para centavos
        type: tx.type === 'INFLOW' ? 'income' : 'expense',
        date: tx.value_date || tx.accounting_date,
        category: categorization.category,
        confidence: categorization.confidence,
        originalData: tx,
      };
    });
  }

  /**
   * Sincronizar transações
   */
  async syncTransactions(linkId: string, userId: number) {
    try {
      // Buscar últimos 30 dias
      const dateTo = new Date().toISOString().split('T')[0];
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30);
      const dateFromStr = dateFrom.toISOString().split('T')[0];

      const categorizedTx = await this.importAndCategorize(linkId, dateFromStr, dateTo);

      return {
        success: true,
        transactions: categorizedTx,
        count: categorizedTx.length,
      };
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      return { success: false, transactions: [], count: 0 };
    }
  }
}

export const belvoService = new BelvoService();
