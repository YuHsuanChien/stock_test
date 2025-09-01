// src/app/components/w_strategy.tsx

import React from 'react';
import { WStrategyParams } from '../interfaces/stockData';

export default function W_Strategy({
  selectedStrategy,
  isDarkMode,
  strategyParams,
  setStrategyParams,
}: {
  selectedStrategy: string;
  isDarkMode: boolean;
  strategyParams: WStrategyParams;
  setStrategyParams: (params: WStrategyParams) => void;
}) {
  return (
    <div
      className={`mb-6 ${
        selectedStrategy === 'W_Strategy' ? 'block' : 'hidden'
      }`}
    >
      <h3
        className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
          isDarkMode ? 'text-gray-200' : 'text-gray-700'
        }`}
      >
        回後買上漲策略參數
      </h3>

      {/* 底底高、頭頭高分析區域 */}
      <div
        className={`mb-6 p-4 border rounded-lg transition-colors duration-300 ${
          isDarkMode
            ? 'bg-purple-900/30 border-purple-700'
            : 'bg-purple-50 border-purple-200'
        }`}
      >
        <h4
          className={`text-md font-semibold mb-3 transition-colors duration-300 ${
            isDarkMode ? 'text-purple-300' : 'text-purple-800'
          }`}
        >
          🎯 底底高、頭頭高分析
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 啟用分析 */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={strategyParams.enableHighLowAnalysis}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    enableHighLowAnalysis: e.target.checked,
                  })
                }
                className="form-checkbox h-4 w-4 text-purple-600"
              />
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                啟用底底高、頭頭高分析
              </span>
            </label>
            <div
              className={`text-xs transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              根據MA5穿越點識別高低點，判定趨勢健康度
            </div>
          </div>

          {/* 顯示圖表 */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={strategyParams.showHighLowChart}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    showHighLowChart: e.target.checked,
                  })
                }
                className="form-checkbox h-4 w-4 text-purple-600"
                disabled={!strategyParams.enableHighLowAnalysis}
              />
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                } ${!strategyParams.enableHighLowAnalysis ? 'opacity-50' : ''}`}
              >
                顯示K線標記圖表
              </span>
            </label>
            <div
              className={`text-xs transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              在回測結果中顯示標記了高低點的K線圖
            </div>
          </div>
        </div>

        {/* 功能說明 */}
        {strategyParams.enableHighLowAnalysis && (
          <div
            className={`mt-4 p-3 rounded border transition-colors duration-300 ${
              isDarkMode
                ? 'bg-purple-800/20 border-purple-600'
                : 'bg-white border-purple-300'
            }`}
          >
            <h5
              className={`text-sm font-semibold mb-2 transition-colors duration-300 ${
                isDarkMode ? 'text-purple-300' : 'text-purple-700'
              }`}
            >
              📋 分析邏輯說明
            </h5>
            <div
              className={`text-xs space-y-1 transition-colors duration-300 ${
                isDarkMode ? 'text-purple-200' : 'text-purple-600'
              }`}
            >
              <div>
                <strong>底（低點）：</strong>收盤價跌破MA5 → 重新突破MA5
                期間的最低收盤價
              </div>
              <div>
                <strong>高（高點）：</strong>收盤價突破MA5 → 重新跌破MA5
                期間的最高收盤價
              </div>
              <div>
                <strong>底底高：</strong>連續的底部一個比一個高
              </div>
              <div>
                <strong>頭頭高：</strong>連續的高點一個比一個高
              </div>
              <div>
                <strong>趨勢確認：</strong>同時滿足底底高 + 頭頭高 =
                健康上升趨勢
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 回後買上漲策略區域 */}
      <div
        className={`mb-6 p-4 border rounded-lg transition-colors duration-300 ${
          isDarkMode
            ? 'bg-orange-900/30 border-orange-700'
            : 'bg-orange-50 border-orange-200'
        }`}
      >
        <h4
          className={`text-md font-semibold mb-3 transition-colors duration-300 ${
            isDarkMode ? 'text-orange-300' : 'text-orange-800'
          }`}
        >
          🎯 回後買上漲策略
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 啟用回後買上漲策略 */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={strategyParams.enableBuyUpTrend}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    enableBuyUpTrend: e.target.checked,
                  })
                }
                className="form-checkbox h-4 w-4 text-orange-600"
              />
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                啟用回後買上漲分析
              </span>
            </label>
            <div
              className={`text-xs transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              啟用底底高、頭頭高基礎上的買點信號偵測
            </div>
          </div>

          {/* 顯示買點標記 */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={strategyParams.showBuyPoints}
                disabled={!strategyParams.enableBuyUpTrend}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    showBuyPoints: e.target.checked,
                  })
                }
                className={`form-checkbox h-4 w-4 text-orange-600 ${
                  !strategyParams.enableBuyUpTrend ? 'opacity-50' : ''
                }`}
              />
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                } ${!strategyParams.enableBuyUpTrend ? 'opacity-50' : ''}`}
              >
                顯示買點標記
              </span>
            </label>
            <div
              className={`text-xs transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              在K線圖上標註偵測到的買點信號
            </div>
          </div>
        </div>

        {/* 策略說明 */}
        {strategyParams.enableBuyUpTrend && (
          <div
            className={`mt-4 p-3 rounded border transition-colors duration-300 ${
              isDarkMode
                ? 'bg-orange-800/20 border-orange-600'
                : 'bg-white border-orange-300'
            }`}
          >
            <h5
              className={`text-sm font-semibold mb-2 transition-colors duration-300 ${
                isDarkMode ? 'text-orange-300' : 'text-orange-700'
              }`}
            >
              📋 買點偵測條件
            </h5>
            <div
              className={`text-xs space-y-1 transition-colors duration-300 ${
                isDarkMode ? 'text-orange-200' : 'text-orange-600'
              }`}
            >
              <div>
                <strong>1. 趨勢確認：</strong>
                當前最近的底要高於上一個底，當前最近的高要高於上一個高
              </div>
              <div>
                <strong>2. 買點確認：</strong>當日突破5日線，並且是上漲的
              </div>
              <div>
                <strong>3. 20線向上確認：</strong>
                MA20連續3天向上且5日斜率大於0.01%(可選)
              </div>
              <div>
                <strong>4. 多頭排列確認：</strong>
                5日線 &gt; 10日線 &gt; 20日線(可選)
              </div>
              <div>
                <strong>5. 交易量確認：</strong>
                當日交易量要大於前一個交易日的交易量(可調倍數)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 其他策略參數 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* 量能確認 */}
        <div>
          <label className="flex items-center space-x-2 mb-2">
            <input
              type="checkbox"
              checked={strategyParams.volumeConfirm}
              onChange={(e) =>
                setStrategyParams({
                  ...strategyParams,
                  volumeConfirm: e.target.checked,
                })
              }
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span
              className={`text-xs font-medium transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              量能確認
            </span>
          </label>
          {strategyParams.volumeConfirm && (
            <div className="mt-2">
              <label className="text-xs text-gray-600 mb-1 block">
                量能倍數
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="3.0"
                className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={strategyParams.volumeThreshold}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    volumeThreshold: Number(e.target.value),
                  })
                }
              />
            </div>
          )}
        </div>

        {/* 20線向上確認 */}
        <div>
          <label className="flex items-center space-x-2 mb-2">
            <input
              type="checkbox"
              checked={strategyParams.ma20UpTrend}
              onChange={(e) =>
                setStrategyParams({
                  ...strategyParams,
                  ma20UpTrend: e.target.checked,
                })
              }
              className="form-checkbox h-4 w-4 text-green-600"
            />
            <span
              className={`text-xs font-medium transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              20線向上
            </span>
          </label>
          <div
            className={`text-xs transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            要求MA20連續3天向上且5日斜率&gt;0.01%
          </div>
        </div>

        {/* 多頭排列確認 */}
        <div>
          <label className="flex items-center space-x-2 mb-2">
            <input
              type="checkbox"
              checked={strategyParams.bullishAlignment}
              onChange={(e) =>
                setStrategyParams({
                  ...strategyParams,
                  bullishAlignment: e.target.checked,
                })
              }
              className="form-checkbox h-4 w-4 text-green-600"
            />
            <span
              className={`text-xs font-medium transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              多頭排列
            </span>
          </label>
          <div
            className={`text-xs transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            要求 5日線 &gt; 10日線 &gt; 20日線
          </div>
        </div>
      </div>

      {/* 風控參數 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <div
            className={`text-sm p-3 rounded border transition-colors duration-300 ${
              isDarkMode
                ? 'bg-blue-900/30 border-blue-700 text-blue-300'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            <div className="font-medium mb-1">W策略停損機制說明：</div>
            <div className="text-xs">
              停損條件：股價跌破買入訊號當日的開盤價即執行停損
            </div>
          </div>
        </div>

        <div>
          <label
            className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            停利(%)
          </label>
          <input
            type="number"
            step="0.01"
            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-300 ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            value={strategyParams.stopProfit}
            onChange={(e) =>
              setStrategyParams({
                ...strategyParams,
                stopProfit: Number(e.target.value),
              })
            }
          />
        </div>

        <div>
          <label
            className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            最大倉位(%)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="1.0"
            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-300 ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            value={strategyParams.maxPositionSize}
            onChange={(e) =>
              setStrategyParams({
                ...strategyParams,
                maxPositionSize: Number(e.target.value),
              })
            }
          />
          <div
            className={`text-xs mt-1 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {(strategyParams.maxPositionSize * 100).toFixed(0)}% 單檔上限
          </div>
        </div>
      </div>
    </div>
  );
}
