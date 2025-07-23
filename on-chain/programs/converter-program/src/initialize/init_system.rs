use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeSystem<'info> {
    #[account(mut)]
    pub signer: Signer<'info>
}

impl<'info> InitializeSystem<'info> {
    pub fn process(&mut self) -> Result<()> {

        Ok(())
    }
}