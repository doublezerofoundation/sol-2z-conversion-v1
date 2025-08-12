use anchor_lang::prelude::*;

use crate::{
    state::bump_registry::BumpRegistry,
    common::error::DoubleZeroError,
    common::events::system::UnauthorizedUser
};

#[account]
#[derive(InitSpace, Debug)]
pub struct ProgramStateAccount {
    pub admin: Pubkey,
    pub is_halted: bool,  // Indicates whether the system accepts conversion requests
    pub bump_registry: BumpRegistry,
}

impl ProgramStateAccount {
    pub fn assert_admin(&self, signer: &Signer) -> Result<()> {
        if self.admin != signer.key() {
            emit!(UnauthorizedUser { attempted_by: signer.key() });
            return err!(DoubleZeroError::UnauthorizedAdmin);
        }
        Ok(())
    }
}