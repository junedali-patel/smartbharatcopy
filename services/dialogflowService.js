// Replace axios import with fetch (built into React Native)
// import axios from 'axios';
import { schemes } from './schemes';

const PROJECT_ID = 'appa-456917';
const LOCATION = 'global'; // or e.g. asia-south1
const AGENT_ID = '1a22cadf-1f4a-4173-9712-76961dafbee9';
const SESSION_ID = Math.random().toString(36).substring(7); // random ID
const LANGUAGE_CODE = 'en';

// Fallback data for news
const fallbackNews = [
  {
    title: "Government announces new agricultural reforms",
    source: { name: "Ministry of Agriculture" }
  },
  {
    title: "Digital India initiative reaches new milestones",
    source: { name: "Ministry of Electronics and IT" }
  }
];

// Fallback weather data for when API fails
const fallbackWeatherData = {
  temperature: 25,
  feels_like: 27,
  temp_min: 22,
  temp_max: 28,
  humidity: 65,
  wind_speed: 5,
  description: "partly cloudy",
  sunrise: "06:30 AM",
  sunset: "06:30 PM"
};

let accessToken = '';

const loadAccessToken = async () => {
  const res = await fetch('/your-service-account-key.json');
  const key = await res.json();

  const tokenRes = await axios.post(
    `https://oauth2.googleapis.com/token`,
    {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: createJWT(key),
    }
  );

  accessToken = tokenRes.data.access_token;
};

const createJWT = (key) => {
  // JWT creation logic (we'll plug this later)
  return 'YOUR_JWT_TOKEN';
};

const fetchWeatherData = async (city) => {
  try {
    const apiKey = '6c14fad1d3f1651d2d72ec1cc2837a44';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch weather data');
    }
    
    const { main, weather, wind, sys, name } = data;
    const sunrise = new Date(sys.sunrise * 1000).toLocaleTimeString();
    const sunset = new Date(sys.sunset * 1000).toLocaleTimeString();
    
    return {
      success: true,
      data: {
        city: name,
        temperature: main.temp,
        feels_like: main.feels_like,
        temp_min: main.temp_min,
        temp_max: main.temp_max,
        humidity: main.humidity,
        wind_speed: wind.speed,
        description: weather[0].description,
        sunrise,
        sunset,
        pressure: main.pressure,
        visibility: response.data.visibility / 1000, // Convert to km
        clouds: response.data.clouds?.all || 0
      }
    };
  } catch (error) {
    console.error('Weather API error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.status === 401 
        ? "API key is invalid or not configured"
        : error.response?.status === 404
          ? `City "${city}" not found`
          : "Failed to fetch weather data",
      data: {
        ...fallbackWeatherData,
        city: city
      }
    };
  }
};

const formatWeatherResponse = (weatherData, language = 'en') => {
  const { 
    city, 
    temperature, 
    feels_like, 
    temp_min, 
    temp_max, 
    humidity, 
    wind_speed, 
    description, 
    sunrise, 
    sunset,
    pressure,
    visibility,
    clouds
  } = weatherData;
  
  if (language === 'hi') {
    return `मौसम की जानकारी ${city} में:
तापमान: ${temperature}°C
महसूस हो रहा: ${feels_like}°C
न्यूनतम: ${temp_min}°C
अधिकतम: ${temp_max}°C
आर्द्रता: ${humidity}%
हवा की गति: ${wind_speed} m/s
दबाव: ${pressure} hPa
दृश्यता: ${visibility} km
बादल: ${clouds}%
मौसम: ${description}
सूर्योदय: ${sunrise}
सूर्यास्त: ${sunset}`;
  }
  
  return `Weather in ${city}:
Temperature: ${temperature}°C
Feels like: ${feels_like}°C
Min: ${temp_min}°C
Max: ${temp_max}°C
Humidity: ${humidity}%
Wind Speed: ${wind_speed} m/s
Pressure: ${pressure} hPa
Visibility: ${visibility} km
Clouds: ${clouds}%
Weather: ${description}
Sunrise: ${sunrise}
Sunset: ${sunset}`;
};

const fetchGovernmentSchemes = async (state = 'All') => {
  try {
    // Filter schemes by state if specified
    if (state !== 'All') {
      return schemes.filter(scheme => 
        scheme.states.includes(state) || scheme.states.includes('All')
      );
    }
    return schemes;
  } catch (error) {
    console.error('Error fetching schemes:', error);
    return schemes; // Return all schemes as fallback
  }
};

const fetchNews = async (language = 'en') => {
  try {
    const apiKey = process.env.REACT_APP_NEWS_API_KEY;
    if (!apiKey) {
      throw new Error('News API key is not configured');
    }

    const url = `https://newsapi.org/v2/top-headlines?country=in&language=${language === 'hi' ? 'hi' : 'en'}&apiKey=${apiKey}&pageSize=5`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch news');
    }

    return data.articles.map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source.name,
      publishedAt: new Date(article.publishedAt).toLocaleDateString()
    }));
  } catch (error) {
    console.error('News API error:', error);
    return [];
  }
};

const formatNewsResponse = (articles, language = 'en') => {
  if (articles.length === 0) {
    return language === 'hi' 
      ? 'क्षमा करें, मैं समाचार प्राप्त नहीं कर सका। कृपया बाद में पुनः प्रयास करें।'
      : 'Sorry, I couldn\'t fetch the news. Please try again later.';
  }

  let response = language === 'hi' 
    ? 'यहां कुछ ताजा समाचार हैं:\n\n'
    : 'Here are some latest news:\n\n';

  articles.forEach((article, index) => {
    response += `${index + 1}. ${article.title}\n`;
    response += `   ${article.description}\n`;
    response += `   स्रोत: ${article.source} | प्रकाशित: ${article.publishedAt}\n`;
    response += `   👉 ${article.url}\n\n`;
  });

  return response;
};

const findMatchingScheme = async (message, state) => {
  try {
    const schemes = await fetchGovernmentSchemes(state);
    const lowerMessage = message.toLowerCase();
    
    // First, try to match exact scheme titles
    const exactMatch = schemes.find(scheme => 
      scheme.title.toLowerCase() === lowerMessage ||
      (scheme.language?.hi && scheme.language.hi.toLowerCase() === lowerMessage)
    );
    if (exactMatch) return exactMatch;

    // Then, try to match keywords from scheme titles and descriptions
    const keywordMatch = schemes.find(scheme => {
      const schemeKeywords = [
        scheme.title.toLowerCase(),
        scheme.description.toLowerCase(),
        ...(scheme.language?.hi ? [scheme.language.hi.toLowerCase()] : []),
        scheme.category.toLowerCase()
      ];
      
      return schemeKeywords.some(keyword => lowerMessage.includes(keyword));
    });
    if (keywordMatch) return keywordMatch;

    // Finally, try to match partial words from scheme titles
    const partialMatch = schemes.find(scheme => {
      const titleWords = scheme.title.toLowerCase().split(' ');
      return titleWords.some(word => 
        word.length > 3 && lowerMessage.includes(word)
      );
    });
    
    return partialMatch || null;
  } catch (error) {
    console.error('Scheme matching error:', error);
    return null;
  }
};

const getCategorySchemes = async (category, state = 'All') => {
  const schemes = await fetchGovernmentSchemes(state);
  return schemes.filter(scheme => 
    scheme.category.toLowerCase() === category.toLowerCase() &&
    (scheme.states.includes(state) || scheme.states.includes('All'))
  );
};

// Change from export const to const
const sendToDialogflowCX = async (text) => {
  if (!accessToken) await loadAccessToken();

  const url = `https://dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents/${AGENT_ID}/sessions/${SESSION_ID}:detectIntent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      queryInput: {
        text: {
          text,
        },
        languageCode: LANGUAGE_CODE,
      },
    }),
  });

  const data = await response.json();
  const messages = data.queryResult.responseMessages;
  return messages.map((msg) => msg.text?.text?.[0]).join(' ');
};

// Change from export const to const
const getRealResponse = async (text, language = 'en') => {
  const lower = text.toLowerCase();
  
  // Handle weather queries
  if (lower.includes("weather") || lower.includes("मौसम")) {
    const city = text.match(/(?:in|at|from|में) ([A-Za-z\s]+)/i)?.[1]?.trim() || "Delhi";
    const weatherResult = await fetchWeatherData(city);
    
    if (weatherResult.success) {
      return formatWeatherResponse(weatherResult.data, language);
    } else {
      const fallbackMessage = language === 'hi'
        ? `मैं ${city} के लिए वास्तविक मौसम की जानकारी प्राप्त नहीं कर सका। यहां अनुमानित मौसम की जानकारी है:\n\n${formatWeatherResponse(weatherResult.data, language)}`
        : `I couldn't fetch real-time weather for ${city}. Here's an estimated weather report:\n\n${formatWeatherResponse(weatherResult.data, language)}`;
      
      return fallbackMessage;
    }
  }
  
  // Handle news queries
  if (lower.includes("news") || lower.includes("समाचार") || lower.includes("खबर")) {
    const articles = await fetchNews(language);
    return formatNewsResponse(articles, language);
  }
  
  // Handle scheme queries
  if (lower.includes("scheme") || lower.includes("yojana")) {
    const scheme = await findMatchingScheme(text, 'All');
    if (scheme) {
      const response = language === 'hi' 
        ? `${scheme.language.hi}\n👉 आवेदन के लिए यहां क्लिक करें: ${scheme.applyLink}`
        : `${scheme.description}\n👉 Apply here: ${scheme.applyLink}`;
      return response;
    }
    return language === 'hi' 
      ? "मैं कोई मिलान करने वाली योजना नहीं ढूंढ पाया। कृपया अपना प्रश्न दोबारा लिखें।"
      : "I couldn't find a matching scheme. Please try rephrasing your query.";
  }
  
  // Handle category-based queries
  const categories = ['farming', 'health', 'housing', 'welfare', 'education'];
  const matchedCategory = categories.find(category => lower.includes(category));
  if (matchedCategory) {
    const categorySchemes = await getCategorySchemes(matchedCategory);
    if (categorySchemes.length > 0) {
      const response = language === 'hi'
        ? `${matchedCategory} से संबंधित योजनाएं:\n\n${categorySchemes.map((scheme, index) => 
            `${index + 1}. ${scheme.language.hi}\n   आवेदन के लिए यहां क्लिक करें: ${scheme.applyLink}`
          ).join('\n\n')}`
        : `${matchedCategory} related schemes:\n\n${categorySchemes.map((scheme, index) => 
            `${index + 1}. ${scheme.title}\n   ${scheme.description}\n   Apply here: ${scheme.applyLink}`
          ).join('\n\n')}`;
      return response;
    }
  }
  
  // Handle state-specific queries
  const states = ['maharashtra', 'uttar pradesh', 'bihar'];
  const matchedState = states.find(state => lower.includes(state));
  if (matchedState) {
    const stateSchemes = await fetchGovernmentSchemes(matchedState);
    if (stateSchemes.length > 0) {
      const response = language === 'hi'
        ? `${matchedState} की योजनाएं:\n\n${stateSchemes.map((scheme, index) => 
            `${index + 1}. ${scheme.language.hi}\n   आवेदन के लिए यहां क्लिक करें: ${scheme.applyLink}`
          ).join('\n\n')}`
        : `Schemes available in ${matchedState}:\n\n${stateSchemes.map((scheme, index) => 
            `${index + 1}. ${scheme.title}\n   ${scheme.description}\n   Apply here: ${scheme.applyLink}`
          ).join('\n\n')}`;
      return response;
    }
  }
  
  // Default response with available options
  const availableSchemes = await fetchGovernmentSchemes();
  const categoriesList = [...new Set(availableSchemes.map(scheme => scheme.category))];
  
  return language === 'hi'
    ? `मैं आपकी कैसे मदद कर सकता हूं? मैं निम्नलिखित जानकारी प्रदान कर सकता हूं:
1. मौसम की जानकारी (जैसे "मुंबई का मौसम")
2. सरकारी योजनाएं (जैसे "पीएम किसान योजना के बारे में बताएं")
3. श्रेणी-वार योजनाएं: ${categoriesList.join(', ')}
4. राज्य-विशेष योजनाएं: ${states.join(', ')}
5. नवीनतम समाचार

कृपया अपना प्रश्न पूछें।`
    : `How can I help you? I can provide information about:
1. Weather (e.g., "weather in Mumbai")
2. Government schemes (e.g., "tell me about PM Kisan scheme")
3. Category-wise schemes: ${categoriesList.join(', ')}
4. State-specific schemes: ${states.join(', ')}
5. Latest news

Please ask your question.`;
};
// Single export statement at the bottom
export {
  sendToDialogflowCX,
  getRealResponse,
  fetchGovernmentSchemes,
  fetchWeatherData,
  fetchNews,
  formatWeatherResponse,
  formatNewsResponse
};