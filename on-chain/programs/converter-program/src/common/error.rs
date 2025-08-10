use anchor_lang::prelude::*;

// NOTE: Anchor 0.30.1 adds 6000 for user error codes)
#[error_code]
pub enum DoubleZeroError {
    #[msg("User is blocked in the DenyList")]
    UserInsideDenyList, // 6000 0x1796

    #[msg("Unauthorized Admin")]
    UnauthorizedAdmin, // 6001

    #[msg("Provided Attestation is Invalid")]
    InvalidAttestation, // 6002

    #[msg("Oracle Public Key is Invalid")]
    InvalidOraclePublicKey, // 6003

    #[msg("Provided Attestation is not Authentic")]
    AttestationVerificationError, // 6004

    #[msg("Invalid discount rate")]
    InvalidDiscountRate, // 6005

    #[msg("Invalid sol quantity")]
    InvalidSolQuantity, // 6006

    #[msg("Invalid ask price")]
    InvalidAskPrice, // 6007

    #[msg("Invalid max discount rate")]
    InvalidMaxDiscountRate, // 6008

    #[msg("Invalid sol demand")]
    InvalidSolDemand, // 6009

    #[msg("Invalid steepness")]
    InvalidSteepness, // 6010

    #[msg("Discount calculation error")]
    DiscountCalculationError, // 6011

    #[msg("Invalid oracle swap rate")]
    InvalidOracleSwapRate, // 6012

    #[msg("Invalid Timestamp")]
    InvalidTimestamp, // 6013

    #[msg("Provided bid is too low")]
    BidTooLow, // 6014

    #[msg("Provided Attestation is not Authentic")]
    StalePrice, // 6015

    #[msg("Maximum number of authorized dequeuers reached")]
    MaxAuthorizedDequeuersReached, // 6016

    #[msg("Deny list is full")]
    DenyListFull, // 6017

    #[msg("Address already added to Deny List")]
    AlreadyExistsInDenyList, // 6018

    #[msg("Invalid system state")]
    InvalidSystemState, // 6019

    #[msg("Invalid conversion rate")]
    InvalidConversionRate, // 6020
}
