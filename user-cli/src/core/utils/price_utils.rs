use std::collections::HashMap;
use std::error::Error;
use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};

pub async fn fetch_oracle_price(price_oracle_end_point: Url) ->  Result<(), Box<dyn Error>>  {
    let client = Client::new();
    let response = client
        .get(price_oracle_end_point)
        .header("User-Agent", "Admin CLI")
        .send()
        .await?
        .json::<RawOraclePriceData>()
        .await?;

    println!("{:#?}", response);
    Ok(())
}

struct OraclePriceData {
    swap_rate: String,
    timestamp: u64,
    signature: SignatureWrapper,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawOraclePriceData {
    swap_rate: String,
    timestamp: u64,
    signature: SignatureWrapper,
    sol_price_usd: f64,
    twoz_price_usd: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SignatureWrapper {
    signature: SignatureBytes,
    #[serde(rename = "publicKey")]
    public_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SignatureBytes {
    #[serde(flatten)]
    bytes: HashMap<String, u8>,
}