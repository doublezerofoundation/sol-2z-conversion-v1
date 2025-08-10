use anchor_lang::prelude::*;

#[event]
pub struct UnauthorizedUser {
    pub attempted_by: Pubkey,
}

#[event]
pub struct SystemHalted {
    pub halted_by: Pubkey,
}

#[event]
pub struct SystemUnhalted{
    pub unhalted_by: Pubkey,
}

#[event]
pub struct AccessDuringSystemHalt {
    pub accessed_by: Pubkey,
}

#[event]
pub struct AccessByDeniedPerson {
    pub accessed_by: Pubkey,
}

#[event]
pub struct AttestationInvalid {
}
