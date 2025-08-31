// src/app/components/ProfessionalKLineChart.tsx
// 修復版 v5.0.8 - 使用正確的 createSeriesMarkers API

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  createSeriesMarkers,
  ColorType,
  CrosshairMode,
  LineStyle,
  PriceScaleMode,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';
import type {
  IChartApi,
  CandlestickData,
  LineData,
  HistogramData,
  Time,
  SeriesMarker,
  ISeriesApi,
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
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const seriesMarkersRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔧 修復: 改進日期轉換函數，返回正確的 Time 類型
  const convertToTime = (date: Date | string): Time => {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    
    // 確保日期有效
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date:', date);
      dateObj = new Date();
    }
    
    // 轉換為UTC timestamp (秒) - lightweight-charts 接受的 Time 類型
    return Math.floor(dateObj.getTime() / 1000) as Time;
  };

  // 🔧 修復: 改進數據驗證
  const validateStockData = (data: StockData[]) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('股票數據為空或格式不正確');
    }

    // 檢查必需欄位
    const firstItem = data[0];
    const requiredFields = ['date', 'open', 'high', 'low', 'close', 'volume'];
    
    for (const field of requiredFields) {
      if (!(field in firstItem)) {
        throw new Error(`缺少必要欄位: ${field}`);
      }
    }

    return true;
  };

  useEffect(() => {
    // 🔧 修復: 檢查必要條件
    if (!chartContainerRef.current) {
      console.warn('Chart container not ready, waiting...');
      return;
    }

    if (!stockData || stockData.length === 0) {
      console.warn('Stock data not ready, waiting...');
      setError('等待股票數據載入...');
      return;
    }

    let chart: IChartApi | null = null;

    const initChart = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🚀 開始初始化 lightweight-charts v5.0.8...');
        console.log('📊 股票數據:', { 
          symbol, 
          dataLength: stockData.length,
          highLowPointsLength: highLowPoints.length,
          firstDataItem: stockData[0],
          containerReady: !!chartContainerRef.current
        });

        // 🔧 修復: 再次確認容器存在
        if (!chartContainerRef.current) {
          throw new Error('圖表容器未準備就緒');
        }

        // 🔧 修復: 數據驗證
        validateStockData(stockData);

        // 創建圖表
        chart = createChart(chartContainerRef.current!, {
          width: chartContainerRef.current!.clientWidth,
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

        // 🔧 修復: 改進數據準備和類型處理
        console.log('📈 準備K線數據...');
        const candlestickData: CandlestickData[] = stockData
          .map((item, index) => {
            try {
              // 數據驗證
              if (typeof item.open !== 'number' || typeof item.high !== 'number' || 
                  typeof item.low !== 'number' || typeof item.close !== 'number') {
                console.warn(`數據項目 ${index} 格式錯誤:`, item);
                return null;
              }

              const candleData: CandlestickData = {
                time: convertToTime(item.date),
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
              };

              return candleData;
            } catch (error) {
              console.warn(`處理數據項目 ${index} 時出錯:`, error);
              return null;
            }
          })
          .filter((item): item is CandlestickData => item !== null);

        if (candlestickData.length === 0) {
          throw new Error('沒有有效的K線數據');
        }

        console.log('✅ K線數據準備完成:', candlestickData.length, '筆');

        // 🔧 修復: v5.0.8 正確的 series 創建方式
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

        candlestickSeriesRef.current = candlestickSeries;
        candlestickSeries.setData(candlestickData);

        // 🔧 修復: 安全地添加移動平均線
        const addMovingAverage = (
          period: number,
          color: string,
          dataKey: keyof StockData
        ) => {
          try {
            const maData: LineData[] = stockData
              .filter(item => item[dataKey] && !isNaN(item[dataKey] as number))
              .map(item => ({
                time: convertToTime(item.date),
                value: item[dataKey] as number,
              }));

            if (maData.length > 0) {
              const maSeries = chart!.addSeries(LineSeries, {
                color,
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 4,
                priceLineVisible: false,
                lastValueVisible: true,
                title: `MA${period}`,
              });
              maSeries.setData(maData);
              console.log(`✅ MA${period} 添加成功:`, maData.length, '筆');
            }
          } catch (error) {
            console.warn(`添加 MA${period} 失敗:`, error);
          }
        };

        // 添加移動平均線
        addMovingAverage(5, '#ff9800', 'ma5');
        addMovingAverage(20, '#2196f3', 'ma20');
        addMovingAverage(60, '#9c27b0', 'ma60');

        // 🔧 修復: 改進成交量處理
        try {
          const volumeData: HistogramData[] = stockData
            .filter(item => item.volume > 0)
            .map(item => ({
              time: convertToTime(item.date),
              value: item.volume,
              color: item.close >= item.open 
                ? (isDarkMode ? '#26a69a80' : '#26a69a60')
                : (isDarkMode ? '#ef535080' : '#ef535060'),
            }));

          if (volumeData.length > 0) {
            const volumeSeries = chart.addSeries(HistogramSeries, {
              priceFormat: {
                type: 'volume',
              },
              priceScaleId: '',
            });

            volumeSeries.setData(volumeData);

            // 配置成交量位置
            volumeSeries.priceScale().applyOptions({
              scaleMargins: {
                top: 0.7,
                bottom: 0,
              },
            });

            console.log('✅ 成交量添加成功:', volumeData.length, '筆');
          }
        } catch (error) {
          console.warn('添加成交量失敗:', error);
        }

        // 🔧 修復: v5.0.8 正確的 Marker API 使用方式
        if (highLowPoints && highLowPoints.length > 0) {
          try {
            console.log('📍 準備添加高低點標記:', highLowPoints.length, '個');
            
            const markers: SeriesMarker<Time>[] = highLowPoints.map(point => {
              const time = convertToTime(point.date);
              const isHigh = point.type === 'HIGH';

              return {
                time,
                position: isHigh ? 'aboveBar' : 'belowBar',
                color: isHigh ? '#e53e3e' : '#38a169',
                shape: isHigh ? 'arrowDown' : 'arrowUp',
                text: `${isHigh ? '高' : '底'}${point.confirmed ? '' : '?'}\n${point.price.toFixed(2)}`,
                size: point.confirmed ? 1 : 0.8,
              };
            });

            // 🔧 v5.0.8 正確的 API: 使用 createSeriesMarkers
            console.log('🔧 使用 createSeriesMarkers API...');
            const seriesMarkers = createSeriesMarkers(candlestickSeries, markers);
            seriesMarkersRef.current = seriesMarkers;
            
            console.log('✅ 高低點標記添加成功');
          } catch (error) {
            console.warn('添加高低點標記失敗:', error);
            console.error('標記錯誤詳情:', error);
          }
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
          if (chart) {
            chart.timeScale().fitContent();
            console.log('✅ 圖表初始化完成');
            setIsLoading(false);
          }
        }, 200);

        // 清理函數
        return () => {
          window.removeEventListener('resize', handleResize);
          if (seriesMarkersRef.current) {
            // 清理 markers
            seriesMarkersRef.current.setMarkers([]);
            seriesMarkersRef.current = null;
          }
          if (chart) {
            chart.remove();
          }
          chartRef.current = null;
          candlestickSeriesRef.current = null;
        };

      } catch (error) {
        console.error('❌ 創建圖表失敗:', error);
        setError(
          `載入圖表失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
        );
        setIsLoading(false);
      }
    };

    // 🔧 修復: 延遲初始化，確保 DOM 完全準備就緒
    const timeoutId = setTimeout(() => {
      if (chartContainerRef.current && stockData && stockData.length > 0) {
        initChart();
      } else {
        console.warn('延遲初始化條件不滿足:', {
          containerReady: !!chartContainerRef.current,
          dataReady: !!(stockData && stockData.length > 0)
        });
        setError('圖表初始化條件不滿足，請檢查數據');
      }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      if (seriesMarkersRef.current) {
        seriesMarkersRef.current.setMarkers([]);
        seriesMarkersRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
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

  // 🔧 修復: 添加數據和容器檢查的載入狀態
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
        <div className="text-xs mt-4 text-left bg-gray-100 p-3 rounded">
          <div><strong>調試信息:</strong></div>
          <div>• 股票: {symbol}</div>
          <div>• 數據筆數: {stockData?.length || 0}</div>
          <div>• 高低點: {highLowPoints?.length || 0}</div>
          <div>• 數據狀態: {stockData && stockData.length > 0 ? '✅ 已準備' : '⏳ 等待中'}</div>
          <div>• 第一筆數據: {stockData && stockData[0] ? JSON.stringify({
            date: stockData[0].date,
            close: stockData[0].close,
            volume: stockData[0].volume
          }) : 'N/A'}</div>
        </div>
      </div>
    );
  }

  // 🔧 修復: 添加數據檢查的錯誤狀態
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
        <div className="text-xs mb-4 text-left bg-gray-100 p-3 rounded max-h-40 overflow-y-auto">
          <div><strong>調試信息:</strong></div>
          <div>• 股票: {symbol}</div>
          <div>• 數據筆數: {stockData?.length || 0}</div>
          <div>• 容器狀態: {chartContainerRef.current ? '✅ 已準備' : '❌ 未準備'}</div>
          {stockData && stockData.length > 0 && (
            <div>• 數據樣本: {JSON.stringify(stockData[0], null, 2)}</div>
          )}
        </div>
        <button
          onClick={() => {
            setError(null);
            setIsLoading(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mr-2"
        >
          重試載入
        </button>
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
          📈 {symbol} - TradingView 專業K線圖 v5.0.8
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
        <strong>💡 v5.0.8 專業功能：</strong>
        滑鼠滾輪縮放 | 拖拽平移 | 雙擊重置 | 十字線詳細數據 | 🔺底點標記 |
        🔻高點標記 | 橙線MA5 | 藍線MA20 | 紫線MA60 | createSeriesMarkers API
      </div>
    </div>
  );
};

export default ProfessionalKLineChart;