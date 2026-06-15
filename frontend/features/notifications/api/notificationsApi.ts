import { apiClient as api } from '@/services/api/client';
import { NotificationsListResponse } from '../types/api';

export const fetchNotifications = async (): Promise<NotificationsListResponse> => {
  const { data } = await api.get('/notifications/');
  return data;
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await api.post(`/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.post('/notifications/read-all');
};
