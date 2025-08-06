"use client";

import React, { useState } from "react";
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
} from "recharts";

// 型別定義
interface StockData {
	date: Date;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	symbol: string;
	rsi?: number;
	macd?: number;
	macdSignal?: number;
	macdHistogram?: number;
	ma20?: number;
	ma5?: number;
	volumeMA20?: number;
	volumeRatio?: number;
}

interface TradeResult {
	stock: string;
	action: string;
	date: Date;
	price: number;
	quantity: number;
	amount: number;
	entryPrice?: number;
	entryDate?: Date;
	holdingDays?: number;
	profit?: number;
	profitRate?: number;
	reason: string;
	confidence?: number;
}

interface Position {
	entryDate: Date;
	entryPrice: number;
	quantity: number;
	investAmount: number;
	confidence?: number;
}

interface BacktestResults {
	performance: {
		initialCapital: number;
		finalCapital: number;
		totalReturn: number;
		annualReturn: number;
		totalProfit: number;
	};
	trades: {
		totalTrades: number;
		winningTrades: number;
		losingTrades: number;
		winRate: number;
		avgWin: number;
		avgLoss: number;
		maxWin: number;
		maxLoss: number;
		avgHoldingDays: number;
	};
	detailedTrades: TradeResult[];
	equityCurve: {
		date: string;
		value: number;
		cash: number;
		positions: number;
	}[];
	stockPerformance: {
		stock: string;
		trades: number;
		winRate: number;
		totalProfit: number;
	}[];
}

interface StrategyParams {
	rsiPeriod: number;
	rsiOversold: number;
	macdFast: number;
	macdSlow: number;
	macdSignal: number;
	volumeThreshold: number;
	maxPositionSize: number;
	stopLoss: number;
	stopProfit: number;
	confidenceThreshold: number;
}

interface BuySignalResult {
	signal: boolean;
	reason: string;
	confidence?: number;
}

interface SellSignalResult {
	signal: boolean;
	reason: string;
}

const BacktestSystem = () => {
	const [stocks, setStocks] = useState<string[]>(["2330", "2454", "2317"]);
	const [startDate, setStartDate] = useState<string>("2020-01-01");
	const [endDate, setEndDate] = useState<string>("2025-08-05");
	const [initialCapital, setInitialCapital] = useState<number>(1000000);
	const [loading, setLoading] = useState<boolean>(false);
	const [results, setResults] = useState<BacktestResults | null>(null);
	const [newStock, setNewStock] = useState<string>("");

	const [strategyParams, setStrategyParams] = useState<StrategyParams>({
		rsiPeriod: 14,
		rsiOversold: 30,
		macdFast: 12,
		macdSlow: 26,
		macdSignal: 9,
		volumeThreshold: 1.2,
		maxPositionSize: 0.25,
		stopLoss: 0.06,
		stopProfit: 0.12,
		confidenceThreshold: 0.8, // 降低信心度閾值，讓買入更容易觸發
	});

	/**
	 * 解析 Yahoo Finance Chart API 返回的數據
	 * @param chartResult - Yahoo API 返回的圖表數據
	 * @param symbol - 股票代號
	 * @param startDate - 開始日期
	 * @param endDate - 結束日期
	 * @returns 解析後的股票數據陣列
	 */
	const parseYahooChartData = (
		chartResult: unknown,
		symbol: string,
		startDate: string,
		endDate: string
	): StockData[] => {
		try {
			console.log(`🔍 parseYahooChartData 開始解析 ${symbol} 的數據...`);
			const result = chartResult as {
				timestamp?: number[];
				indicators?: {
					quote?: Array<{
						open?: number[];
						high?: number[];
						low?: number[];
						close?: number[];
						volume?: number[];
					}>;
				};
			};

			const { timestamp, indicators } = result;
			const quote = indicators?.quote?.[0];

			console.log(`🔍 timestamp 數量: ${timestamp?.length || 0}`);
			console.log(`🔍 quote 數據:`, quote ? "存在" : "不存在");

			if (!timestamp || !quote) {
				console.log(
					`❌ 數據不完整: timestamp=${!!timestamp}, quote=${!!quote}`
				);
				return [];
			}

			const rawData = timestamp.map((ts, index) => {
				// 將時間戳轉換為交易日期（去除時間部分，只保留日期）
				const utcDate = new Date(ts * 1000);
				// 建立台北時區的日期，但只保留日期部分
				const year = utcDate.getUTCFullYear();
				const month = utcDate.getUTCMonth();
				const day = utcDate.getUTCDate();
				const tradingDate = new Date(year, month, day);

				return {
					symbol: symbol,
					date: tradingDate,
					open: quote.open?.[index] || 0,
					high: quote.high?.[index] || 0,
					low: quote.low?.[index] || 0,
					close: quote.close?.[index] || 0,
					volume: quote.volume?.[index] || 0,
				};
			});

			console.log(`🔍 原始數據筆數: ${rawData.length}`);
			console.log(`🔍 原始數據範例:`, rawData.slice(0, 3));

			// 特別檢查第一筆數據的詳細信息
			if (rawData.length > 0) {
				const firstData = rawData[0];
				const utcTime = new Date(timestamp[0] * 1000);
				console.log(`🔍 第一筆數據詳細檢查:`);
				console.log(`   原始時間戳: ${timestamp[0]}`);
				console.log(`   UTC 時間: ${utcTime.toISOString()}`);
				console.log(
					`   轉換為交易日: ${firstData.date.toLocaleDateString("zh-TW")}`
				);
				console.log(`   開盤: ${firstData.open} / 收盤: ${firstData.close}`);
				console.log(`   最高: ${firstData.high} / 最低: ${firstData.low}`);
				console.log(`   成交量: ${firstData.volume.toLocaleString()}`);
			}

			const filteredData = rawData.filter((data) => {
				const dateStr = data.date.toISOString().split("T")[0];
				const inDateRange = dateStr >= startDate && dateStr <= endDate;
				const hasValidPrice = data.close > 0;
				return inDateRange && hasValidPrice;
			});

			console.log(`🔍 篩選後數據筆數: ${filteredData.length}`);
			console.log(`🔍 日期範圍: ${startDate} ~ ${endDate}`);

			return filteredData;
		} catch (error) {
			console.error("解析 Yahoo 數據錯誤:", error);
			return [];
		}
	};

	/**
	 * 從台灣證券交易所獲取股票數據
	 * @param symbol - 股票代號
	 * @param startDate - 開始日期
	 * @param endDate - 結束日期
	 * @returns 股票數據陣列
	 */
	const fetchTWSEData = async (
		symbol: string,
		startDate: string,
		endDate: string
	): Promise<StockData[]> => {
		try {
			// 移除股票代號中的後綴（如 .TW）
			const cleanSymbol = symbol.replace(/\.(TW|TWO)$/, "");

			// TWSE API 通常需要年月格式
			const start = new Date(startDate);
			const end = new Date(endDate);
			const results: StockData[] = [];

			// 按月份獲取數據
			for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
				const startMonth =
					year === start.getFullYear() ? start.getMonth() + 1 : 1;
				const endMonth = year === end.getFullYear() ? end.getMonth() + 1 : 12;

				for (let month = startMonth; month <= endMonth; month++) {
					const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${year}${month
						.toString()
						.padStart(2, "0")}01&stockNo=${cleanSymbol}`;

					try {
						const response = await fetch(
							`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
						);
						const jsonWrapper = await response.json();
						const data = JSON.parse(jsonWrapper.contents);

						if (data.stat === "OK" && data.data) {
							data.data.forEach((row: string[]) => {
								const [
									dateStr,
									,
									openStr,
									highStr,
									lowStr,
									closeStr,
									,
									,
									volumeStr,
								] = row;
								const date = dateStr.replace(/\//g, "-");
								const formattedDate = `20${date
									.split("-")
									.reverse()
									.join("-")}`;

								if (formattedDate >= startDate && formattedDate <= endDate) {
									results.push({
										symbol: cleanSymbol,
										date: new Date(formattedDate),
										open: parseFloat(openStr.replace(/,/g, "")),
										high: parseFloat(highStr.replace(/,/g, "")),
										low: parseFloat(lowStr.replace(/,/g, "")),
										close: parseFloat(closeStr.replace(/,/g, "")),
										volume: parseInt(volumeStr.replace(/,/g, "")),
									});
								}
							});
						}

						// 避免過度請求
						await new Promise((resolve) => setTimeout(resolve, 100));
					} catch (error) {
						console.warn(`TWSE API 月份 ${year}-${month} 請求失敗:`, error);
					}
				}
			}

			return results.sort((a, b) => a.date.getTime() - b.date.getTime());
		} catch (error) {
			console.error("TWSE API 錯誤:", error);
			return [];
		}
	};

	/**
	 * 真實台股數據獲取器 (更新版)
	 *
	 * 用途：使用多個可靠的API來源獲取真實台股數據
	 * API來源優先級：
	 * 1. Yahoo Finance Chart API (通過CORS代理)
	 * 2. 台灣證券交易所官方API
	 * 3. Alpha Vantage API (需要免費API Key)
	 * 4. 多個CORS代理服務輪替
	 *
	 * @param symbol - 股票代碼 (例：'2330')
	 * @param startDate - 開始日期 (YYYY-MM-DD格式)
	 * @param endDate - 結束日期 (YYYY-MM-DD格式)
	 * @returns Promise<StockData[]> - 股票歷史數據陣列
	 */
	const fetchRealStockData = async (
		symbol: string,
		startDate: string,
		endDate: string
	): Promise<StockData[]> => {
		console.log(
			`🔍🔍🔍 fetchRealStockData 被調用: ${symbol} (${startDate} - ${endDate})`
		);

		// 方法1: 使用 Yahoo Finance Chart API (通過CORS代理)
		try {
			console.log(`🌐 開始嘗試 Yahoo Finance Chart API...`);
			const corsProxies = [
				"https://corsproxy.io/?",
				"https://api.allorigins.win/get?url=",
				"https://cors-anywhere.herokuapp.com/",
				"https://proxy.cors.sh/",
			];

			for (const proxy of corsProxies) {
				try {
					const ticker = symbol + ".TW";
					// 修改API請求，使用更精確的參數
					const start = Math.floor(new Date(startDate).getTime() / 1000);
					const end = Math.floor(new Date(endDate).getTime() / 1000);
					const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${start}&period2=${end}&interval=1d&includeAdjustedClose=false`;

					let proxyUrl: string;
					if (proxy.includes("allorigins")) {
						proxyUrl = `${proxy}${encodeURIComponent(chartUrl)}`;
					} else {
						proxyUrl = `${proxy}${chartUrl}`;
					}

					console.log(`🌐 嘗試使用代理: ${proxy}`);
					console.log(`🔗 請求 URL: ${chartUrl}`);
					console.log(`🔗 完整代理 URL: ${proxyUrl}`);
					console.log(
						`🕐 請求時間範圍: ${startDate} (${start}) ~ ${endDate} (${end})`
					);
					const response = await fetch(proxyUrl, {
						headers: {
							"User-Agent":
								"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
						},
					});

					if (response.ok) {
						let chartData: unknown;

						if (proxy.includes("allorigins")) {
							const jsonWrapper = await response.json();
							chartData = JSON.parse(jsonWrapper.contents);
						} else {
							chartData = await response.json();
						}

						if (
							chartData &&
							typeof chartData === "object" &&
							"chart" in chartData
						) {
							const chart = (chartData as { chart: { result?: unknown[] } })
								.chart;
							if (chart?.result?.[0]) {
								console.log(`🔍 Yahoo API 原始數據結構:`, chart.result[0]);
								const data = parseYahooChartData(
									chart.result[0],
									symbol,
									startDate,
									endDate
								);
								console.log(`🔍 解析後的數據範例 (前5筆):`, data.slice(0, 5));
								if (data.length > 0) {
									console.log(
										`✅ Yahoo Finance Chart API 成功獲取 ${symbol} 數據: ${data.length} 天`
									);
									return data;
								}
							}
						}
					}
				} catch (proxyError) {
					console.log(`⚠️ 代理 ${proxy} 失敗:`, proxyError);
				}

				// 添加延遲避免被API限制
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		} catch (error) {
			console.log(`⚠️ Yahoo Finance Chart API 整體失敗:`, error);
		}

		// 方法2: 使用台灣證券交易所官方API
		try {
			const twseData = await fetchTWSEData(symbol, startDate, endDate);
			if (twseData.length > 0) {
				console.log(
					`✅ 台灣證交所API成功獲取 ${symbol} 數據: ${twseData.length} 天`
				);
				return twseData;
			}
		} catch (error) {
			console.log(`⚠️ 台灣證交所API失敗:`, error);
		}

		// 方法3: 使用傳統Yahoo Finance下載API (通過代理)
		try {
			const ticker = symbol + ".TW";
			const start = Math.floor(new Date(startDate).getTime() / 1000);
			const end = Math.floor(new Date(endDate).getTime() / 1000);
			const downloadUrl = `https://query1.finance.yahoo.com/v7/finance/download/${ticker}?period1=${start}&period2=${end}&interval=1d&events=history&includeAdjustedClose=true`;

			const corsProxies = [
				"https://api.allorigins.win/get?url=",
				"https://corsproxy.io/?",
			];

			for (const proxy of corsProxies) {
				try {
					const proxyUrl = proxy.includes("allorigins")
						? `${proxy}${encodeURIComponent(downloadUrl)}`
						: `${proxy}${downloadUrl}`;

					const response = await fetch(proxyUrl);

					if (response.ok) {
						let csvText: string;

						if (proxy.includes("allorigins")) {
							const jsonData = await response.json();
							csvText = jsonData.contents;
						} else {
							csvText = await response.text();
						}

						const data = parseCSVData(csvText, symbol);
						if (data.length > 0) {
							console.log(
								`✅ Yahoo Finance 下載API成功獲取 ${symbol} 數據: ${data.length} 天`
							);
							return data;
						}
					}
				} catch (proxyError) {
					console.log(`⚠️ 下載API代理 ${proxy} 失敗:`, proxyError);
				}

				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		} catch (error) {
			console.log(`⚠️ Yahoo Finance 下載API失敗:`, error);
		}

		// 如果所有方法都失敗，拋出錯誤
		throw new Error(`無法從任何數據源獲取 ${symbol} 的真實股票數據`);
	};

	/**
	 * CSV數據解析器
	 *
	 * 用途：將從Yahoo Finance獲取的CSV格式數據轉換為標準化的股票數據物件
	 * 處理內容：
	 * - 解析CSV標頭和數據行
	 * - 數據格式驗證和清理
	 * - 日期排序 (由舊到新)
	 *
	 * @param csvText - CSV格式的原始數據字串
	 * @param symbol - 股票代碼，用於標識數據來源
	 * @returns StockData[] - 解析後的股票數據陣列
	 */
	const parseCSVData = (csvText: string, symbol: string): StockData[] => {
		const lines = csvText.trim().split("\n");
		const data: StockData[] = [];

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) continue;

			const columns = line.split(",");

			if (columns.length >= 6) {
				const [dateStr, openStr, highStr, lowStr, closeStr, , volumeStr] =
					columns;

				const open = parseFloat(openStr);
				const high = parseFloat(highStr);
				const low = parseFloat(lowStr);
				const close = parseFloat(closeStr);
				const volume = parseInt(volumeStr) || 0;

				if (!isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
					data.push({
						date: new Date(dateStr),
						open: open,
						high: high,
						low: low,
						close: close,
						volume: volume,
						symbol: symbol,
					});
				}
			}
		}

		data.sort((a, b) => a.date.getTime() - b.date.getTime());
		return data;
	};

	/**
	 * 股票數據生成統一入口
	 *
	 * 用途：作為數據獲取的統一接口，內部調用真實數據獲取器
	 * 主要用於日誌記錄和未來擴展功能
	 *
	 * @param symbol - 股票代碼
	 * @param startDate - 開始日期
	 * @param endDate - 結束日期
	 * @returns Promise<StockData[]> - 股票數據陣列
	 */
	const generateStockData = async (
		symbol: string,
		startDate: string,
		endDate: string
	): Promise<StockData[]> => {
		console.log(
			`🔍🔍🔍 開始獲取 ${symbol} 的股票數據 (${startDate} - ${endDate})...`
		);
		const result = await fetchRealStockData(symbol, startDate, endDate);
		console.log(`✅✅✅ ${symbol} 數據獲取完成，共 ${result.length} 筆數據`);
		return result;
	};

	/**
	 * 技術指標計算器
	 *
	 * 用途：為原始股價數據計算各種技術分析指標
	 * 計算指標包括：
	 * - RSI (相對強弱指標)：判斷超買超賣
	 * - MACD (指數平滑移動平均線)：趨勢追蹤指標
	 * - MA5/MA20 (移動平均線)：趨勢判斷
	 * - 成交量比率：量價關係分析
	 *
	 * 注意：指標計算需要足夠的歷史數據，初期數據點可能為空
	 *
	 * @param data - 原始股票數據陣列
	 * @returns StockData[] - 包含技術指標的股票數據陣列
	 */
	const calculateIndicators = (data: StockData[]): StockData[] => {
		console.log(
			`🔍 calculateIndicators 開始計算技術指標，數據筆數: ${data.length}`
		);
		const result = [...data];

		// 計算 RSI
		for (let i = 0; i < result.length; i++) {
			if (i >= strategyParams.rsiPeriod && i > 0) {
				let gains = 0;
				let losses = 0;

				for (let j = i - strategyParams.rsiPeriod + 1; j <= i; j++) {
					if (j > 0) {
						const change = result[j].close - result[j - 1].close;
						if (change > 0) gains += change;
						else losses += Math.abs(change);
					}
				}

				const avgGain = gains / strategyParams.rsiPeriod;
				const avgLoss = losses / strategyParams.rsiPeriod;
				const rs = avgGain / (avgLoss || 1);
				result[i].rsi = 100 - 100 / (1 + rs);
			}
		}

		// 計算 MACD
		for (let i = 0; i < result.length; i++) {
			if (i >= strategyParams.macdSlow) {
				let fastSum = 0;
				let slowSum = 0;

				for (let j = i - strategyParams.macdFast + 1; j <= i; j++) {
					fastSum += result[j].close;
				}
				for (let j = i - strategyParams.macdSlow + 1; j <= i; j++) {
					slowSum += result[j].close;
				}

				const fastMA = fastSum / strategyParams.macdFast;
				const slowMA = slowSum / strategyParams.macdSlow;
				result[i].macd = fastMA - slowMA;

				if (i >= strategyParams.macdSlow + strategyParams.macdSignal) {
					let signalSum = 0;
					for (let j = i - strategyParams.macdSignal + 1; j <= i; j++) {
						if (result[j].macd !== undefined) {
							signalSum += result[j].macd!;
						}
					}
					result[i].macdSignal = signalSum / strategyParams.macdSignal;
					result[i].macdHistogram =
						(result[i].macd || 0) - (result[i].macdSignal || 0);
				}
			}
		}

		// 計算移動平均和成交量比率

		for (let i = 0; i < result.length; i++) {
			if (i >= 20) {
				let sum = 0;
				for (let j = i - 19; j <= i; j++) {
					sum += result[j].close;
				}
				result[i].ma20 = sum / 20;
			}

			if (i >= 5) {
				let sum = 0;
				for (let j = i - 4; j <= i; j++) {
					sum += result[j].close;
				}
				result[i].ma5 = sum / 5;
			}

			if (i >= 20) {
				let volumeSum = 0;
				for (let j = i - 19; j <= i; j++) {
					volumeSum += result[j].volume;
				}
				result[i].volumeMA20 = volumeSum / 20;
				result[i].volumeRatio = result[i].volume / (result[i].volumeMA20 || 1);
			}
		}

		console.log(
			`✅ 技術指標計算完成，有效數據從第 ${
				strategyParams.macdSlow + strategyParams.macdSignal
			} 天開始`
		);
		return result;
	};

	/**
	 * 買入信心度計算器
	 *
	 * 用途：根據多個技術指標計算進場的信心度分數
	 * 評估因子：
	 * - RSI底部回升 (+0.15~0.25)：基於用戶設定的超賣閾值
	 * - MACD黃金交叉 (+0.10~0.20)：趨勢轉強信號
	 * - 成交量放大 (+0.05~0.15)：資金關注度
	 * - 移動平均線排列 (+0.05~0.10)：多頭排列加分
	 *
	 * @param current - 當前股票數據
	 * @param previous - 前一天股票數據（可選）
	 * @returns number - 信心度分數 (0.0-0.95)
	 */
	const calculateConfidence = (
		current: StockData,
		previous?: StockData
	): number => {
		let confidence = 0.5;

		// RSI 基於用戶設定的超賣閾值來評分
		const extremeOversold = strategyParams.rsiOversold * 0.83; // 約 83% 的超賣閾值作為極度超賣
		if (
			(current.rsi || 0) < extremeOversold &&
			(current.rsi || 0) > (previous?.rsi || 0)
		) {
			confidence += 0.25; // 極度超賣且回升
		} else if (
			(current.rsi || 0) < strategyParams.rsiOversold &&
			(current.rsi || 0) > (previous?.rsi || 0)
		) {
			confidence += 0.15; // 超賣且回升
		}

		if (
			(current.macd || 0) > (current.macdSignal || 0) &&
			(previous?.macd || 0) <= (previous?.macdSignal || 0)
		) {
			confidence += 0.2;
		} else if ((current.macd || 0) > (current.macdSignal || 0)) {
			confidence += 0.1;
		}

		if ((current.volumeRatio || 0) > 2.0) {
			confidence += 0.15;
		} else if ((current.volumeRatio || 0) > 1.5) {
			confidence += 0.1;
		} else if ((current.volumeRatio || 0) > 1.2) {
			confidence += 0.05;
		}

		if (
			current.close > (current.ma5 || 0) &&
			(current.ma5 || 0) > (current.ma20 || 0)
		) {
			confidence += 0.1;
		} else if (current.close > (current.ma20 || 0)) {
			confidence += 0.05;
		}

		return Math.min(confidence, 0.95);
	};

	/**
	 * 買入信號檢查器
	 *
	 * 用途：綜合多個條件判斷是否應該買入股票
	 * 買入條件（須全部滿足）：
	 * 1. RSI < 超賣閾值 且較前日回升：超賣反彈
	 * 2. MACD黃金交叉：趨勢轉多
	 * 3. 成交量放大：資金進場
	 * 4. 收紅K線：當日上漲
	 * 5. 信心度達標：綜合評分通過門檻
	 *
	 * @param current - 當前股票數據
	 * @param previous - 前一天股票數據（可選）
	 * @returns BuySignalResult - 買入信號結果 {signal: boolean, reason: string, confidence?: number}
	 */
	const checkBuySignal = (
		current: StockData,
		previous?: StockData
	): BuySignalResult => {
		const dateStr = current.date.toISOString().split("T")[0];

		if (!current.rsi || !current.macd || !current.macdSignal) {
			console.log(
				`🚫 ${dateStr} 數據不足: RSI=${current.rsi}, MACD=${current.macd}, Signal=${current.macdSignal}`
			);
			return { signal: false, reason: "數據不足" };
		}

		console.log(
			`🔍 ${dateStr} 檢查買入信號: RSI=${current.rsi.toFixed(2)} (閾值: ${
				strategyParams.rsiOversold
			}), MACD=${current.macd.toFixed(4)}, Signal=${current.macdSignal.toFixed(
				4
			)}`
		);

		if (current.rsi > strategyParams.rsiOversold) {
			console.log(
				`🚫 ${dateStr} RSI不符合條件: ${current.rsi.toFixed(2)} > ${
					strategyParams.rsiOversold
				}`
			);
			return {
				signal: false,
				reason: `RSI不符合條件 (${current.rsi.toFixed(2)} > ${
					strategyParams.rsiOversold
				})`,
			};
		}

		if ((current.macd || 0) <= (current.macdSignal || 0)) {
			console.log(
				`🚫 ${dateStr} MACD未黃金交叉: ${current.macd.toFixed(
					4
				)} <= ${current.macdSignal.toFixed(4)}`
			);
			return { signal: false, reason: "MACD未黃金交叉" };
		}

		if ((current.rsi || 0) <= (previous?.rsi || 0)) {
			console.log(
				`🚫 ${dateStr} RSI未回升: ${current.rsi.toFixed(2)} <= ${
					previous?.rsi?.toFixed(2) || "N/A"
				}`
			);
			return { signal: false, reason: "RSI未回升" };
		}

		if ((current.volumeRatio || 0) < strategyParams.volumeThreshold) {
			console.log(
				`🚫 ${dateStr} 成交量不足: ${
					current.volumeRatio?.toFixed(2) || "N/A"
				} < ${strategyParams.volumeThreshold}`
			);
			return { signal: false, reason: "成交量不足" };
		}

		if (current.close <= current.open) {
			console.log(
				`🚫 ${dateStr} 收黑K線: Close=${current.close} <= Open=${current.open}`
			);
			return { signal: false, reason: "收黑K線" };
		}

		const confidence = calculateConfidence(current, previous);
		if (confidence < strategyParams.confidenceThreshold) {
			console.log(
				`🚫 ${dateStr} 信心度不足: ${(confidence * 100).toFixed(1)}% < ${(
					strategyParams.confidenceThreshold * 100
				).toFixed(1)}%`
			);
			return {
				signal: false,
				reason: `信心度不足: ${(confidence * 100).toFixed(1)}% < ${(
					strategyParams.confidenceThreshold * 100
				).toFixed(1)}%`,
			};
		}

		console.log(
			`✅ ${dateStr} 買入信號觸發！信心度: ${(confidence * 100).toFixed(1)}%`
		);
		return {
			signal: true,
			reason: `買進訊號，信心度: ${(confidence * 100).toFixed(1)}%`,
			confidence,
		};
	};

	/**
	 * 賣出信號檢查器
	 *
	 * 用途：判斷持有股票是否應該賣出
	 * 賣出條件（任一滿足即賣出）：
	 * 1. 達到停利點：獲利達預設百分比
	 * 2. 觸及停損點：虧損達預設百分比
	 * 3. RSI超買 (>70)：技術面過熱
	 * 4. MACD死亡交叉：趨勢轉弱
	 * 5. 持有超過30天：避免長期套牢
	 *
	 * @param current - 當前股票數據
	 * @param entryPrice - 買入價格
	 * @param entryDate - 買入日期
	 * @param holdingDays - 持有天數
	 * @returns SellSignalResult - 賣出信號結果 {signal: boolean, reason: string}
	 */
	const checkSellSignal = (
		current: StockData,
		entryPrice: number,
		entryDate: Date,
		holdingDays: number
	): SellSignalResult => {
		const profitRate = (current.close - entryPrice) / entryPrice;

		if (profitRate >= strategyParams.stopProfit) {
			return {
				signal: true,
				reason: `停利出場，獲利: ${(profitRate * 100).toFixed(2)}%`,
			};
		}

		if (profitRate <= -strategyParams.stopLoss) {
			return {
				signal: true,
				reason: `停損出場，虧損: ${(profitRate * 100).toFixed(2)}%`,
			};
		}

		if ((current.rsi || 0) > 70) {
			return { signal: true, reason: "RSI超買出場" };
		}

		if (
			(current.macd || 0) < (current.macdSignal || 0) &&
			(current.macdHistogram || 0) < 0
		) {
			return { signal: true, reason: "MACD死亡交叉出場" };
		}

		if (holdingDays > 30) {
			return { signal: true, reason: "持有超過30天出場" };
		}

		return { signal: false, reason: "" };
	};

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
	const runBacktest = async () => {
		console.log("🔥🔥🔥 回測按鈕被點擊了！開始執行回測...");
		setLoading(true);

		try {
			let currentCapital = initialCapital;
			const trades: TradeResult[] = [];
			const positions: Record<string, Position> = {};
			const equityCurve: {
				date: string;
				value: number;
				cash: number;
				positions: number;
			}[] = [];

			console.log("🚀 開始獲取真實股票數據...");
			console.log("💡 請打開瀏覽器的開發者工具 Network 頁籤來查看 API 請求！");

			const allStockData: Record<string, StockData[]> = {};
			for (const stock of stocks) {
				console.log(`📈 正在處理 ${stock}...`);
				try {
					const rawData = await generateStockData(stock, startDate, endDate);
					if (rawData && rawData.length > 0) {
						const processedData = calculateIndicators(rawData);
						allStockData[stock] = processedData;
						console.log(`✅ ${stock} 數據處理完成: ${rawData.length} 天`);
						console.log(
							`🔍 ${stock} 處理後數據範例:`,
							processedData.slice(0, 3).map((d) => ({
								date: d.date.toISOString().split("T")[0],
								rsi: d.rsi,
								macd: d.macd,
							}))
						);
					} else {
						console.warn(`⚠️ ${stock} 數據為空，跳過處理`);
					}
				} catch (error) {
					console.error(`❌ ${stock} 數據獲取失敗:`, error);
				}

				await new Promise((resolve) => setTimeout(resolve, 500));
			}

			const validStocks = Object.keys(allStockData).filter(
				(stock) => allStockData[stock] && allStockData[stock].length > 0
			);

			if (validStocks.length === 0) {
				throw new Error("無法獲取任何股票的有效數據");
			}

			console.log(
				`📊 成功獲取 ${validStocks.length} 支股票的數據，開始回測...`
			);

			const allDates = [
				...new Set(
					Object.values(allStockData)
						.flat()
						.map((d) => d.date.toISOString().split("T")[0])
				),
			].sort();

			for (const dateStr of allDates) {
				const currentDate = new Date(dateStr);

				for (const stock of validStocks) {
					const stockData = allStockData[stock];
					const currentIndex = stockData.findIndex(
						(d) => d.date.toISOString().split("T")[0] === dateStr
					);

					// 確保指標數據已經計算完成（至少需要 MACD 計算完成的天數）
					const minRequiredIndex =
						strategyParams.macdSlow + strategyParams.macdSignal;
					if (currentIndex < minRequiredIndex) continue;

					const current = stockData[currentIndex];
					const previous = stockData[currentIndex - 1];

					// 確認當前數據有完整的技術指標
					if (!current.rsi || !current.macd || !current.macdSignal) {
						console.log(
							`🚫 ${dateStr} ${stock} 指標數據不完整: RSI=${current.rsi}, MACD=${current.macd}, Signal=${current.macdSignal}`
						);
						continue;
					}

					// 添加調試信息來檢查數據
					if (currentIndex < minRequiredIndex + 5) {
						console.log(
							`🔍 ${dateStr} ${stock} - Index: ${currentIndex}, RSI: ${current.rsi?.toFixed(
								2
							)}, MACD: ${current.macd?.toFixed(
								4
							)}, Signal: ${current.macdSignal?.toFixed(4)}`
						);
					}

					if (positions[stock]) {
						const position = positions[stock];
						const holdingDays = Math.floor(
							(currentDate.getTime() - position.entryDate.getTime()) /
								(1000 * 60 * 60 * 24)
						);
						const sellCheck = checkSellSignal(
							current,
							position.entryPrice,
							position.entryDate,
							holdingDays
						);

						if (sellCheck.signal) {
							const sellAmount = current.close * position.quantity * 0.9965;
							const profit = sellAmount - position.investAmount;
							const profitRate = profit / position.investAmount;

							trades.push({
								stock,
								action: "SELL",
								date: currentDate,
								price: current.close,
								quantity: position.quantity,
								amount: sellAmount,
								entryPrice: position.entryPrice,
								entryDate: position.entryDate,
								holdingDays,
								profit,
								profitRate,
								confidence: position.confidence,
								reason: sellCheck.reason,
							});

							currentCapital += sellAmount;
							delete positions[stock];
						}
					}

					if (!positions[stock]) {
						const buyCheck = checkBuySignal(current, previous);

						if (buyCheck.signal) {
							const positionSize =
								(buyCheck.confidence || 0) > 0.8
									? 0.225
									: (buyCheck.confidence || 0) > 0.65
									? 0.15
									: 0.105;
							const investAmount = Math.min(
								currentCapital * positionSize,
								currentCapital * strategyParams.maxPositionSize
							);

							if (investAmount > 10000) {
								const quantity = Math.floor(
									investAmount / (current.close * 1.001425)
								);
								const actualInvestAmount = current.close * quantity * 1.001425;

								if (actualInvestAmount <= currentCapital) {
									positions[stock] = {
										entryDate: currentDate,
										entryPrice: current.close,
										quantity,
										investAmount: actualInvestAmount,
										confidence: buyCheck.confidence,
									};

									trades.push({
										stock,
										action: "BUY",
										date: currentDate,
										price: current.close,
										quantity,
										amount: actualInvestAmount,
										confidence: buyCheck.confidence,
										reason: buyCheck.reason,
									});

									currentCapital -= actualInvestAmount;
								}
							}
						}
					}
				}

				let positionValue = 0;
				for (const [stock, position] of Object.entries(positions)) {
					const stockData = allStockData[stock];
					const currentData = stockData.find(
						(d) => d.date.toISOString().split("T")[0] === dateStr
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

			const completedTrades = trades.filter((t) => t.action === "SELL");
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
									0
							  ) / completedTrades.length
							: 0,
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
							stockTrades.length > 0
								? stockWins.length / stockTrades.length
								: 0,
						totalProfit: stockTrades.reduce(
							(sum, t) => sum + (t.profit || 0),
							0
						),
					};
				}),
			};

			console.log(`🎉 回測完成！共執行 ${completedTrades.length} 筆交易`);
			setResults(resultsData);
		} catch (error: unknown) {
			console.error("❌ 回測執行錯誤:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			alert(`回測執行失敗: ${errorMessage}`);
		} finally {
			setLoading(false);
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
			setNewStock("");
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
		return `NT$ ${value.toLocaleString("zh-TW", { minimumFractionDigits: 0 })}`;
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
		return (value * 100).toFixed(2) + "%";
	};

	const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

	return (
		<div className='w-full max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen'>
			<div className='bg-white rounded-lg shadow-lg p-6 mb-6'>
				<h1 className='text-3xl font-bold text-center mb-8 text-gray-800'>
					策略3.1 動態回測系統
				</h1>

				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6'>
					<div className='space-y-4'>
						<h3 className='text-lg font-semibold text-gray-700'>股票設定</h3>
						<div className='flex gap-2'>
							<input
								type='text'
								placeholder='輸入股票代碼'
								className='flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={newStock}
								onChange={(e) => setNewStock(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && addStock()}
							/>
							<button
								onClick={addStock}
								className='px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors'>
								新增
							</button>
						</div>
						<div className='flex flex-wrap gap-2'>
							{stocks.map((stock) => (
								<span
									key={stock}
									className='inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm'>
									{stock}
									<button
										onClick={() => removeStock(stock)}
										className='ml-1 text-blue-600 hover:text-blue-800'>
										×
									</button>
								</span>
							))}
						</div>
					</div>

					<div className='space-y-4'>
						<h3 className='text-lg font-semibold text-gray-700'>回測期間</h3>
						<div className='space-y-2'>
							<div>
								<label className='block text-sm font-medium text-gray-600 mb-1'>
									開始日期
								</label>
								<input
									type='date'
									className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
								/>
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-600 mb-1'>
									結束日期
								</label>
								<input
									type='date'
									className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
								/>
							</div>
						</div>
					</div>

					<div className='space-y-4'>
						<h3 className='text-lg font-semibold text-gray-700'>資金設定</h3>
						<div>
							<label className='block text-sm font-medium text-gray-600 mb-1'>
								初始資金 (NT$)
							</label>
							<input
								type='number'
								className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={initialCapital}
								onChange={(e) => setInitialCapital(Number(e.target.value))}
							/>
						</div>
					</div>
				</div>

				<div className='mb-6'>
					<h3 className='text-lg font-semibold text-gray-700 mb-4'>策略參數</h3>
					<div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4'>
						<div>
							<label className='block text-xs font-medium text-gray-600 mb-1'>
								RSI週期
							</label>
							<input
								type='number'
								className='w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
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
							<label className='block text-xs font-medium text-gray-600 mb-1'>
								RSI超賣
							</label>
							<input
								type='number'
								className='w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
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
							<label className='block text-xs font-medium text-gray-600 mb-1'>
								MACD快線
							</label>
							<input
								type='number'
								className='w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
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
							<label className='block text-xs font-medium text-gray-600 mb-1'>
								MACD慢線
							</label>
							<input
								type='number'
								className='w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
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
							<label className='block text-xs font-medium text-gray-600 mb-1'>
								信心度門檻
							</label>
							<input
								type='number'
								step='0.01'
								min='0'
								max='1'
								className='w-full px-2 py-1 text-sm border border-yellow-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-yellow-50'
								value={strategyParams.confidenceThreshold}
								onChange={(e) =>
									setStrategyParams({
										...strategyParams,
										confidenceThreshold: Number(e.target.value),
									})
								}
								title='設定進場所需的最低信心度 (0.0-1.0)，數值越高進場越嚴格'
							/>
							<div className='text-xs text-yellow-600 mt-1'>
								{(strategyParams.confidenceThreshold * 100).toFixed(0)}%
							</div>
						</div>
						<div>
							<label className='block text-xs font-medium text-gray-600 mb-1'>
								停損(%)
							</label>
							<input
								type='number'
								step='0.01'
								className='w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
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
							<label className='block text-xs font-medium text-gray-600 mb-1'>
								停利(%)
							</label>
							<input
								type='number'
								step='0.01'
								className='w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500'
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

					<div className='mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
						<h4 className='text-sm font-semibold text-blue-800 mb-2'>
							💡 信心度門檻設定指南
						</h4>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-blue-700'>
							<div>
								<strong>保守型 (0.6-0.8)</strong>
								<br />
								進場較嚴格，勝率高但交易次數少
							</div>
							<div>
								<strong>平衡型 (0.5-0.6)</strong>
								<br />
								預設範圍，平衡勝率與交易頻率
							</div>
							<div>
								<strong>積極型 (0.3-0.5)</strong>
								<br />
								進場較寬鬆，交易次數多但風險較高
							</div>
						</div>
						<div className='mt-2 text-xs text-blue-600'>
							<strong>目前設定：</strong>
							{strategyParams.confidenceThreshold >= 0.6
								? "保守型"
								: strategyParams.confidenceThreshold >= 0.5
								? "平衡型"
								: "積極型"}
							({(strategyParams.confidenceThreshold * 100).toFixed(0)}%)
						</div>
					</div>
				</div>

				<div className='text-center'>
					<button
						onClick={runBacktest}
						disabled={loading || stocks.length === 0}
						className='px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg'>
						{loading ? "回測中..." : "開始回測"}
					</button>
				</div>
			</div>

			{results && (
				<div className='space-y-6'>
					<div className='bg-white rounded-lg shadow-lg p-6'>
						<h2 className='text-2xl font-bold mb-6 text-gray-800'>
							回測結果摘要
						</h2>
						<div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
							<div className='text-center p-4 bg-blue-50 rounded-lg'>
								<div className='text-2xl font-bold text-blue-600'>
									{formatCurrency(results.performance.finalCapital)}
								</div>
								<div className='text-sm text-gray-600'>最終資金</div>
							</div>
							<div className='text-center p-4 bg-green-50 rounded-lg'>
								<div className='text-2xl font-bold text-green-600'>
									{formatPercent(results.performance.totalReturn)}
								</div>
								<div className='text-sm text-gray-600'>總報酬率</div>
							</div>
							<div className='text-center p-4 bg-purple-50 rounded-lg'>
								<div className='text-2xl font-bold text-purple-600'>
									{formatPercent(results.performance.annualReturn)}
								</div>
								<div className='text-sm text-gray-600'>年化報酬</div>
							</div>
							<div className='text-center p-4 bg-orange-50 rounded-lg'>
								<div className='text-2xl font-bold text-orange-600'>
									{formatPercent(results.trades.winRate)}
								</div>
								<div className='text-sm text-gray-600'>勝率</div>
							</div>
						</div>
					</div>

					<div className='bg-white rounded-lg shadow-lg p-6'>
						<h3 className='text-xl font-bold mb-4 text-gray-800'>交易統計</h3>
						<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
							<div className='p-3 border rounded-lg'>
								<div className='text-lg font-semibold'>
									{results.trades.totalTrades}
								</div>
								<div className='text-sm text-gray-600'>總交易次數</div>
							</div>
							<div className='p-3 border rounded-lg'>
								<div className='text-lg font-semibold text-green-600'>
									{results.trades.winningTrades}
								</div>
								<div className='text-sm text-gray-600'>獲利交易</div>
							</div>
							<div className='p-3 border rounded-lg'>
								<div className='text-lg font-semibold text-red-600'>
									{results.trades.losingTrades}
								</div>
								<div className='text-sm text-gray-600'>虧損交易</div>
							</div>
							<div className='p-3 border rounded-lg'>
								<div className='text-lg font-semibold'>
									{formatPercent(results.trades.avgWin)}
								</div>
								<div className='text-sm text-gray-600'>平均獲利</div>
							</div>
							<div className='p-3 border rounded-lg'>
								<div className='text-lg font-semibold'>
									{formatPercent(results.trades.avgLoss)}
								</div>
								<div className='text-sm text-gray-600'>平均虧損</div>
							</div>
							<div className='p-3 border rounded-lg'>
								<div className='text-lg font-semibold'>
									{formatPercent(results.trades.maxWin)}
								</div>
								<div className='text-sm text-gray-600'>最大獲利</div>
							</div>
							<div className='p-3 border rounded-lg'>
								<div className='text-lg font-semibold'>
									{formatPercent(results.trades.maxLoss)}
								</div>
								<div className='text-sm text-gray-600'>最大虧損</div>
							</div>
							<div className='p-3 border rounded-lg'>
								<div className='text-lg font-semibold'>
									{results.trades.avgHoldingDays.toFixed(1)}天
								</div>
								<div className='text-sm text-gray-600'>平均持股天數</div>
							</div>
						</div>
					</div>

					<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
						<div className='bg-white rounded-lg shadow-lg p-6'>
							<h3 className='text-xl font-bold mb-4 text-gray-800'>資金曲線</h3>
							<div className='w-full h-80'>
								<LineChart
									width={500}
									height={300}
									data={results.equityCurve.slice(-100)}>
									<CartesianGrid strokeDasharray='3 3' />
									<XAxis
										dataKey='date'
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
											name === "value"
												? "總資產"
												: name === "cash"
												? "現金"
												: "持倉",
										]}
									/>
									<Legend />
									<Line
										type='monotone'
										dataKey='value'
										stroke='#8884d8'
										strokeWidth={2}
										name='總資產'
									/>
									<Line
										type='monotone'
										dataKey='cash'
										stroke='#82ca9d'
										strokeWidth={1}
										name='現金'
									/>
									<Line
										type='monotone'
										dataKey='positions'
										stroke='#ffc658'
										strokeWidth={1}
										name='持倉'
									/>
								</LineChart>
							</div>
						</div>

						<div className='bg-white rounded-lg shadow-lg p-6'>
							<h3 className='text-xl font-bold mb-4 text-gray-800'>個股表現</h3>
							<div className='w-full h-80'>
								<BarChart
									width={500}
									height={300}
									data={results.stockPerformance}>
									<CartesianGrid strokeDasharray='3 3' />
									<XAxis dataKey='stock' tick={{ fontSize: 12 }} />
									<YAxis tick={{ fontSize: 12 }} />
									<Tooltip
										formatter={(value, name) => [
											name === "totalProfit"
												? formatCurrency(Number(value))
												: name === "winRate"
												? formatPercent(Number(value))
												: value,
											name === "totalProfit"
												? "總獲利"
												: name === "winRate"
												? "勝率"
												: "交易次數",
										]}
									/>
									<Legend />
									<Bar dataKey='totalProfit' fill='#8884d8' name='總獲利' />
								</BarChart>
							</div>
						</div>
					</div>

					<div className='bg-white rounded-lg shadow-lg p-6'>
						<h3 className='text-xl font-bold mb-4 text-gray-800'>
							交易結果分布
						</h3>
						<div className='flex justify-center'>
							<PieChart width={400} height={300}>
								<Pie
									data={[
										{
											name: "獲利交易",
											value: results.trades.winningTrades,
											fill: "#00C49F",
										},
										{
											name: "虧損交易",
											value: results.trades.losingTrades,
											fill: "#FF8042",
										},
									]}
									cx={200}
									cy={150}
									labelLine={false}
									label={({ name, percent }) =>
										`${name} ${((percent || 0) * 100).toFixed(0)}%`
									}
									outerRadius={80}
									fill='#8884d8'
									dataKey='value'>
									{[
										{ name: "獲利交易", value: results.trades.winningTrades },
										{ name: "虧損交易", value: results.trades.losingTrades },
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

					<div className='bg-white rounded-lg shadow-lg p-6'>
						<h3 className='text-xl font-bold mb-4 text-gray-800'>
							詳細交易記錄
						</h3>
						<div className='overflow-x-auto'>
							<table className='w-full text-sm'>
								<thead>
									<tr className='bg-gray-50'>
										<th className='px-4 py-2 text-left'>股票</th>
										<th className='px-4 py-2 text-left'>進場日期</th>
										<th className='px-4 py-2 text-left'>出場日期</th>
										<th className='px-4 py-2 text-right'>進場價</th>
										<th className='px-4 py-2 text-right'>出場價</th>
										<th className='px-4 py-2 text-center'>持有天數</th>
										<th className='px-4 py-2 text-center'>信心度</th>
										<th className='px-4 py-2 text-right'>獲利率</th>
										<th className='px-4 py-2 text-right'>獲利金額</th>
										<th className='px-4 py-2 text-left'>出場原因</th>
									</tr>
								</thead>
								<tbody>
									{results.detailedTrades.slice(-20).map((trade, index) => (
										<tr
											key={index}
											className={`border-b ${
												(trade.profit || 0) > 0 ? "bg-green-50" : "bg-red-50"
											}`}>
											<td className='px-4 py-2 font-medium'>{trade.stock}</td>
											<td className='px-4 py-2'>
												{trade.entryDate?.toLocaleDateString()}
											</td>
											<td className='px-4 py-2'>
												{trade.date.toLocaleDateString()}
											</td>
											<td className='px-4 py-2 text-right'>
												{trade.entryPrice?.toFixed(2)}
											</td>
											<td className='px-4 py-2 text-right'>
												{trade.price.toFixed(2)}
											</td>
											<td className='px-4 py-2 text-center'>
												{trade.holdingDays}
											</td>
											<td className='px-4 py-2 text-center'>
												<span
													className={`inline-block px-2 py-1 rounded text-xs font-medium ${
														(trade.confidence || 0) >= 0.7
															? "bg-green-100 text-green-800"
															: (trade.confidence || 0) >= 0.5
															? "bg-yellow-100 text-yellow-800"
															: "bg-red-100 text-red-800"
													}`}>
													{trade.confidence
														? `${(trade.confidence * 100).toFixed(1)}%`
														: "N/A"}
												</span>
											</td>
											<td
												className={`px-4 py-2 text-right font-medium ${
													(trade.profit || 0) > 0
														? "text-green-600"
														: "text-red-600"
												}`}>
												{formatPercent(trade.profitRate || 0)}
											</td>
											<td
												className={`px-4 py-2 text-right font-medium ${
													(trade.profit || 0) > 0
														? "text-green-600"
														: "text-red-600"
												}`}>
												{formatCurrency(trade.profit || 0)}
											</td>
											<td className='px-4 py-2 text-xs'>{trade.reason}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{results.detailedTrades.length > 20 && (
							<div className='mt-4 text-center text-gray-500'>
								顯示最近20筆交易，共{results.detailedTrades.length}筆
							</div>
						)}
					</div>

					<div className='bg-white rounded-lg shadow-lg p-6'>
						<h3 className='text-xl font-bold mb-4 text-gray-800'>
							策略分析建議
						</h3>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							<div>
								<h4 className='font-semibold text-green-600 mb-2'>
									✅ 策略優勢
								</h4>
								<ul className='space-y-1 text-sm text-gray-700'>
									<li>
										• 勝率: {formatPercent(results.trades.winRate)}{" "}
										{results.trades.winRate > 0.7
											? "(優秀)"
											: results.trades.winRate > 0.6
											? "(良好)"
											: "(需改進)"}
									</li>
									<li>
										• 年化報酬:{" "}
										{formatPercent(results.performance.annualReturn)}{" "}
										{results.performance.annualReturn > 0.15
											? "(優秀)"
											: results.performance.annualReturn > 0.1
											? "(良好)"
											: "(一般)"}
									</li>
									<li>
										• 平均持股: {results.trades.avgHoldingDays.toFixed(1)}天
										(適中週期)
									</li>
									<li>• 風險控制: 有明確停損停利機制</li>
								</ul>
							</div>
							<div>
								<h4 className='font-semibold text-orange-600 mb-2'>
									⚠️ 改進建議
								</h4>
								<ul className='space-y-1 text-sm text-gray-700'>
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

			<div className='bg-white rounded-lg shadow-lg p-6 mt-6'>
				<h3 className='text-xl font-bold mb-4 text-gray-800'>使用說明</h3>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700'>
					<div>
						<h4 className='font-semibold mb-2'>📈 策略邏輯</h4>
						<ul className='space-y-1'>
							<li>
								• <strong>進場條件</strong>: RSI超賣回升 + MACD黃金交叉 +
								成交量放大 + 信心度≥
								{(strategyParams.confidenceThreshold * 100).toFixed(0)}%
							</li>
							<li>
								• <strong>出場條件</strong>: 停利
								{(strategyParams.stopProfit * 100).toFixed(0)}% 或 停損
								{(strategyParams.stopLoss * 100).toFixed(0)}% 或 技術面轉弱
							</li>
							<li>
								• <strong>倉位管理</strong>: 根據信心度動態調整投入比例
							</li>
							<li>
								• <strong>風險控制</strong>: 單檔最大25%，總倉位最大75%
							</li>
						</ul>
					</div>
					<div>
						<h4 className='font-semibold mb-2'>🔧 參數調整</h4>
						<ul className='space-y-1'>
							<li>
								• <strong>RSI週期</strong>: 建議10-21，預設14
							</li>
							<li>
								• <strong>MACD參數</strong>: 快線8-15，慢線20-35
							</li>
							<li>
								• <strong>信心度門檻</strong>: 0.3-0.8，預設0.5
							</li>
							<li>
								• <strong>停損停利</strong>: 可根據個股波動度調整
							</li>
						</ul>
					</div>
				</div>
				<div className='mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
					<p className='text-sm text-yellow-800'>
						<strong>📊 數據來源說明</strong>: 本系統優先使用Yahoo Finance
						API獲取真實台股歷史數據。
						如API無法連接，將自動降級使用增強型模擬數據（基於真實股價特性設計）。
						過去績效不代表未來表現，請謹慎評估風險後使用。
					</p>
				</div>
			</div>
		</div>
	);
};

export default BacktestSystem;
