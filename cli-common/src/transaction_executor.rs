use std::{
    error::Error,
    fmt::Debug,
    thread::sleep,
    time::Duration
};
use anchor_client::{
    solana_client::{
        rpc_client::RpcClient,
        rpc_config::RpcSendTransactionConfig,
        rpc_config::RpcTransactionConfig
    },
    anchor_lang::{AccountDeserialize, AnchorDeserialize},
    solana_sdk::{
        commitment_config::CommitmentConfig,
        instruction::Instruction,
        pubkey::Pubkey,
        signature::Signature,
        signer::Signer,
        transaction::Transaction,
    }
};
use anchor_client::solana_sdk::signature::Keypair;
use crate::{
    config::Config,
    utils::{
        env_var::load_payer_from_env,
        error_handler, 
        ui::{LABEL, OK, WAITING},
        return_data::ReturnData
    },
    constant::{RETRY_COUNT, RETRY_DELAY},
};


use base64::Engine;
use solana_transaction_status::{
    option_serializer::OptionSerializer, EncodedConfirmedTransactionWithStatusMeta,
    UiTransactionEncoding,
};

pub fn send_batch_instructions(
    instructions: Vec<Instruction>
) -> Result<Signature, Box<dyn Error>> {
    send_batch_instructions_with_signers(instructions, &[])
}

pub fn send_batch_instructions_with_signers(
    instructions: Vec<Instruction>,
    other_signers:  &[&Keypair],
) -> Result<Signature, Box<dyn Error>> {
    let payer = load_payer_from_env()?;

    let config = Config::load().map_err(|_| "Error when reading config file")?;

    println!("{LABEL} Program ID : {}", config.program_id);
    println!("{LABEL} Payer      : {}", payer.pubkey());
    println!("{WAITING} Sending transaction...");

    let rpc_client = RpcClient::new_with_commitment(config.rpc_url, CommitmentConfig::confirmed());

    // Fetch recent block hash
    let recent_block_hash = rpc_client
        .get_latest_blockhash()
        .map_err(|_| "Error when getting latest block hash")?;

    let tx_config = RpcSendTransactionConfig {
        skip_preflight: config.skip_preflight,
        preflight_commitment: Some(CommitmentConfig::confirmed().commitment),
        ..RpcSendTransactionConfig::default()
    };

    let mut signers: Vec<&Keypair> = vec![&payer];
    signers.extend_from_slice(other_signers);

    let transaction = Transaction::new_signed_with_payer(
        &instructions,
        Some(&payer.pubkey()),
        &signers,
        recent_block_hash
    );

    let signature = rpc_client
        .send_and_confirm_transaction_with_spinner_and_config(
            &transaction,
            CommitmentConfig::confirmed(),
            tx_config,
        );

    match signature {
        Ok(tx) => {
            println!("{OK} Transaction Successfully Executed! Signature: {}", tx);
            Ok(tx)
        }
        Err(e) => {
            let client_error = anchor_client::ClientError::SolanaClientError(e);
            Err(error_handler::handle_error(client_error))
        }
    }
}

pub fn send_instruction_with_return_data<T: ReturnData<T>>(
    instruction: Instruction,
) -> Result<T, Box<dyn Error>> {
    let payer = load_payer_from_env()?;

    let config = Config::load().map_err(|_| "Error when reading config file")?;

    println!("{LABEL} Program ID : {}", config.program_id);
    println!("{LABEL} Payer      : {}", payer.pubkey());
    println!("{WAITING} Sending transaction...");

    let rpc_client = RpcClient::new_with_commitment(config.rpc_url, CommitmentConfig::confirmed());

    // Fetch recent block hash
    let recent_block_hash = rpc_client
        .get_latest_blockhash()
        .map_err(|_| "Error when getting latest block hash")?;

    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
        &[&payer],
        recent_block_hash,
    );

    let tx_config = RpcSendTransactionConfig {
        skip_preflight: config.skip_preflight,
        preflight_commitment: Some(CommitmentConfig::confirmed().commitment),
        ..RpcSendTransactionConfig::default()
    };

    let signature = rpc_client.send_and_confirm_transaction_with_spinner_and_config(
        &transaction,
        CommitmentConfig::confirmed(),
        tx_config,
    );

    match signature {
        Ok(_) => {
            println!("{OK} Transaction Completed!");
        }
        Err(e) => {
            let client_error = anchor_client::ClientError::SolanaClientError(e);
            return Err(error_handler::handle_error(client_error));
        }
    }

    let signature = signature.unwrap(); // Signature is guaranteed to be Ok

    println!("{WAITING} Reading transaction data...");

    // Retry get_transaction up to 5 times with 2-second delay between attempts
    for i in 0..RETRY_COUNT {
        if i > 0 {
            println!("{WAITING} Retrying get_transaction (attempt {})...", i + 1);
            sleep(Duration::from_secs(RETRY_DELAY));
        }
        let tx_status = rpc_client.get_transaction_with_config(
            &signature,
            RpcTransactionConfig {
                encoding: Some(UiTransactionEncoding::Base64),
                commitment: Some(CommitmentConfig::confirmed()),
                max_supported_transaction_version: Some(0),
            },
        );
        match tx_status {
            Ok(tx_status) => {
                let return_data = extract_return_data(config.program_id, tx_status)?;
                let result = T::try_deserialize(&mut return_data.as_slice())?;
                return Ok(result);
            }
            Err(e) => {
                println!("{WAITING} Error when getting transaction: {}", e);
                continue;
            }
        }
    }
    Err("Deserialization error".into())
}

fn extract_return_data(
    program_id: String,
    tx_status: EncodedConfirmedTransactionWithStatusMeta,
) -> Result<Vec<u8>, Box<dyn Error>> {
    if let Some(meta) = tx_status.transaction.meta {
        if let OptionSerializer::Some(data) = meta.return_data {
            if data.program_id == program_id {
                let result = base64::engine::general_purpose::STANDARD.decode(data.data.0);
                return match result {
                    Ok(data) => Ok(data),
                    Err(e) => Err(e.into()),
                }
            } else {
                println!("Return data is not from the expected program");
            }
        } else {
            println!("No return data found");
        }
    } else {
        println!("No transaction metadata found");
    }
    Err("Deserialization error".into())
}

pub fn get_account_data<T: AccountDeserialize + AnchorDeserialize + Debug>(
    rpc_url: String,
    account: Pubkey,
) -> Result<T, Box<dyn Error>> {
    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());
    let data = client.get_account_data(&account)?;
    let account = T::try_deserialize(&mut data.as_slice())?;
    Ok(account)
}