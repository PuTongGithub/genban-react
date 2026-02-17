import { useState, useEffect, useCallback, useRef } from 'react';
import { chatApi, ApiError, ApiErrorCode } from '../api';

export interface UseModelsReturn {
  models: string[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isOffline: boolean;
}

export function useModels(): UseModelsReturn {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const initializedRef = useRef(false);

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsOffline(false);
    
    try {
      const data = await chatApi.getModels();
      setModels(data);
      if (data.length > 0) {
        setSelectedModel(data[0]);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === ApiErrorCode.NETWORK_ERROR || err.code === ApiErrorCode.TIMEOUT) {
          setIsOffline(true);
        }
        setError(err.message);
      } else {
        setError('获取模型列表失败');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    fetchModels();
  }, [fetchModels]);

  return {
    models,
    selectedModel,
    setSelectedModel,
    isLoading,
    error,
    refetch: fetchModels,
    isOffline,
  };
}
