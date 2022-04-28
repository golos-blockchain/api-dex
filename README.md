# GOLOS statistics API



## VERSION 1 (NEW) MANDATORY

[https://api-dex.golos.app/api/v1](https://api-dex.golos.app/api/v1)

(for:
[https://docs.google.com/document/d/1S4urpzUnO2t7DmS_1dc4EL4tgnnbTObPYXvDeBnukCg](https://docs.google.com/document/d/1S4urpzUnO2t7DmS_1dc4EL4tgnnbTObPYXvDeBnukCg))

## Summary ENDPOINT 0
#### ASSETS   /summary
The summary endpoint is to provide an overview of market data for all tickers and all market pairs on the exchange.

GET [https://api-dex.golos.app/api/v1/summary](https://api-dex.golos.app/api/v1/summary)

```
[{
    "trading_pairs": "PZM_GLS",
    "last_price": "0.64102582",
    "base_volume": "0.00",
    "quote_volume": "0.000",
    "lowest_price_24h": "0.34131283",
    "highest_price_24h": "0.64102582",
    "price_change_percent_24h": "-0.00002674",
    "highest_bid": "1.93000002000000004",
    "lowest_ask": "1.56000000663829774"
}, ...]
```

```
trading_pairs - Identifier of a ticker with delimiter to separate base/quote, eg. PZM-GLS (Price of PZM is quoted in GLS)
last_price - Last transacted price of base currency based on given quote currency
base_volume - 24-hr volume of market pair denoted in BASE currency
quote_volume - 24-hr volume of market pair denoted in QUOTE currency
lowest_price_24h - Lowest price of base currency based on given quote currency in the last 24-hrs
highest_price_24h - Highest price of base currency based on given quote currency in the last 24-hrs
price_change_percent_24h - 24-hr % price change of market pair
highest_bid - Highest bid price of base currency based on given quote currency
lowest_ask - Lowest Ask price of base currency based on given quote currency

```


## ENDPOINT 2
#### TICKER /ticker
The ticker endpoint is to provide a 24-hour pricing and volume summary for each market pair available on the exchange.

GET [https://api-dex.golos.app/api/v1/ticker](https://api-dex.golos.app/api/v1/ticker)

```
[{
    "base_id": 1681,
    "quote_id": 4834,
    "last_price": "0.64102582",
    "base_volume": "0.00",
    "quote_volume": "0.000"
}, ...]
```


```
base_id - The base pair Unified Cryptoasset ID.
quote_id - The quote pair Unified Cryptoasset ID.
last_price - The price of the last executed order
base_volume - 24 hour trading volume in base pair volume
quote_volume - 24 hour trading volume in quote pair volume

```


## ENDPOINT 3
#### ORDERBOOK /orderbook/{quote_base}
The order book endpoint is to provide a complete level 2 order book (arranged by best asks/bids) with full depth returned for a given market pair.

GET [https://api-dex.golos.app/api/v1/orderbook/GLS_PZM](https://api-dex.golos.app/api/v1/orderbook/GLS_PZM)

```
{
    "timestamp": "1642729537872",
    "bids": [
        ["0.51813470965663511", "96500.001"],
        ["0.50505049994898488", "99000.001"],
        ["0.49751243286057278", "100500.001"],
        ...
    ],
    "asks": [
        ["0.64102563829787240", "199515.952"],
        ["0.65789475409836062", "274500.000"],
        ["0.67567569288389517", "267000.000"],
        ...
    ]
}
```

```
timestamp - Unix timestamp in milliseconds for when the last updated time occurred.
bids - An array containing 2 elements. The offer price and quantity for each bid order.
asks - An array containing 2 elements. The ask price and quantity for each ask order.

```

## ENDPOINT 4
#### TRADES /trades/{quote_base}
The trades endpoint is to return data on all recently completed trades for a given market pair.

GET [https://api-dex.golos.app/api/v1/trades/GLS_PZM](https://api-dex.golos.app/api/v1/trades/GLS_PZM)

```
[
    {
        "trade_id": "143215",
        "price": "1.55999999",
        "base_volume": "82484.048",
        "quote_volume": "52874.39",
        "timestamp": "1642187271000",
        "type": "buy"
    },
    ...]
```

```
trade_id - A unique ID associated with the trade for the currency pair transaction
price - Transaction price in base pair volume
base_volume - Transaction amount in base pair volume.
quote_volume - Transaction amount in quote pair volume.
trade_timestamp - Unix timestamp in milliseconds for when the transaction occurred.
type - 
Used to determine whether or not the transaction originated as a buy or sell.
  Buy – Identifies an ask was removed from the order book.
  Sell – Identifies a bid was removed from the order book.
```

## Получение курса токенов GOLOS и другая информация

GET [https://api-dex.golos.app/api/v1/cmc/GOLOS](https://api-dex.golos.app/api/v1/cmc/GOLOS)

Дает возможность получить информацию о цене CoinMarketCap (в рублях и $) токенов GOLOS, GBG, YMRUB и т.д. Поддерживает большинство токенов, которые доступны на GOLOS.

```
{
    "status": "ok",
    "price_usd": 0.0026651538105083973,
    "price_rub": 0.20621626542743116,
    "from_cache": false,
    "updated": "2022-04-23T14:58:16",
    "data": {
        ... другая информация, полученная непосредственно от CoinMarketCap
```

```
price_usd - цена в $ или null, если не удалось получить цену
price_rub - цена в руб. или null, если не удалось получить цену
updated - момент, когда были получены эти данные от CoinMarketCap. Получение данных от CoinMarketCap осуществляется раз в 15 минут.
```
