use std::{error::Error, str::FromStr};
use anchor_client::{
    anchor_lang::prelude::Pubkey,
    solana_sdk::native_token::LAMPORTS_PER_SOL,
    solana_client::rpc_client::RpcClient
};
use crate::{
    constant::{TOKEN_UNITS, MAX_FILLS_QUEUE_SIZE},
    structs::FillsRegistry,
    utils::{pda_helper, ui},
    config::Config
};
use solana_commitment_config::CommitmentConfig;

pub fn view_fills_registry() -> Result<(), Box<dyn Error>> {
    let config = Config::load()?;
    let program_id = Pubkey::from_str(&config.program_id)?;

    let fills_registry_address = pda_helper::get_fills_registry_address(program_id, config.rpc_url.clone())?;
    println!("Fills Registry Address: {}", fills_registry_address);

    // Fetch the raw account data
    let client = RpcClient::new_with_commitment(config.rpc_url, CommitmentConfig::confirmed());
    let account_data = client.get_account_data(&fills_registry_address)?;
    let account_data_slice = &account_data[8..];
    let fills_registry_size = size_of::<FillsRegistry>();
    let fills_registry_bytes = &account_data_slice[..fills_registry_size];
    let fills_registry: &FillsRegistry = bytemuck::from_bytes(fills_registry_bytes);

    println!("{} Successfully Fetched Fill Registry", ui::OK);
    println!("{} Fill Registry Statistics", ui::LABEL);
    println!("{} Total Unprocessed Fills {}", ui::BULLET, fills_registry.count);
    println!("{} Head: {}", ui::BULLET, fills_registry.head);
    println!("{} Tail: {}", ui::BULLET, fills_registry.tail);
    println!("{} Total Unprocessed SOL Volume {}, In Lamports {}",
             ui::BULLET, fills_registry.total_sol_pending / LAMPORTS_PER_SOL, fills_registry.total_sol_pending);
    println!("{} Total Unprocessed 2Z Volume {}, With Decimals {}",
             ui::BULLET, fills_registry.total_2z_pending / TOKEN_UNITS, fills_registry.total_2z_pending);
    println!("\n");
    println!("{} Pending Fills", ui::LABEL);

    if fills_registry.count == 0 {
        println!("{} No Pending Fills found", ui::BULLET);
        return Ok(());
    }
    // Iterate over pending fills
    for i in 0..fills_registry.count as usize {
        // Circular queue indexing
        let idx = (fills_registry.head as usize + i) % MAX_FILLS_QUEUE_SIZE;
        let fill = &fills_registry.fills[idx];
        let fill_quantity = fill.sol_in/ LAMPORTS_PER_SOL;
        println!("Fill {}: sol_in:{} token_2z_out:{}", i, fill_quantity, fill.token_2z_out);
    }
    Ok(())
}