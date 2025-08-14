use anchor_lang::prelude::*;

use crate::{
    common::{
        constant::DISCRIMINATOR_SIZE,
        events::init::SystemInitialized,
        seeds::seed_prefixes::SeedPrefixes
    },
    configuration_registry::configuration_registry::ConfigurationRegistry,
    deny_list_registry::deny_list_registry::DenyListRegistry,
    fills_registry::fills_registry::FillsRegistry,
    state::program_state::ProgramStateAccount,
    program::ConverterProgram
};

/// Only the current upgrade authority can call this
#[derive(Accounts)]
pub struct InitializeSystem<'info> {
    #[account(
        init,
        payer = authority,
        space = DISCRIMINATOR_SIZE + ConfigurationRegistry::INIT_SPACE,
        seeds = [SeedPrefixes::ConfigurationRegistry.as_bytes()],
        bump,
    )]
    pub configuration_registry: Account<'info, ConfigurationRegistry>,
    #[account(
        init,
        payer = authority,
        space = DISCRIMINATOR_SIZE + ProgramStateAccount::INIT_SPACE,
        seeds = [SeedPrefixes::ProgramState.as_bytes()],
        bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    #[account(
        init,
        payer = authority,
        space = DISCRIMINATOR_SIZE + DenyListRegistry::INIT_SPACE,
        seeds = [SeedPrefixes::DenyListRegistry.as_bytes()],
        bump,
    )]
    pub deny_list_registry: Account<'info, DenyListRegistry>,
    #[account(zero)]
    pub fills_registry: AccountLoader<'info, FillsRegistry>,
    #[account(
        constraint = program.programdata_address()? == Some(program_data.key()) 
    )]
    pub program: Program<'info, ConverterProgram>,
    /// PDA holding upgrade authority info.
    #[account(
        constraint = program_data.upgrade_authority_address == Some(authority.key())
    )]
    pub program_data: Account<'info, ProgramData>,
    pub system_program: Program<'info, System>,
    /// current upgrade have to sign
    #[account(mut)]
    pub authority: Signer<'info>
}

impl<'info> InitializeSystem<'info> {
    pub fn process(
        &mut self,
        oracle_pubkey: Pubkey,
        sol_quantity: u64,
        slot_threshold: u64,
        price_maximum_age: i64,
        max_fills_storage: u64,
        coefficient: u64,
        max_discount_rate: u64,
        min_discount_rate: u64
    ) -> Result<()> {

        // Initialize configuration_registry registry with provided values
        self.configuration_registry.initialize(
            oracle_pubkey,
            sol_quantity,
            slot_threshold,
            price_maximum_age,
            max_fills_storage,
            coefficient,
            max_discount_rate,
            min_discount_rate
        )?;

        // Initializing Fills Registry
        self.fills_registry.load_init()?;
        // Store it in program state
        self.program_state.fills_registry_address = self.fills_registry.key();

        // Set upgrade authority as admin
        self.program_state.admin = self.authority.key();
        self.program_state.deny_list_authority = self.authority.key();

        // Set last trade slot to current slot
        self.program_state.last_trade_slot = Clock::get()?.slot;

        msg!("System is Initialized");
        emit!(SystemInitialized {});
        Ok(())

    }

    pub fn set_bumps(
        &mut self,
        configuration_registry_bump: u8,
        program_state_bump: u8,
        deny_list_registry_bump: u8,
    )-> Result<()> {

        let bump_registry = &mut self.program_state.bump_registry;
        bump_registry.configuration_registry_bump = configuration_registry_bump;
        bump_registry.program_state_bump = program_state_bump;
        bump_registry.deny_list_registry_bump = deny_list_registry_bump;
        Ok(())

    }
}