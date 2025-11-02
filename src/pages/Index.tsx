import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { SettingsDialog } from '@/components/SettingsDialog';
import { FoodEntryForm } from '@/components/FoodEntryForm';
import { EntriesList } from '@/components/EntriesList';
import { AllergyStats } from '@/components/AllergyStats';
import { useFoodDiary } from '@/hooks/useFoodDiary';
import { FoodEntry, EditingEntry, AllergyFilter } from '@/types/foodEntry';

const Index = () => {
  const {
    entries,
    mysqlConfig,
    syncing,
    isOnline,
    loadFromCloud,
    syncWithMySQL,
    uploadToMySQL,
    handleConfigChange,
    addEntry,
    updateEntry,
    deleteEntry
  } = useFoodDiary();

  const [productInput, setProductInput] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [hasAllergy, setHasAllergy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterAllergy, setFilterAllergy] = useState<AllergyFilter>('all');
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);

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

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Добавьте хотя бы один продукт');
      return;
    }

    if (editingEntry) {
      await updateEntry(editingEntry, selectedProducts, hasAllergy);
      cancelEditing();
    } else {
      const newEntry: FoodEntry = {
        id: Date.now().toString(),
        products: selectedProducts,
        date: new Date(),
        hasAllergy
      };
      await addEntry(newEntry);
      setSelectedProducts([]);
      setHasAllergy(false);
    }
  };

  const exportToCSV = () => {
    if (entries.length === 0) {
      toast.error('Нет данных для экспорта');
      return;
    }

    const headers = ['Дата и время', 'Продукты', 'Аллергия'];
    const rows = entries.map(entry => [
      format(entry.date, 'dd.MM.yyyy HH:mm', { locale: { code: 'ru' } }),
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addProduct(productInput);
    }
  };

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
            <FoodEntryForm
              editingEntry={editingEntry}
              productInput={productInput}
              selectedProducts={selectedProducts}
              hasAllergy={hasAllergy}
              suggestions={suggestions}
              showSuggestions={showSuggestions}
              onInputChange={handleInputChange}
              onAddProduct={addProduct}
              onRemoveProduct={removeProduct}
              onAllergyChange={setHasAllergy}
              onSubmit={handleSubmit}
              onCancelEdit={cancelEditing}
              onKeyPress={handleKeyPress}
            />

            <EntriesList
              entries={entries}
              filterAllergy={filterAllergy}
              onFilterChange={setFilterAllergy}
              onEdit={startEditing}
              onDelete={deleteEntry}
            />
          </div>

          <div className="lg:col-span-1">
            <AllergyStats entries={entries} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
