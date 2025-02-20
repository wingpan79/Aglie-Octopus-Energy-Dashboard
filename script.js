// Main configuration
const apiUrl = 'https://api.octopus.energy/v1/products/AGILE-24-10-01/electricity-tariffs/E-1R-AGILE-24-10-01-G/standard-unit-rates/';

// Fetch and process data
async function fetchPriceData() {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        processData(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('price-summary').innerHTML = 
            `<p class="error">Error loading data. Please check your connection and try again.</p>`;
    }
}

function processData(data) {
    // Get tomorrow's date
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    // Filter for tomorrow's prices
    let tomorrowPrices = data.results.filter(item => {
        const itemDate = new Date(item.valid_from);
        return itemDate.getDate() === tomorrow.getDate() && 
               itemDate.getMonth() === tomorrow.getMonth() && 
               itemDate.getFullYear() === tomorrow.getFullYear();
    });
    
    // Sort by time
    tomorrowPrices.sort((a, b) => new Date(a.valid_from) - new Date(b.valid_from));
    
    if (tomorrowPrices.length === 0) {
        // If no data for tomorrow, use the first 48 results (assuming they're the next available)
        tomorrowPrices = data.results.slice(0, 48);
        tomorrowPrices.sort((a, b) => new Date(a.valid_from) - new Date(b.valid_from));
    }
    
    // Find min, max, average
    const prices = tomorrowPrices.map(item => item.value_inc_vat);
    const cheapestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    // Find when these prices occur
    const cheapestItem = tomorrowPrices.find(item => item.value_inc_vat === cheapestPrice);
    const highestItem = tomorrowPrices.find(item => item.value_inc_vat === highestPrice);
    
    // Update summary
    updatePriceSummary(cheapestPrice, cheapestItem, highestPrice, highestItem, averagePrice);
    
    // Calculate thresholds for recommendations
    const lowThreshold = percentile(prices, 25);
    const highThreshold = percentile(prices, 75);
    
    // Get good periods for recommendations
    const goodPeriods = findGoodPeriods(tomorrowPrices, lowThreshold);
    
    // Update recommendations
    updateRecommendations(goodPeriods);
    
    // Populate table
    updatePriceTable(tomorrowPrices, lowThreshold, highThreshold);
    
    // Create chart
    createChart(tomorrowPrices, lowThreshold, highThreshold);
    
    // Update last refresh time
    document.getElementById('update-time').textContent = new Date().toLocaleString();
}

function updatePriceSummary(cheapestPrice, cheapestItem, highestPrice, highestItem, averagePrice) {
    document.getElementById('cheapest-price').textContent = `${cheapestPrice.toFixed(2)}p/kWh`;
    document.getElementById('cheapest-time').textContent = formatTime(cheapestItem.valid_from);
    document.getElementById('highest-price').textContent = `${highestPrice.toFixed(2)}p/kWh`;
    document.getElementById('highest-time').textContent = formatTime(highestItem.valid_from);
    document.getElementById('average-price').textContent = `${averagePrice.toFixed(2)}p/kWh`;
    
    // Position markers on price bar
    const range = highestPrice - cheapestPrice;
    const cheapestPosition = 0;
    const averagePosition = ((averagePrice - cheapestPrice) / range) * 100;
    const highestPosition = 100;
    
    document.getElementById('cheapest-marker').style.left = `${cheapestPosition}%`;
    document.getElementById('average-marker').style.left = `${averagePosition}%`;
    document.getElementById('highest-marker').style.left = `${highestPosition}%`;
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const position = (sorted.length - 1) * (p / 100);
    const base = Math.floor(position);
    const rest = position - base;
    
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
        return sorted[base];
    }
}

function findGoodPeriods(prices, threshold) {
    const goodPeriods = [];
    let currentStart = null;
    let currentEnd = null;
    
    prices.forEach((item, index) => {
        if (item.value_inc_vat <= threshold) {
            // Start or extend a period
            if (currentStart === null) {
                currentStart = item.valid_from;
            }
            currentEnd = item.valid_to;
        } else {
            // End current period if exists
            if (currentStart !== null) {
                goodPeriods.push({
                    start: currentStart,
                    end: currentEnd
                });
                currentStart = null;
                currentEnd = null;
            }
        }
        
        // Check if we're at the end
        if (index === prices.length - 1 && currentStart !== null) {
            goodPeriods.push({
                start: currentStart,
                end: currentEnd
            });
        }
    });
    
    return goodPeriods;
}

function updateRecommendations(goodPeriods) {
    const recList = document.getElementById('time-recommendations');
    recList.innerHTML = '';
    
    if (goodPeriods.length === 0) {
        recList.innerHTML = '<li>No particularly cheap periods found for tomorrow</li>';
        return;
    }
    
    goodPeriods.forEach(period => {
        const li = document.createElement('li');
        li.textContent = `${formatTime(period.start)} - ${formatTime(period.end)}`;
        recList.appendChild(li);
    });
    
    // Update appliance recommendations
    updateApplianceRecommendations(goodPeriods);
}

function updateApplianceRecommendations(goodPeriods) {
    if (goodPeriods.length > 0) {
        const firstPeriod = `${formatTime(goodPeriods[0].start)} - ${formatTime(goodPeriods[0].end)}`;
        const secondPeriod = goodPeriods.length > 1 ? 
            `${formatTime(goodPeriods[1].start)} - ${formatTime(goodPeriods[1].end)}` : firstPeriod;
        
        document.getElementById('washer-recommendation').textContent = `Use during ${firstPeriod}`;
        document.getElementById('ev-recommendation').textContent = `Schedule charging during ${firstPeriod}`;
        document.getElementById('dishwasher-recommendation').textContent = `Run during ${secondPeriod}`;
        
        let highEnergyRec = "Schedule during ";
        goodPeriods.forEach((period, index) => {
            if (index > 0) highEnergyRec += " or ";
            highEnergyRec += `${formatTime(period.start)} - ${formatTime(period.end)}`;
        });
        document.getElementById('high-energy-recommendation').textContent = highEnergyRec;
    } else {
        // Default recommendations if no good periods
        document.getElementById('washer-recommendation').textContent = "Use during early morning hours if possible";
        document.getElementById('ev-recommendation').textContent = "Check for cheapest overnight rates";
        document.getElementById('dishwasher-recommendation').textContent = "Run overnight if possible";
        document.getElementById('high-energy-recommendation').textContent = "Try to avoid evening peak hours (4-7PM)";
    }
}

function updatePriceTable(tomorrowPrices, lowThreshold, highThreshold) {
    const tableBody = document.getElementById('price-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';
    
    tomorrowPrices.forEach(item => {
        const row = tableBody.insertRow();
        if (item.value_inc_vat <= lowThreshold) {
            row.className = 'price-row-cheap';
        } else if (item.value_inc_vat >= highThreshold) {
            row.className = 'price-row-expensive';
        }
        
        // Time period
        const timeCell = row.insertCell(0);
        const startTime = formatTime(item.valid_from);
        const endTime = formatTime(item.valid_to);
        timeCell.textContent = `${startTime} - ${endTime}`;
        
        // Price
        const priceCell = row.insertCell(1);
        priceCell.textContent = `${item.value_inc_vat.toFixed(2)}p/kWh`;
        
        // Recommendation
        const recCell = row.insertCell(2);
        if (item.value_inc_vat <= lowThreshold) {
            recCell.innerHTML = '<span style="color: #2ecc71">✓ Great time to use appliances</span>';
        } else if (item.value_inc_vat >= highThreshold) {
            recCell.innerHTML = '<span style="color: #e74c3c">⚠️ Avoid high-energy usage</span>';
        } else {
            recCell.textContent = 'Normal usage';
        }
    });
}

function createChart(prices, lowThreshold, highThreshold) {
    const ctx = document.getElementById('price-chart').getContext('2d');
    
    // Prepare data
    const labels = prices.map(item => {
        const date = new Date(item.valid_from);
        return date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    });
    
    const data = prices.map(item => item.value_inc_vat);
    
    // Create gradient for background
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(54, 162, 235, 0.1)');
    gradient.addColorStop(1, 'rgba(54, 162, 235, 0)');
    
    // Determine point colors based on thresholds
    const pointColors = prices.map(item => {
        if (item.value_inc_vat <= lowThreshold) return '#2ecc71';
        if (item.value_inc_vat >= highThreshold) return '#e74c3c';
        return '#3498db';
    });
    
    // If there's an existing chart, destroy it
    if (window.priceChart) {
        window.priceChart.destroy();
    }
    
    // Create new chart
    window.priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price (p/kWh)',
                data: data,
                backgroundColor: gradient,
                borderColor: 'rgba(54, 162, 235, 1)',
                pointBackgroundColor: pointColors,
                pointRadius: 4,
                borderWidth: 2,
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw.toFixed(2)}p/kWh`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Price (p/kWh)'
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 90,
                        minRotation: 45,
                        callback: function(value, index) {
                            // Show every 2 hours on mobile, every hour on desktop
                            return window.innerWidth < 768 ? 
                                (index % 4 === 0 ? this.getLabelForValue(value) : '') : 
                                (index % 2 === 0 ? this.getLabelForValue(value) : '');
                        }
                    }
                }
            }
        }
    });
}

// Initialize data loading
document.addEventListener('DOMContentLoaded', fetchPriceData);

// Add auto-refresh capability (every 3 hours)
setInterval(fetchPriceData, 3 * 60 * 60 * 1000);