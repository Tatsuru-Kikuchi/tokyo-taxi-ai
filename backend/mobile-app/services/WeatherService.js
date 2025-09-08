// services/WeatherService.js
class WeatherService {
  async getStationWeather(stationLat, stationLng, arrivalTime) {
    // OpenWeatherMap API (you already have the key!)
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${stationLat}&lon=${stationLng}&appid=${WEATHER_API_KEY}&units=metric&lang=ja`
    );
    
    const data = await response.json();
    
    // Find weather at arrival time
    const arrivalWeather = data.list.find(item => 
      new Date(item.dt * 1000) >= arrivalTime
    );
    
    return {
      condition: arrivalWeather.weather[0].main,
      temp: arrivalWeather.main.temp,
      rainChance: arrivalWeather.pop * 100,
      description: arrivalWeather.weather[0].description
    };
  }
}
