use std::error::Error;
use reqwest::{Client, Url};
use serde::{Deserialize};

pub async fn fetch_oracle_price(price_oracle_end_point: Url) ->  Result<OraclePriceData, Box<dyn Error>>  {
    let client = Client::new();
    let response = client
        .get(price_oracle_end_point)
        .header("User-Agent", "Admin CLI")
        .send()
        .await?
        .json::<OraclePriceData>()
        .await?;

    println!("{:#?}", response);
    Ok(response)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OraclePriceData {
    pub swap_rate: String,
    pub timestamp: i64,
    pub signature: String,
    // uncomment if needed
    // pub sol_price_usd: String,
    // pub twoz_price_usd: String,
}