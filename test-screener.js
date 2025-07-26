// Simple test script to verify the DojiPatternScreener functionality
import { DojiPatternScreener } from './src/services/DojiPatternScreener.js'
import { HistoricalPatternServiceImpl } from './src/services/HistoricalPatternService.js'
import { StockDataServiceImpl } from './src/services/StockDataService.js'

async function testScreener() {
    console.log('Testing DojiPatternScreener...')
    
    try {
        // Create service instances
        const historicalPatternService = new HistoricalPatternServiceImpl()
        const stockDataService = new StockDataServiceImpl()
        const screener = new DojiPatternScreener(historicalPatternService, stockDataService)
        
        // Test criteria
        const criteria = {
            patternTypes: ['standard', 'dragonfly', 'gravestone', 'longLegged'],
            daysRange: 30,
            minUpwardPercent: 1.0,
            sortBy: 'priceChange',
            sortDirection: 'desc',
            limit: 10
        }
        
        console.log('Screening with criteria:', criteria)
        
        // Run screening
        const result = await screener.screenStocks(criteria)
        
        console.log('Screening result:')
        console.log('Total results:', result.total)
        console.log('Returned stocks:', result.stocks.length)
        
        if (result.stocks.length > 0) {
            console.log('First few results:')
            result.stocks.slice(0, 3).forEach((stock, index) => {
                console.log(`${index + 1}. ${stock.stockName} (${stock.stockId})`)
                console.log(`   Pattern: ${stock.patternType}`)
                console.log(`   Price Change: ${stock.priceChange.toFixed(2)}%`)
                console.log(`   Volume Change: ${stock.volumeChange.toFixed(2)}%`)
                console.log(`   Significance: ${(stock.significance * 100).toFixed(0)}%`)
                console.log('')
            })
        }
        
        console.log('Test completed successfully!')
        
    } catch (error) {
        console.error('Test failed:', error)
    }
}

// Run the test
testScreener()
