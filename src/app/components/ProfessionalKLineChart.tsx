// src/app/components/ProfessionalKLineChart.tsx
// 正確使用 lightweight-charts v5.0.8

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  PriceScaleMode,
  HistogramSeries,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
} from 'lightweight-charts';
import type {
  IChartApi,
  CandlestickData,
  LineData,
  HistogramData,
  UTCTimestamp,
  SeriesMarker,
  Time,
} from 'lightweight-charts';
import { StockData, HighLowPoint } from '../interfaces/stockData';

interface ProfessionalKLineChartProps {
  stockData: StockData[];
  highLowPoints: HighLowPoint[];
  symbol: string;
  isDarkMode?: boolean;
}

const ProfessionalKLineChart: React.FC<ProfessionalKLineChartProps> = ({
  stockData,
  highLowPoints,
  symbol,
  isDarkMode = false,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || stockData.length === 0) return;

    try {
      setIsLoading(true);
      setError(null);

      // 創建圖表實例
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: isFullscreen ? window.innerHeight - 100 : 600,
        layout: {
          background: {
            type: ColorType.Solid,
            color: isDarkMode ? '#1f2937' : '#ffffff',
          },
          textColor: isDarkMode ? '#d1d5db' : '#374151',
        },
        grid: {
          vertLines: {
            color: isDarkMode ? '#374151' : '#e5e7eb',
            style: LineStyle.Solid,
          },
          horzLines: {
            color: isDarkMode ? '#374151' : '#e5e7eb',
            style: LineStyle.Solid,
          },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
          mode: PriceScaleMode.Normal,
        },
        timeScale: {
          borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      chartRef.current = chart;

      // 準備K線數據
      const candlestickData: CandlestickData[] = stockData.map((item) => ({
        time: (item.date.getTime() / 1000) as UTCTimestamp,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }));

      // 創建K線系列 - v5正確語法
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });

      candlestickSeries.setData(candlestickData);

      // 添加MA5線 - v5正確語法
      const ma5Data: LineData[] = stockData
        .filter((item) => item.ma5 && !isNaN(item.ma5))
        .map((item) => ({
          time: (item.date.getTime() / 1000) as UTCTimestamp,
          value: item.ma5!,
        }));

      if (ma5Data.length > 0) {
        const ma5Series = chart.addSeries(LineSeries, {
          color: '#ff9800',
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        ma5Series.setData(ma5Data);
      }

      // 添加MA20線 - v5正確語法
      const ma20Data: LineData[] = stockData
        .filter((item) => item.ma20 && !isNaN(item.ma20))
        .map((item) => ({
          time: (item.date.getTime() / 1000) as UTCTimestamp,
          value: item.ma20!,
        }));

      if (ma20Data.length > 0) {
        const ma20Series = chart.addSeries(LineSeries, {
          color: '#2196f3',
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        ma20Series.setData(ma20Data);
      }

      // 添加MA60線 - v5正確語法
      const ma60Data: LineData[] = stockData
        .filter((item) => item.ma60 && !isNaN(item.ma60))
        .map((item) => ({
          time: (item.date.getTime() / 1000) as UTCTimestamp,
          value: item.ma60!,
        }));

      if (ma60Data.length > 0) {
        const ma60Series = chart.addSeries(LineSeries, {
          color: '#9c27b0',
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        ma60Series.setData(ma60Data);
      }

      // 添加成交量 - v5正確語法使用HistogramSeries
      if (stockData.some((item) => item.volume > 0)) {
        const volumeData: HistogramData[] = stockData.map((item) => ({
          time: (item.date.getTime() / 1000) as UTCTimestamp,
          value: item.volume,
          color:
            item.close >= item.open
              ? isDarkMode
                ? '#26a69a80'
                : '#26a69a60'
              : isDarkMode
              ? '#ef535080'
              : '#ef535060',
        }));

        const volumeSeries = chart.addSeries(HistogramSeries, {
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '', // 設定為overlay
        });

        volumeSeries.setData(volumeData);

        // 配置成交量的位置 - 底部30%
        volumeSeries.priceScale().applyOptions({
          scaleMargins: {
            top: 0.7, // K線占上方70%
            bottom: 0, // 成交量占下方30%
          },
        });
      }

      // 添加高低點標記
      if (highLowPoints && highLowPoints.length > 0) {
        const markers: SeriesMarker<Time>[] = highLowPoints.map((point) => {
          const time = (point.date.getTime() / 1000) as UTCTimestamp;
          const isHigh = point.type === 'HIGH';

          return {
            time: time,
            position: isHigh ? 'aboveBar' : 'belowBar',
            color: isHigh ? '#e53e3e' : '#38a169',
            shape: isHigh ? 'arrowDown' : 'arrowUp',
            text: `${isHigh ? '高' : '底'}${
              point.confirmed ? '' : '?'
            }\n${point.price.toFixed(2)}`,
            size: point.confirmed ? 1 : 0.8,
          };
        });

        createSeriesMarkers(candlestickSeries, markers);
      }

      // 響應式處理
      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: isFullscreen ? window.innerHeight - 100 : 600,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      // 自動調整視圖
      setTimeout(() => {
        chart.timeScale().fitContent();
      }, 100);

      setIsLoading(false);

      // 清理函數
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chart) {
          chart.remove();
        }
        chartRef.current = null;
      };
    } catch (error) {
      console.error('創建圖表失敗:', error);
      setError(
        `載入圖表失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
      );
      setIsLoading(false);
    }
  }, [stockData, highLowPoints, isDarkMode, isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const downloadChart = () => {
    if (chartRef.current) {
      try {
        const canvas = chartRef.current.takeScreenshot();
        const link = document.createElement('a');
        link.download = `${symbol}_kline_chart.png`;
        link.href = canvas.toDataURL();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('下載圖表失敗:', error);
        alert('下載功能暫時不可用');
      }
    }
  };

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  // 載入狀態
  if (isLoading) {
    return (
      <div
        className={`p-8 text-center rounded-lg transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>載入專業K線圖中...</p>
        <p className="text-sm text-gray-500 mt-2">
          TradingView Lightweight Charts v5.0.8
        </p>
      </div>
    );
  }

  // 錯誤狀態
  if (error) {
    return (
      <div
        className={`p-8 text-center rounded-lg border transition-colors duration-300 ${
          isDarkMode
            ? 'bg-red-900/20 border-red-700 text-red-300'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}
      >
        <div className="text-4xl mb-4">⚠️</div>
        <h4 className="font-semibold mb-2">圖表載入失敗</h4>
        <p className="text-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          重新載入頁面
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg shadow-lg transition-colors duration-300 ${
        isDarkMode
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-white border border-gray-200'
      } ${isFullscreen ? 'fixed inset-4 z-50 p-4' : 'p-4'}`}
    >
      {/* 標題和控制按鈕 */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h4
          className={`text-lg font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}
        >
          📈 {symbol} - TradingView 專業K線圖
        </h4>

        <div className="flex gap-2">
          <button
            onClick={resetZoom}
            className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
            title="重置縮放"
          >
            🔄
          </button>

          <button
            onClick={downloadChart}
            className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            title="下載圖表"
          >
            💾
          </button>

          <button
            onClick={toggleFullscreen}
            className="px-3 py-1 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
            title={isFullscreen ? '退出全屏' : '全屏顯示'}
          >
            {isFullscreen ? '🔽' : '🔼'}
          </button>

          {isFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 圖表容器 */}
      <div
        ref={chartContainerRef}
        className={`w-full border rounded ${
          isDarkMode ? 'border-gray-600' : 'border-gray-300'
        }`}
        style={{ height: isFullscreen ? 'calc(100vh - 160px)' : '600px' }}
      />

      {/* 統計信息 */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div
          className={`p-3 rounded border transition-colors duration-300 ${
            isDarkMode
              ? 'bg-blue-900/20 border-blue-700'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <h5 className="font-semibold text-blue-600 mb-2">📊 圖表統計</h5>
          <div className="text-xs space-y-1">
            <div>交易天數: {stockData.length.toLocaleString()}</div>
            <div>
              高點標記: {highLowPoints.filter((p) => p.type === 'HIGH').length}
            </div>
            <div>
              底點標記: {highLowPoints.filter((p) => p.type === 'LOW').length}
            </div>
          </div>
        </div>

        <div
          className={`p-3 rounded border transition-colors duration-300 ${
            isDarkMode
              ? 'bg-green-900/20 border-green-700'
              : 'bg-green-50 border-green-200'
          }`}
        >
          <h5 className="font-semibold text-green-600 mb-2">🟢 近期高點</h5>
          <div className="text-xs space-y-1 max-h-20 overflow-y-auto">
            {highLowPoints
              .filter((p) => p.type === 'HIGH')
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .slice(0, 3)
              .map((point, index) => (
                <div key={index} className="text-green-600">
                  {point.price.toFixed(2)} ({point.date.toLocaleDateString()})
                </div>
              ))}
          </div>
        </div>

        <div
          className={`p-3 rounded border transition-colors duration-300 ${
            isDarkMode
              ? 'bg-red-900/20 border-red-700'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <h5 className="font-semibold text-red-600 mb-2">🔴 近期底點</h5>
          <div className="text-xs space-y-1 max-h-20 overflow-y-auto">
            {highLowPoints
              .filter((p) => p.type === 'LOW')
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .slice(0, 3)
              .map((point, index) => (
                <div key={index} className="text-red-600">
                  {point.price.toFixed(2)} ({point.date.toLocaleDateString()})
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* 操作提示 */}
      <div
        className={`mt-3 p-2 rounded text-xs transition-colors duration-300 ${
          isDarkMode
            ? 'bg-gray-700/50 text-gray-300'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        <strong>💡 專業功能：</strong>
        滑鼠滾輪縮放 | 拖拽平移 | 雙擊重置 | 十字線詳細數據 | 🔺底點標記 |
        🔻高點標記 | 橙線MA5 | 藍線MA20 | 紫線MA60
      </div>
    </div>
  );
};

export default ProfessionalKLineChart;
