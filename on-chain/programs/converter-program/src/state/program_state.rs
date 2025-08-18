use anchor_lang::prelude::*;

use crate::{
    state::bump_registry::BumpRegistry,
    common::error::DoubleZeroError,
    common::events::system::UnauthorizedUser
};

#[account]
#[derive(InitSpace, Debug)]
pub struct ProgramStateAccount {
    // We don't do any changes here. just version upgrade
    pub admin: Pubkey,
    pub fills_registry_address: Pubkey,
    pub is_halted: bool,  // Indicates whether the system accepts conversion requests
    pub bump_registry: BumpRegistry,
    pub last_trade_slot: u64,
    pub deny_list_authority: Pubkey,
}

impl ProgramStateAccount {
    pub fn assert_admin(&self, signer: &Signer) -> Result<()> {
        if self.admin != signer.key() {
            emit!(UnauthorizedUser { attempted_by: signer.key() });
            return err!(DoubleZeroError::UnauthorizedAdmin);
        }
        Ok(())
    }
    pub fn assert_deny_list_authority(&self, signer: &Signer) -> Result<()> {
        if self.deny_list_authority != signer.key() {
            emit!(UnauthorizedUser { attempted_by: signer.key() });
            return err!(DoubleZeroError::UnauthorizedDenyListAuthority);
        }
        Ok(())
    }
}