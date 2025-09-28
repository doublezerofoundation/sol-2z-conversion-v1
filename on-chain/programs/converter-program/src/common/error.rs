use anchor_lang::prelude::*;

// NOTE: Anchor 0.30.1 adds 6000 for user error codes)
#[error_code]
/// Error codes specifies all possible custom errors in the DoubleZero program.
pub enum DoubleZeroError {
    #[msg("User is blocked in the deny list")]
    UserInsideDenyList, // 6000 0x1796

    #[msg("Unauthorized admin")]
    UnauthorizedAdmin, // 6001

    #[msg("Provided attestation is invalid")]
    InvalidAttestation, // 6002

    #[msg("Oracle public key is invalid")]
    InvalidOraclePublicKey, // 6003

    #[msg("Provided attestation is not authentic")]
    AttestationVerificationError, // 6004

    #[msg("Invalid discount rate")]
    InvalidDiscountRate, // 6005

    #[msg("Invalid SOL quantity")]
    InvalidSolQuantity, // 6006

    #[msg("Invalid ask price")]
    InvalidAskPrice, // 6007

    #[msg("Invalid max discount rate")]
    InvalidMaxDiscountRate, // 6008

    #[msg("Invalid min discount rate")]
    InvalidMinDiscountRate, // 6009

    #[msg("Invalid trade slot")]
    InvalidTradeSlot, // 6010

    #[msg("Invalid coefficient")]
    InvalidCoefficient, // 6011

    #[msg("Discount calculation error")]
    DiscountCalculationError, // 6012

    #[msg("Invalid oracle swap rate")]
    InvalidOracleSwapRate, // 6013

    #[msg("Invalid timestamp")]
    InvalidTimestamp, // 6014

    #[msg("Provided bid is too low")]
    BidTooLow, // 6015

    #[msg("Provided attestation is outdated")]
    StalePrice, // 6016

    #[msg("Deny list is full")]
    DenyListFull, // 6017

    #[msg("Address already added to deny list")]
    AlreadyExistsInDenyList, // 6018

    #[msg("Invalid system state")]
    InvalidSystemState, // 6019

    #[msg("Invalid conversion rate")]
    InvalidConversionRate, // 6020

    #[msg("Address not found in deny list")]
    AddressNotInDenyList, // 6021

    #[msg("System is halted")]
    SystemIsHalted, // 6022

    #[msg("Arithmetic error has occurred")]
    ArithmeticError, // 6023

    #[msg("User is not authorized to do fills consumption")]
    UnauthorizedFillConsumer, // 6024

    #[msg("Unauthorized deny list authority")]
    UnauthorizedDenyListAuthority, // 6025

    #[msg("Fills registry is full — cannot enqueue")]
    RegistryFull, //6026

    #[msg("Fills registry is empty — cannot consume")]
    EmptyFillsRegistry, // 6027

    #[msg("Provided SOL amount for consumption is invalid")]
    InvalidMaxSolAmount, // 6028

    #[msg("Only one trade is allowed per slot")]
    SingleTradePerSlot, //6029

    #[msg("Error when calculating ask price")]
    AskPriceCalculationError, //6030
    
    #[msg("Provided price maximum age value is invalid")]
    InvalidPriceMaximumAge, //6031
}