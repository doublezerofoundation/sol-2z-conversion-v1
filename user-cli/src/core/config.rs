use std::error::Error;
use reqwest::Url;
use cli_common::config::Config;

#[allow(dead_code)]
pub struct UserConfig {
    pub program_id: String,
    pub price_oracle_end_point: Url,
    pub rpc_url: String,
    pub double_zero_program_id: String,
}

#[allow(dead_code)]
impl UserConfig {
    pub fn load_user_config() -> Result<Self, Box<dyn Error>> {
        let raw_config = Config::load()?;
        let oracle_price_end_point = raw_config.price_oracle_end_point.ok_or("Missing oracle end point in config file")?;
        Ok(UserConfig {
            program_id: raw_config.program_id,
            double_zero_program_id: raw_config.double_zero_program_id,
            price_oracle_end_point: Url::parse(&oracle_price_end_point)?,
            rpc_url: raw_config.rpc_url,
        })
    }
}
