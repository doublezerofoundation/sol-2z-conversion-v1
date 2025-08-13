use anchor_client::{
    anchor_lang::prelude::{borsh::BorshDeserialize, *},
    solana_sdk::pubkey::Pubkey,
};

#[derive(Debug, AnchorDeserialize)]
pub struct ConfigurationRegistry {
    pub oracle_pubkey: Pubkey,
    pub sol_quantity: u64,
    pub slot_threshold: u64,
    pub price_maximum_age: i64,
    pub max_fills_storage: u64,
    pub authorized_dequeuers: Vec<Pubkey>,
    pub steepness: u64,
    pub max_discount_rate: u64,
}

impl AccountDeserialize for ConfigurationRegistry {
    fn try_deserialize(buf: &mut &[u8]) -> Result<Self> {
        *buf = &buf[8..];
        ConfigurationRegistry::try_deserialize_unchecked(buf)
    }
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        ConfigurationRegistry::deserialize(buf).map_err(Into::into)
    }
}

#[derive(Debug, AnchorDeserialize)]
pub struct FillsRegistry {
    pub total_sol_pending: u64,      // Total SOL in not dequeued fills
    pub total_2z_pending: u64,       // Total 2Z in not dequeued fills
    pub lifetime_sol_processed: u64, // Cumulative SOL processed
    pub lifetime_2z_processed: u64,  // Cumulative 2Z processed
    pub fills: Vec<Fill>,
    pub head: u32,   // index of oldest element
    pub tail: u32,   // index to insert next element
    pub count: u32,  // number of valid elements
}

#[derive(Debug, AnchorDeserialize)]
pub struct Fill {
    pub sol_in: u64,
    pub token_2z_out: u64,
    pub timestamp: i64,
    pub buyer: Pubkey,
    pub epoch: u64, // Source epoch for accounting
}

impl AccountDeserialize for FillsRegistry {
    fn try_deserialize(buf: &mut &[u8]) -> Result<Self> {
        *buf = &buf[8..];
        FillsRegistry::try_deserialize_unchecked(buf)
    }
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        FillsRegistry::deserialize(buf).map_err(Into::into)
    }
}

#[derive(Debug, AnchorDeserialize)]
pub struct ProgramStateAccount {
    pub admin: Pubkey,
    pub is_halted: bool,
    pub bump_registry: BumpRegistry,
    pub trade_history_list: Vec<TradeHistory>,
}

impl AccountDeserialize for ProgramStateAccount {
    fn try_deserialize(buf: &mut &[u8]) -> Result<Self> {
        *buf = &buf[8..];
        ProgramStateAccount::try_deserialize_unchecked(buf)
    }
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        ProgramStateAccount::deserialize(buf).map_err(Into::into)
    }
}

#[derive(Debug, AnchorDeserialize)]
pub struct TradeHistory {
    pub epoch: u64,
    pub num_of_trades: u64,
}

#[derive(Debug, AnchorDeserialize)]
pub struct BumpRegistry {
    pub configuration_registry_bump: u8,
    pub program_state_bump: u8,
    pub fills_registry_bump: u8,
    pub deny_list_registry_bump: u8,
}