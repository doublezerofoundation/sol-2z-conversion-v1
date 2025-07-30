use anchor_lang::prelude::*;

#[error_code]
pub enum ConverterError {
    #[msg("Unauthorized user")]
    UnauthorizedUser,

    #[msg("Deny listed user")]
    DenyListedUser,

    #[msg("Invalid discount rate")]
    InvalidDiscountRate,

    #[msg("Invalid oracle swap rate")]
    InvalidOracleSwapRate,

    #[msg("Invalid sol quantity")]
    InvalidSolQuantity,

    #[msg("Invalid ask price")]
    InvalidAskPrice,

    #[msg("Invalid max discount rate")]
    InvalidMaxDiscountRate,

    #[msg("Invalid sol demand")]
    InvalidSolDemand,

    #[msg("Invalid steepness")]
    InvalidSteepness,

    #[msg("Discount calculation error")]
    DiscountCalculationError,
}
