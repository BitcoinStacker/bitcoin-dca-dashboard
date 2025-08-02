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
    updateTimestamp();
    elements.calculateBtn.addEventListener('click', calculateDCA);

    async function calculateDCA() {
        resetUI();
        
        try {
            const baseInvestment = validateInput();
            const [btcPrice, historicalPrices] = await fetchMarketData();
            const metrics = calculateMetrics(btcPrice, historicalPrices, baseInvestment);
            
            updateUI(metrics);
            showResults();
        } catch (error) {
            handleError(error);
        } finally {
            elements.loadingSpinner.classList.add('d-none');
        }
    }

    // Helper functions
    function updateTimestamp() {
        elements.lastUpdated.textContent = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function resetUI() {
        elements.resultsSection.classList.add('d-none');
        elements.errorAlert.classList.add('d-none');
        elements.loadingSpinner.classList.remove('d-none');
    }

    function validateInput() {
        const amount = parseFloat(elements.baseInvestment.value);
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
            console.error('Failed to fetch data:', error);
            throw new Error('Market data unavailable. Please try again later.');
        }
    }

    async function getCurrentBTCPrice() {
        const endpoints = [
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
            'https://api.coincap.io/v2/assets/bitcoin',
            'https://blockchain.info/ticker'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);
                if (!response.ok) continue;
                
                const data = await response.json();
                if (endpoint.includes('coingecko')) return data.bitcoin.usd;
                if (endpoint.includes('coincap')) return data.data.priceUsd;
                if (endpoint.includes('blockchain')) return data.USD.last;
            } catch (e) {
                console.warn(`Failed with ${endpoint}:`, e);
            }
        }
        
        throw new Error('All price APIs are currently unavailable. Please try again later.');
    }

    async function getHistoricalBTCData() {
        try {
            const response = await fetch(
                'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365'
            );
            if (!response.ok) throw new Error('API response not OK');
            const data = await response.json();
            return data.prices.map(item => item[1]);
        } catch (error) {
            console.warn('Historical data API failed:', error);
            throw new Error('Could not load historical data. Please try again later.');
        }
    }

    function calculateMetrics(currentPrice, historicalPrices, baseAmount) {
        const dcaCost = calculateAveragePrice(historicalPrices);
        const coinAge = calculateCoinAge();
        const growthEstimate = 10 ** (5.84 * Math.log10(coinAge) - 17.01);
        const ahr999 = (currentPrice / dcaCost) * (currentPrice / growthEstimate);
        const recommendedInvestment = (baseAmount / Math.max(ahr999, 0.1)).toFixed(2);
        
        return {
            currentPrice,
            dcaCost,
            growthEstimate,
            ahr999,
            recommendedInvestment
        };
    }

    function calculateAveragePrice(prices) {
        const sum = prices.reduce((total, price) => total + price, 0);
        return sum / prices.length;
    }

    function calculateCoinAge() {
        const genesis = new Date('2009-01-03');
        return Math.floor((new Date() - genesis) / (86400 * 1000));
    }

    function updateUI(metrics) {
        elements.dcaCost.textContent = `$${metrics.dcaCost.toFixed(2)}`;
        elements.growthEstimate.textContent = `$${metrics.growthEstimate.toFixed(2)}`;
        elements.btcPrice.textContent = `$${metrics.currentPrice.toFixed(2)}`;
        elements.ahr999.textContent = metrics.ahr999.toFixed(2);
        elements.investmentAmount.textContent = `$${metrics.recommendedInvestment}`;
        
        updateAhr999Color(metrics.ahr999);
    }

    function updateAhr999Color(value) {
        elements.ahr999.classList.remove(
            'text-success', 'text-primary', 'text-warning', 'text-danger'
        );
        
        if (value < 0.45) {
            elements.ahr999.classList.add('text-success');
        } else if (value < 1.2) {
            elements.ahr999.classList.add('text-primary');
        } else if (value < 5) {
            elements.ahr999.classList.add('text-warning');
        } else {
            elements.ahr999.classList.add('text-danger');
        }
    }

    function showResults() {
        elements.resultsSection.classList.remove('d-none');
    }

    function handleError(error) {
        console.error('Error:', error);
        elements.errorAlert.textContent = error.message;
        elements.errorAlert.classList.remove('d-none');
    }
});
