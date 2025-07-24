use std::{
    error::Error
};
use anchor_client::{
    solana_client::rpc_client::RpcClient,
    solana_sdk::{
        commitment_config::CommitmentConfig,
        instruction::Instruction,
        signature::{Keypair, Signature},
        signer::Signer,
        transaction::Transaction
    },
};
use crate::{
    config::Config,
    utils::{
        error_handler,
        ui::{LABEL, WAITING, OK},
        env_var::load_private_key
    }
};

pub fn send_batch_instructions(
    instructions: Vec<Instruction>
) -> Result<Signature, Box<dyn Error>> {
    let private_key = load_private_key()?;
    let payer = Keypair::from_bytes(&private_key)?;

    let config = Config::load().map_err(|_| "Error when reading config file")?;

    println!("{LABEL} Program ID : {}", config.program_id);
    println!("{LABEL} Payer      : {}", payer.pubkey());
    println!("{WAITING} Sending transaction...");

    let rpc_client = RpcClient::new_with_commitment(config.rpc_url, CommitmentConfig::confirmed());

    // Fetch recent blockhash
    let recent_blockhash = rpc_client
        .get_latest_blockhash()
        .map_err(|_| "Error when getting latest block hash")?;

    let transaction = Transaction::new_signed_with_payer(
        &instructions,
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash
    );

    let signature = rpc_client
        .send_and_confirm_transaction(&transaction);

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

