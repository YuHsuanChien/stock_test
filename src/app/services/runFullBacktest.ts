import { fetchAllStocksList, runBacktestOnServer } from './stock_api';
import { runFrontendFullBacktest } from './runFrontendFullBacktest';
import { BacktestResults, StrategyParams } from '../interfaces/stockData';

export const runFullBacktest = async (
  useBackendBacktest: boolean,
  startDate: string,
  endDate: string,
  initialCapital: number,
  strategyParams: StrategyParams,
  setStocks: (stocks: string[]) => void,
  setResults: (results: BacktestResults) => void,
  setLoading: (loading: boolean) => void,
  stocks: string[],
) => {
  console.log('🚀🚀🚀 全部回測按鈕被點擊了！開始執行全部股票回測...');
  setLoading(true);

  try {
    if (useBackendBacktest) {
      // 使用後端回測 - 全部股票
      console.log('🚀 使用後端回測模式（全部股票）');

      // 1. 獲取所有股票清單
      const allStockList = await fetchAllStocksList();
      if (allStockList.length === 0) {
        alert('無法獲取股票清單或股票清單為空');
        return;
      }

      console.log(`📊 準備後端回測 ${allStockList.length} 支股票...`);

      const result = await runBacktestOnServer(
        allStockList,
        startDate,
        endDate,
        initialCapital,
        strategyParams,
      );

      setResults(result);
      console.log('result', result);
      setStocks(allStockList); // 更新顯示的股票清單
      console.log('✅ 後端全部股票回測完成');
      return;
    }

    // 前端全部回測邏輯
    console.log('🚀 使用前端回測模式（全部股票）');
    await runFrontendFullBacktest(
      startDate,
      endDate,
      initialCapital,
      setStocks,
      setResults,
      stocks,
    );
  } catch (error: unknown) {
    console.error('❌ 全部回測執行錯誤:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    alert(`全部回測執行失敗: ${errorMessage}`);
  } finally {
    setLoading(false);
  }
};
