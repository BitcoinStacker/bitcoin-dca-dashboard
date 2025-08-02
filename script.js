document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const elements = {
        calculateBtn: document.getElementById('calculateBtn'),
        baseInvestment: document.getElementById('baseInvestment'),
        loadingSpinner: document.getElementById('loadingSpinner'),
        resultsSection: document.getElementById('results'),
        errorAlert: document.getElementById('errorAlert'),
        lastUpdated: document.getElementById('lastUpdated'),
        dcaCost: document.getElementById('dcaCost'),
        growthEstimate: document.getElementById('growthEstimate'),
        btcPrice: document.getElementById('btcPrice'),
        ahr999: document.getElementById('ahr999'),
        investmentAmount: document.getElementById('investmentAmount')
    };

    // Initialize
    updateLastUpdatedTime();
    elements.calculateBtn?.addEventListener('click', calculateDCA);
    elements.calculateBtn?.click(); // Initial calculation

    async function calculateDCA() {
        resetUIState();
        
        try {
            const baseInvestment = validateInvestmentInput();
            const [btcPrice, historicalPrices] = await fetchMarketData();
            const metrics = calculateAllMetrics(btcPrice, historicalPrices, baseInvestment);
            
            updateDashboardUI(metrics);
            showResults();
        } catch (error) {
            handleCalculationError(error);
        }
    }

    function updateLastUpdatedTime() {
        if (elements.lastUpdated) {
            elements.lastUpdated.textContent = new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    function resetUIState() {
        elements.resultsSection?.classList.add('d-none');
        elements.errorAlert?.classList.add('d-none');
        elements.loadingSpinner?.classList.remove('d-none');
    }

    function validateInvestmentInput() {
        const amount = parseFloat(elements.baseInvestment?.value);
        if (isNaN(amount)) throw new Error('Please enter a valid number');
        if (amount <= 0) throw new Error('Amount must be greater than 0');
        return amount;
    }

    async function fetchMarketData() {
        try {
            const [price, history] = await Promise.all([
                getCurrentBTCPrice(),
                getHistoricalBTCData()
            ]);
            return [price, history];
        } catch (error) {
            console.error('Data fetch failed:', error);
            throw new Error('Failed to load market data. Please try again later.');
        }
    }

    function calculateAllMetrics(currentPrice, historicalPrices, baseAmount) {
        return {
            currentPrice: currentPrice,
            dcaCost: calculateDCACost(historicalPrices),
            growthEstimate: calculateGrowthEstimate(),
            ahr999: calculateAHR999Index(currentPrice, historicalPrices),
            recommendedInvestment: calculateRecommendedInvestment(currentPrice, historicalPrices, baseAmount)
        };
    }

    function updateDashboardUI(metrics) {
        safeUpdateElement(elements.dcaCost, formatCurrency(metrics.dcaCost));
        safeUpdateElement(elements.growthEstimate, formatCurrency(metrics.growthEstimate));
        safeUpdateElement(elements.btcPrice, formatCurrency(metrics.currentPrice));
        
        if (elements.ahr999) {
            elements.ahr999.textContent = metrics.ahr999.toFixed(2);
            updateAHR999Color(metrics.ahr999);
        }
        
        safeUpdateElement(elements.investmentAmount, formatCurrency(metrics.recommendedInvestment));
    }

    function safeUpdateElement(element, value) {
        if (element) element.textContent = value;
    }

    function formatCurrency(value) {
        return '$' + parseFloat(value).toFixed(2);
    }

    function showResults() {
        elements.loadingSpinner?.classList.add('d-none');
        elements.resultsSection?.classList.remove('d-none');
    }

    function handleCalculationError(error) {
        console.error('Calculation error:', error);
        elements.loadingSpinner?.classList.add('d-none');
        if (elements.errorAlert) {
            elements.errorAlert.textContent = error.message;
            elements.errorAlert.classList.remove('d-none');
        }
    }

    // API Functions with Fallbacks
    async function getCurrentBTCPrice() {
        const apis = [
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
            'https://api.coincap.io/v2/assets/bitcoin',
            'https://blockchain.info/ticker'
        ];

        for (const api of apis) {
            try {
                const response = await fetch(api);
                if (!response.ok) continue;
                
                const data = await response.json();
                if (api.includes('coingecko')) return data.bitcoin.usd;
                if (api.includes('coincap')) return parseFloat(data.data.priceUsd);
                if (api.includes('blockchain')) return data.USD.last;
            } catch (e) {
                console.warn(`API failed: ${api}`, e);
            }
        }
        
        throw new Error('All price APIs unavailable');
    }

    async function getHistoricalBTCData(days = 365) {
        try {
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`
            );
            if (!response.ok) throw new Error('API error');
            
            const data = await response.json();
            return data.prices.map(p => p[1]);
        } catch (error) {
            console.warn('Using fallback historical data');
            // Generate synthetic data if API fails
            const avgPrice = await getCurrentBTCPrice().catch(() => 30000);
            return generateSyntheticData(days, avgPrice);
        }
    }

    function generateSyntheticData(days, averagePrice) {
        return Array.from({ length: days }, (_, i) => {
            const fluctuation = Math.sin(i / 30) * (averagePrice * 0.2); // 20% fluctuation
            return averagePrice + fluctuation;
        });
    }

    // Core Calculation Logic
    function calculateDCACost(prices) {
        return prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }

    function calculateGrowthEstimate() {
        const genesisDate = new Date('2009-01-03');
        const coinAgeDays = Math.floor((new Date() - genesisDate) / (86400 * 1000));
        return 10 ** (5.84 * Math.log10(coinAgeDays) - 17.01);
    }

    function calculateAHR999Index(currentPrice, historicalPrices) {
        const dcaCost = calculateDCACost(historicalPrices);
        const growthEstimate = calculateGrowthEstimate();
        return (currentPrice / dcaCost) * (currentPrice / growthEstimate);
    }

    function calculateRecommendedInvestment(ahr999, baseAmount) {
        const adjustedIndex = Math.max(ahr999, 0.1); // Prevent division by tiny numbers
        return (baseAmount / adjustedIndex).toFixed(2);
    }

    function updateAHR999Color(ahr999Value) {
        if (!elements.ahr999) return;
        
        elements.ahr999.classList.remove(
            'text-success', 'text-primary', 'text-warning', 'text-danger'
        );
        
        if (ahr999Value < 0.45) {
            elements.ahr999.classList.add('text-success');
        } else if (ahr999Value < 1.2) {
            elements.ahr999.classList.add('text-primary');
        } else if (ahr999Value < 5) {
            elements.ahr999.classList.add('text-warning');
        } else {
            elements.ahr999.classList.add('text-danger');
        }
    }
});
