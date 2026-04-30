import { useState, useCallback } from "react";

interface OptimisticUpdateState<T> {
  data: T;
  isPending: boolean;
  error: string | null;
}

/**
 * Hook for optimistic UI updates
 * Immediately shows optimistic state while request is in flight
 */
export function useOptimisticUpdate<T>(initialData: T) {
  const [state, setState] = useState<OptimisticUpdateState<T>>({
    data: initialData,
    isPending: false,
    error: null,
  });

  const execute = useCallback(
    async (
      optimisticData: T,
      request: () => Promise<Response>
    ): Promise<boolean> => {
      // Show optimistic data immediately
      setState({
        data: optimisticData,
        isPending: true,
        error: null,
      });

      try {
        const response = await request();

        if (response.ok) {
          // Request succeeded - keep optimistic data
          setState({
            data: optimisticData,
            isPending: false,
            error: null,
          });
          return true;
        } else {
          // Request failed - revert to previous data
          setState({
            data: initialData,
            isPending: false,
            error: `Błąd: ${response.statusText}`,
          });
          return false;
        }
      } catch (error) {
        // Network error - revert to previous data
        const errorMsg =
          error instanceof Error ? error.message : "Błąd połączenia";
        setState({
          data: initialData,
          isPending: false,
          error: errorMsg,
        });
        return false;
      }
    },
    [initialData]
  );

  const reset = useCallback(() => {
    setState({
      data: initialData,
      isPending: false,
      error: null,
    });
  }, [initialData]);

  return {
    ...state,
    execute,
    reset,
  };
}
