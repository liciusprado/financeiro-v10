import { db } from "../db";
import {
  currencies,
  exchangeRates,
  userCurrencyPreferences,
  type InsertExchangeRate,
  type InsertUserCurrencyPreference,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Serviço de Multi-moeda
 */
export class CurrencyService {
  /**
   * Listar todas as moedas ativas
   */
  async listCurrencies() {
    return await db
      .select()
      .from(currencies)
      .where(eq(currencies.isActive, true))
      .orderBy(currencies.code);
  }

  /**
   * Obter moeda por código
   */
  async getCurrency(code: string) {
    const [currency] = await db
      .select()
      .from(currencies)
      .where(eq(currencies.code, code));

    return currency;
  }

  /**
   * Obter preferências do usuário
   */
  async getUserPreferences(userId: number) {
    const [prefs] = await db
      .select()
      .from(userCurrencyPreferences)
      .where(eq(userCurrencyPreferences.userId, userId));

    if (!prefs) {
      // Criar preferências padrão
      await db.insert(userCurrencyPreferences).values({
        userId,
        baseCurrency: "BRL",
        displayCurrencies: JSON.stringify(["BRL", "USD", "EUR"]),
        autoConvert: true,
      });

      const [newPrefs] = await db
        .select()
        .from(userCurrencyPreferences)
        .where(eq(userCurrencyPreferences.userId, userId));

      return {
        ...newPrefs,
        displayCurrencies: JSON.parse(newPrefs.displayCurrencies || "[]"),
      };
    }

    return {
      ...prefs,
      displayCurrencies: JSON.parse(prefs.displayCurrencies || "[]"),
    };
  }

  /**
   * Atualizar preferências do usuário
   */
  async updateUserPreferences(userId: number, data: {
    baseCurrency?: string;
    displayCurrencies?: string[];
    autoConvert?: boolean;
  }) {
    const updateData: any = {};
    if (data.baseCurrency) updateData.baseCurrency = data.baseCurrency;
    if (data.displayCurrencies) updateData.displayCurrencies = JSON.stringify(data.displayCurrencies);
    if (data.autoConvert !== undefined) updateData.autoConvert = data.autoConvert;

    const [existing] = await db
      .select()
      .from(userCurrencyPreferences)
      .where(eq(userCurrencyPreferences.userId, userId));

    if (existing) {
      await db
        .update(userCurrencyPreferences)
        .set(updateData)
        .where(eq(userCurrencyPreferences.userId, userId));
    } else {
      await db.insert(userCurrencyPreferences).values({
        userId,
        ...updateData,
      });
    }

    return { success: true };
  }

  /**
   * Obter taxa de câmbio mais recente
   */
  async getExchangeRate(from: string, to: string, date?: string) {
    if (from === to) return 1;

    const targetDate = date || new Date().toISOString().split("T")[0];

    // Tentar buscar taxa exata
    const [rate] = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, from),
          eq(exchangeRates.toCurrency, to),
          eq(exchangeRates.date, targetDate)
        )
      )
      .limit(1);

    if (rate) {
      return parseFloat(rate.rate.toString());
    }

    // Buscar taxa mais recente disponível
    const [latestRate] = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, from),
          eq(exchangeRates.toCurrency, to)
        )
      )
      .orderBy(desc(exchangeRates.date))
      .limit(1);

    if (latestRate) {
      return parseFloat(latestRate.rate.toString());
    }

    // Tentar taxa inversa
    const [inverseRate] = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, to),
          eq(exchangeRates.toCurrency, from)
        )
      )
      .orderBy(desc(exchangeRates.date))
      .limit(1);

    if (inverseRate) {
      return 1 / parseFloat(inverseRate.rate.toString());
    }

    // Se não encontrar, buscar na API
    return await this.fetchExchangeRateFromAPI(from, to);
  }

  /**
   * Buscar taxa de câmbio de API externa
   */
  private async fetchExchangeRateFromAPI(from: string, to: string): Promise<number> {
    try {
      // Usando Exchange Rate API (free tier)
      // URL: https://api.exchangerate-api.com/v4/latest/${from}
      
      // Simulação - em produção, fazer requisição real
      // const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
      // const data = await response.json();
      // const rate = data.rates[to];

      // Taxas hardcoded para desenvolvimento (atualizar periodicamente)
      const mockRates: Record<string, Record<string, number>> = {
        BRL: { USD: 0.20, EUR: 0.18, GBP: 0.16, JPY: 29.50 },
        USD: { BRL: 5.00, EUR: 0.92, GBP: 0.79, JPY: 147.50 },
        EUR: { BRL: 5.43, USD: 1.09, GBP: 0.86, JPY: 160.50 },
        GBP: { BRL: 6.32, USD: 1.27, EUR: 1.16, JPY: 187.00 },
        JPY: { BRL: 0.034, USD: 0.0068, EUR: 0.0062, GBP: 0.0053 },
      };

      const rate = mockRates[from]?.[to] || 1;

      // Salvar taxa no banco
      await this.saveExchangeRate(from, to, rate, "api");

      return rate;
    } catch (error) {
      console.error("Erro ao buscar taxa de câmbio:", error);
      return 1; // Fallback
    }
  }

  /**
   * Salvar taxa de câmbio
   */
  async saveExchangeRate(from: string, to: string, rate: number, source: string = "manual") {
    const today = new Date().toISOString().split("T")[0];

    // Verificar se já existe
    const [existing] = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, from),
          eq(exchangeRates.toCurrency, to),
          eq(exchangeRates.date, today)
        )
      );

    if (existing) {
      // Atualizar
      await db
        .update(exchangeRates)
        .set({ rate: rate.toString(), source })
        .where(eq(exchangeRates.id, existing.id));
    } else {
      // Inserir
      await db.insert(exchangeRates).values({
        fromCurrency: from,
        toCurrency: to,
        rate: rate.toString(),
        date: today,
        source,
      });
    }

    return { success: true };
  }

  /**
   * Converter valor entre moedas
   */
  async convertCurrency(amount: number, from: string, to: string, date?: string): Promise<number> {
    const rate = await this.getExchangeRate(from, to, date);
    return amount * rate;
  }

  /**
   * Converter valor para moeda base do usuário
   */
  async convertToBaseCurrency(userId: number, amount: number, from: string): Promise<number> {
    const prefs = await this.getUserPreferences(userId);
    const baseCurrency = prefs.baseCurrency;

    if (from === baseCurrency) {
      return amount;
    }

    return await this.convertCurrency(amount, from, baseCurrency);
  }

  /**
   * Obter histórico de taxas
   */
  async getExchangeRateHistory(from: string, to: string, days: number = 30) {
    const history = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, from),
          eq(exchangeRates.toCurrency, to)
        )
      )
      .orderBy(desc(exchangeRates.date))
      .limit(days);

    return history.map((h) => ({
      ...h,
      rate: parseFloat(h.rate.toString()),
    }));
  }

  /**
   * Atualizar todas as taxas de câmbio
   */
  async updateAllRates() {
    const allCurrencies = await this.listCurrencies();
    const codes = allCurrencies.map((c) => c.code);
    const updated: string[] = [];

    for (const from of codes) {
      for (const to of codes) {
        if (from !== to) {
          try {
            await this.fetchExchangeRateFromAPI(from, to);
            updated.push(`${from}-${to}`);
          } catch (error) {
            console.error(`Erro ao atualizar ${from}-${to}:`, error);
          }
        }
      }
    }

    return { success: true, updated: updated.length };
  }

  /**
   * Formatar valor em moeda
   */
  formatCurrency(amount: number, currencyCode: string, locale: string = "pt-BR"): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
      }).format(amount / 100);
    } catch (error) {
      // Fallback para moedas não suportadas
      const currency = this.getCurrency(currencyCode);
      const symbol = currency ? (currency as any).symbol : currencyCode;
      return `${symbol} ${(amount / 100).toFixed(2)}`;
    }
  }
}

export const currencyService = new CurrencyService();
