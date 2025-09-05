# Stock Trading Frontend 📈

## Description

股票交易系統前端 - 基於 Next.js 開發的股票分析與回測介面

## 🚀 主要功能

### 📊 回測系統

- **RSI 策略回測**: 基於 RSI 超賣回升與 MACD 黃金交叉的買入信號
- **W 策略回測**: 頭頭高+底底高+突破 MA5 的完整交易策略
- **固定股數模式**: 每次交易固定 1000 股，簡化資金管理邏輯
- **績效分析**:
  - **最終收益**: 代表投資組合總價值（累積損益）
  - **總報酬率**: 整體獲利率計算
  - **年化報酬**: 換算成年化的投資報酬
  - **勝率分析**: 獲利交易占比統計

### 🎯 回測與實時掃描差異

- **回測邏輯**: 基於歷史每個時點的所有可得資訊進行模擬交易
- **實時掃描**: 從當日往前推 90 天，專注於最近趨勢判斷
- **高低點分析**: 統一使用最近 2 個高點+2 個低點的上升趨勢判斷
- **時間過濾**: 回測有時間過濾確保不會未卜先知，掃描無需過濾

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
