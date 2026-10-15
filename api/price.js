const https = require('https')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const SECRET_KEY = process.env.CANNOTGUESS
  const key = req.query.key || req.headers['x-api-key']

  // Temporary debug — remove after fixing
  if (req.query.debug === '1') {
    return res.status(200).json({
      receivedKey: key,
      secretExists: !!SECRET_KEY,
      secretLength: SECRET_KEY ? SECRET_KEY.length : 0,
      match: key === SECRET_KEY
    })
  }

  if (!key || key !== SECRET_KEY) {
    return res.status(401).json({ error: 'Cannot be found' })
  }

  const { symbol, exchange } = req.query
  if (!symbol) {
    return res.status(400).json({ error: 'symbol is required' })
  }

  const suffix = exchange === 'BSE' ? '.BO' : '.NS'
  const ticker = symbol.toUpperCase() + suffix
  const url    = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`

  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      'Accept':     'application/json',
      'Referer':    'https://finance.yahoo.com/'
    }
  }

  https.get(url, options, (apiRes) => {
    let body = ''
    apiRes.on('data', chunk => body += chunk)
    apiRes.on('end', () => {
      try {
        const data  = JSON.parse(body)
        const meta  = data.chart.result[0].meta
        const price = meta.regularMarketPrice || meta.previousClose || null
        res.status(200).json({ ticker, price: price ? +price.toFixed(2) : null })
      } catch {
        res.status(502).json({ error: 'Failed to parse Yahoo Finance response', ticker })
      }
    })
  }).on('error', (e) => {
    res.status(502).json({ error: 'Failed to reach Yahoo Finance', detail: e.message })
  })
}
