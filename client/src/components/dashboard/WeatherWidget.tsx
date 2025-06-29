import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, CloudFog, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    localtime: string;
  };
  current: {
    temp_c: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_kph: number;
    wind_dir: string;
    humidity: number;
    feelslike_c: number;
    uv: number;
  };
  error?: {
    code: number;
    message: string;
  };
}

export default function WeatherWidget({ city = "São Paulo" }: { city?: string }) {
  const { toast } = useToast();
  const [localCity, setLocalCity] = useState(city);
  
  // Busca dados do clima da API
  const { data: weather, isLoading, error } = useQuery<WeatherData>({
    queryKey: [`/api/weather/${encodeURIComponent(localCity)}`],
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 30, // 30 minutos
  });

  // Determina o ícone apropriado com base no código de condição
  const getWeatherIcon = (code: number) => {
    // Códigos baseados na documentação da Weather API
    if (code === 1000) return <Sun className="h-8 w-8 text-yellow-500" />; // Ensolarado
    if ([1003, 1006, 1009].includes(code)) return <Cloud className="h-8 w-8 text-gray-400" />; // Nublado
    if ([1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) 
      return <CloudRain className="h-8 w-8 text-blue-400" />; // Chuva
    if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) 
      return <CloudSnow className="h-8 w-8 text-blue-200" />; // Neve
    if ([1087, 1273, 1276, 1279, 1282].includes(code)) 
      return <CloudLightning className="h-8 w-8 text-yellow-400" />; // Tempestade
    if ([1030, 1135, 1147].includes(code)) 
      return <CloudFog className="h-8 w-8 text-gray-300" />; // Neblina
    if ([1069, 1072, 1150, 1153, 1168, 1171, 1198, 1201, 1204, 1207, 1249, 1252, 1261, 1264].includes(code)) 
      return <CloudRain className="h-8 w-8 text-gray-400" />; // Garoa
      
    return <Wind className="h-8 w-8 text-blue-300" />; // Padrão
  };

  // Se estiver carregando, mostra um componente de carregamento
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-2">
            <Skeleton className="h-6 w-24" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se houve um erro ou não há dados do clima
  if (error || !weather || weather.error) {
    return (
      <Card className="overflow-hidden border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Não foi possível obter dados do clima
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-blue-100 dark:border-blue-900">
      <CardContent className="p-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
            Clima em {weather.location.name}
          </h3>
          
          <div className="mt-2 mb-2 flex items-center space-x-3">
            <div>
              {getWeatherIcon(weather.current.condition.code)}
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-800 dark:text-white">
                {Math.round(weather.current.temp_c)}°C
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Sensação {Math.round(weather.current.feelslike_c)}°C
              </span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {weather.current.condition.text}
          </p>
          
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div>
              Umidade: {weather.current.humidity}%
            </div>
            <div>
              Vento: {Math.round(weather.current.wind_kph)} km/h
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}