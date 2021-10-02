const fs = require('fs')
const Binance = require('node-binance-api');
const RSI = require('technicalindicators').RSI;


class SE {
    constructor() {
        this.reqWeight = 0
        this.activePairs = 0
        console.log('Initializing')
        this.cfg = JSON.parse(String(fs.readFileSync('./config.json')))
        console.log(`Config loaded\nConfig:\n${this.cfg}`)
        this.binance = new Binance().options({
            APIKEY: this.cfg.APIKEY,
            APISECRET: this.cfg.APISECRET
        });
        console.log('Binance initialized')
        this.coins = this.cfg.coins
        console.log(`Pairs: ${this.coins}`)
        this.getTimeFrames();
        this.chart = {}
        this.initWebsockets();
        this.indicators = {}
        this.startEngine()
    }

    initWebsockets(){
        console.log('Connecting websockets')
        for (const coin of this.coins) {
            for (const tf of this.tfs) {
                this.chart[tf] = {}
                this.reqWeight += 5
                this.binance.futuresChart( `${coin}USDT`, tf,(pairr, window,candles) => {
                    this.chart[tf][coin] = {
                        open: [],
                        close: [],
                        high: [],
                        low: [],
                        volume: []
                    }
                    for(const candle in candles){
                        const currentCandle = candles[candle]
                        this.chart[tf][coin].open.push(currentCandle.open)
                        this.chart[tf][coin].close.push(currentCandle.close)
                        this.chart[tf][coin].high.push(currentCandle.high)
                        this.chart[tf][coin].low.push(currentCandle.low)
                        this.chart[tf][coin].volume.push(currentCandle.volume)
                    }
                }, 100 );
                console.log(`Websocket for ${coin}USDT ${tf} connected`)
            }
        }
    }

    getTimeFrames(){
        console.log('Initializing TFs')
        this.tfs = []
        for(const indicator of this.cfg.indicators){
            this.tfs.push(indicator.tf)
        }
        console.log(`TFs: ${this.tfs}`)
    }

    startEngine(){
        setTimeout(()=> {
            console.log('Starting pair finder')
            setInterval(()=> {
                if(this.activePairs < this.cfg.coinLimit){
                    for(const coin of this.cfg.coins){
                        const start = this.getIndicators(coin)
                        if(start){
                            console.log('Finded')
                        }
                    }
                }
            }, this.cfg.timeout)}, 2000)

    }

    getIndicators(coin){
        let success = []
        for(const indicator of this.cfg.indicators){
            if(indicator.type === 'RSI'){
                const res = RSI.calculate({values: this.chart[indicator.tf][coin].close, period: indicator.period}).pop()
                console.log(`Pair: ${coin}USDT, TF: ${indicator.tf}, current RSI: ${res}, excepted RSI: ${indicator.from}`)
                if(res < indicator.from) success.push(true)
                else success.push(false)
            }
        }
        return success.indexOf(false) === -1;
    }
}

const bot = new SE()