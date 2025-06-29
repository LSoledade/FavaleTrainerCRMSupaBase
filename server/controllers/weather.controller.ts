import type { Request, Response } from "express";
import { checkWeatherService, getWeatherByCity } from "../weather-service"; // Adjust path as needed

// API de clima - Verificar status do serviço
export const checkStatus = async (req: Request, res: Response) => {
  try {
    const statusResult = await checkWeatherService();
    if (statusResult.status === 'connected') {
      res.json(statusResult);
    } else {
       // Service unavailable or error during check
       console.warn(`Weather service status check failed: ${statusResult.message}`);
      res.status(503).json(statusResult); // Use 503 Service Unavailable
    }
  } catch (error: any) {
    console.error("Erro ao verificar serviço de clima:", error);
    res.status(500).json({ 
      status: 'error', 
      message: `Erro interno ao verificar serviço de clima: ${error.message}` 
    });
  }
};
  
// API de clima - Buscar clima por cidade
export const getWeather = async (req: Request, res: Response) => {
  try {
    const city = req.params.city;
    if (!city) {
      return res.status(400).json({ message: "Nome da cidade é obrigatório" });
    }
    
    const weatherData = await getWeatherByCity(city);
    
    // Handle errors returned from the weather service itself
    if (weatherData.error) {
        console.warn(`Erro da API de clima para ${city}: ${weatherData.error.message} (Code: ${weatherData.error.code})`);
        // If the service indicates an error (like city not found), use 404 or 400.
        // We can't be certain of a specific 'CITY_NOT_FOUND' code string without more info on weather-service.
        const statusCode = weatherData.error.code ? 400 : 404; // Default to 400 if code exists, else 404. More specific handling can be added if error codes are known.
        return res.status(statusCode).json({ 
            message: weatherData.error.message,
            code: weatherData.error.code
        });
    }
      
    res.json(weatherData);
  } catch (error: any) {
    // Handle internal server errors during the process
    console.error(`Erro ao obter dados de clima para ${req.params.city}:`, error);
    res.status(500).json({ 
      message: `Erro interno ao obter dados de clima: ${error.message}` 
    });
  }
}; 