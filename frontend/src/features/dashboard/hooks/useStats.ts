import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import type { ApiResponse } from '../../../types';

export interface Stats {
  projects: number;
  teams: number;
  tasks: { todo: number; in_progress: number; done: number };
}

export const useStats = () =>
  useQuery({
    queryKey: ['stats'],
    queryFn: async (): Promise<Stats> => {
      const { data } = await api.get<ApiResponse<Stats>>('/stats');
      return data.data;
    },
  });
