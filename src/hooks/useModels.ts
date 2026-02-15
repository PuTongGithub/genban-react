import { useState, useEffect, useCallback, useRef } from 'react';
import { chatApi } from '../api';

export function useModels() {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const initializedRef = useRef(false);

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await chatApi.getModels();
      setModels(data);
      if (data.length > 0) {
        setSelectedModel(data[0]);
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
    refetch: fetchModels,
  };
}
