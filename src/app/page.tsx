'use client';

/**
 * 安全的日期格式化工具
 * 用途：安全地將日期字符串或Date對象格式化為本地日期字符串
 * 處理後端返回的字符串日期和前端的Date對象
 */
const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  try {
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString();
    } else if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return '-';
  } catch (error) {
    console.warn('日期格式化錯誤:', error);
    return '-';
  }
};

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BacktestResults,
  RsiStrategyParams,
  WStrategyParams,
} from './interfaces/stockData';
import { runBacktest } from './services/runBacktest';
import { runFullBacktest } from './services/runFullBacktest';
import W_Strategy from './components/w_strategy';
import RSI_MACD_Strategy from './components/rsi_macd_strategy';
import StockResultsList from './components/StockResultsList';

const BacktestSystem = () => {
  // 暗亮模式狀態
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [stocks, setStocks] = useState<string[]>(['2330', '2454', '2317']);
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>('2025-08-05');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [newStock, setNewStock] = useState<string>('');
  const [selectedStrategy, setSelectedStrategy] =
    useState<string>('W_Strategy');

  // 暗亮模式切換功能
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // 保存用戶偏好到 localStorage
    localStorage.setItem('darkMode', (!isDarkMode).toString());
  };

  // 從 localStorage 恢復暗亮模式設定
  React.useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === 'true');
    } else {
      // 偵測系統偏好
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      setIsDarkMode(prefersDark);
    }
  }, []);

  React.useEffect(() => {
    if (results && results.chartData && selectedStrategy === 'W_Strategy') {
      console.log('results.chartData', results.chartData);
    }
  }, [results, selectedStrategy]);

  const [W_StrategyParams, setW_StrategyParams] = useState<WStrategyParams>({
    strategy: 'w_strategy',

    // 底底高、頭頭高分析
    enableHighLowAnalysis: true, // 預設啟用
    showHighLowChart: true, // 預設顯示圖表

    // 基本條件（保留但不在UI顯示，已內建在後端邏輯中）
    ma5Breakthrough: true,
    previousHighBreak: false, // 不需要此條件
    volumeConfirm: true, // 預設啟用量能確認
    volumeThreshold: 1.2,
    ma20UpTrend: false, // 預設關閉20線向上條件
    bullishAlignment: false, // 預設關閉多頭排列條件
    stopProfit: 0.15, // 15%
    // 注意：現在固定買1000股，不再需要maxPositionSize

    // 新增：回後買上漲策略
    enableBuyUpTrend: true, // 預設啟用
    showBuyPoints: true, // 預設顯示買點標記

    // 新增：MA5跌破賣出功能
    enableMA5SellSignal: false, // 預設關閉，讓用戶決定是否啟用

    // 新增：價格區間限制功能
    enablePriceRangeFilter: false, // 預設關閉
    minPrice: undefined, // 未設定
    maxPrice: undefined, // 未設定
  });

  const [rsiStrategyParams, setRsiStrategyParams] = useState<RsiStrategyParams>(
    {
      // 基礎技術指標參數 (與Python一致)
      strategy: 'rsi_macd',
      rsiPeriod: 14,
      rsiOversold: 35, // 調整為Python標準：35 (深度超賣為25)
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      volumeThreshold: 1.5, // 提高為Python標準：1.5倍
      volumeLimit: 1000,
      // 注意：現在固定買1000股，不再需要maxPositionSize
      stopLoss: 0.06,
      stopProfit: 0.12,
      confidenceThreshold: 0.6, // 平衡Python(70%)與原版(40%)：設定60%

      // 高優先級參數 (追蹤停利機制)
      enableTrailingStop: true,
      trailingStopPercent: 0.05, // Python: 5%追蹤停利
      trailingActivatePercent: 0.03, // Python: 3%獲利後啟動追蹤

      // 中優先級參數 (ATR動態停損)
      enableATRStop: true,
      atrPeriod: 14, // Python: ATR週期14天
      atrMultiplier: 2.0, // Python: ATR倍數2.0
      minHoldingDays: 5, // Python: 最少持有5天 (避免剛進場就被洗出)

      // 價格動能指標
      enablePriceMomentum: true,
      priceMomentumPeriod: 5, // Python: 5日價格動能
      priceMomentumThreshold: 0.03, // Python: 3%動能門檻 (提高精準度)

      // 低優先級參數 (MA60季線)
      enableMA10: false, // Python預設不啟用，但可選擇開啟

      // 新增：Python風格優化參數
      maxTotalExposure: 0.75, // Python: 最大總曝險度75%
      usePythonLogic: true, // 啟用Python決策邏輯 (預設開啟以獲得更好表現)
      hierarchicalDecision: true, // 階層決策模式
      dynamicPositionSize: true, // 動態倉位調整
    },
  );

  /**
   * 回測引擎主函數
   *
   * 用途：執行完整的股票投資策略回測流程
   * 主要流程：
   * 1. 獲取所有股票的歷史數據
   * 2. 計算技術指標
   * 3. 按時間順序模擬交易
   * 4. 執行買賣信號檢查
   * 5. 管理資金和倉位
   * 6. 記錄所有交易明細
   * 7. 計算績效統計數據
   *
   * 倉位管理：
   * - 根據信心度動態調整投入比例
   * - 單檔最大持倉不超過25%
   * - 考慮交易成本 (買入+0.1425%, 賣出-0.35%)
   *
   * @returns void - 結果存儲在 results state 中
   */
  const handleRunBacktest = async () => {
    if (selectedStrategy == 'RSI_MACD_Strategy') {
      await runBacktest(
        stocks,
        startDate,
        endDate,
        rsiStrategyParams,
        setResults,
        setLoading,
      );
    } else {
      await runBacktest(
        stocks,
        startDate,
        endDate,
        W_StrategyParams,
        setResults,
        setLoading,
      );
    }
  };

  const handleRunFullBacktest = async () => {
    if (selectedStrategy == 'RSI_MACD_Strategy') {
      await runFullBacktest(
        startDate,
        endDate,
        rsiStrategyParams,
        setStocks,
        setResults,
        setLoading,
      );
    } else {
      await runFullBacktest(
        startDate,
        endDate,
        W_StrategyParams,
        setStocks,
        setResults,
        setLoading,
      );
    }
  };

  /**
   * 股票添加功能
   *
   * 用途：將新股票代碼添加到回測股票清單
   * 驗證：
   * - 檢查股票代碼不為空
   * - 檢查不重複添加
   * - 成功添加後清空輸入框
   *
   * @returns void
   */
  const addStock = () => {
    if (newStock && !stocks.includes(newStock)) {
      setStocks([...stocks, newStock]);
      setNewStock('');
    }
  };

  /**
   * 股票移除功能
   *
   * 用途：從回測股票清單中移除指定股票
   *
   * @param stockToRemove - 要移除的股票代碼
   * @returns void
   */
  const removeStock = (stockToRemove: string) => {
    setStocks(stocks.filter((stock) => stock !== stockToRemove));
  };

  /**
   * 貨幣格式化工具
   *
   * 用途：將數字格式化為台幣顯示格式
   * 格式：NT$ 1,000,000
   *
   * @param value - 要格式化的數值
   * @returns string - 格式化後的貨幣字串
   */
  const formatCurrency = (value: number): string => {
    return `NT$ ${value.toLocaleString('zh-TW', { minimumFractionDigits: 0 })}`;
  };

  /**
   * 百分比格式化工具
   *
   * 用途：將小數格式化為百分比顯示
   * 格式：12.34%
   *
   * @param value - 要格式化的數值 (0.1234 -> 12.34%)
   * @returns string - 格式化後的百分比字串
   */
  const formatPercent = (value: number): string => {
    return (value * 100).toFixed(2) + '%';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div
      className={`w-full max-w-[80%] mx-auto p-6 min-h-screen transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      {/* 暗亮模式切換按鈕 */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleDarkMode}
          className={`p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
            isDarkMode
              ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300'
              : 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
          }`}
          title={isDarkMode ? '切換到亮色模式' : '切換到暗色模式'}
        >
          {isDarkMode ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </div>

      <div
        className={`rounded-lg shadow-lg p-6 mb-6 transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
        }`}
      >
        <h1
          className={`text-3xl font-bold text-center mb-4 transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}
        >
          策略3.2 優化動態回測系統
        </h1>
        <div className="text-center mb-6">
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-full shadow-lg">
            🚀 結合 Python & React 優點的智能回測引擎
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
          <div
            className={`p-4 rounded-lg border transition-colors duration-300 ${
              isDarkMode
                ? 'bg-gradient-to-br from-blue-900/50 to-indigo-900/50 border-blue-700 text-blue-300'
                : 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200'
            }`}
          >
            <h3
              className={`font-semibold mb-2 ${
                isDarkMode ? 'text-blue-300' : 'text-blue-800'
              }`}
            >
              🐍 Python精華
            </h3>
            <ul
              className={`space-y-1 text-xs ${
                isDarkMode ? 'text-blue-200' : 'text-blue-700'
              }`}
            >
              <li>• 階層決策系統</li>
              <li>• 動態倉位管理</li>
              <li>• 嚴格信號篩選</li>
              <li>• 風險曝險控制</li>
            </ul>
          </div>
          <div
            className={`p-4 rounded-lg border transition-colors duration-300 ${
              isDarkMode
                ? 'bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-green-700'
                : 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-200'
            }`}
          >
            <h3
              className={`font-semibold mb-2 ${
                isDarkMode ? 'text-green-300' : 'text-green-800'
              }`}
            >
              ⚛️ React優勢
            </h3>
            <ul
              className={`space-y-1 text-xs ${
                isDarkMode ? 'text-green-200' : 'text-green-700'
              }`}
            >
              <li>• 即時參數調整</li>
              <li>• 視覺化分析</li>
              <li>• 多資料源整合</li>
              <li>• 完整追蹤停利</li>
            </ul>
          </div>
          <div
            className={`p-4 rounded-lg border transition-colors duration-300 ${
              isDarkMode
                ? 'bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-700'
                : 'bg-gradient-to-br from-purple-50 to-pink-100 border-purple-200'
            }`}
          >
            <h3
              className={`font-semibold mb-2 ${
                isDarkMode ? 'text-purple-300' : 'text-purple-800'
              }`}
            >
              ✨ 融合創新
            </h3>
            <ul
              className={`space-y-1 text-xs ${
                isDarkMode ? 'text-purple-200' : 'text-purple-700'
              }`}
            >
              <li>• 雙模式切換</li>
              <li>• 智能風控</li>
              <li>• 專業指標算法</li>
              <li>• 最佳化參數</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="space-y-4">
            <h3
              className={`text-lg font-semibold transition-colors duration-300 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              股票設定
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="輸入股票代碼"
                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStock()}
              />
              <button
                onClick={addStock}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                新增
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {stocks.map((stock) => (
                <span
                  key={stock}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors duration-300 ${
                    isDarkMode
                      ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {stock}
                  <button
                    onClick={() => removeStock(stock)}
                    className={`ml-1 transition-colors duration-300 ${
                      isDarkMode
                        ? 'text-blue-400 hover:text-blue-200'
                        : 'text-blue-600 hover:text-blue-800'
                    }`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3
              className={`text-lg font-semibold transition-colors duration-300 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              回測期間
            </h3>
            <div className="space-y-2">
              <div>
                <label
                  className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  開始日期
                </label>
                <input
                  type="date"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  結束日期
                </label>
                <input
                  type="date"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <div>
          <h3
            className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}
          >
            選擇策略
          </h3>
          <div className="mb-6">
            <select
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
            >
              <option value="W_Strategy">回後買上漲</option>
              <option value="RSI_MACD_Strategy">RSI+MACD搶反彈</option>
            </select>
          </div>
        </div>
        {/* 回後買上漲策略條件 */}
        <W_Strategy
          selectedStrategy={selectedStrategy}
          isDarkMode={isDarkMode}
          strategyParams={W_StrategyParams} // 傳入參數
          setStrategyParams={setW_StrategyParams} // 傳入設置函數
        />
        {/* RSI+MACD搶反彈條件 */}
        <RSI_MACD_Strategy
          selectedStrategy={selectedStrategy}
          isDarkMode={isDarkMode}
          strategyParams={rsiStrategyParams}
          setStrategyParams={setRsiStrategyParams}
        />

        <div className="text-center space-y-4">
          {/* 回測模式切換 */}
          <div className="flex justify-center mb-4">
            <button
              className={`px-4 py-2 rounded-md font-medium transition-all duration-200 `}
            >
              後端回測 ⚡
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="text-center">
              <button
                onClick={handleRunBacktest}
                disabled={loading || stocks.length === 0}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                {loading ? '回測中...' : '開始回測'}
              </button>
              <div
                className={`text-xs mt-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                回測已選擇的 {stocks.length} 支股票
              </div>
            </div>

            <div
              className={`hidden sm:block w-px h-12 transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            ></div>

            <div className="text-center">
              <button
                onClick={handleRunFullBacktest}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              >
                {loading ? '回測中...' : '回測全部股票'}
              </button>
              <div
                className={`text-xs mt-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                從資料庫獲取所有股票進行回測
              </div>
            </div>
          </div>

          <div
            className={`p-3 rounded-lg border transition-colors duration-300 ${
              isDarkMode
                ? 'bg-blue-900/20 border-blue-700 text-blue-300'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            <div className="text-sm">
              <strong>💡 使用提示：</strong>
            </div>
            <div className="text-xs mt-1 space-y-1">
              <div>
                • <strong>開始回測</strong>
                ：僅回測上方已選擇的股票（需要至少選擇一支股票）
              </div>
              <div>
                • <strong>回測全部股票</strong>
                ：自動從資料庫載入所有股票並進行完整回測
              </div>
              <div>• 全部回測會自動套用相同的策略參數和時間區間</div>
            </div>
          </div>
        </div>
      </div>

      {/* 股票回測結果清單 - 替換原來的圖表顯示 */}
      {results && (results.chartData || results.stockPerformance) && (
        <StockResultsList results={results} isDarkMode={isDarkMode} />
      )}

      {results && (
        <div className="space-y-6">
          <div
            className={`rounded-lg shadow-lg p-6 transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}
          >
            <h2
              className={`text-2xl font-bold mb-6 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}
            >
              回測結果摘要
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div
                className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-blue-900/30 border border-blue-700'
                    : 'bg-blue-50'
                }`}
              >
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(results.performance.finalCapital)}
                </div>
                <div
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  最終收益
                </div>
              </div>
              <div
                className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-green-900/30 border border-green-700'
                    : 'bg-green-50'
                }`}
              >
                <div className="text-2xl font-bold text-green-600">
                  {formatPercent(results.performance.totalReturn)}
                </div>
                <div
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  總報酬率
                </div>
              </div>
              <div
                className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-purple-900/30 border border-purple-700'
                    : 'bg-purple-50'
                }`}
              >
                <div className="text-2xl font-bold text-purple-600">
                  {formatPercent(results.performance.annualReturn)}
                </div>
                <div
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  年化報酬
                </div>
              </div>
              <div
                className={`text-center p-4 rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-orange-900/30 border border-orange-700'
                    : 'bg-orange-50'
                }`}
              >
                <div className="text-2xl font-bold text-orange-600">
                  {formatPercent(results.trades.winRate)}
                </div>
                <div
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  勝率
                </div>
              </div>
            </div>
          </div>

          <div
            className={`rounded-lg shadow-lg p-6 transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}
          >
            <h3
              className={`text-xl font-bold mb-4 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}
            >
              交易統計
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div
                className={`p-3 border rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'border-gray-600 bg-gray-700/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div
                  className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {results.trades.totalTrades}
                </div>
                <div
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  總交易次數
                </div>
              </div>
              <div
                className={`p-3 border rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'border-gray-600 bg-gray-700/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="text-lg font-semibold text-green-600">
                  {results.trades.winningTrades}
                </div>
                <div
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  獲利交易
                </div>
              </div>
              <div
                className={`p-3 border rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'border-gray-600 bg-gray-700/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="text-lg font-semibold text-red-600">
                  {results.trades.losingTrades}
                </div>
                <div
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  虧損交易
                </div>
              </div>
              <div
                className={`p-3 border rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'border-gray-600 bg-gray-700/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div
                  className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {formatPercent(results.trades.avgWin)}
                </div>
                <div
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  平均獲利
                </div>
              </div>
              <div
                className={`p-3 border rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'border-gray-600 bg-gray-700/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div
                  className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {formatPercent(results.trades.avgLoss)}
                </div>
                <div
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  平均虧損
                </div>
              </div>
              <div
                className={`p-3 border rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'border-gray-600 bg-gray-700/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div
                  className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {formatPercent(results.trades.maxWin)}
                </div>
                <div
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  最大獲利
                </div>
              </div>
              <div
                className={`p-3 border rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'border-gray-600 bg-gray-700/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div
                  className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {formatPercent(results.trades.maxLoss)}
                </div>
                <div
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  最大虧損
                </div>
              </div>
              <div
                className={`p-3 border rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'border-gray-600 bg-gray-700/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div
                  className={`text-lg font-semibold transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {results.trades.avgHoldingDays.toFixed(1)}天
                </div>
                <div
                  className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  平均持股天數
                </div>
              </div>
              <div
                className={`p-3 border rounded-lg transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700'
                    : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
                }`}
              >
                <div className="text-lg font-semibold text-blue-600">
                  {results.trades.profitFactor >= 999
                    ? '∞'
                    : results.trades.profitFactor.toFixed(2)}
                </div>
                <div className="text-sm text-blue-600">獲利因子</div>
                <div
                  className={`text-xs mt-1 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {results.trades.profitFactor >= 2.0
                    ? '優秀'
                    : results.trades.profitFactor >= 1.5
                    ? '良好'
                    : results.trades.profitFactor >= 1.0
                    ? '及格'
                    : '需改進'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className={`rounded-lg shadow-lg p-6 transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
              }`}
            >
              <h3
                className={`text-xl font-bold mb-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}
              >
                資金曲線
              </h3>
              <div className="w-full h-80">
                <LineChart
                  width={500}
                  height={300}
                  data={results.equityCurve.slice(-100)}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString()
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    labelFormatter={(value) =>
                      new Date(value as string).toLocaleDateString()
                    }
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      name === 'value'
                        ? '總資產'
                        : name === 'cash'
                        ? '現金'
                        : '持倉',
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="總資產"
                  />
                  <Line
                    type="monotone"
                    dataKey="cash"
                    stroke="#82ca9d"
                    strokeWidth={1}
                    name="現金"
                  />
                  <Line
                    type="monotone"
                    dataKey="positions"
                    stroke="#ffc658"
                    strokeWidth={1}
                    name="持倉"
                  />
                </LineChart>
              </div>
            </div>

            <div
              className={`rounded-lg shadow-lg p-6 transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
              }`}
            >
              <h3
                className={`text-xl font-bold mb-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}
              >
                個股表現
              </h3>
              <div className="w-full h-80">
                <BarChart
                  width={500}
                  height={300}
                  data={results.stockPerformance}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stock" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'totalProfit'
                        ? formatCurrency(Number(value))
                        : name === 'winRate'
                        ? formatPercent(Number(value))
                        : value,
                      name === 'totalProfit'
                        ? '總獲利'
                        : name === 'winRate'
                        ? '勝率'
                        : '交易次數',
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="totalProfit" fill="#8884d8" name="總獲利" />
                </BarChart>
              </div>
            </div>
          </div>

          <div
            className={`rounded-lg shadow-lg p-6 transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}
          >
            <h3
              className={`text-xl font-bold mb-4 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}
            >
              交易結果分布
            </h3>
            <div className="flex justify-center">
              <PieChart width={400} height={300}>
                <Pie
                  data={[
                    {
                      name: '獲利交易',
                      value: results.trades.winningTrades,
                      fill: '#00C49F',
                    },
                    {
                      name: '虧損交易',
                      value: results.trades.losingTrades,
                      fill: '#FF8042',
                    },
                  ]}
                  cx={200}
                  cy={150}
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: '獲利交易', value: results.trades.winningTrades },
                    { name: '虧損交易', value: results.trades.losingTrades },
                  ].map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </div>
          </div>

          <div
            className={`rounded-lg shadow-lg p-6 transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}
          >
            <h3
              className={`text-xl font-bold mb-4 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}
            >
              詳細交易記錄
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className={`transition-colors duration-300 ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                    }`}
                  >
                    <th
                      className={`px-4 py-2 text-left transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}
                    >
                      股票
                    </th>
                    <th
                      className={`px-4 py-2 text-left transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}
                    >
                      訊號-買
                    </th>
                    <th
                      className={`px-4 py-2 text-left transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}
                    >
                      購買日期
                    </th>
                    <th
                      className={`px-4 py-2 text-left transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}
                    >
                      訊號-賣
                    </th>
                    <th
                      className={`px-4 py-2 text-left transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}
                    >
                      賣出日期
                    </th>
                    <th
                      className={`px-4 py-2 text-right transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}
                    >
                      進場價
                    </th>
                    <th
                      className={`px-4 py-2 text-right transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}
                    >
                      出場價
                    </th>
                    <th
                      className={`px-4 py-2 text-center transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}
                    >
                      持有天數
                    </th>
                    <th
                      className={`px-4 py-2 text-center transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}
                    >
                      信心度
                    </th>
                    <th
                      className={`px-4 py-2 text-right transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}
                    >
                      獲利率
                    </th>
                    <th
                      className={`px-4 py-2 text-right transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}
                    >
                      獲利金額
                    </th>
                    <th
                      className={`px-4 py-2 text-left transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}
                    >
                      出場原因
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.detailedTrades.map((trade, index) => (
                    <tr
                      key={index}
                      className={`border-b transition-colors duration-300 ${
                        (trade.profit || 0) > 0
                          ? isDarkMode
                            ? 'bg-green-900/20 border-green-800'
                            : 'bg-green-50 border-green-200'
                          : isDarkMode
                          ? 'bg-red-900/20 border-red-800'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <td
                        className={`px-4 py-2 font-medium transition-colors duration-300 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {trade.stock}
                      </td>
                      <td
                        className={`px-4 py-2 transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {formatDate(trade.buySignalDate)}
                      </td>
                      <td
                        className={`px-4 py-2 transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {formatDate(trade.actualBuyDate) !== '-'
                          ? formatDate(trade.actualBuyDate)
                          : formatDate(trade.entryDate)}
                      </td>
                      <td
                        className={`px-4 py-2 transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {trade.action === 'SELL'
                          ? formatDate(trade.sellSignalDate)
                          : '-'}
                      </td>
                      <td
                        className={`px-4 py-2 transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {trade.action === 'SELL'
                          ? formatDate(trade.actualSellDate) !== '-'
                            ? formatDate(trade.actualSellDate)
                            : formatDate(trade.date)
                          : '-'}
                      </td>
                      <td
                        className={`px-4 py-2 text-right transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {trade.entryPrice?.toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {trade.price.toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-2 text-center transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {trade.holdingDays}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            (trade.confidence || 0) >= 0.7
                              ? 'bg-green-100 text-green-800'
                              : (trade.confidence || 0) >= 0.5
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {trade.confidence
                            ? `${(trade.confidence * 100).toFixed(1)}%`
                            : 'N/A'}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-medium ${
                          (trade.profit || 0) > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatPercent(trade.profitRate || 0)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-medium ${
                          (trade.profit || 0) > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(trade.profit || 0)}
                      </td>
                      <td
                        className={`px-4 py-2 text-xs transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {trade.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {results.detailedTrades.length > 20 && (
              <div
                className={`mt-4 text-center transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                共 {results.detailedTrades.length} 筆交易資料
              </div>
            )}
          </div>

          <div
            className={`rounded-lg shadow-lg p-6 transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            }`}
          >
            <h3
              className={`text-xl font-bold mb-4 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}
            >
              策略分析建議
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4
                  className={`font-semibold mb-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}
                >
                  ✅ 策略優勢
                </h4>
                <ul
                  className={`space-y-1 text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  <li>
                    • 勝率: {formatPercent(results.trades.winRate)}{' '}
                    {results.trades.winRate > 0.7
                      ? '(優秀)'
                      : results.trades.winRate > 0.6
                      ? '(良好)'
                      : '(需改進)'}
                  </li>
                  <li>
                    • 年化報酬:{' '}
                    {formatPercent(results.performance.annualReturn)}{' '}
                    {results.performance.annualReturn > 0.15
                      ? '(優秀)'
                      : results.performance.annualReturn > 0.1
                      ? '(良好)'
                      : '(一般)'}
                  </li>
                  <li>
                    • 平均持股: {results.trades.avgHoldingDays.toFixed(1)}天
                    (適中週期)
                  </li>
                  <li>• 風險控制: 有明確停損停利機制</li>
                </ul>
              </div>
              <div>
                <h4
                  className={`font-semibold mb-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-orange-400' : 'text-orange-600'
                  }`}
                >
                  ⚠️ 改進建議
                </h4>
                <ul
                  className={`space-y-1 text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  {results.trades.winRate < 0.6 && (
                    <li>• 考慮提高進場門檻以提升勝率</li>
                  )}
                  {results.trades.avgHoldingDays > 40 && (
                    <li>• 平均持股天數較長，考慮調整出場條件</li>
                  )}
                  {Math.abs(results.trades.avgLoss) >
                    Math.abs(results.trades.avgWin) && (
                    <li>• 虧損幅度大於獲利幅度，需要調整風險報酬比</li>
                  )}
                  <li>• 建議分散投資更多不同產業股票</li>
                  <li>• 可考慮加入市場環境過濾條件</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BacktestSystem;
