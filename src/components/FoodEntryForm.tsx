import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { EditingEntry } from '@/types/foodEntry';

interface FoodEntryFormProps {
  editingEntry: EditingEntry | null;
  productInput: string;
  selectedProducts: string[];
  hasAllergy: boolean;
  suggestions: string[];
  showSuggestions: boolean;
  onInputChange: (value: string) => void;
  onAddProduct: (product: string) => void;
  onRemoveProduct: (product: string) => void;
  onAllergyChange: (checked: boolean) => void;
  onSubmit: () => void;
  onCancelEdit: () => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const FoodEntryForm = ({
  editingEntry,
  productInput,
  selectedProducts,
  hasAllergy,
  suggestions,
  showSuggestions,
  onInputChange,
  onAddProduct,
  onRemoveProduct,
  onAllergyChange,
  onSubmit,
  onCancelEdit,
  onKeyPress
}: FoodEntryFormProps) => {
  return (
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
                onChange={(e) => onInputChange(e.target.value)}
                onKeyPress={onKeyPress}
                placeholder="Начните вводить название продукта..."
                className="w-full"
              />
              {showSuggestions && suggestions.length > 0 && (
                <Card className="absolute z-10 w-full mt-1 p-2 max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left px-3 py-2 hover:bg-accent/10 rounded transition-colors"
                      onClick={() => onAddProduct(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </Card>
              )}
            </div>
            <Button onClick={() => onAddProduct(productInput)} size="icon">
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
                  onClick={() => onRemoveProduct(product)}
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
            onCheckedChange={(checked) => onAllergyChange(checked === true)}
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
              onClick={onCancelEdit}
              variant="outline"
              className="flex-1" 
              size="lg"
            >
              <Icon name="X" size={18} className="mr-2" />
              Отмена
            </Button>
          )}
          <Button 
            onClick={onSubmit} 
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
  );
};
