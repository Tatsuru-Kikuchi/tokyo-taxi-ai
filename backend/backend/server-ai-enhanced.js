// OpenWeather API統合
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'bd17578f85cb46d681ca3e4f3bdc9963';

// 実際の天気データ取得
app.get('/api/weather', async (req, res) => {
  const { lat, lon } = req.query;
  
  try {
    // OpenWeather APIを使用
    const weatherResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=ja`
    );
    
    const forecastResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=ja`
    );
    
    const currentWeather = weatherResponse.data;
    const forecast = forecastResponse.data;
    
    // 30分後の雨予報チェック
    const rainIn30Min = forecast.list[0].weather[0].main === 'Rain';
    
    // 需要影響計算
    let demandImpact = 0;
    if (currentWeather.weather[0].main === 'Rain') {
      demandImpact = 30 + (currentWeather.rain?.['1h'] || 0) * 5; // 雨量に応じて増加
    } else if (currentWeather.main.temp > 35) {
      demandImpact = 25; // 猛暑
    } else if (currentWeather.main.temp < 5) {
      demandImpact = 20; // 寒冷
    }
    
    res.json({
      current: {
        temp: Math.round(currentWeather.main.temp),
        condition: currentWeather.weather[0].main,
        description: currentWeather.weather[0].description,
        humidity: currentWeather.main.humidity,
        windSpeed: currentWeather.wind.speed
      },
      rainIn30Min,
      rainProbability: forecast.list[0].pop * 100,
      demandImpact,
      forecast: forecast.list.slice(0, 6).map(item => ({
        time: item.dt_txt,
        temp: Math.round(item.main.temp),
        condition: item.weather[0].main,
        rainProbability: item.pop * 100
      }))
    });
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ error: error.message });
  }
});
