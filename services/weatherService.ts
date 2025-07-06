import axios from 'axios';

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
    };
    humidity: number;
    wind_kph: number;
    wind_mph: number;
    wind_dir: string;
    pressure_mb: number;
    precip_mm: number;
    feelslike_c: number;
    uv: number;
    visibility_km: number;
  };
  forecast?: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        avgtemp_c: number;
        maxwind_kph: number;
        totalprecip_mm: number;
        avghumidity: number;
        condition: {
          text: string;
          icon: string;
        };
      };
      hour: Array<{
        time: string;
        temp_c: number;
        condition: {
          text: string;
          icon: string;
        };
        humidity: number;
        wind_kph: number;
        chance_of_rain: number;
      }>;
    }>;
  };
}

class WeatherService {
  private static instance: WeatherService;
  private apiKey = '634a0908fd40356c59b7ed6d1e87a328';
  private baseUrl = 'https://api.openweathermap.org/data/2.5';

  private constructor() {}

  public static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  // Get current weather by city name
  public async getWeatherByCity(city: string): Promise<WeatherData | null> {
    try {
      console.log('WeatherService: Fetching weather for city:', city);
      
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: `${city},IN`,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      console.log('WeatherService: Weather data received for', city);
      
      // Transform OpenWeatherMap data to our format
      const data = response.data;
      return {
        location: {
          name: data.name,
          region: data.sys.country,
          country: data.sys.country,
          lat: data.coord.lat,
          lon: data.coord.lon,
          localtime: new Date().toISOString()
        },
        current: {
          temp_c: data.main.temp,
          temp_f: (data.main.temp * 9/5) + 32,
          condition: {
            text: data.weather[0].description,
            icon: data.weather[0].icon
          },
          humidity: data.main.humidity,
          wind_kph: data.wind.speed * 3.6, // Convert m/s to km/h
          wind_mph: data.wind.speed * 2.237, // Convert m/s to mph
          wind_dir: this.getWindDirection(data.wind.deg),
          pressure_mb: data.main.pressure,
          precip_mm: data.rain ? data.rain['1h'] || 0 : 0,
          feelslike_c: data.main.feels_like,
          uv: 5, // OpenWeatherMap doesn't provide UV in free tier
          visibility_km: data.visibility / 1000
        }
      };
    } catch (error) {
      console.error('WeatherService: Error fetching weather for city:', city, error);
      return null;
    }
  }

  // Get current weather by pincode
  public async getWeatherByPincode(pincode: string): Promise<WeatherData | null> {
    try {
      console.log('WeatherService: Fetching weather for pincode:', pincode);
      
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: `${pincode},IN`,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      console.log('WeatherService: Weather data received for pincode', pincode);
      
      // Transform OpenWeatherMap data to our format
      const data = response.data;
      return {
        location: {
          name: data.name,
          region: data.sys.country,
          country: data.sys.country,
          lat: data.coord.lat,
          lon: data.coord.lon,
          localtime: new Date().toISOString()
        },
        current: {
          temp_c: data.main.temp,
          temp_f: (data.main.temp * 9/5) + 32,
          condition: {
            text: data.weather[0].description,
            icon: data.weather[0].icon
          },
          humidity: data.main.humidity,
          wind_kph: data.wind.speed * 3.6,
          wind_mph: data.wind.speed * 2.237,
          wind_dir: this.getWindDirection(data.wind.deg),
          pressure_mb: data.main.pressure,
          precip_mm: data.rain ? data.rain['1h'] || 0 : 0,
          feelslike_c: data.main.feels_like,
          uv: 5,
          visibility_km: data.visibility / 1000
        }
      };
    } catch (error) {
      console.error('WeatherService: Error fetching weather for pincode:', pincode, error);
      return null;
    }
  }

  // Get weather for user's location (tries city first, then pincode)
  public async getUserWeather(city: string, pincode: string): Promise<WeatherData | null> {
    try {
      console.log('WeatherService: Getting weather for user location:', city, pincode);
      
      // Try city first
      if (city) {
        const cityWeather = await this.getWeatherByCity(city);
        if (cityWeather) {
          console.log('WeatherService: Found weather data for city:', city);
          return cityWeather;
        }
      }

      // Fallback to pincode
      if (pincode) {
        const pincodeWeather = await this.getWeatherByPincode(pincode);
        if (pincodeWeather) {
          console.log('WeatherService: Found weather data for pincode:', pincode);
          return pincodeWeather;
        }
      }

      console.log('WeatherService: No weather data found for user location');
      return null;
    } catch (error) {
      console.error('WeatherService: Error getting user weather:', error);
      return null;
    }
  }

  // Helper function to convert wind degrees to direction
  private getWindDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  // Test method to verify API is working
  public async testAPI(): Promise<boolean> {
    try {
      console.log('WeatherService: Testing API connection...');
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: 'Mumbai,IN',
          appid: this.apiKey,
          units: 'metric'
        }
      });
      
      console.log('WeatherService: API test successful:', response.status);
      return response.status === 200;
    } catch (error) {
      console.error('WeatherService: API test failed:', error);
      return false;
    }
  }

  // Get agriculture-friendly weather info
  public getAgricultureWeatherInfo(weather: WeatherData): {
    isGoodForFarming: boolean;
    recommendations: string[];
    alerts: string[];
  } {
    const temp = weather.current.temp_c;
    const humidity = weather.current.humidity;
    const precip = weather.current.precip_mm;
    const windSpeed = weather.current.wind_kph;

    const recommendations: string[] = [];
    const alerts: string[] = [];

    // Temperature analysis
    if (temp < 10) {
      alerts.push('Temperature is low for most crops');
      recommendations.push('Consider cold-resistant crops or greenhouse farming');
    } else if (temp > 35) {
      alerts.push('High temperature may stress crops');
      recommendations.push('Ensure adequate irrigation and shade');
    } else if (temp >= 20 && temp <= 30) {
      recommendations.push('Optimal temperature for most crops');
    }

    // Humidity analysis
    if (humidity < 40) {
      alerts.push('Low humidity - crops may need more water');
      recommendations.push('Increase irrigation frequency');
    } else if (humidity > 80) {
      alerts.push('High humidity - watch for fungal diseases');
      recommendations.push('Ensure good air circulation');
    }

    // Rainfall analysis
    if (precip > 50) {
      alerts.push('Heavy rainfall - protect crops from waterlogging');
      recommendations.push('Check drainage systems');
    } else if (precip < 5) {
      alerts.push('Low rainfall - irrigation needed');
      recommendations.push('Schedule irrigation');
    }

    // Wind analysis
    if (windSpeed > 20) {
      alerts.push('Strong winds may damage crops');
      recommendations.push('Consider wind protection measures');
    }

    const isGoodForFarming = temp >= 15 && temp <= 30 && humidity >= 40 && humidity <= 70;

    return {
      isGoodForFarming,
      recommendations,
      alerts
    };
  }
}

export default WeatherService; 