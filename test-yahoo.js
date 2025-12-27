// Test script to diagnose yahoo-finance2 issues
const yahooFinance = require('yahoo-finance2').default;

async function testYahoo() {
    try {
        console.log('Testing yahoo-finance2...');

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        console.log('Fetching AAPL data...');
        const result = await yahooFinance.chart('AAPL', {
            period1: startDate,
            period2: endDate,
            interval: '1d'
        });

        console.log('Success!');
        console.log('Quotes count:', result.quotes.length);
        console.log('Latest quote:', result.quotes[result.quotes.length - 1]);

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Full error:', error);
    }
}

testYahoo();
