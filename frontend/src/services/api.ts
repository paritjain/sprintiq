import { AnalysisSession, HealthResponse, FrameLandmarks, MovementEvent } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001';

export class ApiService {
  static getBaseUrl(): string {
    return API_BASE_URL;
  }

  static getMediaUrl(relativeUrl?: string): string {
    if (!relativeUrl) return '';
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    return `${API_BASE_URL}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
  }

  static async checkHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      throw new Error(`Backend health check failed with HTTP ${res.status}`);
    }
    return res.json();
  }

  static async getAnalyses(): Promise<AnalysisSession[]> {
    const res = await fetch(`${API_BASE_URL}/api/analyses`);
    if (!res.ok) {
      throw new Error(`Failed to fetch analyses (HTTP ${res.status})`);
    }
    return res.json();
  }

  static async getAnalysis(id: string): Promise<AnalysisSession> {
    const res = await fetch(`${API_BASE_URL}/api/analyses/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to load analysis session '${id}' (HTTP ${res.status})`);
    }
    return res.json();
  }

  static async getLandmarks(id: string): Promise<FrameLandmarks[]> {
    const res = await fetch(`${API_BASE_URL}/api/analyses/${id}/landmarks`);
    if (!res.ok) {
      throw new Error(`Failed to load landmarks for '${id}'`);
    }
    return res.json();
  }

  static async getEvents(id: string): Promise<MovementEvent[]> {
    const res = await fetch(`${API_BASE_URL}/api/analyses/${id}/events`);
    if (!res.ok) {
      throw new Error(`Failed to load movement events for '${id}'`);
    }
    return res.json();
  }

  static async uploadAnalysis(formData: FormData): Promise<AnalysisSession> {
    const res = await fetch(`${API_BASE_URL}/api/analyses`, {
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
    const res = await fetch(`${API_BASE_URL}/api/analyses/load-demo/${eventType}`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Failed to trigger demo processing: HTTP ${res.status}`);
    }
    return res.json();
  }

  static async deleteAnalysis(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/analyses/${id}`, {
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
