document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculateBtn');
    const baseInvestmentInput = document.getElementById('baseInvestment');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsSection = document.getElementById('results');
    const errorAlert = document.getElementById('errorAlert');
    
    // Update last updated time
    document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
    
    calculateBtn.addEventListener('click', async function() {
        // Reset UI
        resultsSection.classList.add('d-none');
        errorAlert.classList.add('d-none');
        loadingSpinner.classList.remove('d-none');
        
        try {
            const baseInvestment = parseFloat(baseInvestmentInput.value);
            if (isNaN(baseInvestment) {
                throw new Error('Please enter a valid base investment amount');
            }
            
            // Get all required data
            const [btcPrice, historicalPrices] = await Promise.all([
                getBtcPrice(),
                getBtcHistoricalPrices()
            ]);
            
            const dcaCost = calculateDcaCost(historicalPrices);
            const coinAge = calculateCoinAge();
            const expGrowthEstimate = calculateExponentialGrowthEstimate(coinAge);
            const ahr999 = calculateAhr999(btcPrice, dcaCost, expGrowthEstimate);
            const investUsdt = getInvestUsdt(ahr999, baseInvestment);
            
            // Update UI with results
            document.getElementById('dcaCost').textContent = `$${dcaCost.toFixed(2)}`;
            document.getElementById('growthEstimate').textContent = `$${expGrowthEstimate.toFixed(2)}`;
            document.getElementById('btcPrice').textContent = `$${btcPrice.toFixed(2)}`;
            document.getElementById('ahr999').textContent = ahr999.toFixed(2);
            document.getElementById('investmentAmount').textContent = `$${investUsdt.toFixed(2)}`;
            
            // Color code AHR999 value
            const ahr999Element = document.getElementById('ahr999');
            if (ahr999 < 0.45) {
                ahr999Element.classList.add('text-success');
                ahr999Element.classList.remove('text-warning', 'text-danger');
            } else if (ahr999 < 1.2) {
                ahr999Element.classList.add('text-primary');
                ahr999Element.classList.remove('text-success', 'text-danger');
            } else if (ahr999 < 5) {
                ahr999Element.classList.add('text-warning');
                ahr999Element.classList.remove('text-success', 'text-danger');
            } else {
                ahr999Element.classList.add('text-danger');
                ahr999Element.classList.remove('text-success', 'text-warning');
            }
            
            loadingSpinner.classList.add('d-none');
            resultsSection.classList.remove('d-none');
        } catch (error) {
            console.error('Error:', error);
            loadingSpinner.classList.add('d-none');
            errorAlert.textContent = error.message;
            errorAlert.classList.remove('d-none');
        }
    });
    
    // Initial calculation on page load
    calculateBtn.click();
});

// API functions
async function getBtcPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const data = await response.json();
        return data.bitcoin.usd;
    } catch (error) {
        throw new Error('Failed to fetch current BTC price');
    }
}

async function getBtcHistoricalPrices(days = 365) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`);
        const data = await response.json();
        return data.prices.map(price => price[1]);
    } catch (error) {
        throw new Error('Failed to fetch historical BTC prices');
    }
}

// Calculation functions
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
    // Modified to use the base investment amount
    return baseInvestment / Math.max(ahr999, 0.1); // Prevent division by very small numbers
}
