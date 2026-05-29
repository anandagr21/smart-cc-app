import { apiClient } from '@/services/api/client';
import { 
  CardCatalogResponse, 
  UserCardResponse, 
  UserCardCreate, 
  PaginatedResponse, 
  SingleResponse,
  UserCardUpdate
} from '../types/api';

export const fetchCardCatalog = async (): Promise<CardCatalogResponse[]> => {
  const response = await apiClient.get<PaginatedResponse<CardCatalogResponse>>('/cards/catalog', {
    params: { limit: 100, active_only: true }
  });
  return response.data.data;
};

export const fetchUserCards = async (): Promise<UserCardResponse[]> => {
  const response = await apiClient.get<PaginatedResponse<UserCardResponse>>('/cards', {
    params: { limit: 100 }
  });
  return response.data.data;
};

export const updateCardCatalog = async (
  cardId: string,
  data: Partial<CardCatalogResponse>
): Promise<CardCatalogResponse> => {
  const response = await apiClient.patch<SingleResponse<CardCatalogResponse>>(`/cards/catalog/${cardId}`, data);
  return response.data.data;
};

export const addUserCard = async (data: UserCardCreate): Promise<UserCardResponse> => {
  const response = await apiClient.post<SingleResponse<UserCardResponse>>('/cards', data);
  return response.data.data;
};

export const updateUserCard = async (
  cardId: string,
  data: UserCardUpdate
): Promise<UserCardResponse> => {
  const response = await apiClient.patch<SingleResponse<UserCardResponse>>(`/cards/${cardId}`, data);
  return response.data.data;
};

export interface RewardRule {
  id: string;
  card_id: string;
  rule_name: string;
  rule_type: string;
  rule_config: any;
  priority: number;
  is_active: boolean;
}

export const fetchCardRules = async (cardId: string): Promise<RewardRule[]> => {
  const response = await apiClient.get<PaginatedResponse<RewardRule>>(`/reward-rules/card/${cardId}`);
  return response.data.data;
};
