// src/app/components/StockResultsList.tsx
// 股票回測結果清單組件

import React, { useState } from 'react';
import { BacktestResults } from '../interfaces/stockData';
import StockChartModal from './StockChartModal';

interface StockResultsListProps {
  results: BacktestResults;
  isDarkMode?: boolean;
}

interface StockSummary {
  symbol: string;
  trades: number;
  winRate: number;
  totalProfit: number;
  finalValue: number;
  returnRate: number;
  hasChartData: boolean;
}

const StockResultsList: React.FC<StockResultsListProps> = ({
  results,
  isDarkMode = false,
}) => {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    'symbol' | 'profit' | 'winRate' | 'trades'
  >('profit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 處理股票摘要數據
  const stockSummaries: StockSummary[] = React.useMemo(() => {
    const summaries: StockSummary[] = [];

    // 從 stockPerformance 獲取基本信息
    results.stockPerformance?.forEach((stock) => {
      const hasChartData = !!(
        results.chartData && results.chartData[stock.stock]
      );

      // 🔧 修正：直接使用後端計算的真實數據，不再假設投資成本
      const totalInvestment = stock.totalInvestment || 0; // 後端計算的實際投入成本
      const finalValue = totalInvestment + stock.totalProfit;
      const returnRate = stock.returnRate || 0; // 後端計算的真實報酬率

      summaries.push({
        symbol: stock.stock,
        trades: stock.trades,
        winRate: stock.winRate * 100, // 轉換為百分比
        totalProfit: stock.totalProfit,
        finalValue,
        returnRate,
        hasChartData,
      });
    });

    // 如果沒有 stockPerformance，從 chartData 創建基本摘要
    if (summaries.length === 0 && results.chartData) {
      Object.keys(results.chartData).forEach((symbol) => {
        summaries.push({
          symbol,
          trades: 0,
          winRate: 0,
          totalProfit: 0,
          finalValue: 0,
          returnRate: 0,
          hasChartData: true,
        });
      });
    }

    return summaries;
  }, [results]);

  // 排序功能
  const sortedStocks = React.useMemo(() => {
    return [...stockSummaries].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'profit':
          comparison = a.totalProfit - b.totalProfit;
          break;
        case 'winRate':
          comparison = a.winRate - b.winRate;
          break;
        case 'trades':
          comparison = a.trades - b.trades;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [stockSummaries, sortBy, sortOrder]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number, decimals = 2) => {
    return `${percent.toFixed(decimals)}%`;
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600';
    if (profit < 0) return 'text-red-600';
    return isDarkMode ? 'text-gray-300' : 'text-gray-600';
  };

  const getReturnRateColor = (rate: number) => {
    if (rate > 0) return 'text-green-600';
    if (rate < 0) return 'text-red-600';
    return isDarkMode ? 'text-gray-300' : 'text-gray-600';
  };

  if (stockSummaries.length === 0) {
    return (
      <div
        className={`p-6 text-center rounded-lg ${
          isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'
        }`}
      >
        <p>目前沒有股票回測結果</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg shadow-lg transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
      }`}
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3
            className={`text-xl font-bold transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}
          >
            📈 股票回測結果清單 ({stockSummaries.length} 支股票)
          </h3>

          <div className="text-sm text-gray-500">💡 點擊股票行查看詳細圖表</div>
        </div>

        {/* 表格標題 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                className={`border-b-2 ${
                  isDarkMode ? 'border-gray-600' : 'border-gray-200'
                }`}
              >
                <th
                  className={`text-left p-3 font-semibold cursor-pointer hover:bg-opacity-50 transition-colors ${
                    isDarkMode
                      ? 'text-gray-200 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => handleSort('symbol')}
                >
                  股票代碼{' '}
                  {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className={`text-right p-3 font-semibold cursor-pointer hover:bg-opacity-50 transition-colors ${
                    isDarkMode
                      ? 'text-gray-200 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => handleSort('trades')}
                >
                  交易次數{' '}
                  {sortBy === 'trades' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className={`text-right p-3 font-semibold cursor-pointer hover:bg-opacity-50 transition-colors ${
                    isDarkMode
                      ? 'text-gray-200 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => handleSort('winRate')}
                >
                  勝率{' '}
                  {sortBy === 'winRate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className={`text-right p-3 font-semibold cursor-pointer hover:bg-opacity-50 transition-colors ${
                    isDarkMode
                      ? 'text-gray-200 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => handleSort('profit')}
                >
                  總損益{' '}
                  {sortBy === 'profit' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className={`text-right p-3 font-semibold ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}
                >
                  報酬率
                </th>
                <th
                  className={`text-center p-3 font-semibold ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}
                >
                  圖表
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStocks.map((stock) => (
                <tr
                  key={stock.symbol}
                  className={`border-b transition-colors duration-200 ${
                    isDarkMode
                      ? 'border-gray-700 hover:bg-gray-700/50'
                      : 'border-gray-100 hover:bg-gray-50'
                  } ${stock.hasChartData ? 'cursor-pointer' : ''}`}
                  onClick={() =>
                    stock.hasChartData && setSelectedStock(stock.symbol)
                  }
                  title={stock.hasChartData ? '點擊查看圖表' : '無圖表數據'}
                >
                  <td
                    className={`p-3 font-medium ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}
                  >
                    {stock.symbol}
                    {stock.hasChartData && (
                      <span className="ml-2 text-xs">📊</span>
                    )}
                  </td>
                  <td
                    className={`p-3 text-right ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    {stock.trades}
                  </td>
                  <td
                    className={`p-3 text-right ${
                      stock.winRate > 50
                        ? 'text-green-600'
                        : stock.winRate < 50
                        ? 'text-red-600'
                        : isDarkMode
                        ? 'text-gray-300'
                        : 'text-gray-600'
                    }`}
                  >
                    {formatPercent(stock.winRate)}
                  </td>
                  <td
                    className={`p-3 text-right font-medium ${getProfitColor(
                      stock.totalProfit,
                    )}`}
                  >
                    {formatCurrency(stock.totalProfit)}
                  </td>
                  <td
                    className={`p-3 text-right font-medium ${getReturnRateColor(
                      stock.returnRate,
                    )}`}
                  >
                    {formatPercent(stock.returnRate)}
                  </td>
                  <td className="p-3 text-center">
                    {stock.hasChartData ? (
                      <span className="text-green-500 text-lg">📈</span>
                    ) : (
                      <span className="text-gray-400 text-lg">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 統計摘要 */}
        <div
          className={`mt-6 p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
          }`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div
                className={`font-semibold ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                總股票數
              </div>
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`}
              >
                {stockSummaries.length}
              </div>
            </div>
            <div className="text-center">
              <div
                className={`font-semibold ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                有圖表數據
              </div>
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}
              >
                {stockSummaries.filter((s) => s.hasChartData).length}
              </div>
            </div>
            <div className="text-center">
              <div
                className={`font-semibold ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                獲利股票
              </div>
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}
              >
                {stockSummaries.filter((s) => s.totalProfit > 0).length}
              </div>
            </div>
            <div className="text-center">
              <div
                className={`font-semibold ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                虧損股票
              </div>
              <div
                className={`text-lg font-bold ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`}
              >
                {stockSummaries.filter((s) => s.totalProfit < 0).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 彈跳視窗 */}
      {selectedStock &&
        results.chartData &&
        results.chartData[selectedStock] && (
          <StockChartModal
            isOpen={true}
            onClose={() => setSelectedStock(null)}
            stockSymbol={selectedStock}
            stockData={results.chartData[selectedStock].stockData}
            highLowPoints={results.chartData[selectedStock].highLowPoints}
            buyPoints={results.chartData[selectedStock].buyPoints}
            sellPoints={results.chartData[selectedStock].sellPoints}
            stockPerformance={results.stockPerformance?.find(
              (s) => s.stock === selectedStock,
            )}
            highLowAnalysis={results.highLowAnalysis?.[selectedStock]}
            isDarkMode={isDarkMode}
          />
        )}
    </div>
  );
};

export default StockResultsList;
