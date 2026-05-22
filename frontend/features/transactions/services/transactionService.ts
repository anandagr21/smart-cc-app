import { apiClient } from '../../../services/api/client';
import { PaginatedResponse, SingleResponse } from '../../cards/types/api';
import { TransactionCreate, TransactionResponse } from '../types/transaction.types';

class TransactionService {
  /**
   * Fetch all transactions for the current user
   */
  async fetchUserTransactions(skip: number = 0, limit: number = 50): Promise<PaginatedResponse<TransactionResponse>> {
    const { data } = await apiClient.get<PaginatedResponse<TransactionResponse>>('/transactions', {
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
}

export const transactionService = new TransactionService();
