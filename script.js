document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const calculateBtn = document.getElementById('calculateBtn');
    const baseInvestmentInput = document.getElementById('baseInvestment');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsSection = document.getElementById('results');
    const errorAlert = document.getElementById('errorAlert');

    // 显示美观的更新时间 (格式示例: "Jun 5, 2023, 2:30 PM")
    const updateTimeElement = document.getElementById('lastUpdated');
    const now = new Date();
    updateTimeElement.textContent = now.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // 主计算函数
    calculateBtn.addEventListener('click', async function() {
        // 重置UI状态
        resultsSection.classList.add('d-none');
        errorAlert.classList.add('d-none');
        loadingSpinner.classList.remove('d-none');
        
        try {
            // 验证输入
            const baseInvestment = parseFloat(baseInvestmentInput.value);
            if (isNaN(baseInvestment) || baseInvestment <= 0) {
                throw new Error('Please enter a valid investment amount (must be > 0)');
            }

            // 获取数据 (添加错误处理)
            const [btcPrice, historicalPrices] = await Promise.all([
                getBtcPrice().catch(() => { throw new Error('Failed to get current BTC price') }),
                getBtcHistoricalPrices().catch(() => { throw new Error('Failed to get historical data') })
            ]);

            // 计算指标
            const dcaCost = calculateDcaCost(historicalPrices);
            const coinAge = calculateCoinAge();
            const expGrowthEstimate = calculateExponentialGrowthEstimate(coinAge);
            const ahr999 = calculateAhr999(btcPrice, dcaCost, expGrowthEstimate);
            const investUsdt = getInvestUsdt(ahr999, baseInvestment);

            // 更新UI
            updateResultElement('dcaCost', dcaCost);
            updateResultElement('growthEstimate', expGrowthEstimate);
            updateResultElement('btcPrice', btcPrice);
            updateResultElement('ahr999', ahr999);
            document.getElementById('investmentAmount').textContent = `$${investUsdt.toFixed(2)}`;

            // 根据AHR999值设置颜色
            updateAhr999Color(ahr999);

            // 显示结果
            loadingSpinner.classList.add('d-none');
            resultsSection.classList.remove('d-none');
        } catch (error) {
            console.error('Error:', error);
            loadingSpinner.classList.add('d-none');
            errorAlert.textContent = error.message;
            errorAlert.classList.remove('d-none');
        }
    });

    // 辅助函数：更新结果元素
    function updateResultElement(id, value) {
        const element = document.getElementById(id);
        if (id === 'ahr999') {
            element.textContent = value.toFixed(2);
        } else {
            element.textContent = `$${value.toFixed(2)}`;
        }
    }

    // 辅助函数：更新AHR999颜色
    function updateAhr999Color(ahr999) {
        const element = document.getElementById('ahr999');
        element.classList.remove('text-success', 'text-primary', 'text-warning', 'text-danger');
        
        if (ahr999 < 0.45) {
            element.classList.add('text-success'); // 严重低估
        } else if (ahr999 < 1.2) {
            element.classList.add('text-primary'); // 低估
        } else if (ahr999 < 5) {
            element.classList.add('text-warning'); // 合理估值
        } else {
            element.classList.add('text-danger'); // 高估
        }
    }

    // 初始加载时自动计算一次
    calculateBtn.click();
});

/* ========== API 函数 ========== */
async function getBtcPrice() {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    return data.bitcoin.usd;
}

async function getBtcHistoricalPrices(days = 365) {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`);
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    return data.prices.map(price => price[1]);
}

/* ========== 计算函数 ========== */
function calculateDcaCost(prices) {
    const sum = prices.reduce((acc, price) => acc + price, 0);
    return sum / prices.length;
}

function calculateCoinAge() {
    const genesisDate = new Date('2009-01-03');
    const today = new Date();
    return Math.floor((today - genesisDate) / (1000 * 60 * 60 * 24));
}

function calculateExponentialGrowthEstimate(coinAge) {
    return Math.pow(10, 5.84 * Math.log10(coinAge) - 17.01);
}

function calculateAhr999(btcPrice, dcaCost, expGrowthEstimate) {
    return (btcPrice / dcaCost) * (btcPrice / expGrowthEstimate);
}

function getInvestUsdt(ahr999, baseInvestment = 100) {
    // 防止除以极小值 (最低0.1)
    const adjustedAhr999 = Math.max(ahr999, 0.1);
    return (baseInvestment / adjustedAhr999).toFixed(2);
}
