// src/app/components/StockChartModal.tsx
// 股票圖表彈跳視窗組件

import React, { useEffect } from 'react';
import EChartsProfessionalKLineChart from './EChartsProfessionalKLineChart';
import {
  StockData,
  HighLowPoint,
  HighLowAnalysis,
  BuyPoint,
  SellPoint,
} from '../interfaces/stockData';

interface StockChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockSymbol: string;
  stockData: StockData[];
  highLowPoints: HighLowPoint[];
  buyPoints?: BuyPoint[]; // 新增買點數據
  sellPoints?: SellPoint[]; // 新增賣點數據
  stockPerformance?: {
    stock: string;
    trades: number;
    winRate: number;
    totalProfit: number;
  };
  highLowAnalysis?: HighLowAnalysis;
  isDarkMode?: boolean;
}

const StockChartModal: React.FC<StockChartModalProps> = ({
  isOpen,
  onClose,
  stockSymbol,
  stockData,
  highLowPoints,
  buyPoints = [], // 新增買點數據
  sellPoints = [], // 新增賣點數據
  stockPerformance,
  highLowAnalysis,
  isDarkMode = false,
}) => {
  // 處理 ESC 鍵關閉
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 防止背景滾動
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number, decimals = 2) => {
    return `${(percent * 100).toFixed(decimals)}%`;
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600';
    if (profit < 0) return 'text-red-600';
    return isDarkMode ? 'text-gray-300' : 'text-gray-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* 彈跳視窗內容 */}
      <div
        className={`relative w-[95vw] h-[95vh] max-w-7xl rounded-lg shadow-2xl transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
        }`}
      >
        {/* 標題列 */}
        <div
          className={`flex justify-between items-center p-4 border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center space-x-4">
            <h2
              className={`text-2xl font-bold transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}
            >
              📈 {stockSymbol} 股票分析
            </h2>

            {/* 快速統計 */}
            {stockPerformance && (
              <div className="flex items-center space-x-6 text-sm">
                <div>
                  <span
                    className={`${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    交易次數:
                  </span>
                  <span
                    className={`font-semibold ml-1 ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}
                  >
                    {stockPerformance.trades}
                  </span>
                </div>
                <div>
                  <span
                    className={`${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    勝率:
                  </span>
                  <span
                    className={`font-semibold ml-1 ${
                      stockPerformance.winRate > 0.5
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatPercent(stockPerformance.winRate)}
                  </span>
                </div>
                <div>
                  <span
                    className={`${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    總損益:
                  </span>
                  <span
                    className={`font-semibold ml-1 ${getProfitColor(
                      stockPerformance.totalProfit,
                    )}`}
                  >
                    {formatCurrency(stockPerformance.totalProfit)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className={`text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
              isDarkMode
                ? 'hover:bg-gray-700 hover:text-gray-300'
                : 'hover:bg-gray-100 hover:text-gray-900'
            }`}
            title="關閉 (ESC)"
          >
            ×
          </button>
        </div>

        {/* 內容區域 */}
        <div className="p-4 h-[calc(95vh-80px)] overflow-y-auto">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full">
            {/* 圖表區域 */}
            <div className="xl:col-span-3">
              <div
                className={`h-full rounded-lg p-4 ${
                  isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'
                }`}
              >
                <EChartsProfessionalKLineChart
                  stockData={stockData}
                  highLowPoints={highLowPoints}
                  buyPoints={buyPoints}
                  sellPoints={sellPoints}
                  symbol={stockSymbol}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>

            {/* 分析結果側邊欄 */}
            <div className="xl:col-span-1 space-y-4">
              {/* 基本資訊 */}
              <div
                className={`p-4 rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700/50 border border-gray-600'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <h3
                  className={`font-bold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  📊 基本資訊
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span
                      className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}
                    >
                      股票代碼:
                    </span>
                    <span
                      className={`font-semibold ${
                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                      }`}
                    >
                      {stockSymbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}
                    >
                      資料筆數:
                    </span>
                    <span
                      className={`font-semibold ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-800'
                      }`}
                    >
                      {stockData.length} 天
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span
                      className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}
                    >
                      標記點數:
                    </span>
                    <span
                      className={`font-semibold ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-800'
                      }`}
                    >
                      {highLowPoints.length} 個
                    </span>
                  </div>
                </div>
              </div>

              {/* 高低點分析 */}
              {highLowAnalysis && (
                <div
                  className={`p-4 rounded-lg ${
                    highLowAnalysis.trendConfirmed
                      ? isDarkMode
                        ? 'bg-green-900/30 border border-green-700'
                        : 'bg-green-50 border border-green-200'
                      : isDarkMode
                      ? 'bg-gray-700/50 border border-gray-600'
                      : 'bg-gray-50 border border-gray-300'
                  }`}
                >
                  <h3
                    className={`font-bold mb-3 ${
                      highLowAnalysis.trendConfirmed
                        ? 'text-green-600'
                        : isDarkMode
                        ? 'text-gray-300'
                        : 'text-gray-600'
                    }`}
                  >
                    📈 高低點分析
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span
                        className={
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }
                      >
                        高點數量:
                      </span>
                      <span
                        className={`font-semibold ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-800'
                        }`}
                      >
                        {highLowAnalysis.highs.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className={
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }
                      >
                        低點數量:
                      </span>
                      <span
                        className={`font-semibold ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-800'
                        }`}
                      >
                        {highLowAnalysis.lows.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className={
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }
                      >
                        頭頭高:
                      </span>
                      <span
                        className={`font-semibold ${
                          highLowAnalysis.isHigherHighs
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {highLowAnalysis.isHigherHighs ? '✅ 是' : '❌ 否'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className={
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }
                      >
                        底底高:
                      </span>
                      <span
                        className={`font-semibold ${
                          highLowAnalysis.isHigherLows
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {highLowAnalysis.isHigherLows ? '✅ 是' : '❌ 否'}
                      </span>
                    </div>
                    <div
                      className={`mt-3 p-2 rounded text-center font-bold ${
                        highLowAnalysis.trendConfirmed
                          ? isDarkMode
                            ? 'bg-green-800/50 text-green-400'
                            : 'bg-green-100 text-green-700'
                          : isDarkMode
                          ? 'bg-red-800/50 text-red-400'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {highLowAnalysis.trendConfirmed
                        ? '🎯 趨勢確認'
                        : '❌ 趨勢未確認'}
                    </div>
                  </div>
                </div>
              )}

              {/* 交易表現 */}
              {stockPerformance && (
                <div
                  className={`p-4 rounded-lg ${
                    stockPerformance.totalProfit > 0
                      ? isDarkMode
                        ? 'bg-green-900/30 border border-green-700'
                        : 'bg-green-50 border border-green-200'
                      : stockPerformance.totalProfit < 0
                      ? isDarkMode
                        ? 'bg-red-900/30 border border-red-700'
                        : 'bg-red-50 border border-red-200'
                      : isDarkMode
                      ? 'bg-gray-700/50 border border-gray-600'
                      : 'bg-gray-50 border border-gray-300'
                  }`}
                >
                  <h3
                    className={`font-bold mb-3 ${
                      stockPerformance.totalProfit > 0
                        ? 'text-green-600'
                        : stockPerformance.totalProfit < 0
                        ? 'text-red-600'
                        : isDarkMode
                        ? 'text-gray-300'
                        : 'text-gray-600'
                    }`}
                  >
                    💰 交易表現
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span
                        className={
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }
                      >
                        交易次數:
                      </span>
                      <span
                        className={`font-semibold text-lg ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-800'
                        }`}
                      >
                        {stockPerformance.trades}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className={
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }
                      >
                        勝率:
                      </span>
                      <span
                        className={`font-semibold text-lg ${
                          stockPerformance.winRate > 0.5
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatPercent(stockPerformance.winRate)}
                      </span>
                    </div>
                    <div
                      className={`mt-3 p-3 rounded text-center ${
                        stockPerformance.totalProfit > 0
                          ? isDarkMode
                            ? 'bg-green-800/50'
                            : 'bg-green-100'
                          : stockPerformance.totalProfit < 0
                          ? isDarkMode
                            ? 'bg-red-800/50'
                            : 'bg-red-100'
                          : isDarkMode
                          ? 'bg-gray-800/50'
                          : 'bg-gray-100'
                      }`}
                    >
                      <div
                        className={
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }
                      >
                        總損益
                      </div>
                      <div
                        className={`text-xl font-bold ${getProfitColor(
                          stockPerformance.totalProfit,
                        )}`}
                      >
                        {formatCurrency(stockPerformance.totalProfit)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 操作提示 */}
              <div
                className={`p-3 rounded-lg text-xs ${
                  isDarkMode
                    ? 'bg-blue-900/30 border border-blue-700'
                    : 'bg-blue-50 border border-blue-200'
                }`}
              >
                <div
                  className={`font-semibold mb-2 ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-700'
                  }`}
                >
                  💡 操作提示
                </div>
                <ul
                  className={`space-y-1 ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-600'
                  }`}
                >
                  <li>• 按 ESC 鍵關閉視窗</li>
                  <li>• 點擊背景關閉視窗</li>
                  <li>• 圖表支援縮放和拖拽</li>
                  <li>• 滑鼠懸停查看詳細數據</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockChartModal;
