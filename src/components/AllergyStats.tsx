import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { FoodEntry } from '@/types/foodEntry';

interface AllergyStatsProps {
  entries: FoodEntry[];
}

interface AllergyStat {
  product: string;
  frequency: number;
  percentage: number;
}

export const AllergyStats = ({ entries }: AllergyStatsProps) => {
  const getAllergyStats = (): AllergyStat[] => {
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

  const allergyStats = getAllergyStats();

  return (
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
  );
};
