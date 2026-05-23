import { supabase } from './supabase';

export interface AppConfig {
  minVersion: string;
  downloadUrl: string;
  maintenanceMode: boolean;
}

export const APP_VERSION = "1.0.0"; // Versión actual de esta compilación

export const getAppConfig = async (): Promise<AppConfig | null> => {
  try {
    const { data, error } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'app_version')
      .single();
    
    if (error) {
      console.error("Error fetching app config from Supabase:", error);
      return null;
    }
    
    if (data && data.value) {
      return data.value as unknown as AppConfig;
    }
    return null;
  } catch (error) {
    console.error("Error fetching app config:", error);
    return null;
  }
};

/**
 * Compara dos versiones (ej: "1.0.0" vs "1.0.1")
 * Retorna true si v1 es menor que v2
 */
export const isVersionOlder = (current: string, minRequired: string): boolean => {
  const v1Parts = current.split('.').map(Number);
  const v2Parts = minRequired.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1 = v1Parts[i] || 0;
    const v2 = v2Parts[i] || 0;
    if (v1 < v2) return true;
    if (v1 > v2) return false;
  }
  return false;
};
