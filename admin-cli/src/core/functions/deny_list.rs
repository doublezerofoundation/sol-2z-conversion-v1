use crate::core::{
    common::instruction::{ADD_TO_DENY_LIST_INSTRUCTION, REMOVE_FROM_DENY_LIST_INSTRUCTION},
    config::AdminConfig,
};
use anchor_client::solana_client::rpc_client::RpcClient;
use anchor_client::solana_sdk::{
    commitment_config::CommitmentConfig,
    hash::hash,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
};
use cli_common::{
    config::Config,
    transaction_executor,
    utils::{env_var::load_private_key, pda_helper},
};
use std::{error::Error, str::FromStr};

/// Adds an address to the deny list registry
pub fn add_to_deny_list(address: String) -> Result<(), Box<dyn Error>> {
    println!("Adding address {} to deny list", address);

    let admin_config = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;
    let address_pubkey = Pubkey::from_str(&address)?;

    let private_key = load_private_key()?;
    let payer = Keypair::from_bytes(&private_key)?;

    // Building instruction data using Anchor discriminator
    let mut data = hash(ADD_TO_DENY_LIST_INSTRUCTION).to_bytes()[..8].to_vec();
    data.extend_from_slice(&address_pubkey.to_bytes());

    // Getting necessary accounts
    let deny_list_registry_pda = pda_helper::get_deny_list_registry_pda(program_id).0;

    let accounts = vec![
        AccountMeta::new(deny_list_registry_pda, false),
        AccountMeta::new(payer.pubkey(), true),
    ];

    let instruction = Instruction {
        program_id,
        data,
        accounts,
    };

    transaction_executor::send_batch_instructions(vec![instruction])?;
    println!("Address {} successfully added to deny list", address);
    Ok(())
}

/// Removes an address from the deny list registry
pub fn remove_from_deny_list(address: String) -> Result<(), Box<dyn Error>> {
    println!("Removing address {} from deny list", address);

    let admin_config = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;
    let address_pubkey = Pubkey::from_str(&address)?;

    let private_key = load_private_key()?;
    let payer = Keypair::from_bytes(&private_key)?;

    // Building instruction data using Anchor discriminator
    let mut data = hash(REMOVE_FROM_DENY_LIST_INSTRUCTION).to_bytes()[..8].to_vec();
    data.extend_from_slice(&address_pubkey.to_bytes());

    // Getting necessary accounts
    let deny_list_registry_pda = pda_helper::get_deny_list_registry_pda(program_id).0;

    let accounts = vec![
        AccountMeta::new(deny_list_registry_pda, false),
        AccountMeta::new(payer.pubkey(), true),
    ];

    let instruction = Instruction {
        program_id,
        data,
        accounts,
    };

    transaction_executor::send_batch_instructions(vec![instruction])?;
    println!("Address {} successfully removed from deny list", address);
    Ok(())
}

/// Displays all addresses in the deny list registry
pub fn view_deny_list() -> Result<(), Box<dyn Error>> {
    println!("Fetching deny list...");

    let admin_config = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;

    let deny_list_registry_pda = pda_helper::get_deny_list_registry_pda(program_id).0;

    // Load config and setup RPC client
    let config = Config::load().map_err(|_| "Error when reading config file")?;
    let rpc_client = RpcClient::new_with_commitment(config.rpc_url, CommitmentConfig::confirmed());

    // Fetch the account data
    match rpc_client.get_account(&deny_list_registry_pda) {
        Ok(account) => {
            println!("Current deny list:");
            println!("Registry Address: {}", deny_list_registry_pda);

            if account.data.len() < 16 {
                println!("Account data too small, registry may not be initialized properly");
                return Ok(());
            }

            // Skip the discriminator (first 8 bytes) and deserialize the basic structure
            let data = &account.data[8..];

            // Parse the vector length (4 bytes after discriminator)
            if data.len() < 4 {
                println!("Invalid account data format");
                return Ok(());
            }

            let vec_len = u32::from_le_bytes([data[0], data[1], data[2], data[3]]) as usize;
            println!("Number of denied addresses: {}", vec_len);

            if vec_len == 0 {
                println!("No addresses currently in deny list");
            } else {
                println!("Denied addresses:");

                // Each Pubkey is 32 bytes, starting after the vector length
                let mut offset = 4;
                for i in 0..vec_len {
                    if offset + 32 <= data.len() {
                        let pubkey_bytes = &data[offset..offset + 32];
                        let pubkey = Pubkey::try_from(pubkey_bytes)?;
                        println!("  {}. {}", i + 1, pubkey);
                        offset += 32;
                    } else {
                        println!("  {}. [Data truncated]", i + 1);
                        break;
                    }
                }
            }

            // Try to parse timestamp and update count if available
            let remaining_data = &data[4 + (vec_len * 32)..];
            if remaining_data.len() >= 16 {
                let last_updated = i64::from_le_bytes([
                    remaining_data[0],
                    remaining_data[1],
                    remaining_data[2],
                    remaining_data[3],
                    remaining_data[4],
                    remaining_data[5],
                    remaining_data[6],
                    remaining_data[7],
                ]);
                let update_count = u64::from_le_bytes([
                    remaining_data[8],
                    remaining_data[9],
                    remaining_data[10],
                    remaining_data[11],
                    remaining_data[12],
                    remaining_data[13],
                    remaining_data[14],
                    remaining_data[15],
                ]);

                println!("Last updated: {} (timestamp)", last_updated);
                println!("Update count: {}", update_count);
            }
        }
        Err(e) => {
            println!("Error fetching deny list registry: {}", e);
            println!("Registry may not be initialized yet. Try running the init command first.");
        }
    }

    Ok(())
}
