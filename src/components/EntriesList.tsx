import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FoodEntry, AllergyFilter } from '@/types/foodEntry';

interface EntriesListProps {
  entries: FoodEntry[];
  filterAllergy: AllergyFilter;
  onFilterChange: (filter: AllergyFilter) => void;
  onEdit: (entry: FoodEntry) => void;
  onDelete: (id: string) => void;
}

export const EntriesList = ({
  entries,
  filterAllergy,
  onFilterChange,
  onEdit,
  onDelete
}: EntriesListProps) => {
  const filteredEntries = entries.filter(entry => {
    if (filterAllergy === 'allergy') return entry.hasAllergy;
    if (filterAllergy === 'safe') return !entry.hasAllergy;
    return true;
  });

  return (
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
            onClick={() => onFilterChange('all')}
            className="flex-1 sm:flex-none"
          >
            Все
          </Button>
          <Button
            variant={filterAllergy === 'allergy' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('allergy')}
            className="flex-1 sm:flex-none"
          >
            <Icon name="AlertTriangle" size={14} className="mr-1" />
            <span className="hidden xs:inline">Аллергия</span>
            <span className="xs:hidden">⚠️</span>
          </Button>
          <Button
            variant={filterAllergy === 'safe' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange('safe')}
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
                      onClick={() => onEdit(entry)}
                      className="hover:bg-accent/10 hover:text-accent"
                      title="Редактировать"
                    >
                      <Icon name="Edit" size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(entry.id)}
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
  );
};
