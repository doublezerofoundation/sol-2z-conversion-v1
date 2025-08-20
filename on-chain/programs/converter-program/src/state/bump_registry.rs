use anchor_lang::prelude::*;
use anchor_lang::{AnchorSerialize, AnchorDeserialize};

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct BumpRegistry {
    pub configuration_registry_bump: u8,
    pub program_state_bump: u8,
    pub deny_list_registry_bump: u8,
    pub withdraw_authority_bump: u8,
}