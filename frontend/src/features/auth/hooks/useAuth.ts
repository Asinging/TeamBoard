import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import type { ApiResponse, AuthResponse, User } from '../../../types';

export function useMe() {
  return useQuery<User>({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<User>>('/auth/me');
      return data.data;
    },
    enabled: !!localStorage.getItem('access_token'),
  });
}

export function useSignup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string }) =>
      api.post<ApiResponse<AuthResponse>>('/auth/signup', body),
    onSuccess: ({ data }) => {
      localStorage.setItem('access_token', data.data.access_token);
      queryClient.setQueryData(['me'], data.data.user);
      navigate('/dashboard');
    },
  });
}

export function useLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api.post<ApiResponse<AuthResponse>>('/auth/login', body),
    onSuccess: ({ data }) => {
      localStorage.setItem('access_token', data.data.access_token);
      queryClient.setQueryData(['me'], data.data.user);
      navigate('/dashboard');
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return () => {
    localStorage.removeItem('access_token');
    queryClient.clear();
    navigate('/login');
  };
}
