import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FoodEntry, EditingEntry } from '@/types/foodEntry';
import { MySQLConfig } from '@/components/SettingsDialog';

const CLOUD_SYNC_URL = 'https://functions.poehali.dev/5ddf72dd-63e6-4130-b9ac-d5e66deb6e56';

export const useFoodDiary = () => {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [mysqlConfig, setMysqlConfig] = useState<MySQLConfig | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const loadFromCloud = async () => {
    try {
      const response = await fetch(CLOUD_SYNC_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        const cloudEntries = data.entries.map((e: any) => ({
          ...e,
          date: new Date(e.date)
        }));
        setEntries(cloudEntries);
        localStorage.setItem('foodDiary', JSON.stringify(cloudEntries));
        setIsOnline(true);
        return true;
      }
    } catch (error) {
      console.warn('Cloud sync unavailable, using local storage');
      setIsOnline(false);
    }
    return false;
  };

  useEffect(() => {
    const savedConfig = localStorage.getItem('mysqlConfig');
    if (savedConfig) {
      setMysqlConfig(JSON.parse(savedConfig));
    }

    const initData = async () => {
      const cloudLoaded = await loadFromCloud();
      
      if (!cloudLoaded) {
        const saved = localStorage.getItem('foodDiary');
        if (saved) {
          const parsed = JSON.parse(saved);
          setEntries(parsed.map((e: any) => ({ ...e, date: new Date(e.date) })));
        }
      }
    };

    initData();
  }, []);

  useEffect(() => {
    localStorage.setItem('foodDiary', JSON.stringify(entries));
    
    const syncToCloud = async () => {
      try {
        await fetch(CLOUD_SYNC_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entries: entries.map(e => ({
              id: e.id,
              products: e.products,
              date: e.date.toISOString(),
              hasAllergy: e.hasAllergy
            }))
          })
        });
        setIsOnline(true);
      } catch (error) {
        console.warn('Cloud sync failed:', error);
        setIsOnline(false);
      }
    };

    const timeoutId = setTimeout(syncToCloud, 1000);
    return () => clearTimeout(timeoutId);
  }, [entries]);

  const syncWithMySQL = async () => {
    if (!mysqlConfig) return;

    setSyncing(true);
    try {
      const response = await fetch('https://functions.poehali.dev/226037d0-a087-48be-82b4-54e0b3622d1f', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-DB-Config': JSON.stringify(mysqlConfig)
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.entries && data.entries.length > 0) {
          const mysqlEntries = data.entries.map((e: any) => ({
            ...e,
            date: new Date(e.entry_date)
          }));
          setEntries(mysqlEntries);
        }
        toast.success('Данные загружены из MySQL');
      }
    } catch (error) {
      toast.error('Ошибка синхронизации с MySQL');
    } finally {
      setSyncing(false);
    }
  };

  const uploadToMySQL = async () => {
    if (!mysqlConfig) return;

    setSyncing(true);
    try {
      const response = await fetch('https://functions.poehali.dev/226037d0-a087-48be-82b4-54e0b3622d1f', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-DB-Config': JSON.stringify(mysqlConfig)
        },
        body: JSON.stringify({
          entries: entries.map(e => ({
            id: e.id,
            products: e.products,
            date: e.date.toISOString(),
            hasAllergy: e.hasAllergy
          }))
        })
      });

      if (response.ok) {
        toast.success('Данные выгружены в MySQL');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast.error('Ошибка выгрузки в MySQL');
    } finally {
      setSyncing(false);
    }
  };

  const handleConfigChange = (config: MySQLConfig | null) => {
    setMysqlConfig(config);
    if (config) {
      localStorage.setItem('mysqlConfig', JSON.stringify(config));
      syncWithMySQL();
    } else {
      localStorage.removeItem('mysqlConfig');
    }
  };

  const addEntry = async (newEntry: FoodEntry) => {
    setEntries([newEntry, ...entries]);
    toast.success('Запись добавлена!');

    if (mysqlConfig) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://functions.poehali.dev/226037d0-a087-48be-82b4-54e0b3622d1f', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-DB-Config': JSON.stringify(mysqlConfig)
          },
          body: JSON.stringify({
            id: newEntry.id,
            products: newEntry.products,
            date: newEntry.date.toISOString(),
            hasAllergy: newEntry.hasAllergy
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn('MySQL save failed, but local save succeeded');
        }
      } catch (error) {
        console.warn('MySQL save error:', error);
      }
    }
  };

  const updateEntry = async (editingEntry: EditingEntry, selectedProducts: string[], hasAllergy: boolean) => {
    const updatedEntries = entries.map(e => 
      e.id === editingEntry.id 
        ? { ...e, products: selectedProducts, hasAllergy }
        : e
    );

    setEntries(updatedEntries);
    toast.success('Запись обновлена');

    if (mysqlConfig) {
      await uploadToMySQL();
    }
  };

  const deleteEntry = async (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
    toast.success('Запись удалена');

    if (mysqlConfig) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(
          `https://functions.poehali.dev/226037d0-a087-48be-82b4-54e0b3622d1f?id=${id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-DB-Config': JSON.stringify(mysqlConfig)
            },
            signal: controller.signal
          }
        );
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn('MySQL delete failed, but local delete succeeded');
        }
      } catch (error) {
        console.warn('MySQL delete error:', error);
      }
    }
  };

  return {
    entries,
    mysqlConfig,
    syncing,
    isOnline,
    setEntries,
    loadFromCloud,
    syncWithMySQL,
    uploadToMySQL,
    handleConfigChange,
    addEntry,
    updateEntry,
    deleteEntry
  };
};