export function weatherLabel(code: number): { label: string; icon: string } {
  const map: Record<number, { label: string; icon: string }> = {
    0: { label: 'Despejado', icon: '☀️' },
    1: { label: 'Mayormente despejado', icon: '🌤️' },
    2: { label: 'Parcialmente nublado', icon: '⛅' },
    3: { label: 'Nublado', icon: '☁️' },
    45: { label: 'Neblina', icon: '🌫️' },
    48: { label: 'Neblina helada', icon: '🌫️' },
    51: { label: 'Llovizna ligera', icon: '🌦️' },
    53: { label: 'Llovizna', icon: '🌦️' },
    55: { label: 'Llovizna intensa', icon: '🌧️' },
    61: { label: 'Lluvia ligera', icon: '🌦️' },
    63: { label: 'Lluvia', icon: '🌧️' },
    65: { label: 'Lluvia intensa', icon: '🌧️' },
    71: { label: 'Nieve ligera', icon: '🌨️' },
    73: { label: 'Nieve', icon: '❄️' },
    75: { label: 'Nieve intensa', icon: '❄️' },
    80: { label: 'Chubascos', icon: '🌦️' },
    81: { label: 'Chubascos', icon: '🌧️' },
    82: { label: 'Chubascos fuertes', icon: '⛈️' },
    95: { label: 'Tormenta', icon: '⛈️' },
    96: { label: 'Tormenta con granizo', icon: '⛈️' },
    99: { label: 'Tormenta con granizo', icon: '⛈️' },
  };
  return map[code] || { label: 'Clima', icon: '🌡️' };
}
