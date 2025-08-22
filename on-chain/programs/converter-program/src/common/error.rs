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

    #[msg("Invalid Timestamp")]
    InvalidTimestamp, // 6014

    #[msg("Provided bid is too low")]
    BidTooLow, // 6015

    #[msg("Provided Attestation is not Authentic")]
    StalePrice, // 6016

    #[msg("Deny list is full")]
    DenyListFull, // 6017

    #[msg("Address already added to Deny List")]
    AlreadyExistsInDenyList, // 6018

    #[msg("Invalid system state")]
    InvalidSystemState, // 6019

    #[msg("Invalid conversion rate")]
    InvalidConversionRate, // 6020

    #[msg("Address not found in Deny List")]
    AddressNotInDenyList, // 6021

    #[msg("System is halted")]
    SystemIsHalted, // 6022

    #[msg("Arithmetic Error has occurred")]
    ArithmeticError, // 6023

    #[msg("User is not authorized to do Dequeue Action")]
    UnauthorizedFillConsumer, // 6024

    #[msg("Unauthorized Deny List Authority")]
    UnauthorizedDenyListAuthority, // 6025

    #[msg("FillsRegistry is full — cannot enqueue.")]
    RegistryFull, //6026

    #[msg("FillsRegistry is empty — cannot dequeue.")]
    RegistryEmpty, //6027

    #[msg("Trying To Dequeue From Empty Fills Registry")]
    EmptyFillsRegistry, // 6028
}
