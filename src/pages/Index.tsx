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

interface FoodEntry {
  id: string;
  products: string[];
  date: Date;
  hasAllergy: boolean;
}

const Index = () => {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [productInput, setProductInput] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [hasAllergy, setHasAllergy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterAllergy, setFilterAllergy] = useState<'all' | 'allergy' | 'safe'>('all');

  useEffect(() => {
    const saved = localStorage.getItem('foodDiary');
    if (saved) {
      const parsed = JSON.parse(saved);
      setEntries(parsed.map((e: any) => ({ ...e, date: new Date(e.date) })));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('foodDiary', JSON.stringify(entries));
  }, [entries]);

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

  const handleSubmit = () => {
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
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
    toast.success('Запись удалена');
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Icon name="Apple" size={36} className="text-accent" />
            Дневник питания
          </h1>
          <p className="text-muted-foreground">Отслеживайте питание и аллергические реакции</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6 mb-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Icon name="Plus" size={20} />
                Добавить запись
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

                <Button 
                  onClick={handleSubmit} 
                  className="w-full" 
                  size="lg"
                  disabled={selectedProducts.length === 0}
                >
                  <Icon name="Check" size={18} className="mr-2" />
                  Сохранить запись
                </Button>
              </div>
            </Card>

            <Card className="p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Icon name="List" size={20} />
                  История записей
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant={filterAllergy === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterAllergy('all')}
                  >
                    Все
                  </Button>
                  <Button
                    variant={filterAllergy === 'allergy' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setFilterAllergy('allergy')}
                  >
                    <Icon name="AlertTriangle" size={14} className="mr-1" />
                    Аллергия
                  </Button>
                  <Button
                    variant={filterAllergy === 'safe' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterAllergy('safe')}
                    className={filterAllergy === 'safe' ? 'bg-accent hover:bg-accent/90' : ''}
                  >
                    <Icon name="Check" size={14} className="mr-1" />
                    Безопасно
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[500px] pr-4">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteEntry(entry.id)}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Icon name="Trash2" size={18} />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 shadow-sm sticky top-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
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
