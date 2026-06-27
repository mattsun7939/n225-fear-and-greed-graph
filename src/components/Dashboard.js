'use client';

import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  Activity,
  ShieldAlert,
  ArrowRight,
  Clock,
  Compass,
  Info,
  Calendar,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  TrendingDown
} from 'lucide-react';

const sentimentColors = {
  'Extreme Fear': { text: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-800/50', dot: 'bg-rose-500', glow: 'shadow-rose-500/20' },
  'Fear': { text: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/50', dot: 'bg-amber-500', glow: 'shadow-amber-500/20' },
  'Neutral': { text: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-800/50', dot: 'bg-yellow-500', glow: 'shadow-yellow-500/20' },
  'Greed': { text: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50', dot: 'bg-emerald-500', glow: 'shadow-emerald-500/20' },
  'Extreme Greed': { text: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-800/50', dot: 'bg-cyan-500', glow: 'shadow-cyan-500/20' }
};

const indicatorDetails = {
  market_momentum: { label: 'Market Momentum', color: '#f43f5e', desc: '日経平均の125日移動平均線に対する乖離率。' },
  stock_price_strength: { label: 'Stock Price Strength', color: '#f59e0b', desc: '日経平均の52週高値・安値に対する現在の株価水準。' },
  stock_price_breadth: { label: 'Stock Price Breadth', color: '#10b981', desc: '過去20日間の上昇日数割合（騰落の広がり）。' },
  junk_bond_demand: { label: 'Junk Bond Demand', color: '#06b6d4', desc: 'グローバルなリスク選好度を示すハイイールド債ETF(HYG)のトレンド。' },
  market_volatility: { label: 'Market Volatility', color: '#8b5cf6', desc: '日経平均のヒストリカル・ボラティリティ（年率）。数値が高いと恐怖。' },
  safe_haven_demand: { label: 'Safe Haven Demand', color: '#ec4899', desc: '株式の直近20日リターンと安全資産需要の対比。' }
};

export default function Dashboard({ initialHistory }) {
  const [timeframe, setTimeframe] = useState('3M'); // '1M', '3M', 'ALL'
  const [visibleIndicators, setVisibleIndicators] = useState({
    market_momentum: false,
    stock_price_strength: false,
    stock_price_breadth: false,
    junk_bond_demand: false,
    market_volatility: false,
    safe_haven_demand: false
  });
  const [selectedHoverData, setSelectedHoverData] = useState(null);
  const [showNikkei, setShowNikkei] = useState(true);

  // If no data
  if (!initialHistory || initialHistory.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-300 p-6">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold mb-2">No Sentiment Data Available</h2>
        <p className="text-zinc-500 text-center max-w-md">
          Please run the fetchData script in the Japanese Fear & Greed Index project directory first to populate index logs.
        </p>
      </div>
    );
  }

  // Latest entry
  const latestData = initialHistory[initialHistory.length - 1];

  // Filter history based on timeframe
  const filteredHistory = useMemo(() => {
    if (timeframe === '1M') {
      return initialHistory.slice(-30);
    } else if (timeframe === '3M') {
      return initialHistory.slice(-90);
    }
    return initialHistory;
  }, [initialHistory, timeframe]);

  // Compute Statistics
  const stats = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    
    let sum = 0;
    let max = { score: -1, date: '' };
    let min = { score: 101, date: '' };
    const counts = { 'Extreme Fear': 0, 'Fear': 0, 'Neutral': 0, 'Greed': 0, 'Extreme Greed': 0 };
    
    filteredHistory.forEach(item => {
      sum += item.score;
      if (item.score > max.score) {
        max = { score: item.score, date: item.date };
      }
      if (item.score < min.score) {
        min = { score: item.score, date: item.date };
      }
      if (counts[item.rating] !== undefined) {
        counts[item.rating]++;
      }
    });

    return {
      average: Math.round(sum / filteredHistory.length),
      max,
      min,
      counts,
      totalDays: filteredHistory.length
    };
  }, [filteredHistory]);

  const activeHoverData = selectedHoverData || latestData;

  const getSentimentLabel = (score) => {
    if (score >= 75) return 'Extreme Greed';
    if (score >= 55) return 'Greed';
    if (score >= 45) return 'Neutral';
    if (score >= 25) return 'Fear';
    return 'Extreme Fear';
  };

  const getGaugeRotation = (score) => {
    // scale 0-100 to -90deg to 90deg (180 deg total range)
    return (score / 100) * 180 - 90;
  };

  const toggleIndicator = (key) => {
    setVisibleIndicators(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white pb-16">
      {/* Background Subtle Gradients */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-zinc-900/60 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-zinc-900/30 blur-[150px] rounded-full pointer-events-none" />
      
      {/* Header */}
      <header className="relative border-b border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md py-5 px-6 sm:px-12 flex flex-col md:flex-row justify-between items-center gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-zinc-800 to-zinc-700 rounded-xl shadow-lg border border-zinc-700/50">
            <Activity className="w-6 h-6 text-zinc-100 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Nikkei 225 Sentiment
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-normal border border-zinc-700/50">
                Fear & Greed Index
              </span>
            </h1>
            <p className="text-xs text-zinc-400">日本の株式市場の市場心理と投資家センチメントの追跡</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900/80 border border-zinc-800/80 rounded-full">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>最新更新 (JST): {latestData.rawTimestamp ? new Date(latestData.rawTimestamp).toLocaleString('ja-JP') : latestData.date}</span>
          </div>
        </div>
      </header>

      {/* Dashboard Content Container */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        
        {/* LEFT COLUMN: GAUGE AND BREAKDOWN */}
        <section className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Circular Gauge Card */}
          <div className="relative overflow-hidden rounded-3xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-8 shadow-xl shadow-black/30 flex flex-col items-center justify-center text-center group transition-all duration-300 hover:border-zinc-700/50">
            <div className="absolute top-4 left-4 flex items-center gap-1.5 text-xs text-zinc-500">
              <Compass className="w-4 h-4" />
              <span>Current Market State</span>
            </div>
            
            {/* Gauge Wrapper */}
            <div className="relative w-64 h-36 mt-6 mb-4 flex justify-center items-end overflow-hidden">
              {/* Semi-circle Gauge Background Arc */}
              <div className="absolute bottom-0 w-56 h-28 border-[14px] border-zinc-800/80 rounded-t-full" />
              
              {/* Color segments arcs */}
              {/* Note: In pure CSS semi-circle colors are complex. We use HSL border coloring here as segment colors */}
              <div className="absolute bottom-0 w-56 h-28 border-[14px] border-transparent border-t-rose-500/20 border-l-rose-500/20 rounded-t-full rotate-45 pointer-events-none" />
              <div className="absolute bottom-0 w-56 h-28 border-[14px] border-transparent border-t-cyan-500/20 border-r-cyan-500/20 rounded-t-full -rotate-45 pointer-events-none" />

              {/* Gauge Needle */}
              <div 
                className="absolute bottom-0 left-[calc(50%-4px)] w-2 h-24 origin-bottom transition-all duration-1000 ease-out"
                style={{ transform: `rotate(${getGaugeRotation(activeHoverData.score)}deg)` }}
              >
                <div className="w-2 h-20 bg-zinc-100 rounded-full shadow-lg shadow-black/50 border border-zinc-900" />
                <div className="w-4 h-4 bg-zinc-100 rounded-full -ml-1 -mt-2 shadow-lg shadow-black/50 border-2 border-zinc-900" />
              </div>
            </div>

            {/* Score & Sentiment Info */}
            <div className="space-y-1.5 z-10 mt-2">
              <span className="text-7xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_12px_rgba(255,255,255,0.05)]">
                {activeHoverData.score}
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className={`text-xl font-bold tracking-wide ${sentimentColors[activeHoverData.rating]?.text || 'text-zinc-300'}`}>
                  {activeHoverData.rating}
                </span>
                <span className={`w-2.5 h-2.5 rounded-full ${sentimentColors[activeHoverData.rating]?.dot || 'bg-zinc-400'} ${sentimentColors[activeHoverData.rating]?.glow || ''} shadow-lg`} />
              </div>
              {activeHoverData.n225Price && (
                <p className="text-sm font-semibold text-zinc-300">
                  日経平均: <span className="text-amber-400">¥{activeHoverData.n225Price.toLocaleString()}</span>
                </p>
              )}
              <p className="text-zinc-500 text-xs">
                Selected Date: <span className="text-zinc-300 font-semibold">{activeHoverData.date}</span>
                {selectedHoverData && <span className="ml-1 text-zinc-500 font-normal hover:text-white cursor-pointer underline" onClick={() => setSelectedHoverData(null)}>(Reset to Latest)</span>}
              </p>
            </div>
            
            {/* Quick scale visual representation */}
            <div className="w-full grid grid-cols-5 gap-1 mt-6 text-[9px] font-bold text-zinc-600 tracking-wider">
              <div className="text-rose-500/80">F.FEAR</div>
              <div className="text-amber-500/80">FEAR</div>
              <div className="text-yellow-500/80">NEUTRAL</div>
              <div className="text-emerald-500/80">GREED</div>
              <div className="text-cyan-500/80">E.GREED</div>
            </div>
          </div>

          {/* Timeframe Distribution & Stats Card */}
          <div className="rounded-3xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-8 shadow-xl shadow-black/30 flex flex-col gap-6 group transition-all duration-300 hover:border-zinc-700/50">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-zinc-400" />
                Historical Stats ({timeframe})
              </h3>
              <HelpCircle className="w-4 h-4 text-zinc-600 hover:text-zinc-400 cursor-pointer" title="選択された期間中の指標統計情報" />
            </div>

            {stats && (
              <div className="grid grid-cols-3 gap-4 border-b border-zinc-800/80 pb-6 text-center">
                <div className="p-3 bg-zinc-950/40 rounded-2xl border border-zinc-800/50">
                  <span className="block text-2xl font-black text-white">{stats.average}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Average</span>
                </div>
                <div className="p-3 bg-zinc-950/40 rounded-2xl border border-zinc-800/50">
                  <span className="block text-2xl font-black text-cyan-400">{stats.max.score}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Peak ({stats.max.date.substring(5)})</span>
                </div>
                <div className="p-3 bg-zinc-950/40 rounded-2xl border border-zinc-800/50">
                  <span className="block text-2xl font-black text-rose-400">{stats.min.score}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Trough ({stats.min.date.substring(5)})</span>
                </div>
              </div>
            )}

            {/* Distribution Bar Chart */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Sentiment Distribution</h4>
              {stats && (
                <div className="space-y-2.5">
                  {Object.entries(stats.counts).reverse().map(([rating, count]) => {
                    const percentage = stats.totalDays > 0 ? Math.round((count / stats.totalDays) * 100) : 0;
                    const colorData = sentimentColors[rating];
                    return (
                      <div key={rating} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className={colorData.text}>{rating}</span>
                          <span className="text-zinc-400">{count} 日 ({percentage}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${colorData.dot}`} 
                            style={{ width: `${percentage}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
        </section>

        {/* RIGHT COLUMN: HISTORICAL TREND AND DETAILED CARDS */}
        <section className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Main Chart Card */}
          <div className="rounded-3xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 p-6 sm:p-8 shadow-xl shadow-black/30 flex flex-col gap-6 group transition-all duration-300 hover:border-zinc-700/50">
            
            {/* Chart Control Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-zinc-400" />
                  Fear & Greed Index History
                </h3>
                <p className="text-xs text-zinc-400">グラフのポイントをホバーするとその日の詳細を左側に表示します</p>
              </div>

              {/* Timeframe Selectors */}
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800/60 self-stretch sm:self-auto">
                {['1M', '3M', 'ALL'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-200 ${
                      timeframe === t 
                        ? 'bg-zinc-800 text-white shadow-md' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Container */}
            <div className="w-full h-80 sm:h-96 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredHistory}
                  margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                  onMouseMove={(state) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      setSelectedHoverData(state.activePayload[0].payload);
                    }
                  }}
                  onMouseLeave={() => {
                    // keep showing latest or keep selected
                  }}
                >
                  <defs>
                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} vertical={false} />
                  
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717a" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                  />
                  
                  <YAxis 
                    yAxisId="left"
                    domain={[0, 100]} 
                    stroke="#71717a" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    dx={-5}
                  />

                  {showNikkei && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={['dataMin - 1000', 'dataMax + 1000']}
                      stroke="#fbbf24"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dx={5}
                      tickFormatter={(val) => `¥${val.toLocaleString()}`}
                    />
                  )}

                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '12px',
                      color: '#f4f4f5'
                    }}
                    itemStyle={{ color: '#a1a1aa' }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                    formatter={(value, name) => {
                      if (name === 'Nikkei 225') {
                        return [`¥${value.toLocaleString()}`, 'Nikkei 225'];
                      }
                      if (name === 'Fear & Greed Index') {
                        return [value, 'Fear & Greed Index'];
                      }
                      return [value, name];
                    }}
                  />

                  {/* Horizontal Threshold references */}
                  <ReferenceLine yAxisId="left" y={75} stroke="#06b6d4" strokeDasharray="3 3" opacity={0.4} label={{ value: 'E.Greed', fill: '#06b6d4', fontSize: 8, position: 'insideRight' }} />
                  <ReferenceLine yAxisId="left" y={55} stroke="#10b981" strokeDasharray="3 3" opacity={0.4} label={{ value: 'Greed', fill: '#10b981', fontSize: 8, position: 'insideRight' }} />
                  <ReferenceLine yAxisId="left" y={45} stroke="#eab308" strokeDasharray="3 3" opacity={0.4} label={{ value: 'Neutral', fill: '#eab308', fontSize: 8, position: 'insideRight' }} />
                  <ReferenceLine yAxisId="left" y={25} stroke="#f97316" strokeDasharray="3 3" opacity={0.4} label={{ value: 'Fear', fill: '#f97316', fontSize: 8, position: 'insideRight' }} />

                  {/* Overall Index Score Area */}
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="score"
                    name="Fear & Greed Index"
                    stroke="#f4f4f5"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#scoreColor)"
                    activeDot={{ r: 6, fill: '#ffffff', stroke: '#18181b', strokeWidth: 2 }}
                  />

                  {/* Toggleable Indicator Lines */}
                  {Object.entries(visibleIndicators).map(([key, isVisible]) => {
                    if (!isVisible) return null;
                    return (
                       <Line
                         yAxisId="left"
                         key={key}
                         type="monotone"
                         dataKey={key}
                         name={indicatorDetails[key].label}
                         stroke={indicatorDetails[key].color}
                         strokeWidth={1.5}
                         dot={false}
                         activeDot={{ r: 4 }}
                       />
                    );
                  })}

                  {/* Superimposed Nikkei 225 Line */}
                  {showNikkei && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="n225Price"
                      name="Nikkei 225"
                      stroke="#fbbf24"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Indicator Selectors (Toggles) */}
            <div className="border-t border-zinc-800/50 pt-5">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Compare Indicators</h4>
              <div className="flex flex-wrap gap-2.5">
                {/* Nikkei 225 Toggle */}
                <button
                  onClick={() => setShowNikkei(!showNikkei)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all duration-200 ${
                    showNikkei
                      ? 'bg-amber-950/40 text-amber-400 border-amber-800/60 shadow-lg shadow-amber-500/5'
                      : 'bg-zinc-950 text-zinc-500 border-zinc-900 hover:border-zinc-700 hover:text-zinc-350'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-md shadow-amber-500/20" />
                  Nikkei 225 Price
                </button>

                {Object.entries(indicatorDetails).map(([key, detail]) => {
                  const isActive = visibleIndicators[key];
                  return (
                    <button
                      key={key}
                      onClick={() => toggleIndicator(key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all duration-200 ${
                        isActive
                          ? 'bg-zinc-100 text-zinc-950 border-white'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <span 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: detail.color }} 
                      />
                      {detail.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Indicator Grid List Card */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Compass className="w-5 h-5 text-zinc-400" />
                Sentiment Indicators Details
              </h3>
              <span className="text-xs text-zinc-500">ホバー時の日付 ({activeHoverData.date}) の値</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeHoverData.indicators && activeHoverData.indicators.map((ind, i) => {
                // Find local details
                const key = ind.name.replace(/\s*\(.*\)/g, '').trim().replace(/\s+/g, '_').toLowerCase();
                const detail = indicatorDetails[key] || { color: '#71717a' };
                const colorData = sentimentColors[ind.rating] || { text: 'text-zinc-300', dot: 'bg-zinc-400' };

                return (
                  <div 
                    key={i}
                    className="group relative overflow-hidden rounded-2xl bg-zinc-900/40 border border-zinc-850 p-5 shadow-md flex flex-col gap-3 transition-all duration-300 hover:border-zinc-750 hover:bg-zinc-900/60 hover:shadow-lg hover:shadow-black/20"
                  >
                    {/* Left Accent Color Indicator Bar */}
                    <div 
                      className="absolute top-0 bottom-0 left-0 w-1 transition-all duration-300 group-hover:w-1.5" 
                      style={{ backgroundColor: detail.color }} 
                    />

                    <div className="flex justify-between items-center pl-2">
                      <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
                        {ind.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-extrabold ${colorData.text}`}>
                          {ind.score}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${colorData.dot}`} />
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 pl-2 leading-relaxed flex-grow">
                      {ind.description}
                    </p>

                    <div className="pl-2 border-t border-zinc-800/40 pt-2 flex justify-between items-center text-[10px] text-zinc-500">
                      <span>Rating: <strong className={colorData.text}>{ind.rating}</strong></span>
                      <button 
                        onClick={() => toggleIndicator(key)}
                        className="text-zinc-400 hover:text-white transition-colors flex items-center gap-0.5"
                      >
                        {visibleIndicators[key] ? 'Hide Line' : 'Plot on Chart'} 
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 sm:px-8 mt-16 text-center text-xs text-zinc-600 border-t border-zinc-900 pt-8">
        <p className="flex justify-center items-center gap-1.5 mb-1.5">
          <Info className="w-3.5 h-3.5" />
          Data sourced from local Fear & Greed index crawler running on Chromebook Linux context (via Yahoo Finance API).
        </p>
        <p>Copyright © {new Date().getFullYear()} N225 Fear & Greed Index Dashboard. Built with Next.js.</p>
      </footer>
    </div>
  );
}
