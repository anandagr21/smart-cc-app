import { apiClient } from '../../../services/api/client';
import { 
  CardCatalogResponse, 
  UserCardResponse, 
  UserCardCreate, 
  PaginatedResponse, 
  SingleResponse 
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

export const addUserCard = async (data: UserCardCreate): Promise<UserCardResponse> => {
  const response = await apiClient.post<SingleResponse<UserCardResponse>>('/cards', data);
  return response.data.data;
};
