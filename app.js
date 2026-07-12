const app_id = "1089"; // Demo application ID
let ws = null;
let isRunning = false;
let tradeInProgress = false;
let profit = 0;
let trades = [];
let priceHistory = [];
let winCount = 0;
let lossCount = 0;

// UI Elements
const tokenInput = document.getElementById("token");
const marketSelect = document.getElementById("market");
const stakeInput = document.getElementById("stake");
const tpInput = document.getElementById("tp");
const slInput = document.getElementById("sl");
const connectBtn = document.getElementById("connect");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const balanceDisplay = document.getElementById("balance");
const signalDisplay = document.getElementById("signal");
const profitDisplay = document.getElementById("profit");
const logDiv = document.getElementById("log");

// Event Listeners
connectBtn.addEventListener("click", () => {
    const token = tokenInput.value;
    if (!token) {
        addLog("Error: Please enter your Deriv API token", "error");
        return;
    }
    connect(token);
});

startBtn.addEventListener("click", () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        addLog("Error: Not connected to Deriv", "error");
        return;
    }
    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    marketSelect.disabled = true;
    stakeInput.disabled = true;
    tpInput.disabled = true;
    slInput.disabled = true;
    addLog("Bot started - Waiting for signal...", "success");
    signalDisplay.innerHTML = "📊 Signal: WAIT";
    setTimeout(() => generateSignal(), 1000);
});

stopBtn.addEventListener("click", () => {
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    marketSelect.disabled = false;
    stakeInput.disabled = false;
    tpInput.disabled = false;
    slInput.disabled = false;
    addLog("Bot stopped", "warning");
    signalDisplay.innerHTML = "📊 Signal: STOPPED";
});

function connect(token) {
    addLog("Connecting to Deriv API...", "info");
    ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${app_id}`);

    ws.onopen = () => {
        addLog("Connected to Deriv API", "success");
        connectBtn.disabled = true;
        tokenInput.disabled = true;
        startBtn.disabled = false;

        ws.send(JSON.stringify({
            authorize: token
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received:", data);

        // Handle Authorization
        if (data.msg_type === "authorize") {
            if (data.authorize) {
                balanceDisplay.innerHTML =
                    "💰 Balance: $" + parseFloat(data.authorize.balance).toFixed(2) + " " + data.authorize.currency;
                addLog("Authorization successful - Account ready", "success");
            } else if (data.error) {
                addLog("Authorization failed: " + data.error.message, "error");
                disconnect();
            }
        }

        // Handle Tick Data (Price Updates)
        if (data.msg_type === "tick") {
            if (data.tick) {
                priceHistory.push(data.tick.quote);
                if (priceHistory.length > 100) {
                    priceHistory.shift(); // Keep only last 100 prices
                }
                analyzePrices();
            }
        }

        // Handle Trade Execution
        if (data.msg_type === "buy") {
            if (data.buy) {
                addLog("Trade executed: Contract ID " + data.buy.contract_id, "success");
                tradeInProgress = true;
                monitorTrade(data.buy.contract_id);
            } else if (data.error) {
                addLog("Trade failed: " + data.error.message, "error");
                tradeInProgress = false;
                if (isRunning) {
                    setTimeout(() => generateSignal(), 2000);
                }
            }
        }

        // Handle Trade Closure
        if (data.msg_type === "sell") {
            if (data.sell) {
                const payout = parseFloat(data.sell.payout) || 0;
                const cost = parseFloat(data.sell.transaction_cost) || 0;
                const tradeProfitLoss = payout - cost;
                profit += tradeProfitLoss;

                if (tradeProfitLoss > 0) {
                    winCount++;
                    addLog("✓ Trade WON: +$" + tradeProfitLoss.toFixed(2), "success");
                } else {
                    lossCount++;
                    addLog("✗ Trade LOST: -$" + Math.abs(tradeProfitLoss).toFixed(2), "error");
                }

                profitDisplay.innerHTML = "📈 Profit: $" + profit.toFixed(2) + " (W:" + winCount + " L:" + lossCount + ")";
                tradeInProgress = false;

                if (isRunning) {
                    setTimeout(() => generateSignal(), 2000);
                }
            } else if (data.error) {
                addLog("Error closing trade: " + data.error.message, "error");
            }
        }

        // Handle Contract Status
        if (data.msg_type === "proposal_open_contract") {
            if (data.proposal_open_contract) {
                const contract = data.proposal_open_contract;
                if (contract.is_expired === 1) {
                    closeTrade(contract.contract_id);
                }
            }
        }
    };

    ws.onerror = (error) => {
        addLog("WebSocket Error: " + error, "error");
    };

    ws.onclose = () => {
        addLog("Disconnected from Deriv", "warning");
        connectBtn.disabled = false;
        tokenInput.disabled = false;
        startBtn.disabled = true;
        stopBtn.disabled = true;
        isRunning = false;
    };
}

function disconnect() {
    if (ws) {
        ws.close();
    }
}

// Advanced Signal Generation with Technical Analysis
function generateSignal() {
    if (!isRunning || tradeInProgress) return;

    let signal = "WAIT";

    if (priceHistory.length >= 10) {
        const rsi = calculateRSI(priceHistory, 14);
        const macd = calculateMACD(priceHistory);
        const sma = calculateSMA(priceHistory, 14);
        const currentPrice = priceHistory[priceHistory.length - 1];

        // Signal Logic
        let buySignals = 0;
        let sellSignals = 0;

        // RSI Signals
        if (rsi < 30) buySignals++;
        if (rsi > 70) sellSignals++;

        // MACD Signals
        if (macd.histogram > 0 && macd.histogram < 0.1) buySignals++;
        if (macd.histogram < 0 && macd.histogram > -0.1) sellSignals++;

        // SMA Signals
        if (currentPrice < sma) buySignals++;
        if (currentPrice > sma) sellSignals++;

        // Determine Signal
        if (buySignals >= 2) {
            signal = "BUY";
        } else if (sellSignals >= 2) {
            signal = "SELL";
        } else {
            signal = "WAIT";
        }

        addLog(`Analysis - RSI: ${rsi.toFixed(2)}, Price: $${currentPrice.toFixed(4)}, Signal: ${signal}`, "info");
    } else {
        addLog("Collecting price data... (" + priceHistory.length + "/10)", "info");
    }

    signalDisplay.innerHTML = "📊 Signal: " + signal;

    if (signal !== "WAIT") {
        executeTrade(signal);
    } else {
        setTimeout(() => generateSignal(), 2000);
    }
}

// Subscribe to tick data for price updates
function subscribeToTicks() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const market = marketSelect.value;
    ws.send(JSON.stringify({
        ticks: market,
        subscribe: 1
    }));
}

function analyzePrices() {
    if (isRunning && !tradeInProgress && priceHistory.length >= 10) {
        generateSignal();
    }
}

function executeTrade(signal) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const market = marketSelect.value;
    const stake = parseFloat(stakeInput.value);
    const duration = 5; // 5 minutes
    const contractType = signal === "BUY" ? "CALL" : "PUT";

    const tradePayload = {
        buy: 1,
        subscribe: 1,
        price: stake,
        parameters: {
            amount: stake,
            basis: "stake",
            contract_type: contractType,
            currency: "USD",
            duration: duration,
            duration_unit: "m",
            symbol: market
        }
    };

    addLog(`Executing ${signal} trade on ${market} - Stake: $${stake.toFixed(2)}`, "success");
    ws.send(JSON.stringify(tradePayload));
}

function closeTrade(contractId) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
        sell: contractId,
        price: 0
    }));
}

function monitorTrade(contractId) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const checkInterval = setInterval(() => {
        if (!tradeInProgress) {
            clearInterval(checkInterval);
            return;
        }

        ws.send(JSON.stringify({
            proposal_open_contract: 1,
            contract_id: contractId,
            subscribe: 1
        }));
    }, 1000);

    // Auto close after 5 minutes if still open
    setTimeout(() => {
        if (tradeInProgress) {
            closeTrade(contractId);
            clearInterval(checkInterval);
        }
    }, 300000); // 5 minutes
}

// Technical Analysis Functions
function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const ema12 = calculateEMA(prices, fastPeriod);
    const ema26 = calculateEMA(prices, slowPeriod);
    const macdLine = ema12 - ema26;
    const signalLine = calculateEMA([...Array(prices.length).fill(0), macdLine].slice(-signalPeriod), signalPeriod);
    const histogram = macdLine - signalLine;

    return {
        macd: macdLine,
        signal: signalLine,
        histogram: histogram
    };
}

function calculateEMA(prices, period) {
    if (prices.length === 0) return 0;
    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
}

function calculateSMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];
    let sum = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
        sum += prices[i];
    }
    return sum / period;
}

// Logging Function with Color Coding
function addLog(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement("div");
    logEntry.className = "log-" + type;
    logEntry.innerHTML = `[${timestamp}] ${message}`;
    logDiv.appendChild(logEntry);
    logDiv.scrollTop = logDiv.scrollHeight;

    // Keep only last 50 logs
    if (logDiv.children.length > 50) {
        logDiv.removeChild(logDiv.firstChild);
    }
}

// Initialize UI on page load
window.addEventListener("load", () => {
    stopBtn.disabled = true;
    startBtn.disabled = true;
    addLog("Xclaimer Bot Pro initialized - Enter token and click Connect", "info");
});

// Subscribe to ticks when trading starts
const originalStart = startBtn.onclick;
startBtn.addEventListener("click", () => {
    setTimeout(() => subscribeToTicks(), 500);
});