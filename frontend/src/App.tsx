import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { Layout } from './components/layout/Layout';
import { Overview } from './pages/Overview';
import { NewAnalysis } from './pages/NewAnalysis';
import { AnalysisResults } from './pages/AnalysisResults';
import { AthleteComparison } from './pages/AthleteComparison';
import { AnalysisHistory } from './pages/AnalysisHistory';
import { Methodology } from './pages/Methodology';
import { Validation } from './pages/Validation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="analyze" element={<NewAnalysis />} />
            <Route path="results/:id" element={<AnalysisResults />} />
            <Route path="compare" element={<AthleteComparison />} />
            <Route path="history" element={<AnalysisHistory />} />
            <Route path="methodology" element={<Methodology />} />
            <Route path="validation" element={<Validation />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" theme="dark" richColors />
    </QueryClientProvider>
  );
}

export default App;
