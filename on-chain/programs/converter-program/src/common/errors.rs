use anchor_lang::prelude::*;

#[error_code]
pub enum ConverterError {
    #[msg("Unauthorized user")]
    UnauthorizedUser,

    #[msg("Deny listed user")]
    DenyListedUser,

    #[msg("Maximum number of authorized dequeuers reached")]
    MaxAuthorizedDequeuersReached,
}
