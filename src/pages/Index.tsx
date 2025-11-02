import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SettingsDialog, MySQLConfig } from '@/components/SettingsDialog';

interface FoodEntry {
  id: string;
  products: string[];
  date: Date;
  hasAllergy: boolean;
}

interface EditingEntry {
  id: string;
  products: string[];
  hasAllergy: boolean;
}

const CLOUD_SYNC_URL = 'https://functions.poehali.dev/5ddf72dd-63e6-4130-b9ac-d5e66deb6e56';

const Index = () => {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [productInput, setProductInput] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [hasAllergy, setHasAllergy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterAllergy, setFilterAllergy] = useState<'all' | 'allergy' | 'safe'>('all');
  const [mysqlConfig, setMysqlConfig] = useState<MySQLConfig | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
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
      if (entries.length === 0) return;
      
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

  useEffect(() => {
    if (mysqlConfig) {
      localStorage.setItem('mysqlConfig', JSON.stringify(mysqlConfig));
      syncWithMySQL();
    } else {
      localStorage.removeItem('mysqlConfig');
    }
  }, [mysqlConfig]);

  const getAllProducts = () => {
    const products = new Set<string>();
    entries.forEach(entry => {
      entry.products.forEach(p => products.add(p));
    });
    return Array.from(products);
  };

  const handleInputChange = (value: string) => {
    setProductInput(value);
    if (value.length > 0) {
      const allProducts = getAllProducts();
      const filtered = allProducts.filter(p => 
        p.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const addProduct = (product: string) => {
    const trimmed = product.trim();
    if (trimmed && !selectedProducts.includes(trimmed)) {
      setSelectedProducts([...selectedProducts, trimmed]);
      setProductInput('');
      setShowSuggestions(false);
    }
  };

  const removeProduct = (product: string) => {
    setSelectedProducts(selectedProducts.filter(p => p !== product));
  };

  const startEditing = (entry: FoodEntry) => {
    setEditingEntry({
      id: entry.id,
      products: [...entry.products],
      hasAllergy: entry.hasAllergy
    });
    setSelectedProducts([...entry.products]);
    setHasAllergy(entry.hasAllergy);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingEntry(null);
    setSelectedProducts([]);
    setHasAllergy(false);
    setProductInput('');
  };

  const saveEdit = async () => {
    if (!editingEntry || selectedProducts.length === 0) {
      toast.error('Добавьте хотя бы один продукт');
      return;
    }

    const updatedEntries = entries.map(e => 
      e.id === editingEntry.id 
        ? { ...e, products: selectedProducts, hasAllergy }
        : e
    );

    setEntries(updatedEntries);
    cancelEditing();
    toast.success('Запись обновлена');

    if (mysqlConfig) {
      await uploadToMySQL();
    }
  };

  const handleSubmit = async () => {
    if (editingEntry) {
      await saveEdit();
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error('Добавьте хотя бы один продукт');
      return;
    }

    const newEntry: FoodEntry = {
      id: Date.now().toString(),
      products: selectedProducts,
      date: new Date(),
      hasAllergy
    };

    setEntries([newEntry, ...entries]);
    setSelectedProducts([]);
    setHasAllergy(false);
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
        const loadedEntries = data.entries.map((e: any) => ({
          id: e.id,
          products: e.products,
          date: new Date(e.entry_date),
          hasAllergy: e.has_allergy
        }));
        setEntries(loadedEntries);
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
  };

  const exportToCSV = () => {
    if (entries.length === 0) {
      toast.error('Нет данных для экспорта');
      return;
    }

    const headers = ['Дата и время', 'Продукты', 'Аллергия'];
    const rows = entries.map(entry => [
      format(entry.date, 'dd.MM.yyyy HH:mm', { locale: ru }),
      entry.products.join(', '),
      entry.hasAllergy ? 'Да' : 'Нет'
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `дневник_питания_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV-файл скачан!');
  };

  const getAllergyStats = () => {
    const stats: Record<string, { total: number; allergies: number }> = {};
    
    entries.forEach(entry => {
      entry.products.forEach(product => {
        if (!stats[product]) {
          stats[product] = { total: 0, allergies: 0 };
        }
        stats[product].total++;
        if (entry.hasAllergy) {
          stats[product].allergies++;
        }
      });
    });

    return Object.entries(stats)
      .map(([product, data]) => ({
        product,
        frequency: data.allergies,
        percentage: data.total > 0 ? Math.round((data.allergies / data.total) * 100) : 0
      }))
      .filter(item => item.frequency > 0)
      .sort((a, b) => b.frequency - a.frequency);
  };

  const filteredEntries = entries.filter(entry => {
    if (filterAllergy === 'allergy') return entry.hasAllergy;
    if (filterAllergy === 'safe') return !entry.hasAllergy;
    return true;
  });

  const allergyStats = getAllergyStats();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-2 md:gap-3">
                <Icon name="Apple" size={28} className="text-accent md:w-9 md:h-9" />
                Дневник питания
              </h1>
              <p className="text-sm md:text-base text-muted-foreground flex items-center gap-2">
                Отслеживайте питание и аллергические реакции
                {isOnline && (
                  <Badge variant="default" className="bg-green-500 text-xs">
                    <Icon name="Cloud" size={12} className="mr-1" />
                    Синхронизировано
                  </Badge>
                )}
                {!isOnline && (
                  <Badge variant="outline" className="text-xs">
                    <Icon name="CloudOff" size={12} className="mr-1" />
                    Офлайн
                  </Badge>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                disabled={entries.length === 0}
                className="flex-1 sm:flex-none"
              >
                <Icon name="FileDown" size={16} className="mr-1 md:mr-2" />
                <span className="hidden sm:inline">Экспорт CSV</span>
                <span className="sm:hidden">CSV</span>
              </Button>
              <Button
                onClick={loadFromCloud}
                variant="outline"
                size="sm"
                disabled={syncing}
                className="flex-1 sm:flex-none"
              >
                <Icon name="RefreshCw" size={16} className="mr-1 md:mr-2" />
                <span className="hidden sm:inline">Обновить</span>
                <span className="sm:hidden">⟳</span>
              </Button>
              {mysqlConfig && (
                <>
                  <Button
                    onClick={syncWithMySQL}
                    variant="outline"
                    size="sm"
                    disabled={syncing}
                    className="flex-1 sm:flex-none"
                  >
                    <Icon name="Download" size={16} className="mr-1 md:mr-2" />
                    <span className="hidden sm:inline">{syncing ? 'Загрузка...' : 'MySQL ↓'}</span>
                    <span className="sm:hidden">{syncing ? '...' : 'DB↓'}</span>
                  </Button>
                  <Button
                    onClick={uploadToMySQL}
                    variant="outline"
                    size="sm"
                    disabled={syncing}
                    className="flex-1 sm:flex-none"
                  >
                    <Icon name="Upload" size={16} className="mr-1 md:mr-2" />
                    <span className="hidden sm:inline">{syncing ? 'Выгрузка...' : 'MySQL ↑'}</span>
                    <span className="sm:hidden">{syncing ? '...' : 'DB↑'}</span>
                  </Button>
                </>
              )}
              <SettingsDialog
                onConfigChange={handleConfigChange}
                currentConfig={mysqlConfig}
              />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <Card className="p-4 md:p-6 mb-4 md:mb-6 shadow-sm">
              <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                <Icon name={editingEntry ? "Edit" : "Plus"} size={20} />
                {editingEntry ? 'Редактировать запись' : 'Добавить запись'}
              </h2>

              <div className="space-y-4">
                <div className="relative">
                  <Label htmlFor="product">Продукты</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1 relative">
                      <Input
                        id="product"
                        value={productInput}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addProduct(productInput);
                          }
                        }}
                        placeholder="Начните вводить название продукта..."
                        className="w-full"
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <Card className="absolute z-10 w-full mt-1 p-2 max-h-48 overflow-y-auto">
                          {suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded transition-colors"
                              onClick={() => addProduct(suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </Card>
                      )}
                    </div>
                    <Button onClick={() => addProduct(productInput)} size="icon">
                      <Icon name="Plus" size={18} />
                    </Button>
                  </div>
                </div>

                {selectedProducts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedProducts.map((product, idx) => (
                      <Badge key={idx} variant="secondary" className="px-3 py-1.5 text-sm">
                        {product}
                        <button
                          onClick={() => removeProduct(product)}
                          className="ml-2 hover:text-destructive"
                        >
                          <Icon name="X" size={14} />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
                  <Checkbox
                    id="allergy"
                    checked={hasAllergy}
                    onCheckedChange={(checked) => setHasAllergy(checked === true)}
                  />
                  <Label 
                    htmlFor="allergy" 
                    className="cursor-pointer font-medium flex items-center gap-2"
                  >
                    <Icon name="AlertCircle" size={18} className="text-destructive" />
                    Проявилась аллергическая реакция
                  </Label>
                </div>

                <div className="flex gap-2">
                  {editingEntry && (
                    <Button 
                      onClick={cancelEditing}
                      variant="outline"
                      className="flex-1" 
                      size="lg"
                    >
                      <Icon name="X" size={18} className="mr-2" />
                      Отмена
                    </Button>
                  )}
                  <Button 
                    onClick={handleSubmit} 
                    className="flex-1" 
                    size="lg"
                    disabled={selectedProducts.length === 0}
                  >
                    <Icon name="Check" size={18} className="mr-2" />
                    {editingEntry ? 'Сохранить изменения' : 'Сохранить запись'}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-4 md:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                  <Icon name="List" size={20} />
                  История записей
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filterAllergy === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterAllergy('all')}
                    className="flex-1 sm:flex-none"
                  >
                    Все
                  </Button>
                  <Button
                    variant={filterAllergy === 'allergy' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setFilterAllergy('allergy')}
                    className="flex-1 sm:flex-none"
                  >
                    <Icon name="AlertTriangle" size={14} className="mr-1" />
                    <span className="hidden xs:inline">Аллергия</span>
                    <span className="xs:hidden">⚠️</span>
                  </Button>
                  <Button
                    variant={filterAllergy === 'safe' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterAllergy('safe')}
                    className={`flex-1 sm:flex-none ${filterAllergy === 'safe' ? 'bg-accent hover:bg-accent/90' : ''}`}
                  >
                    <Icon name="Check" size={14} className="mr-1" />
                    <span className="hidden xs:inline">Безопасно</span>
                    <span className="xs:hidden">✓</span>
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px] md:h-[500px] pr-2 md:pr-4">
                {filteredEntries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="FileText" size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Записей пока нет</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEntries.map((entry) => (
                      <Card 
                        key={entry.id} 
                        className={`p-4 transition-all hover:shadow-md ${
                          entry.hasAllergy 
                            ? 'border-l-4 border-l-destructive bg-red-50/50' 
                            : 'border-l-4 border-l-accent bg-green-50/30'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon 
                                name={entry.hasAllergy ? "AlertCircle" : "Check"} 
                                size={18}
                                className={entry.hasAllergy ? "text-destructive" : "text-accent"}
                              />
                              <span className="text-sm text-muted-foreground">
                                {format(entry.date, "d MMMM yyyy, HH:mm", { locale: ru })}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {entry.products.map((product, idx) => (
                                <Badge key={idx} variant="outline">
                                  {product}
                                </Badge>
                              ))}
                            </div>
                            {entry.hasAllergy && (
                              <Badge variant="destructive" className="text-xs">
                                <Icon name="AlertTriangle" size={12} className="mr-1" />
                                Аллергия
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditing(entry)}
                              className="hover:bg-accent/10 hover:text-accent"
                              title="Редактировать"
                            >
                              <Icon name="Edit" size={18} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteEntry(entry.id)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                              title="Удалить"
                            >
                              <Icon name="Trash2" size={18} />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-4 md:p-6 shadow-sm lg:sticky lg:top-8">
              <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                <Icon name="BarChart3" size={20} />
                Статистика аллергий
              </h2>

              {allergyStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon name="TrendingUp" size={36} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Нет данных об аллергиях</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allergyStats.map((stat, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{stat.product}</span>
                        <Badge variant="destructive" className="text-xs">
                          {stat.frequency}x
                        </Badge>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-destructive h-full rounded-full transition-all duration-500"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {stat.percentage}% случаев вызывали реакцию
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Icon name="FileText" size={20} className="mx-auto mb-1 text-primary" />
                    <div className="text-2xl font-bold">{entries.length}</div>
                    <div className="text-xs text-muted-foreground">Записей</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <Icon name="AlertTriangle" size={20} className="mx-auto mb-1 text-destructive" />
                    <div className="text-2xl font-bold text-destructive">
                      {entries.filter(e => e.hasAllergy).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Аллергий</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;