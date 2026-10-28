import { AnalysisSession, HealthResponse, FrameLandmarks, MovementEvent } from '../types';

const PRODUCTION_API_URL = 'https://sprintiq-0f1g.onrender.com';
const LOCAL_API_URL = 'http://127.0.0.1:8001';

// Centralized API Base URL
// 1. Prioritize VITE_API_BASE_URL environment variable
// 2. Default to production Render URL in production builds
// 3. Fallback to local 127.0.0.1:8001 in development mode
const rawBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? PRODUCTION_API_URL : LOCAL_API_URL)
).trim();

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export class ApiService {
  static getBaseUrl(): string {
    return API_BASE_URL;
  }

  static getMediaUrl(relativeUrl?: string): string {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    const cleanPath = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
    return `${API_BASE_URL}${cleanPath}`;
  }

  private static async safeFetch(url: string, options?: RequestInit): Promise<Response> {
    try {
      return await fetch(url, options);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('AbortError') ||
        msg.includes('Network request failed')
      ) {
        throw new Error(
          `Unable to connect to SprintIQ backend at ${API_BASE_URL}. The server may be waking from cold start or unreachable.`
        );
      }
      throw err;
    }
  }

  static async checkHealth(timeoutMs = 15000, retries = 1): Promise<HealthResponse> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/health`, {
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) {
          throw new Error(`Backend health check failed with HTTP ${res.status}`);
        }
        return await res.json();
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          // Grace period for Render cold start spin-up
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }
    throw lastError;
  }

  static async getAnalyses(): Promise<AnalysisSession[]> {
    const res = await this.safeFetch(`${API_BASE_URL}/api/analyses`);
    if (!res.ok) {
      throw new Error(`Failed to fetch analyses (HTTP ${res.status})`);
    }
    return res.json();
  }

  static async getAnalysis(id: string): Promise<AnalysisSession> {
    const res = await this.safeFetch(`${API_BASE_URL}/api/analyses/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to load analysis session '${id}' (HTTP ${res.status})`);
    }
    return res.json();
  }

  static async getLandmarks(id: string): Promise<FrameLandmarks[]> {
    const res = await this.safeFetch(`${API_BASE_URL}/api/analyses/${id}/landmarks`);
    if (!res.ok) {
      throw new Error(`Failed to load landmarks for '${id}' (HTTP ${res.status})`);
    }
    return res.json();
  }

  static async getEvents(id: string): Promise<MovementEvent[]> {
    const res = await this.safeFetch(`${API_BASE_URL}/api/analyses/${id}/events`);
    if (!res.ok) {
      throw new Error(`Failed to load movement events for '${id}' (HTTP ${res.status})`);
    }
    return res.json();
  }

  static async uploadAnalysis(formData: FormData): Promise<AnalysisSession> {
    const res = await this.safeFetch(`${API_BASE_URL}/api/analyses`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      let errorMsg = `Upload failed (HTTP ${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson.detail) errorMsg = errJson.detail;
      } catch {
        // fallback
      }
      throw new Error(errorMsg);
    }
    return res.json();
  }

  static async loadDemo(eventType: 'sprint' | 'jump'): Promise<AnalysisSession> {
    const res = await this.safeFetch(`${API_BASE_URL}/api/analyses/load-demo/${eventType}`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Failed to trigger demo processing: HTTP ${res.status}`);
    }
    return res.json();
  }

  static async deleteAnalysis(id: string): Promise<void> {
    const res = await this.safeFetch(`${API_BASE_URL}/api/analyses/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Failed to delete session (HTTP ${res.status})`);
    }
  }

  static getExportUrl(id: string, format: 'json' | 'csv' | 'pdf'): string {
    return `${API_BASE_URL}/api/analyses/${id}/export?format=${format}`;
  }
}

