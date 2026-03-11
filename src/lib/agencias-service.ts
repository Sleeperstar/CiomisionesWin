import { supabase } from './supabase';
import type { AgenciaView, Agencia } from './schemas';

/**
 * Obtiene todas las agencias desde la vista agencias_view
 */
export async function getAgencias(): Promise<AgenciaView[]> {
  const { data, error } = await supabase
    .from('agencias_view')
    .select('*')
    .order('razon_social', { ascending: true });

  if (error) throw new Error(`Error al obtener agencias: ${error.message}`);
  return (data as AgenciaView[]) || [];
}

/**
 * Obtiene una agencia por RUC desde la vista agencias_view
 */
export async function getAgenciaByRuc(ruc: string): Promise<AgenciaView | null> {
  const { data, error } = await supabase
    .from('agencias_view')
    .select('*')
    .eq('ruc', ruc)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No encontrada
    throw new Error(`Error al obtener agencia: ${error.message}`);
  }
  return data as AgenciaView;
}

/**
 * Actualiza una agencia por RUC
 */
export async function updateAgencia(
  ruc: string,
  updates: Partial<Omit<Agencia, 'ruc' | 'fin_vigencia' | 'created_at' | 'updated_at'>>
): Promise<Agencia> {
  const { data, error } = await supabase
    .from('agencias')
    .update(updates)
    .eq('ruc', ruc)
    .select()
    .single();

  if (error) throw new Error(`Error al actualizar agencia: ${error.message}`);
  return data as Agencia;
}
