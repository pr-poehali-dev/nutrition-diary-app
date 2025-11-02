import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';

export interface MySQLConfig {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

interface SettingsDialogProps {
  onConfigChange: (config: MySQLConfig | null) => void;
  currentConfig: MySQLConfig | null;
}

export const SettingsDialog = ({ onConfigChange, currentConfig }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<MySQLConfig>({
    host: '',
    port: '3306',
    user: '',
    password: '',
    database: ''
  });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);

  const handleSave = () => {
    if (!config.host || !config.user || !config.database) {
      toast.error('Заполните все обязательные поля');
      return;
    }
    onConfigChange(config);
    toast.success('Настройки MySQL сохранены');
    setOpen(false);
  };

  const handleDisconnect = () => {
    onConfigChange(null);
    setConfig({
      host: '',
      port: '3306',
      user: '',
      password: '',
      database: ''
    });
    toast.success('MySQL отключен');
    setOpen(false);
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('https://functions.poehali.dev/226037d0-a087-48be-82b4-54e0b3622d1f', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-DB-Config': JSON.stringify(config)
        }
      });

      if (response.ok) {
        toast.success('✅ Подключение успешно!');
      } else {
        const error = await response.json();
        toast.error(`Ошибка подключения: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      toast.error('Ошибка сети. Проверьте параметры подключения.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Icon name="Settings" size={16} className="mr-2" />
          MySQL
          {currentConfig && (
            <Badge variant="default" className="ml-2 bg-accent">
              Подключено
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Database" size={20} />
            Настройки MySQL
          </DialogTitle>
          <DialogDescription>
            Укажите параметры подключения к вашей базе данных MySQL
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="host">Хост *</Label>
            <Input
              id="host"
              placeholder="localhost или IP-адрес"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="port">Порт</Label>
              <Input
                id="port"
                placeholder="3306"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="database">База данных *</Label>
              <Input
                id="database"
                placeholder="food_diary"
                value={config.database}
                onChange={(e) => setConfig({ ...config, database: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="user">Пользователь *</Label>
            <Input
              id="user"
              placeholder="root"
              value={config.user}
              onChange={(e) => setConfig({ ...config, user: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="password">Пароль *</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
            />
          </div>

          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex gap-3">
              <Icon name="Info" size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Автоматическая инициализация</p>
                <p className="text-xs opacity-80">
                  При первом подключении приложение автоматически создаст необходимые таблицы в указанной базе данных.
                </p>
              </div>
            </div>
          </Card>

          <div className="flex gap-2">
            <Button onClick={testConnection} variant="outline" disabled={testing} className="flex-1">
              <Icon name="TestTube2" size={16} className="mr-2" />
              {testing ? 'Проверка...' : 'Тест подключения'}
            </Button>
            <Button onClick={handleSave} className="flex-1">
              <Icon name="Save" size={16} className="mr-2" />
              Сохранить
            </Button>
          </div>

          {currentConfig && (
            <Button 
              onClick={handleDisconnect} 
              variant="destructive" 
              className="w-full"
            >
              <Icon name="Unplug" size={16} className="mr-2" />
              Отключить MySQL
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
