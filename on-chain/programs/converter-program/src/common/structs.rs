use anchor_lang::prelude::*;

use crate::common::constant::TTL;

#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct OraclePriceData {
    pub swap_rate: u64,
    pub timestamp: i64,
    pub signature: String,
}

#[error_code]
pub enum OraclePriceDataError {
    #[msg("Invalid oracle swap rate")]
    InvalidOracleSwapRate,

    #[msg("Timestamp is stale")]
    StaleTimestamp,

    #[msg("Timestamp is in the future")]
    FutureTimestamp,

    #[msg("Invalid system time")]
    InvalidSystemTime,
}

impl OraclePriceData {
    pub fn sanity_check(&self) -> Result<()> {
        // swap rate cannot be negative
        // swap rate cannot be zero
        msg!("swap_rate: {}", self.swap_rate);
        require!(self.swap_rate > 0, OraclePriceDataError::InvalidOracleSwapRate);

        // future timestamp
        let unix_time: i64 = Clock::get()?.unix_timestamp;
        msg!("unix_time: {}", unix_time);
        msg!("timestamp: {}", self.timestamp);
        // add 1 second to the unix time to account for the solana clock estimation
        require!(unix_time + 1 >= self.timestamp, OraclePriceDataError::FutureTimestamp);

        // stale data
        let diff = unix_time + 1 - self.timestamp;
        require!(diff < TTL, OraclePriceDataError::StaleTimestamp);

        Ok(())
    }
}