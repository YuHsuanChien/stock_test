// src/app/components/EChartsProfessionalKLineChart.tsx
// ECharts 專業 K 線圖組件 - 替換 lightweight-charts

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { StockData, HighLowPoint } from '../interfaces/stockData';

interface EChartsProfessionalKLineChartProps {
  stockData: StockData[];
  highLowPoints: HighLowPoint[];
  symbol: string;
  isDarkMode?: boolean;
}

const EChartsProfessionalKLineChart: React.FC<
  EChartsProfessionalKLineChartProps
> = ({ stockData, highLowPoints, symbol, isDarkMode = false }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 使用 useMemo 優化數據處理
  const chartOption = useMemo(() => {
    if (!stockData || stockData.length === 0) {
      setError('等待股票數據載入...');
      return null;
    }

    try {
      setError(null);

      // 準備數據
      const dates = stockData.map((item) => {
        const date =
          typeof item.date === 'string' ? new Date(item.date) : item.date;
        return date.toISOString().split('T')[0];
      });

      const candlestickData = stockData.map((item) => [
        item.open, // 開盤價
        item.close, // 收盤價
        item.low, // 最低價
        item.high, // 最高價
      ]);

      const volumeData = stockData.map((item) => item.volume);

      // 準備移動平均線數據
      const ma5Data = stockData.map((item) => item.ma5 || null);
      const ma20Data = stockData.map((item) => item.ma20 || null);
      const ma60Data = stockData.map((item) => item.ma60 || null);

      // 計算價格區間，用於設置 Y 軸和標記偏移
      const allPrices = stockData.flatMap((item) => [
        item.open,
        item.high,
        item.low,
        item.close,
      ]);
      const minPrice = Math.min(...allPrices);
      const maxPrice = Math.max(...allPrices);
      const priceRange = maxPrice - minPrice;
      const pricePadding = priceRange * 0.1;

      // 根據價格範圍動態計算標記偏移量（約為價格範圍的0.4%）
      const markingOffset = priceRange * 0.004;

      // 準備高低點標記
      const highLowMarkings = highLowPoints.map((point) => {
        const date =
          typeof point.date === 'string' ? new Date(point.date) : point.date;
        const dateStr = date.toISOString().split('T')[0];
        const dateIndex = dates.indexOf(dateStr);

        return {
          name: `${point.type === 'HIGH' ? '高點' : '底點'}${
            point.confirmed ? '' : '(待確認)'
          }`,
          coord: [
            dateIndex,
            point.type === 'HIGH'
              ? point.price + markingOffset
              : point.price - markingOffset,
          ],
          value: `${point.price.toFixed(2)}`,
          itemStyle: {
            color: point.type === 'HIGH' ? '#e53e3e' : '#38a169',
          },
          symbol: point.type === 'HIGH' ? 'pin' : 'pin',
          symbolSize: point.confirmed ? 30 : 20,
          symbolRotate: point.type === 'HIGH' ? 0 : 180,
        };
      });

      // ECharts 配置選項
      return {
        title: {
          textStyle: {
            color: isDarkMode ? '#ffffff' : '#333333',
            fontSize: 16,
            fontWeight: 'bold',
          },
          left: 'center',
        },
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        animation: false,
        legend: {
          data: ['K線', 'MA5', 'MA20', 'MA60', '成交量'],
          textStyle: {
            color: isDarkMode ? '#d1d5db' : '#333333',
          },
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
          },
          backgroundColor: isDarkMode
            ? 'rgba(31, 41, 55, 0.9)'
            : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
          textStyle: {
            color: isDarkMode ? '#ffffff' : '#333333',
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (params: any) => {
            const data = params[0];
            if (!data) return '';

            const dateStr = dates[data.dataIndex];
            const candleData = candlestickData[data.dataIndex];
            const volume = volumeData[data.dataIndex];

            let tooltip = `<div style="font-weight: bold; margin-bottom: 8px;">${dateStr}</div>`;
            tooltip += `<div>開盤: ${candleData[0].toFixed(2)}</div>`;
            tooltip += `<div>收盤: ${candleData[1].toFixed(2)}</div>`;
            tooltip += `<div>最低: ${candleData[2].toFixed(2)}</div>`;
            tooltip += `<div>最高: ${candleData[3].toFixed(2)}</div>`;
            tooltip += `<div>成交量: ${volume.toLocaleString()}</div>`;

            if (ma5Data[data.dataIndex]) {
              tooltip += `<div>MA5: ${ma5Data[data.dataIndex]?.toFixed(
                2,
              )}</div>`;
            }
            if (ma20Data[data.dataIndex]) {
              tooltip += `<div>MA20: ${ma20Data[data.dataIndex]?.toFixed(
                2,
              )}</div>`;
            }
            if (ma60Data[data.dataIndex]) {
              tooltip += `<div>MA60: ${ma60Data[data.dataIndex]?.toFixed(
                2,
              )}</div>`;
            }

            return tooltip;
          },
        },
        axisPointer: {
          link: [
            {
              xAxisIndex: 'all',
            },
          ],
          label: {
            backgroundColor: isDarkMode ? '#6366f1' : '#6366f1',
          },
        },
        toolbox: {
          feature: {
            dataZoom: {
              yAxisIndex: false,
            },
            brush: {
              type: ['lineX', 'clear'],
            },
            saveAsImage: {
              name: `${symbol}_kline_chart`,
            },
          },
          iconStyle: {
            borderColor: isDarkMode ? '#ffffff' : '#333333',
          },
        },
        brush: {
          xAxisIndex: 'all',
          brushLink: 'all',
          outOfBrush: {
            colorAlpha: 0.1,
          },
        },
        visualMap: {
          show: false,
          seriesIndex: 4,
          dimension: 2,
          pieces: [
            {
              value: 1,
              color: '#26a69a',
            },
            {
              value: -1,
              color: '#ef5350',
            },
          ],
        },
        grid: [
          {
            left: '10%',
            right: '8%',
            height: '50%',
          },
          {
            left: '10%',
            right: '8%',
            top: '65%',
            height: '16%',
          },
        ],
        xAxis: [
          {
            type: 'category',
            data: dates,
            boundaryGap: false,
            axisLine: { onZero: false },
            splitLine: { show: false },
            min: 'dataMin',
            max: 'dataMax',
            axisPointer: {
              z: 100,
            },
            axisLabel: {
              color: isDarkMode ? '#d1d5db' : '#666666',
            },
          },
          {
            type: 'category',
            gridIndex: 1,
            data: dates,
            boundaryGap: false,
            axisLine: { onZero: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            min: 'dataMin',
            max: 'dataMax',
          },
        ],
        yAxis: [
          {
            scale: true,
            min: 'dataMin',
            max: 'dataMax',
            axisLabel: {
              color: isDarkMode ? '#d1d5db' : '#666666',
            },
            splitLine: {
              lineStyle: {
                color: isDarkMode ? '#374151' : '#e5e7eb',
              },
            },
          },
          {
            scale: true,
            gridIndex: 1,
            splitNumber: 2,
            axisLabel: { show: false },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
          },
        ],
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: [0, 1],
            start: 80,
            end: 100,
          },
          {
            show: true,
            xAxisIndex: [0, 1],
            type: 'slider',
            top: '85%',
            start: 80,
            end: 100,
            textStyle: {
              color: isDarkMode ? '#d1d5db' : '#666666',
            },
          },
        ],
        series: [
          {
            name: 'K線',
            type: 'candlestick',
            data: candlestickData,
            itemStyle: {
              color: '#ef5350', // 上漲改為紅色
              color0: '#26a69a', // 下跌改為綠色
              borderColor: '#ef5350', // 上漲邊框改為紅色
              borderColor0: '#26a69a', // 下跌邊框改為綠色
            },
            markPoint: {
              data: highLowMarkings,
            },
          },
          {
            name: 'MA5',
            type: 'line',
            data: ma5Data,
            smooth: true,
            lineStyle: {
              opacity: 0.8,
              color: '#ff9800',
              width: 2,
            },
            symbol: 'none',
          },
          {
            name: 'MA20',
            type: 'line',
            data: ma20Data,
            smooth: true,
            lineStyle: {
              opacity: 0.8,
              color: '#2196f3',
              width: 2,
            },
            symbol: 'none',
          },
          {
            name: 'MA60',
            type: 'line',
            data: ma60Data,
            smooth: true,
            lineStyle: {
              opacity: 0.8,
              color: '#9c27b0',
              width: 2,
            },
            symbol: 'none',
          },
          {
            name: '成交量',
            type: 'bar',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: volumeData.map((volume, index) => {
              const candleItem = candlestickData[index];
              return {
                value: volume,
                itemStyle: {
                  color:
                    candleItem[1] >= candleItem[0] ? '#ef535080' : '#26a69a80', // 上漲紅色，下跌綠色
                },
              };
            }),
          },
        ],
      };
    } catch (error) {
      console.error('❌ 準備 ECharts 數據失敗:', error);
      setError(
        `準備圖表數據失敗: ${
          error instanceof Error ? error.message : '未知錯誤'
        }`,
      );
      return null;
    }
  }, [stockData, highLowPoints, symbol, isDarkMode]);

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
        <div className="text-xs mb-4 text-left bg-gray-100 p-3 rounded max-h-40 overflow-y-auto">
          <div>
            <strong>調試信息:</strong>
          </div>
          <div>• 股票: {symbol}</div>
          <div>• 數據筆數: {stockData?.length || 0}</div>
        </div>
        <button
          onClick={() => {
            setError(null);
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

  // 載入狀態
  if (!chartOption) {
    return (
      <div
        className={`p-8 text-center rounded-lg transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>載入專業K線圖中...</p>
        <p className="text-sm text-gray-500 mt-2">Apache ECharts 專業版</p>
        <div className="text-xs mt-4 text-left bg-gray-100 p-3 rounded">
          <div>
            <strong>調試信息:</strong>
          </div>
          <div>• 股票: {symbol}</div>
          <div>• 數據筆數: {stockData?.length || 0}</div>
          <div>• 高低點: {highLowPoints?.length || 0}</div>
          <div>
            • 數據狀態:{' '}
            {stockData && stockData.length > 0 ? '✅ 已準備' : '⏳ 等待中'}
          </div>
        </div>
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
          📈 {symbol} - ECharts 專業K線圖
        </h4>
      </div>

      {/* 圖表容器 */}
      <div
        className={`w-full border rounded ${
          isDarkMode ? 'border-gray-600' : 'border-gray-300'
        }`}
      >
        <ReactECharts
          option={chartOption}
          style={{
            height: isFullscreen ? 'calc(100vh - 160px)' : '600px',
            width: '100%',
          }}
          theme={isDarkMode ? 'dark' : undefined}
          opts={{ renderer: 'canvas' }}
        />
      </div>

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
        <strong>💡 ECharts 專業功能：</strong>
        滑鼠滾輪縮放 | 拖拽平移 | 框選縮放 | 工具欄功能 | 📍高低點標記 | 橙線MA5
        | 藍線MA20 | 紫線MA60 | 成交量柱狀圖 | 專業 Tooltip
      </div>
    </div>
  );
};

export default EChartsProfessionalKLineChart;
