import React from 'react';
import { RsiStrategyParams } from '../interfaces/stockData';

export default function RSI_MACD_Strategy({
  selectedStrategy,
  isDarkMode,
  strategyParams,
  setStrategyParams,
}: {
  selectedStrategy: string;
  isDarkMode: boolean;
  strategyParams: RsiStrategyParams;
  setStrategyParams: (params: RsiStrategyParams) => void;
}) {
  return (
    <div
      className={`mb-6 ${
        selectedStrategy === 'W_Strategy' ? 'hidden' : 'block'
      }`}
    >
      <h3
        className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
          isDarkMode ? 'text-gray-200' : 'text-gray-700'
        }`}
      >
        RSI+MACD策略參數
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div>
          <label
            className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            RSI週期
          </label>
          <input
            type="number"
            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-300 ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            value={strategyParams.rsiPeriod}
            onChange={(e) =>
              setStrategyParams({
                ...strategyParams,
                rsiPeriod: Number(e.target.value),
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
            RSI超賣買點區間的上限
          </label>
          <input
            type="number"
            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-300 ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            value={strategyParams.rsiOversold}
            onChange={(e) =>
              setStrategyParams({
                ...strategyParams,
                rsiOversold: Number(e.target.value),
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
            MACD快線
          </label>
          <input
            type="number"
            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-300 ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            value={strategyParams.macdFast}
            onChange={(e) =>
              setStrategyParams({
                ...strategyParams,
                macdFast: Number(e.target.value),
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
            MACD慢線
          </label>
          <input
            type="number"
            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-300 ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            value={strategyParams.macdSlow}
            onChange={(e) =>
              setStrategyParams({
                ...strategyParams,
                macdSlow: Number(e.target.value),
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
            信心度門檻
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            className={`w-full px-2 py-1 text-sm border border-yellow-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-300 ${
              isDarkMode
                ? 'bg-yellow-900/20 border-yellow-600 text-white'
                : 'bg-yellow-50 border-yellow-300 text-gray-900'
            }`}
            value={strategyParams.confidenceThreshold}
            onChange={(e) =>
              setStrategyParams({
                ...strategyParams,
                confidenceThreshold: Number(e.target.value),
              })
            }
            title="設定進場所需的最低信心度 (0.0-1.0)，數值越高進場越嚴格"
          />
          <div
            className={`text-xs mt-1 transition-colors duration-300 ${
              isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
            }`}
          >
            {(strategyParams.confidenceThreshold * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <label
            className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            停損(%)
          </label>
          <input
            type="number"
            step="0.01"
            className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-300 ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            value={strategyParams.stopLoss}
            onChange={(e) =>
              setStrategyParams({
                ...strategyParams,
                stopLoss: Number(e.target.value),
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
      </div>

      <div
        className={`mt-4 p-3 border rounded-lg transition-colors duration-300 ${
          isDarkMode
            ? 'bg-blue-900/30 border-blue-700'
            : 'bg-blue-50 border-blue-200'
        }`}
      >
        <h4
          className={`text-sm font-semibold mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-blue-300' : 'text-blue-800'
          }`}
        >
          💡 信心度門檻設定指南 (已優化至70%)
        </h4>
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-3 text-xs transition-colors duration-300 ${
            isDarkMode ? 'text-blue-200' : 'text-blue-700'
          }`}
        >
          <div>
            <strong>保守型 (0.75-0.85)</strong>
            <br />
            極度嚴格進場，勝率極高但交易稀少
          </div>
          <div>
            <strong>最佳型 (0.70-0.75)</strong> ⭐
            <br />
            Python優化參數，平衡勝率與頻率
          </div>
          <div>
            <strong>積極型 (0.60-0.70)</strong>
            <br />
            適度放寬條件，增加交易機會
          </div>
        </div>
        <div
          className={`mt-2 text-xs transition-colors duration-300 ${
            isDarkMode ? 'text-blue-300' : 'text-blue-600'
          }`}
        >
          <strong>目前設定：</strong>
          {strategyParams.confidenceThreshold >= 0.75
            ? '保守型'
            : strategyParams.confidenceThreshold >= 0.7
            ? '最佳型 🎯'
            : strategyParams.confidenceThreshold >= 0.6
            ? '積極型'
            : '過度積進'}
          ({(strategyParams.confidenceThreshold * 100).toFixed(0)}%)
        </div>
      </div>

      {/* 新增進階參數設定區域 */}
      <div className="mt-6">
        <h4
          className={`text-md font-semibold mb-4 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}
        >
          🎯 進階風控參數 (策略3.2優化版)
        </h4>

        {/* 高優先級參數 */}
        <div className="mb-4">
          <h5
            className={`text-sm font-medium mb-2 transition-colors duration-300 ${
              isDarkMode ? 'text-green-400' : 'text-green-700'
            }`}
          >
            ⭐⭐⭐ 高優先級功能
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={strategyParams.enableTrailingStop}
                  onChange={(e) =>
                    setStrategyParams({
                      ...strategyParams,
                      enableTrailingStop: e.target.checked,
                    })
                  }
                  className="form-checkbox h-4 w-4 text-green-600"
                />
                <span
                  className={`text-xs font-medium transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  啟用追蹤停利
                </span>
              </label>
              {strategyParams.enableTrailingStop && (
                <div className="space-y-2">
                  <div>
                    <label
                      className={`block text-xs transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      追蹤停利 (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="0.2"
                      className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-green-500 transition-colors duration-300 ${
                        isDarkMode
                          ? 'bg-gray-700 border-green-600 text-white'
                          : 'bg-white border-green-300 text-gray-900'
                      }`}
                      value={strategyParams.trailingStopPercent}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          trailingStopPercent: Number(e.target.value),
                        })
                      }
                    />
                    <div
                      className={`text-xs transition-colors duration-300 ${
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`}
                    >
                      {(strategyParams.trailingStopPercent * 100).toFixed(1)}
                      %回落出場
                    </div>
                  </div>
                  <div>
                    <label
                      className={`block text-xs transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      啟動門檻 (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="0.1"
                      className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-green-500 transition-colors duration-300 ${
                        isDarkMode
                          ? 'bg-gray-700 border-green-600 text-white'
                          : 'bg-white border-green-300 text-gray-900'
                      }`}
                      value={strategyParams.trailingActivatePercent}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          trailingActivatePercent: Number(e.target.value),
                        })
                      }
                    />
                    <div
                      className={`text-xs transition-colors duration-300 ${
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`}
                    >
                      獲利
                      {(strategyParams.trailingActivatePercent * 100).toFixed(
                        1,
                      )}
                      %後啟動
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label
                className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                成交量門檻 (倍)
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="3.0"
                className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-orange-500 transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-orange-900/20 border-orange-600 text-white'
                    : 'bg-orange-50 border-orange-300 text-gray-900'
                }`}
                value={strategyParams.volumeThreshold}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    volumeThreshold: Number(e.target.value),
                  })
                }
              />
              <div
                className={`text-xs mt-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-orange-400' : 'text-orange-600'
                }`}
              >
                {strategyParams.volumeThreshold.toFixed(1)}倍平均量
              </div>
            </div>

            <div>
              <label
                className={`block text-xs font-medium mb-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                基本成交量(張)
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="3.0"
                className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-green-500 transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-orange-900/20 border-green-600 text-white'
                    : 'bg-orange-50 border-green-300 text-gray-900'
                }`}
                value={strategyParams.volumeLimit}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    volumeLimit: Number(e.target.value),
                  })
                }
              />
              <div
                className={`text-xs mt-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}
              >
                成交量高於{strategyParams.volumeLimit} (張)
              </div>
            </div>
          </div>
        </div>

        {/* 中優先級參數 */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-blue-700 mb-2">
            ⭐⭐ 中優先級功能
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={strategyParams.enableATRStop}
                  onChange={(e) =>
                    setStrategyParams({
                      ...strategyParams,
                      enableATRStop: e.target.checked,
                    })
                  }
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span className="text-xs font-medium text-gray-700">
                  ATR動態停損
                </span>
              </label>
              {strategyParams.enableATRStop && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600">
                      ATR週期
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="30"
                      className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                      value={strategyParams.atrPeriod}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          atrPeriod: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">
                      ATR倍數
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="4.0"
                      className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500"
                      value={strategyParams.atrMultiplier}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          atrMultiplier: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                最小持有天數
              </label>
              <input
                type="number"
                min="1"
                max="10"
                className="w-full px-2 py-1 text-sm border border-purple-300 rounded focus:ring-1 focus:ring-purple-500"
                value={strategyParams.minHoldingDays}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    minHoldingDays: Number(e.target.value),
                  })
                }
              />
              <div className="text-xs text-purple-600 mt-1">
                保護期{strategyParams.minHoldingDays}天
              </div>
            </div>
            <div>
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={strategyParams.enablePriceMomentum}
                  onChange={(e) =>
                    setStrategyParams({
                      ...strategyParams,
                      enablePriceMomentum: e.target.checked,
                    })
                  }
                  className="form-checkbox h-4 w-4 text-indigo-600"
                />
                <span className="text-xs font-medium text-gray-700">
                  價格動能指標
                </span>
              </label>
              {strategyParams.enablePriceMomentum && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600">
                      動能週期
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500"
                      value={strategyParams.priceMomentumPeriod}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          priceMomentumPeriod: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600">
                      動能門檻 (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="0.1"
                      className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-1 focus:ring-indigo-500"
                      value={strategyParams.priceMomentumThreshold}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          priceMomentumThreshold: Number(e.target.value),
                        })
                      }
                    />
                    <div className="text-xs text-indigo-600">
                      {(strategyParams.priceMomentumThreshold * 100).toFixed(1)}
                      %動能門檻
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 低優先級參數 */}
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-600 mb-2">
            ⭐ 低優先級功能
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={strategyParams.enableMA10}
                  onChange={(e) =>
                    setStrategyParams({
                      ...strategyParams,
                      enableMA10: e.target.checked,
                    })
                  }
                  className="form-checkbox h-4 w-4 text-gray-600"
                />
                <span className="text-xs font-medium text-gray-700">
                  MA10中線確認
                </span>
              </label>
              <div className="text-xs text-gray-500 mt-1">中期趨勢過濾</div>
            </div>
          </div>
        </div>

        {/* 新增：Python風格優化參數 */}
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
          <h5 className="text-sm font-medium text-purple-700 mb-3 flex items-center">
            🐍 Python風格優化功能
            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              NEW!
            </span>
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={strategyParams.usePythonLogic}
                  onChange={(e) =>
                    setStrategyParams({
                      ...strategyParams,
                      usePythonLogic: e.target.checked,
                    })
                  }
                  className="form-checkbox h-4 w-4 text-purple-600"
                />
                <span className="text-xs font-medium text-gray-700">
                  Python決策邏輯
                </span>
              </label>
              <div className="text-xs text-purple-600">
                {strategyParams.usePythonLogic ? '🔥 嚴格模式' : '😊 寬鬆模式'}
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={strategyParams.hierarchicalDecision}
                  onChange={(e) =>
                    setStrategyParams({
                      ...strategyParams,
                      hierarchicalDecision: e.target.checked,
                    })
                  }
                  className="form-checkbox h-4 w-4 text-purple-600"
                />
                <span className="text-xs font-medium text-gray-700">
                  階層決策系統
                </span>
              </label>
              <div className="text-xs text-purple-600">層層篩選信號</div>
            </div>

            <div>
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={strategyParams.dynamicPositionSize}
                  onChange={(e) =>
                    setStrategyParams({
                      ...strategyParams,
                      dynamicPositionSize: e.target.checked,
                    })
                  }
                  className="form-checkbox h-4 w-4 text-purple-600"
                />
                <span className="text-xs font-medium text-gray-700">
                  動態倉位調整
                </span>
              </label>
              <div className="text-xs text-purple-600">依風險度調倉</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                最大總曝險度 (%)
              </label>
              <input
                type="number"
                step="5"
                min="50"
                max="90"
                className={`w-full px-2 py-1 text-sm border border-purple-300 rounded focus:ring-1 focus:ring-purple-500 ${
                  isDarkMode ? '  text-gray-600' : '  text-gray-900'
                }`}
                value={strategyParams.maxTotalExposure * 100}
                onChange={(e) =>
                  setStrategyParams({
                    ...strategyParams,
                    maxTotalExposure: Number(e.target.value) / 100,
                  })
                }
              />
              <div className="text-xs text-purple-600 mt-1">風險控制上限</div>
            </div>
          </div>

          <div className="mt-3 p-2 bg-white bg-opacity-60 rounded border border-purple-200">
            <div className="text-xs text-purple-700 space-y-1">
              <div>
                <strong>Python風格特色：</strong>
              </div>
              <div>• 更嚴格的RSI門檻 (30→35)</div>
              <div>• 階層式決策流程</div>
              <div>• 動態風險控制倉位</div>
              <div>• 總曝險度自動調節</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">
          🚀 策略3.2優化功能說明 (已設定最佳參數)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-gray-700 mb-3">
          <div>
            <strong>T+1真實交易邏輯</strong>
            <br />
            T日收盤後產生信號，T+1日開盤價執行
          </div>
          <div>
            <strong>追蹤停利機制</strong>
            <br />
            獲利3%後啟動，5%回落出場保護利潤
          </div>
          <div>
            <strong>ATR動態停損</strong>
            <br />
            2倍ATR動態停損，靈活應對波動
          </div>
          <div>
            <strong>持有天數保護</strong>
            <br />
            5天保護期，避免剛進場就被洗出
          </div>
        </div>
        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs mb-2">
          <strong className="text-blue-800">🔄 新增T+1交易邏輯：</strong>
          <span className="text-blue-700">
            更貼近實際交易情況，T日技術分析→T+1日開盤執行→避免未來函數問題
          </span>
        </div>
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <strong
            className={`${isDarkMode ? 'text-gray-600' : 'text-gray-900'}`}
          >
            📈 Python最佳化參數已套用：RSI門檻35 | 成交量1.5倍 | 信心度70% |
            價格動能3% | 持有保護5天
          </strong>
        </div>
      </div>
    </div>
  );
}
