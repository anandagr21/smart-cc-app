import { apiClient } from '@/services/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CardDocumentType, DocumentResponse, JobResponse } from '../types/api';
import { Platform } from 'react-native';

export const fetchDocuments = async (cardId: string): Promise<DocumentResponse[]> => {
  const { data } = await apiClient.get<DocumentResponse[]>(`/api/v1/card-intelligence/cards/${cardId}/documents`);
  return data;
};

export const triggerProcessing = async (documentId: string): Promise<JobResponse> => {
  const { data } = await apiClient.post<JobResponse>(`/api/v1/card-intelligence/documents/${documentId}/process`);
  return data;
};

export const uploadDocument = async (
  cardId: string,
  documentType: CardDocumentType,
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<DocumentResponse> => {
  const formData = new FormData();
  formData.append('card_id', cardId);
  formData.append('document_type', documentType);
  
  // @ts-ignore - React Native FormData accepts an object with uri, name, type
  formData.append('file', {
    uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
    name: fileName,
    type: mimeType,
  });

  const { data } = await apiClient.post<DocumentResponse>('/api/v1/card-intelligence/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return data;
};

export const useCardDocuments = (cardId: string | null) => {
  return useQuery({
    queryKey: ['card-documents', cardId],
    queryFn: () => fetchDocuments(cardId!),
    enabled: !!cardId,
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { cardId: string; documentType: CardDocumentType; fileUri: string; fileName: string; mimeType: string }) =>
      uploadDocument(params.cardId, params.documentType, params.fileUri, params.fileName, params.mimeType),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['card-documents', variables.cardId] });
    },
  });
};

export const useTriggerProcessing = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => triggerProcessing(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-documents', cardId] });
    },
  });
};
