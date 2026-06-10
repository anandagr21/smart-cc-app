export type NotificationType = 
  | 'INSIGHT'
  | 'SECURITY'
  | 'SYSTEM'
  | 'CARD_INTELLIGENCE'
  | 'RECOMMENDATION'
  | 'WORKSPACE';

export interface NotificationRead {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  action_url?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationsListResponse {
  notifications: NotificationRead[];
  unread_count: number;
}
