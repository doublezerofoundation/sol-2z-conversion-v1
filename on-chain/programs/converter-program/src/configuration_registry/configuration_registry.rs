use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct ConfigurationRegistry {
    pub oracle_pubkey: Pubkey, // Public key of the swap oracle service
    pub revenue_distribution_program: Pubkey,
    pub sol_quantity: u64,
    pub price_maximum_age: i64, // Maximum acceptable age for oracle price data
    pub fills_consumer: Pubkey,
    // Price calculation
    pub coefficient: u64, // Coefficient of the discount function in basis points (0 <= coefficient <= 100_000_000)
    pub max_discount_rate: u64, // Maximum discount rate in basis points (0 <= max_discount_rate <= 10_000)
    pub min_discount_rate: u64, // Minimum discount rate in basis points (0 <= min_discount_rate <= 10_000)
}