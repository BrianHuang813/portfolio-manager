// Spec: F4.5, T14 — React Query wrapper for Finnhub news
// Routes to stock or crypto endpoint based on asset type.

import { useQuery } from '@tanstack/react-query'
import { fetchStockNews, fetchCryptoNews } from '../services/finnhub'
import { NEWS_STALE_MS } from '../config/constants'
import type { AssetType, NewsArticle } from '../types/holdings'

export function useNews(symbol: string | null, type: AssetType | null) {
  return useQuery<NewsArticle[]>({
    queryKey: ['news', symbol, type],
    queryFn: async () => {
      if (!symbol) return []
      if (type === 'crypto') return fetchCryptoNews()
      return fetchStockNews(symbol)
    },
    enabled: symbol !== null,
    staleTime: NEWS_STALE_MS,
    retry: 1,
  })
}
