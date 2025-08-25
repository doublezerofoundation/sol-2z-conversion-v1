use anchor_lang::prelude::*;

// Sample struct. to test upgrades
#[account]
#[derive(InitSpace, Debug)]
pub struct DenyListRegistryV2 {
    // we increase the size also
    #[max_len(100)]
    pub denied_addresses: Vec<Pubkey>,
    pub last_updated: i64,
    pub update_count: u64, // For audit purposes
    pub new_field: u64,
}
