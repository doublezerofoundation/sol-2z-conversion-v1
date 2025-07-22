use anchor_lang::prelude::*;

declare_id!("DBopoT6ddxmWtNhVpef73mwT2zJr6L8KskNAtrt89LnW");

#[program]
pub mod converter_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
