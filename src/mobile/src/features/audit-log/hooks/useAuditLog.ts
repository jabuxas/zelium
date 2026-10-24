import { useState, useCallback, useEffect, useRef } from 'react';
import { AuditLogRepositoryImpl } from '../data/repository';
import { authGeneration } from '@/src/shared/auth/tokenStore';
import type { AuditLogPaginatedResponse } from '../domain/types';

const repository = new AuditLogRepositoryImpl();
const emptyPage: AuditLogPaginatedResponse = { data: [], total: 0, pages: 0, currentPage: 1, limit: 10 };

export function useAuditLog() {
  const [result, setResult] = useState(emptyPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAcao, setFilterAcao] = useState('');
  const [filterRecurso, setFilterRecurso] = useState('');
  const [filterUsuario, setFilterUsuario] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [operacional, setOperacional] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, unknown>>({ operacional: true });
  const request = useRef(0);

  const load = useCallback(async () => {
    const operation = ++request.current;
    const generation = authGeneration();
    const current = () => request.current === operation && authGeneration() === generation;
    setLoading(true);
    setError(null);
    try {
      const response = await repository.page({ ...filters, page, limit: 10 });
      if (current()) setResult(response);
    } catch (err) {
      if (current()) {
        setResult(emptyPage);
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o histórico.');
      }
    } finally {
      if (current()) setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void load();
    return () => { request.current += 1; };
  }, [load]);

  function applyFilters() {
    setPage(1);
    setFilters(Object.fromEntries(Object.entries({ operacional, busca: searchQuery.trim(), acao: filterAcao,
      tabela: filterRecurso, usuario: filterUsuario.trim(), de, ate }).filter(([, value]) => value !== '')));
  }

  function clearFilters() {
    setSearchQuery(''); setFilterAcao(''); setFilterRecurso(''); setFilterUsuario('');
    setDe(''); setAte(''); setOperacional(true); setPage(1); setFilters({ operacional: true });
  }

  return {
    data: result.data, filteredData: result.data, total: result.total, pages: result.pages,
    loading, error, page, setPage, load, applyFilters, clearFilters,
    searchQuery, setSearchQuery, filterAcao, setFilterAcao, filterRecurso, setFilterRecurso,
    filterUsuario, setFilterUsuario, de, setDe, ate, setAte, operacional, setOperacional,
  };
}
