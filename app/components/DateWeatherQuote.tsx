'use client';

import { useEffect, useState } from 'react';
import { quoteOfTheDay } from '@/lib/quotes';
import { weatherLabel } from '@/lib/weather-codes';

const LAT = process.env.NEXT_PUBLIC_CLINIC_LAT || '19.4326';
const LON = process.env.NEXT_PUBLIC_CLINIC_LON || '-99.1332';

export default function DateWeatherQuote() {
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.current) setWeather({ temp: d.current.temperature_2m, code: d.current.weather_code });
      })
      .catch(() => {});
  }, []);

  const quote = quoteOfTheDay();
  const hour = now ? now.getHours() : 12;
  const periodo = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 19 ? 'day' : 'night';
  const saludo = hour < 6 ? 'Buenas madrugadas' : hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const hh = now ? String(now.getHours()).padStart(2, '0') : '--';
  const mm = now ? String(now.getMinutes()).padStart(2, '0') : '--';
  const segPct = now ? (now.getSeconds() / 60) * 100 : 0;
  const wx = weather ? weatherLabel(weather.code) : null;

  return (
    <div className={`card date-weather-card dwq-${periodo}`}>
      <div className="mobile-launch mobile-clock">
        <span className="mobile-clock-time">{now ? now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
        {wx && <span className="mobile-clock-sub">{wx.icon} {Math.round(weather!.temp)}°C</span>}
      </div>
      <div className="dwq-top">
        <div className="dwq-greet">{saludo}</div>
        <div className="dwq-clock">
          <span>{hh}</span><span className="dwq-colon">:</span><span>{mm}</span>
        </div>
        <div className="dwq-progress"><div className="dwq-progress-fill" style={{ width: segPct + '%' }} /></div>
        <div className="dwq-date">
          {now ? now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
        </div>
      </div>
      {wx && (
        <div className="dwq-weather">
          <span className="dwq-weather-icon">{wx.icon}</span>
          <span>{Math.round(weather!.temp)}°C · {wx.label}</span>
        </div>
      )}
      <div className="dwq-quote">“{quote}”</div>
    </div>
  );
}
