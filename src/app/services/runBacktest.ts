import { runBacktestOnServer } from './stock_api';
import { StrategyParams, BacktestResults } from '../interfaces/stockData';

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
  setResults: (r: BacktestResults) => void,
  setLoading: (b: boolean) => void,
) => {
  console.log('🔥🔥🔥 回測按鈕被點擊了！開始執行回測...');
  setLoading(true);

  try {
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
  } catch (error: unknown) {
    console.error('❌ 回測執行錯誤:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    alert(`回測執行失敗: ${errorMessage}`);
  } finally {
    setLoading(false);
  }
};
