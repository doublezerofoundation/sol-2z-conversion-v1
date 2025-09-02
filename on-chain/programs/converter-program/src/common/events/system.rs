use anchor_lang::prelude::*;

#[event]
pub struct SystemHalted {
    pub halted_by: Pubkey,
}

#[event]
pub struct SystemUnhalted {
    pub unhalted_by: Pubkey,
}

#[event]
pub struct AdminChanged {
    pub new_admin: Pubkey,
    pub changed_by: Pubkey,
}

#[event]
pub struct DenyListAuthoritySet {
    pub new_authority: Pubkey,
    pub changed_by: Pubkey,
}