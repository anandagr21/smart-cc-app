import { apiClient } from '../../../services/api/client';
import { PaginatedResponse, SingleResponse } from '../../cards/types/api';
import { TransactionCreate, TransactionResponse, TransactionUpdate } from '../types/transaction.types';

class TransactionService {
  /**
   * Fetch all transactions for the current user
   */
  async fetchUserTransactions(skip: number = 0, limit: number = 50, cardId?: string): Promise<PaginatedResponse<TransactionResponse>> {
    const url = cardId ? `/transactions/card/${cardId}` : '/transactions';
    const { data } = await apiClient.get<PaginatedResponse<TransactionResponse>>(url, {
      params: { skip, limit },
    });
    return data;
  }

  /**
   * Create a new manual transaction
   */
  async createTransaction(payload: TransactionCreate): Promise<TransactionResponse> {
    const { data } = await apiClient.post<SingleResponse<TransactionResponse>>('/transactions', payload);
    return data.data;
  }

  /**
   * Partially update an existing transaction
   */
  async updateTransaction(transactionId: string, payload: TransactionUpdate): Promise<TransactionResponse> {
    const { data } = await apiClient.patch<SingleResponse<TransactionResponse>>(`/transactions/${transactionId}`, payload);
    return data.data;
  }

  /**
   * Delete a transaction
   */
  async deleteTransaction(transactionId: string): Promise<void> {
    await apiClient.delete(`/transactions/${transactionId}`);
  }
}

export const transactionService = new TransactionService();
