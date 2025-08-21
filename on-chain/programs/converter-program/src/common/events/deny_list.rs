use anchor_lang::prelude::*;
#[event]
pub struct DenyListAddressAdded {
    pub added_by: Pubkey,
    pub address: Pubkey,
    pub timestamp: i64,
    pub update_count: u64,
}

#[event]
pub struct DenyListAddressRemoved {
    pub removed_by: Pubkey,
    pub address: Pubkey,
    pub timestamp: i64,
    pub update_count: u64,
}