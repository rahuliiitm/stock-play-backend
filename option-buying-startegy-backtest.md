we need to do backtest for the stock-play-backend/Option-buying-trading-strategy.md which is already implemented . This is near to real time back testing 

All the code for this backtesting has to be in sperate module 

this is are they key metrics which i am looking for 

Total trades
Winning trades / Losing trades
Win rate (%)
Avg profit / loss per trade
Reward/Risk ratio (AvgWin / AvgLoss)
Max Drawdown (equity curve based)
Profit factor = Gross Profit / Gross Loss
Sharpe Ratio
Calmar Ratio = CAGR / MaxDD
Beta (vs NIFTY baseline)

This owuld be done in Nifty50 index , and  for backtesting you can assume underlying proce to be strike price 

this is public link for last 10 year 1 min OHLC data 

https://storage.googleapis.com/kagglesdsdata/datasets/2401195/12691007/NIFTY%2050_minute.csv?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=gcp-kaggle-com%40kaggle-161607.iam.gserviceaccount.com%2F20250927%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20250927T044926Z&X-Goog-Expires=259200&X-Goog-SignedHeaders=host&X-Goog-Signature=7e70cd50b09aafde75ea7cbdbc851d447c98ebd4030ab9fd962db440a42b444698764a20cb3c5503df962a9c02563618e16b5cc3b4e1224ef195c1c3ebbdbe7f2b8fc5b6838e1039028a7bc9d01a245d8afd59df8e6db47655e41f0973a676113ca9a99dd7ebd6a0c5649e22a321b9c19686abffbce6a3647dcf1e00a80c16e4941d4558f4d80ed19793c45aff333a98c8c18b95c83e49cf84c7ead19c531962717be9d2ad7e5fbda2971ab2a18022965c62056af58a32c37ff95912aa2a4c2c9c04abc531a305b440756dd9ab437e86b4ec3bdaa2e13ce56919bd32d6ed86a04fd3557fa49de73d878a875b9fb7755667fccd12336e35328a134c7ad85f3c07