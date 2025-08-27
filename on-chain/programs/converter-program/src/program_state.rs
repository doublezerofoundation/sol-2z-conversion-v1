use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct ProgramStateAccount {
    pub admin: Pubkey,
    pub fills_registry_address: Pubkey,
    pub is_halted: bool,  // Indicates whether the system accepts conversion requests
    pub bump_registry: BumpRegistry,
    pub last_trade_slot: u64,
    pub deny_list_authority: Pubkey,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct BumpRegistry {
    pub configuration_registry_bump: u8,
    pub program_state_bump: u8,
    pub deny_list_registry_bump: u8,
    pub withdraw_authority_bump: u8,
}