use std::error::Error;
use reqwest::{Client, Url};

use crate::core::common::structs::OraclePriceData;

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