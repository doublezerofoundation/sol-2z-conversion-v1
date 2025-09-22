use std::{error::Error, str::FromStr};

use anchor_client::{
    anchor_lang::{prelude::AccountMeta, AnchorSerialize},
    solana_sdk::{
        hash::hash, instruction::Instruction, pubkey::Pubkey, signer::Signer,
    },
};
use cli_common::{
    structs::ConfigurationRegistry,
    transaction_executor::{get_account_data, send_instruction_with_return_data},
    utils::{
        pda_helper::{
            get_configuration_registry_pda, get_deny_list_registry_pda, get_program_state_pda,
        },
        ui,
        env_var::load_payer_from_env,
        fixed_point_utils::{convert_sol_value, convert_token_value}
    },
};
use crate::core::{
    common::instruction::GET_PRICE_INSTRUCTION, config::UserConfig,
    utils::price_utils::fetch_oracle_price,
};

pub fn get_quantity() -> Result<(), Box<dyn Error>> {
    let user_config = UserConfig::load_user_config()?;
    let program_id = Pubkey::from_str(&user_config.program_id)?;

    println!("{}, Reading configuration registry...", ui::WAITING);
    let config_registry_pda = get_configuration_registry_pda(program_id).0;
    let config_registry: ConfigurationRegistry =
        get_account_data(user_config.rpc_url, config_registry_pda)?;
    let sol_quantity_in_sol = convert_sol_value(config_registry.sol_quantity);

    println!(
        "{} Current tradable SOL quantity \n In lamports: {} \n In SOL: {}",
        ui::OK,
        config_registry.sol_quantity,
        sol_quantity_in_sol
    );
    Ok(())
}

pub async fn get_price() -> Result<(), Box<dyn Error>> {
    let payer = load_payer_from_env()?;
    let user_config = UserConfig::load_user_config()?;

    let oracle_price_data = fetch_oracle_price(user_config.price_oracle_end_point).await?;
    let mut data = hash(GET_PRICE_INSTRUCTION).to_bytes()[..8].to_vec();
    data = [data, oracle_price_data.try_to_vec()?].concat();

    let program_id = Pubkey::from_str(&user_config.program_id)?;
    let program_state_pda = get_program_state_pda(program_id).0;
    let configuration_registry_pda = get_configuration_registry_pda(program_id).0;

    let accounts = vec![
        AccountMeta::new(payer.pubkey(), true),
        AccountMeta::new(program_state_pda, false),
        AccountMeta::new(configuration_registry_pda, false),
    ];

    let ix = Instruction {
        program_id,
        accounts,
        data,
    };
    let result_bps: u64 = send_instruction_with_return_data(ix)?;
    let result = convert_token_value(result_bps);
    println!("{} Current estimated conversion rate: {} 2Z per SOL", ui::OK, result);
    Ok(())
}