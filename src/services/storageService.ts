import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const storageService = {
  /**
   * Guarda cualquier valor serializable bajo una clave dada.
   */
  async set<T>(key: string, value: T): Promise<void> {
    const serializedValue = JSON.stringify(value);
    
    if (isNative) {
      await Preferences.set({ key, value: serializedValue });
    } else {
      localStorage.setItem(key, serializedValue);
    }
  },

  /**
   * Obtiene y parsea el valor almacenado. Retorna el valor por defecto si no existe.
   */
  async get<T>(key: string, defaultValue: T): Promise<T> {
    try {
      let rawValue: string | null = null;

      if (isNative) {
        const { value } = await Preferences.get({ key });
        rawValue = value;
      } else {
        rawValue = localStorage.getItem(key);
      }

      if (rawValue === null) {
        return defaultValue;
      }

      return JSON.parse(rawValue) as T;
    } catch (error) {
      console.error(`Error al leer la clave "${key}" del almacenamiento:`, error);
      return defaultValue;
    }
  },

  /**
   * Elimina un registro específico.
   */
  async remove(key: string): Promise<void> {
    if (isNative) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  /**
   * Limpia todo el almacenamiento de la app.
   */
  async clear(): Promise<void> {
    if (isNative) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  }
};