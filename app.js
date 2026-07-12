const app_id = "1089"; // Demo application ID
let ws = null;
let isTrading = false;
let totalProfit = 0;
let tradeCount = 0;
let currentMarket = "R_10";
let tickCount = 0;
let previousClose = null;
let signalBuffer = [];
const SIGNAL_BUFFER_SIZE = 5;

function log(message) {
    const logDiv = document.getElementById("log");
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement("div");
    logEntry.textContent = `[${timestamp}] ${message}`;
    logEntry.className = "log-entry";
    logDiv.appendChild(logEntry);
    logDiv.scrollTop = logDiv.scrollHeight;
}

function connect(token) {
    if (!token) {
        log("ERROR: Please enter a valid API token");
        return;
    }

    ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${app_id}`);

    ws.onopen = () => {
        log("Connected to Deriv");

        ws.send(JSON.stringify({
            authorize: token
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.msg_type === "authorize") {
            if (data.authorize) {
                document.getElementById("balance").innerHTML =
                    "Balance: " + data.authorize.balance + " " + data.authorize.currency;
                log(`Authorized | Balance: ${data.authorize.balance} ${data.authorize.currency}`);
            } else if (data.error) {
                log(`ERROR: ${data.error.message}`);
            }
        }

        if (data.msg_type === "tick") {
            handleTick(data.tick);
        }

        if (data.msg_type === "buy") {
            if (data.buy) {
                log(`BUY Order Placed | ID: ${data.buy.transaction_id} | Stake: ${data.buy.buy_price}`);
                tradeCount++;
                subscribeToPayout(data.buy.transaction_id);
            } else if (data.error) {
                log(`ERROR on BUY: ${data.error.message}`);
            }
        }

        if (data.msg_type === "proposal_open_contract") {
            handleContractUpdate(data.proposal_open_contract);
        }

        if (data.msg_type === "error") {
            log(`ERROR: ${data.error.message}`);
        }
    };

    ws.onerror = (error) => {
        log(`WebSocket Error: ${error}`);
    };

    ws.onclose = () => {
        log("Disconnected from Deriv");
        isTrading = false;
        document.getElementById("start").disabled = false;
        document.getElementById("stop").disabled = true;
    };
}

function handleTick(tick) {
    if (!isTrading) return;

    const close = tick.quote;
    tickCount++;

    // Add to signal buffer for trend analysis
    if (previousClose !== null) {
        signalBuffer.push(close > previousClose ? 1 : -1); // 1 = UP, -1 = DOWN
        if (signalBuffer.length > SIGNAL_BUFFER_SIZE) {
            signalBuffer.shift();
        }
    }

    previousClose = close;

    // Generate signal every 5 ticks
    if (tickCount >= 5) {
        const signal = generateSignal();
        updateSignalDisplay(signal);

        if (signal !== "WAIT") {
            placeBet(signal);
        }

        tickCount = 0;
    }
}

function generateSignal() {
    if (signalBuffer.length < SIGNAL_BUFFER_SIZE) {
        return "WAIT";
    }

    // Count UP and DOWN signals
    const upCount = signalBuffer.filter(s => s === 1).length;
    const downCount = signalBuffer.filter(s => s === -1).length;

    // Strong trend detection
    if (upCount >= 4) {
        return "UP";
    } else if (downCount >= 4) {
        return "DOWN";
    }

    return "WAIT";
}

function updateSignalDisplay(signal) {
    const signalElement = document.getElementById("signal");
    signalElement.innerHTML = `Signal: ${signal}`;
    signalElement.className = `signal-${signal.toLowerCase()}`;
}

function placeBet(signal) {
    const stake = parseFloat(document.getElementById("stake").value);
    const contractType = signal === "UP" ? "CALL" : "PUT";
    const duration = 5; // 5 ticks

    const betPayload = {
        buy: 1,
        subscribe: 1,
        contract_type: contractType,
        currency: "USD",
        amount: stake,
        symbol: currentMarket,
        duration: duration,
        duration_unit: "t" // ticks
    };

    ws.send(JSON.stringify(betPayload));
    log(`Placing ${contractType} bet | Stake: $${stake} | Duration: ${duration} ticks`);
}

function subscribeToPayout(transactionId) {
    const payload = {
        proposal_open_contract: 1,
        contract_id: transactionId,
        subscribe: 1
    };

    ws.send(JSON.stringify(payload));
}

function handleContractUpdate(contract) {
    if (contract.is_sold) {
        const payout = contract.sell_price || 0;
        const stake = contract.buy_price || 0;
        const profit = payout - stake;

        totalProfit += profit;

        const profitElement = document.getElementById("profit");
        profitElement.innerHTML = `Profit: $${totalProfit.toFixed(2)}`;
        profitElement.className = totalProfit >= 0 ? "profit-positive" : "profit-negative";

        const status = profit > 0 ? "WIN" : "LOSS";
        log(`Contract Closed | ${status} | Payout: $${payout.toFixed(2)} | Total Profit: $${totalProfit.toFixed(2)}`);
    }
}

function startTrading() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        log("ERROR: Not connected to Deriv. Please connect first.");
        return;
    }

    isTrading = true;
    currentMarket = document.getElementById("market").value;
    tickCount = 0;
    previousClose = null;
    signalBuffer = [];

    log(`Trading started on ${currentMarket}`);
    document.getElementById("start").disabled = true;
    document.getElementById("stop").disabled = false;

    // Subscribe to ticks for the selected market
    ws.send(JSON.stringify({
        ticks: currentMarket,
        subscribe: 1
    }));
}

function stopTrading() {
    isTrading = false;
    tickCount = 0;
    previousClose = null;
    signalBuffer = [];

    log(`Trading stopped | Total Trades: ${tradeCount} | Final Profit: $${totalProfit.toFixed(2)}`);
    document.getElementById("start").disabled = false;
    document.getElementById("stop").disabled = true;

    // Unsubscribe from ticks
    ws.send(JSON.stringify({
        forget_all: "ticks"
    }));
}

function resetStats() {
    totalProfit = 0;
    tradeCount = 0;
    document.getElementById("profit").innerHTML = "Profit: $0.00";
    document.getElementById("signal").innerHTML = "Signal: WAIT";
    log("Stats reset");
}

// Event listeners
document.getElementById("connect").onclick = () => {
    const token = document.getElementById("token").value;
    connect(token);
};

document.getElementById("start").onclick = () => {
    startTrading();
};

document.getElementById("stop").onclick = () => {
    stopTrading();
};

// Initialize button states
document.getElementById("start").disabled = true;
document.getElementById("stop").disabled = true;