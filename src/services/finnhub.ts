// Spec: F4.5 — Finnhub news API
// Stocks: company-news endpoint. Crypto: general crypto category feed.

import { getConfig } from '../utils/storage'
import { STORAGE_KEYS } from '../config/constants'
import type { NewsArticle } from '../types/holdings'

interface FinnhubConfig {
  apiKey: string
}

interface FinnhubArticle {
  headline: string
  source: string
  datetime: number
  url: string
}

function isoDateString(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

export async function fetchStockNews(symbol: string): Promise<NewsArticle[]> {
  const cfg = getConfig<FinnhubConfig>(STORAGE_KEYS.finnhub)
  if (!cfg?.apiKey) return []

  const from = isoDateString(7)
  const to = isoDateString(0)
  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${cfg.apiKey}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Finnhub stock news failed: ${res.status}`)

  const articles = await res.json() as FinnhubArticle[]
  return articles.slice(0, 10).map((a) => ({
    headline: a.headline,
    source: a.source,
    datetime: a.datetime,
    url: a.url,
  }))
}

export async function fetchCryptoNews(): Promise<NewsArticle[]> {
  const cfg = getConfig<FinnhubConfig>(STORAGE_KEYS.finnhub)
  if (!cfg?.apiKey) return []

  const url = `https://finnhub.io/api/v1/news?category=crypto&token=${cfg.apiKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Finnhub crypto news failed: ${res.status}`)

  const articles = await res.json() as FinnhubArticle[]
  return articles.slice(0, 10).map((a) => ({
    headline: a.headline,
    source: a.source,
    datetime: a.datetime,
    url: a.url,
  }))
}
