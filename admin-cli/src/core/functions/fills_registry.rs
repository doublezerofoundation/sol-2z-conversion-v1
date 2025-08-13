use std::{
    error::Error,
    str::FromStr
};
use anchor_client::{
    anchor_lang::prelude::Pubkey,
    solana_sdk::native_token::LAMPORTS_PER_SOL
};
use cli_common::{
    constant::TOKEN_DECIMALS,
    structs::FillsRegistry,
    transaction_executor::get_account_data,
    utils::{pda_helper, ui}
};
use crate::core::config::AdminConfig;

pub fn view_fills_registry() -> Result<(), Box<dyn Error>> {
    let admin_config = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;

    let fills_registry_pda = pda_helper::get_fills_registry_pda(program_id).0;
    let fills_registry: FillsRegistry =
        get_account_data(admin_config.rpc_url, fills_registry_pda)?;

    println!("{} Successfully Fetched Fill Registry", ui::OK);
    println!("{} Fill Registry Statistics", ui::LABEL);
    println!("{} Total Unprocessed Fills {}", ui::BULLET, fills_registry.fills.len());
    println!("{} Total Unprocessed SOL Volume {}, In Lamports {}",
             ui::BULLET, fills_registry.total_sol_pending / LAMPORTS_PER_SOL, fills_registry.total_sol_pending);
    println!("{} Total Unprocessed 2Z Volume {}, With Decimals {}",
             ui::BULLET, fills_registry.total_2z_pending / TOKEN_DECIMALS, fills_registry.total_2z_pending);
    println!("{} Lifetime processed SOL Volume {}, In Lamports {}",
             ui::BULLET, fills_registry.lifetime_sol_processed / LAMPORTS_PER_SOL, fills_registry.lifetime_sol_processed);
    println!("{} Lifetime processed 2Z Volume {}, With Decimals {}",
             ui::BULLET, fills_registry.lifetime_2z_processed / TOKEN_DECIMALS, fills_registry.lifetime_2z_processed);
    println!("\n");
    println!("{} Pending Fills", ui::LABEL);
    let fills = fills_registry.fills;

    if fills.len() == 0 {
        println!("{} No Pending Fills found", ui::BULLET);
        return Ok(());
    }

    // Print header
    println!(
        "{:<13} {:<14} {:<12} {:<44} {:<5}",
        "SOL In", "Token 2Z Out", "Timestamp", "Buyer", "Epoch"
    );
    println!("{}", "-".repeat(13 + 1 + 14 + 1 + 12 + 1 + 44 + 1 + 5));

    for fill_entry in fills {
        println!(
            "{:<13} {:<14} {:<12} {:<44} {:<5}",
            fill_entry.sol_in, fill_entry.token_2z_out, fill_entry.timestamp, fill_entry.buyer, fill_entry.epoch
        );
    }

    // println!("{:#?}", fills_registry);
    Ok(())
}