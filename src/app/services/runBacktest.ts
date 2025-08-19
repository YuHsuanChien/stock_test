import { checkBuySignal } from '../services/checkBuySignal';
import { calculateIndicators } from '../services/calculateIndicators';
import { checkSellSignal } from '../services/checkSellSignal';
import { calculateDynamicPositionSize } from '../services/calculateDynamicPositionSize';
import { calculateCurrentExposure } from '../services/calculateCurrentExposure';
import {
  runBacktestOnServer,
  isTradingDay,
  findNextTradingDay,
} from './stock_api';
import { generateStockData } from './generateStockData';
import {
  StrategyParams,
  BacktestResults,
  TradeResult,
  Position,
  StockData,
} from '../interfaces/stockData';

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
 * @parm stocks
 * @
 * @returns void - 結果存儲在 results state 中
 */
// 🔍 完整的前端調試代碼 - 在 runBacktest.ts 中的修改

/**
 * 回測引擎主函數 (添加調試版本)
 */
export const runBacktest = async (
  stocks: string[],
  startDate: string,
  endDate: string,
  initialCapital: number,
  strategyParams: StrategyParams,
  useBackendBacktest: boolean,
  setResults: (r: BacktestResults) => void,
  setLoading: (b: boolean) => void,
) => {
  console.log('🔥🔥🔥 回測按鈕被點擊了！開始執行回測...');
  setLoading(true);

  try {
    if (useBackendBacktest) {
      // 使用後端回測
      console.log('🚀 使用後端回測模式');
      const result = await runBacktestOnServer(
        stocks,
        startDate,
        endDate,
        initialCapital,
        strategyParams,
      );
      setResults(result);
      console.log(result);
      console.log('✅ 後端回測完成');
      return;
    }

    // 原有的前端回測邏輯
    console.log('🚀 使用前端回測模式');
    let currentCapital = initialCapital;
    const trades: TradeResult[] = [];
    const positions: Record<string, Position> = {};
    const pendingBuyOrders: Record<
      string,
      {
        confidence: number;
        reason: string;
        signalDate: Date;
        targetExecutionDate: Date | null;
      }
    > = {}; // 待執行的買入訂單
    const pendingSellOrders: Record<
      string,
      {
        reason: string;
        signalDate: Date;
        targetExecutionDate: Date | null;
        position: Position;
      }
    > = {}; // 待執行的賣出訂單
    const equityCurve: {
      date: string;
      value: number;
      cash: number;
      positions: number;
    }[] = [];

    console.log('🚀 開始獲取真實股票數據...');
    console.log('💡 請打開瀏覽器的開發者工具 Network 頁籤來查看 API 請求！');

    const allStockData: Record<string, StockData[]> = {};
    for (const stock of stocks) {
      console.log(`📈 正在處理 ${stock}...`);
      try {
        const rawData = await generateStockData(stock, startDate, endDate);
        if (rawData && rawData.length > 0) {
          const processedData = calculateIndicators(rawData, strategyParams);
          allStockData[stock] = processedData;
          console.log(`✅ ${stock} 數據處理完成: ${rawData.length} 天`);
          console.log(
            `🔍 ${stock} 處理後數據範例:`,
            processedData.slice(0, 3).map((d) => ({
              date: d.date.toISOString().split('T')[0],
              rsi: d.rsi,
              macd: d.macd,
            })),
          );
        } else {
          console.warn(`⚠️ ${stock} 數據為空，跳過處理`);
        }
      } catch (error) {
        console.error(`❌ ${stock} 數據獲取失敗:`, error);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 🔍 新增：檢查1517的完整數據
    console.log('🔍 檢查1517的完整數據範圍...');
    if (allStockData['1517']) {
      const stock1517Data = allStockData['1517'];
      console.log('🔍 1517 數據範圍:', {
        總筆數: stock1517Data.length,
        開始日期: stock1517Data[0]?.date.toISOString().split('T')[0],
        結束日期: stock1517Data[stock1517Data.length - 1]?.date.toISOString().split('T')[0]
      });

      // 檢查關鍵日期的數據
      const keyDates = ['2024-12-06', '2024-12-09', '2024-12-10', '2024-12-11', '2024-12-12', '2024-12-13', '2024-12-16', '2024-12-17'];
      
      console.log('🔍 1517 關鍵日期數據檢查:');
      keyDates.forEach(date => {
        const dayData = stock1517Data.find(d => d.date.toISOString().split('T')[0] === date);
        if (dayData) {
          console.log(`🔍 前端 ${date}:`, {
            open: dayData.open,
            high: dayData.high,
            low: dayData.low,
            close: dayData.close,
            volume: dayData.volume,
            rsi: dayData.rsi?.toFixed(2),
            是否交易日: '是'
          });
        } else {
          console.log(`🔍 前端 ${date}: 無數據 (可能非交易日或數據缺失)`);
        }
      });
    }

    const validStocks = Object.keys(allStockData).filter(
      (stock) => allStockData[stock] && allStockData[stock].length > 0,
    );

    if (validStocks.length === 0) {
      throw new Error('無法獲取任何股票的有效數據');
    }

    console.log(`📊 成功獲取 ${validStocks.length} 支股票的數據，開始回測...`);

    const allDates = [
      ...new Set(
        Object.values(allStockData)
          .flat()
          .map((d) => d.date.toISOString().split('T')[0]),
      ),
    ].sort();

    // 🔍 新增：檢查交易日列表
    console.log('🔍 前端交易日列表 (12/06-12/18):', 
      allDates.filter(date => date >= '2024-12-06' && date <= '2024-12-18')
    );

    // 🔍 新增：檢查12/12是否為交易日
    console.log('🔍 檢查關鍵日期是否為交易日...');
    const dec11 = new Date('2024-12-11');
    const dec12 = new Date('2024-12-12');
    const dec13 = new Date('2024-12-13');
    
    const isDec11TradingDay = isTradingDay(dec11, allStockData);
    const isDec12TradingDay = isTradingDay(dec12, allStockData);
    const isDec13TradingDay = isTradingDay(dec13, allStockData);
    
    console.log(`🔍 2024-12-11 是否為交易日: ${isDec11TradingDay}`);
    console.log(`🔍 2024-12-12 是否為交易日: ${isDec12TradingDay}`);
    console.log(`🔍 2024-12-13 是否為交易日: ${isDec13TradingDay}`);

    // 🔍 新增：檢查 findNextTradingDay 函數
    const nextTradingDayFromDec11 = findNextTradingDay(dec11, allStockData);
    console.log(`🔍 2024-12-11 的下一個交易日: ${nextTradingDayFromDec11?.toISOString().split('T')[0]}`);

    for (const dateStr of allDates) {
      const currentDate = new Date(dateStr);

      // 使用動態交易日判斷，如果不是則跳過
      if (!isTradingDay(currentDate, allStockData)) {
        const dayName = [
          '星期日',
          '星期一',
          '星期二',
          '星期三',
          '星期四',
          '星期五',
          '星期六',
        ][currentDate.getDay()];
        console.log(`📅 跳過非交易日: ${dateStr} (${dayName})`);
        continue;
      }

      for (const stock of validStocks) {
        const stockData = allStockData[stock];
        const currentIndex = stockData.findIndex(
          (d) => d.date.toISOString().split('T')[0] === dateStr,
        );

        // 🔍 檢查是否找到當前日期的數據
        if (currentIndex === -1) {
          console.log(`⚠️ ${dateStr} ${stock} 找不到數據，跳過處理`);
          continue;
        }

        // 確保指標數據已經計算完成（至少需要 MACD 計算完成的天數）
        const minRequiredIndex =
          strategyParams.macdSlow + strategyParams.macdSignal;
        if (currentIndex < minRequiredIndex) continue;

        const current = stockData[currentIndex];
        const previous = stockData[currentIndex - 1];

        // 🔍 重要：驗證日期匹配性，如果不匹配則跳過
        const currentDataDateStr = current.date.toISOString().split('T')[0];
        if (currentDataDateStr !== dateStr) {
          console.log(`❌ ${dateStr} ${stock} 日期不匹配！
            迴圈日期: ${dateStr}
            數據日期: ${currentDataDateStr}
            跳過此股票處理`);
          continue;
        }

        // 🔍 新增：1517的詳細數據調試
        if (stock === '1517' && ['2024-12-06', '2024-12-09', '2024-12-10', '2024-12-11', '2024-12-12', '2024-12-13', '2024-12-16', '2024-12-17'].includes(dateStr)) {
          console.log(`🔍 前端 ${dateStr} ${stock} 數據:`, {
            date: dateStr,
            open: current.open,
            high: current.high,
            low: current.low,
            close: current.close,
            volume: current.volume,
            rsi: current.rsi?.toFixed(2),
            macd: current.macd?.toFixed(4),
            volumeRatio: current.volumeRatio?.toFixed(2)
          });

          // 如果有持倉，也輸出持倉信息
          if (positions[stock]) {
            const position = positions[stock];
            const currentProfit = (current.close - position.entryPrice) / position.entryPrice;
            console.log(`🔍 前端 ${dateStr} ${stock} 持倉信息:`, {
              entryPrice: position.entryPrice,
              currentPrice: current.close,
              highPriceSinceEntry: position.highPriceSinceEntry,
              trailingStopPrice: position.trailingStopPrice,
              currentProfit: (currentProfit * 100).toFixed(2) + '%',
              holdingDays: Math.floor((new Date(dateStr).getTime() - position.entryDate.getTime()) / (1000 * 60 * 60 * 24))
            });
          }
        }

        console.log(`✅ ${dateStr} ${stock} 日期匹配確認 - 使用正確數據`);

        // 確認當前數據有完整的技術指標
        if (!current.rsi || !current.macd || !current.macdSignal) {
          console.log(
            `🚫 ${dateStr} ${stock} 指標數據不完整: RSI=${current.rsi}, MACD=${current.macd}, Signal=${current.macdSignal}`,
          );
          continue;
        }

        // 首先處理待執行的賣出訂單（使用T+1日開盤價）
        if (pendingSellOrders[stock]) {
          const sellOrder = pendingSellOrders[stock];

          // 彈性T+1邏輯：目標日期或之後的第一個有資料日執行
          const shouldExecute =
            sellOrder.targetExecutionDate &&
            currentDate >= sellOrder.targetExecutionDate;

          if (shouldExecute) {
            const position = sellOrder.position;

            // 使用開盤價計算賣出
            const sellAmount = current.open * position.quantity * 0.995575; // 修正：扣除0.4425%手續費+交易稅
            const profit = sellAmount - position.investAmount;
            const profitRate = profit / position.investAmount;
            const holdingDays = Math.floor(
              (currentDate.getTime() - position.entryDate.getTime()) /
                (1000 * 60 * 60 * 24),
            );

            // 檢查是否延後執行
            const targetDateStr =
              sellOrder.targetExecutionDate?.toISOString().split('T')[0] ||
              '未設定';
            const isDelayed = targetDateStr !== dateStr;
            const delayInfo = isDelayed
              ? ` (原定${targetDateStr}，延後執行)`
              : '';

            console.log(
              `💰 ${dateStr} ${stock} T+1賣出執行${delayInfo}: 出場價${current.open.toFixed(
                2,
              )} | 獲利率${(profitRate * 100).toFixed(
                2,
              )}% | 持有${holdingDays}天`,
            );

            // 從原始reason中提取基本原因，移除舊的獲利率資訊
            let baseReason = sellOrder.reason;
            // 移除可能存在的獲利率信息（如"當前獲利: X%"、"獲利: X%"、"虧損: X%"等）
            baseReason = baseReason.replace(
              /，[最高獲利當前虧損]{2,4}:\s*-?\d+\.?\d*%/g,
              '',
            );
            baseReason = baseReason.replace(/，獲利:\s*-?\d+\.?\d*%/g, '');
            baseReason = baseReason.replace(/，虧損:\s*-?\d+\.?\d*%/g, '');

            // 根據實際獲利率添加正確的後綴
            const actualReason =
              profitRate >= 0
                ? `${baseReason}，實際獲利: ${(profitRate * 100).toFixed(2)}%`
                : `${baseReason}，實際虧損: ${(
                    Math.abs(profitRate) * 100
                  ).toFixed(2)}%`;

            trades.push({
              stock,
              action: 'SELL',
              date: currentDate, // T+1賣出執行日期
              price: current.open, // T+1開盤價
              quantity: position.quantity,
              amount: sellAmount,
              entryPrice: position.entryPrice,
              entryDate: position.entryDate,
              holdingDays,
              profit,
              profitRate,
              confidence: position.confidence,
              reason: `${actualReason} (T+1開盤價執行)`,
              // 詳細日期資訊
              buySignalDate: position.buySignalDate, // 原始買進訊號日期
              sellSignalDate: sellOrder.signalDate, // 賣出訊號日期
              actualBuyDate: position.entryDate, // 實際購買日期
              actualSellDate: currentDate, // 實際賣出日期
            });

            currentCapital += sellAmount;
            delete positions[stock];
            delete pendingSellOrders[stock];
          }
        }

        // 然後處理待執行的買入訂單（使用T+1日開盤價）
        if (pendingBuyOrders[stock]) {
          const buyOrder = pendingBuyOrders[stock];

          // 彈性T+1邏輯：目標日期或之後的第一個有資料日執行
          const shouldExecute =
            buyOrder.targetExecutionDate &&
            currentDate >= buyOrder.targetExecutionDate;

          if (shouldExecute) {
            // 優化版：使用動態倉位管理系統
            const currentExposure = calculateCurrentExposure(
              positions,
              currentCapital,
              allStockData,
              dateStr,
            );

            const dynamicPositionSize = calculateDynamicPositionSize(
              buyOrder.confidence || 0,
              currentExposure,
              strategyParams,
            );

            const investAmount = Math.min(
              currentCapital * dynamicPositionSize,
              currentCapital * strategyParams.maxPositionSize,
            );

            console.log(`💰 ${dateStr} ${stock} T+1執行買入 (開盤價):
              信心度: ${((buyOrder.confidence || 0) * 100).toFixed(1)}%
              當前曝險度: ${(currentExposure * 100).toFixed(1)}%
              動態倉位: ${(dynamicPositionSize * 100).toFixed(1)}%
              投資金額: ${investAmount.toLocaleString()}`);

            if (investAmount > 10000) {
              // 使用開盤價計算
              const quantity = Math.floor(
                investAmount / (current.open * 1.001425),
              );
              const actualInvestAmount = current.open * quantity * 1.001425;

              // 檢查是否延後執行
              const targetDateStr =
                buyOrder.targetExecutionDate?.toISOString().split('T')[0] ||
                '未設定';
              const isDelayed = targetDateStr !== dateStr;
              const delayInfo = isDelayed
                ? ` (原定${targetDateStr}，延後執行)`
                : '';

              console.log(
                `💰 ${dateStr} ${stock} T+1買入執行${delayInfo}: 進場價${current.open.toFixed(
                  2,
                )} | 股數${quantity.toLocaleString()} | 投資${actualInvestAmount.toLocaleString()}`,
              );

              if (actualInvestAmount <= currentCapital) {
                positions[stock] = {
                  entryDate: currentDate, // 實際進場日期（T+1執行日）
                  entryPrice: current.open, // 使用T+1日開盤價
                  quantity,
                  investAmount: actualInvestAmount,
                  confidence: buyOrder.confidence,
                  buySignalDate: buyOrder.signalDate, // 記錄原始訊號日期
                  // 初始化追蹤停利相關欄位
                  highPriceSinceEntry: current.open,
                  trailingStopPrice:
                    current.open * (1 - strategyParams.trailingStopPercent),
                  atrStopPrice: current.atr
                    ? current.open - strategyParams.atrMultiplier * current.atr
                    : undefined,
                  entryATR: current.atr,
                };

                trades.push({
                  stock,
                  action: 'BUY',
                  date: currentDate, // 實際交易日期
                  price: current.open, // T+1開盤價
                  quantity,
                  amount: actualInvestAmount,
                  confidence: buyOrder.confidence,
                  reason: `${buyOrder.reason} (T+1開盤價執行)`,
                  // 詳細日期資訊
                  buySignalDate: buyOrder.signalDate, // 買進訊號日期
                  actualBuyDate: currentDate, // 實際購買日期
                  entryDate: currentDate, // 向後相容
                  entryPrice: current.open, // 向後相容
                });

                currentCapital -= actualInvestAmount;
                console.log(
                  `✅ ${dateStr} ${stock} T+1買入成功: 餘額${currentCapital.toLocaleString()}`,
                );
              }
            } else {
              console.log(
                `💸 ${dateStr} ${stock} T+1投資金額不足最低要求 (${investAmount.toLocaleString()} < 10,000)`,
              );
            }

            // 清除已執行的買入訂單
            delete pendingBuyOrders[stock];
          }
        }

        // 添加調試信息來檢查數據
        if (currentIndex < minRequiredIndex + 5) {
          console.log(
            `🔍 ${dateStr} ${stock} - Index: ${currentIndex}, RSI: ${current.rsi?.toFixed(
              2,
            )}, MACD: ${current.macd?.toFixed(
              4,
            )}, Signal: ${current.macdSignal?.toFixed(4)}`,
          );
        }

        // 處理賣出信號檢查（產生T+1賣出訂單）
        if (positions[stock] && !pendingSellOrders[stock]) {
          const position = positions[stock];
          const holdingDays = Math.floor(
            (currentDate.getTime() - position.entryDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          const sellCheck = checkSellSignal(
            current,
            position,
            holdingDays,
            strategyParams,
          );

          if (sellCheck.signal) {
            // 計算下一個交易日，用於T+1執行
            const nextTradingDay = findNextTradingDay(
              currentDate,
              allStockData,
            );

            // 產生T+1賣出訂單
            pendingSellOrders[stock] = {
              reason: sellCheck.reason,
              signalDate: currentDate,
              targetExecutionDate: nextTradingDay, // 記錄目標執行日期
              position: { ...position }, // 複製position避免後續修改影響
            };

            console.log(`📋 ${dateStr} ${stock} 產生T+1賣出訂單:
              信號價格: ${current.close.toFixed(2)}
              原因: ${sellCheck.reason}
              目標執行日: ${
                nextTradingDay?.toISOString().split('T')[0] || '待確定'
              }
              將於下一交易日開盤執行`);
          }
        }

        // 處理買入信號檢查（產生T+1買入訂單）
        if (!positions[stock] && !pendingBuyOrders[stock]) {
          const buyCheck = checkBuySignal(current, strategyParams, previous);

          if (buyCheck.signal) {
            // 計算下一個交易日，用於T+1執行
            const nextTradingDay = findNextTradingDay(
              currentDate,
              allStockData,
            );

            // 產生T+1買入訂單
            pendingBuyOrders[stock] = {
              confidence: buyCheck.confidence || 0,
              reason: buyCheck.reason,
              signalDate: currentDate,
              targetExecutionDate: nextTradingDay, // 記錄目標執行日期
            };

            console.log(`📋 ${dateStr} ${stock} 產生T+1買入訊號:
              信號價格: ${current.close}
              信心度: ${((buyCheck.confidence || 0) * 100).toFixed(1)}%
              原因: ${buyCheck.reason}
              目標執行日: ${
                nextTradingDay?.toISOString().split('T')[0] || '待確定'
              }
              將於下一交易日開盤執行`);
          }
        }

        // 🔍 新增：追蹤1517最高價的更新過程
        if (stock === '1517' && positions[stock]) {
          const position = positions[stock];
          const oldHigh = position.highPriceSinceEntry;
          
          if (current.high > position.highPriceSinceEntry) {
            position.highPriceSinceEntry = current.high;
            console.log(`📈 前端 ${dateStr} ${stock} 最高價更新: ${oldHigh} → ${current.high}`);
            
            if (strategyParams.enableTrailingStop) {
              const gainSinceEntry = (current.high - position.entryPrice) / position.entryPrice;
              if (gainSinceEntry >= strategyParams.trailingActivatePercent) {
                const oldTrailingStop = position.trailingStopPrice;
                position.trailingStopPrice = current.high * (1 - strategyParams.trailingStopPercent);
                console.log(`🎯 前端 ${dateStr} ${stock} 追蹤停利更新: ${oldTrailingStop.toFixed(4)} → ${position.trailingStopPrice.toFixed(4)}`);
              }
            }
          } else {
            console.log(`📊 前端 ${dateStr} ${stock} 最高價維持: ${oldHigh} (當日最高: ${current.high})`);
          }

          // 詳細追蹤停利狀態
          const currentProfit = (current.close - position.entryPrice) / position.entryPrice;
          const profitSinceEntry = (position.highPriceSinceEntry - position.entryPrice) / position.entryPrice;
          
          console.log(`🔍 前端 ${dateStr} ${stock} 詳細追蹤停利狀態:`, {
            當日最高價: current.high,
            當日最低價: current.low,
            當日收盤價: current.close,
            歷史最高價: position.highPriceSinceEntry,
            追蹤停利價: position.trailingStopPrice.toFixed(4),
            當前獲利: (currentProfit * 100).toFixed(2) + '%',
            最高獲利: (profitSinceEntry * 100).toFixed(2) + '%',
            啟動門檻: (strategyParams.trailingActivatePercent * 100).toFixed(1) + '%',
            是否啟動追蹤: profitSinceEntry >= strategyParams.trailingActivatePercent ? '是' : '否',
            是否觸發停利: current.low <= position.trailingStopPrice ? '是' : '否'
          });
        }
      }

      let positionValue = 0;
      for (const [stock, position] of Object.entries(positions)) {
        const stockData = allStockData[stock];
        const currentData = stockData.find(
          (d) => d.date.toISOString().split('T')[0] === dateStr,
        );
        if (currentData) {
          positionValue += currentData.close * position.quantity;
        }
      }

      const totalValue = currentCapital + positionValue;
      equityCurve.push({
        date: dateStr,
        value: totalValue,
        cash: currentCapital,
        positions: positionValue,
      });
    }

    // 記錄回測結束時的待執行訂單（應該很少，因為採用延後執行策略）
    const pendingBuyOrdersCount = Object.keys(pendingBuyOrders).length;
    const pendingSellOrdersCount = Object.keys(pendingSellOrders).length;

    if (pendingBuyOrdersCount > 0) {
      console.log(
        `⚠️ 回測結束時仍有 ${pendingBuyOrdersCount} 個未執行的買入訂單：`,
      );
      Object.entries(pendingBuyOrders).forEach(([stock, order]) => {
        const signalDate = order.signalDate.toISOString().split('T')[0];
        const targetDate =
          order.targetExecutionDate?.toISOString().split('T')[0] || '未設定';
        console.log(
          `   ${stock}: 訊號日期 ${signalDate}, 目標執行日期 ${targetDate} - 原因: 回測期間結束前未找到交易日`,
        );
      });
    }

    if (pendingSellOrdersCount > 0) {
      console.log(
        `⚠️ 回測結束時仍有 ${pendingSellOrdersCount} 個未執行的賣出訂單：`,
      );
      Object.entries(pendingSellOrders).forEach(([stock, order]) => {
        const signalDate = order.signalDate.toISOString().split('T')[0];
        const targetDate =
          order.targetExecutionDate?.toISOString().split('T')[0] || '未設定';
        console.log(
          `   ${stock}: 訊號日期 ${signalDate}, 目標執行日期 ${targetDate} - 原因: 回測期間結束前未找到交易日`,
        );
      });
    }

    const completedTrades = trades.filter((t) => t.action === 'SELL');
    const winningTrades = completedTrades.filter((t) => (t.profit || 0) > 0);
    const losingTrades = completedTrades.filter((t) => (t.profit || 0) <= 0);

    const finalValue =
      equityCurve.length > 0
        ? equityCurve[equityCurve.length - 1].value
        : initialCapital;
    const totalReturn = (finalValue - initialCapital) / initialCapital;
    const years =
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
      (1000 * 60 * 60 * 24 * 365.25);
    const annualReturn =
      years > 0 ? Math.pow(finalValue / initialCapital, 1 / years) - 1 : 0;

    const resultsData = {
      performance: {
        initialCapital,
        finalCapital: finalValue,
        totalReturn,
        annualReturn,
        totalProfit: finalValue - initialCapital,
        maxDrawdown: 0.05, // 暫時設定為5%，在完整實現時會計算真實值
      },
      trades: {
        totalTrades: completedTrades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate:
          completedTrades.length > 0
            ? winningTrades.length / completedTrades.length
            : 0,
        avgWin:
          winningTrades.length > 0
            ? winningTrades.reduce((sum, t) => sum + (t.profitRate || 0), 0) /
              winningTrades.length
            : 0,
        avgLoss:
          losingTrades.length > 0
            ? losingTrades.reduce((sum, t) => sum + (t.profitRate || 0), 0) /
              losingTrades.length
            : 0,
        maxWin:
          winningTrades.length > 0
            ? Math.max(...winningTrades.map((t) => t.profitRate || 0))
            : 0,
        maxLoss:
          losingTrades.length > 0
            ? Math.min(...losingTrades.map((t) => t.profitRate || 0))
            : 0,
        avgHoldingDays:
          completedTrades.length > 0
            ? completedTrades.reduce(
                (sum, t) => sum + (t.holdingDays || 0),
                0,
              ) / completedTrades.length
            : 0,
        profitFactor: (() => {
          const totalGains = winningTrades.reduce(
            (sum, t) => sum + Math.abs(t.profit || 0),
            0,
          );
          const totalLosses = losingTrades.reduce(
            (sum, t) => sum + Math.abs(t.profit || 0),
            0,
          );
          return totalLosses > 0
            ? totalGains / totalLosses
            : totalGains > 0
            ? 999
            : 0;
        })(),
      },
      detailedTrades: completedTrades,
      equityCurve,
      stockPerformance: validStocks.map((stock) => {
        const stockTrades = completedTrades.filter((t) => t.stock === stock);
        const stockWins = stockTrades.filter((t) => (t.profit || 0) > 0);
        return {
          stock,
          trades: stockTrades.length,
          winRate:
            stockTrades.length > 0 ? stockWins.length / stockTrades.length : 0,
          totalProfit: stockTrades.reduce((sum, t) => sum + (t.profit || 0), 0),
        };
      }),
    };

    console.log(`🎉 回測完成！共執行 ${completedTrades.length} 筆交易`);
    console.log('resultsData', resultsData);
    setResults(resultsData);
  } catch (error: unknown) {
    console.error('❌ 回測執行錯誤:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    alert(`回測執行失敗: ${errorMessage}`);
  } finally {
    setLoading(false);
  }
};
