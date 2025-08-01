use anchor_lang::prelude::*;

#[event]
pub struct UnauthorizedUser {
    pub attempted_by: Pubkey,
}

