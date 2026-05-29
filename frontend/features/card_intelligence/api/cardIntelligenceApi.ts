import { apiClient } from '@/services/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KnowledgeSourceResponse, JobResponse } from '../types/api';
import { Platform } from 'react-native';
import { QueryKeys } from '@/features/core/api/queryKeys';

export const fetchKnowledgeSources = async (cardId: string): Promise<KnowledgeSourceResponse[]> => {
  const { data } = await apiClient.get<KnowledgeSourceResponse[]>(`/card-intelligence/cards/${cardId}/sources`);
  return data;
};

export const triggerProcessing = async (sourceId: string): Promise<JobResponse> => {
  const { data } = await apiClient.post<JobResponse>(`/card-intelligence/sources/${sourceId}/process`);
  return data;
};

export const uploadSource = async (
  bankName: string,
  cardName: string,
  sourceTitle: string,
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<KnowledgeSourceResponse> => {
  const formData = new FormData();
  formData.append('bank_name', bankName);
  formData.append('card_name', cardName);
  formData.append('source_title', sourceTitle);
  
  // @ts-ignore - React Native FormData accepts an object with uri, name, type
  formData.append('file', {
    uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
    name: fileName,
    type: mimeType,
  });

  const { data } = await apiClient.post<KnowledgeSourceResponse>('/card-intelligence/sources/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return data;
};

export const submitUrlSource = async (
  bankName: string,
  cardName: string,
  url: string,
  sourceTitle: string
): Promise<KnowledgeSourceResponse> => {
  const { data } = await apiClient.post<KnowledgeSourceResponse>('/card-intelligence/sources/url', {
    bank_name: bankName,
    card_name: cardName,
    url,
    source_title: sourceTitle
  });
  return data;
};

export const useKnowledgeSources = (cardId: string | null) => {
  return useQuery({
    queryKey: ['card-sources', cardId],
    queryFn: () => fetchKnowledgeSources(cardId!),
    enabled: !!cardId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.some(s => s.processing_status === 'QUEUED' || s.processing_status === 'PROCESSING')) {
        return 2000; // Poll every 2s while processing
      }
      return false;
    }
  });
};

export const useUploadSource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { bankName: string; cardName: string; sourceTitle: string; fileUri: string; fileName: string; mimeType: string }) =>
      uploadSource(params.bankName, params.cardName, params.sourceTitle, params.fileUri, params.fileName, params.mimeType),
    onSuccess: (data) => {
      // Invalidate all card sources and the catalog (so the new card appears in the dashboard picker)
      queryClient.invalidateQueries({ queryKey: ['card-sources'] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.catalog.all });
      // Also seed the specific card's sources immediately
      if (data?.card_id) {
        queryClient.invalidateQueries({ queryKey: ['card-sources', data.card_id] });
      }
    },
  });
};

export const useSubmitUrlSource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { bankName: string; cardName: string; url: string; sourceTitle: string }) =>
      submitUrlSource(params.bankName, params.cardName, params.url, params.sourceTitle),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['card-sources'] });
      queryClient.invalidateQueries({ queryKey: QueryKeys.catalog.all });
      if (data?.card_id) {
        queryClient.invalidateQueries({ queryKey: ['card-sources', data.card_id] });
      }
    },
  });
};

export const useTriggerProcessing = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => triggerProcessing(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-sources', cardId] });
    },
  });
};

import { CardExtractionCandidateResponse, CandidateUpdatePayload, PublishPreviewResponse, PublishResponse } from '../types/api';

export const fetchCandidates = async (cardId: string, status?: string): Promise<CardExtractionCandidateResponse[]> => {
  const url = status 
    ? `/card-intelligence/cards/${cardId}/candidates?status=${status}` 
    : `/card-intelligence/cards/${cardId}/candidates`;
  const { data } = await apiClient.get<CardExtractionCandidateResponse[]>(url);
  return data;
};

export const updateCandidate = async (candidateId: string, payload: CandidateUpdatePayload): Promise<CardExtractionCandidateResponse> => {
  const { data } = await apiClient.put<CardExtractionCandidateResponse>(`/card-intelligence/candidates/${candidateId}`, payload);
  return data;
};

export const publishPreview = async (cardId: string): Promise<PublishPreviewResponse> => {
  const { data } = await apiClient.post<PublishPreviewResponse>(`/card-intelligence/cards/${cardId}/publish-preview`);
  return data;
};

export const publishCandidates = async (cardId: string): Promise<PublishResponse> => {
  const { data } = await apiClient.post<PublishResponse>(`/card-intelligence/cards/${cardId}/publish`);
  return data;
};

export const useCandidates = (cardId: string | null, status?: string) => {
  return useQuery({
    queryKey: ['card-candidates', cardId, status],
    queryFn: () => fetchCandidates(cardId!, status),
    enabled: !!cardId,
    refetchInterval: 3000,
  });
};

export const useUpdateCandidate = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { candidateId: string; payload: CandidateUpdatePayload }) => updateCandidate(params.candidateId, params.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-candidates', cardId] });
    },
  });
};

export const usePublishPreview = (cardId: string | null) => {
  return useQuery({
    queryKey: ['card-publish-preview', cardId],
    queryFn: () => publishPreview(cardId!),
    enabled: !!cardId,
  });
};

export const usePublishChanges = (cardId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => publishCandidates(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-candidates', cardId] });
      queryClient.invalidateQueries({ queryKey: ['card-publish-preview', cardId] });
    },
  });
};
