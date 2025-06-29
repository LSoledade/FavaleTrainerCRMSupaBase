/**
 * Serviço de clima
 * Integra com a Weather API para fornecer informações meteorológicas
 */
import axios from "axios";
import { log } from "./vite";

// Chave de API para Weather API
const API_KEY = process.env.WEATHER_API_KEY;
const BASE_URL = "https://api.weatherapi.com/v1";

// Interface para os dados da resposta da API
export interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    localtime: string;
  };
  current: {
    temp_c: number;
    temp_f: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_kph: number;
    wind_dir: string;
    humidity: number;
    feelslike_c: number;
    feelslike_f: number;
    uv: number;
    is_day: number;
  };
  forecast?: {
    forecastday: {
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
      };
    }[];
  };
  error?: {
    code: number;
    message: string;
  };
}

// Interface para erros da API
export interface WeatherError {
  error: {
    code: number;
    message: string;
  };
}

/**
 * Obtém dados do clima para uma cidade específica
 * @param city Nome da cidade ou estado
 * @returns Dados meteorológicos ou erro
 */
export async function getWeatherByCity(city: string): Promise<WeatherData> {
  try {
    log(`Buscando dados meteorológicos para: ${city}`, "weather-service");
    
    // Constrói a URL para a API de clima atual
    const url = `${BASE_URL}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(city)}&days=1&lang=pt`;
    
    // Faz a requisição para a API
    const response = await axios.get<WeatherData>(url);
    
    // Retorna os dados recebidos
    return response.data;
  } catch (error: any) {
    log(`Erro ao buscar dados meteorológicos: ${error.message}`, "weather-service");
    
    // Se tiver um erro formatado da API, retorna-o
    if (error.response?.data?.error) {
      return {
        error: error.response.data.error,
        location: { name: "", region: "", country: "", lat: 0, lon: 0, localtime: "" },
        current: {
          temp_c: 0,
          temp_f: 0,
          condition: { text: "", icon: "", code: 0 },
          wind_kph: 0,
          wind_dir: "",
          humidity: 0,
          feelslike_c: 0,
          feelslike_f: 0,
          uv: 0,
          is_day: 0
        }
      };
    }
    
    // Caso contrário, formata um erro genérico
    return {
      error: {
        code: 500,
        message: `Erro ao obter dados do clima: ${error.message}`
      },
      location: { name: "", region: "", country: "", lat: 0, lon: 0, localtime: "" },
      current: {
        temp_c: 0,
        temp_f: 0,
        condition: { text: "", icon: "", code: 0 },
        wind_kph: 0,
        wind_dir: "",
        humidity: 0,
        feelslike_c: 0,
        feelslike_f: 0,
        uv: 0,
        is_day: 0
      }
    };
  }
}

/**
 * Verifica se o serviço de clima está funcionando
 * @returns Status do serviço
 */
export async function checkWeatherService(): Promise<{ status: string; message?: string }> {
  try {
    // Testa a API com uma cidade padrão (São Paulo)
    const response = await getWeatherByCity("São Paulo");
    
    if (response.error) {
      return {
        status: "error",
        message: `Erro na API de clima: ${response.error.message}`
      };
    }
    
    return {
      status: "connected",
      message: `Serviço de clima conectado. Temperatura em ${response.location.name}: ${response.current.temp_c}°C`
    };
  } catch (error: any) {
    return {
      status: "error",
      message: `Falha na verificação do serviço de clima: ${error.message}`
    };
  }
}