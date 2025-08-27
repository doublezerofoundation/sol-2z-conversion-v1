use std::error::Error;
use anchor_client::solana_client::rpc_client::RpcClient;
use anchor_client::solana_sdk::commitment_config::CommitmentConfig;
use anchor_client::solana_sdk::pubkey::Pubkey;
use anchor_client::solana_sdk::signature::Keypair;
use anchor_client::solana_sdk::signer::Signer;
use spl_associated_token_account::{
    get_associated_token_address_with_program_id, instruction::create_associated_token_account,
};
use crate::transaction_executor::{ send_batch_instructions};

pub fn find_or_initialize_associated_token_account(payer: Keypair, mint: Pubkey, rpc_url: String) -> Result<Pubkey, Box<dyn Error>>{
    let associated_token_account = get_associated_token_address_with_program_id(
        &payer.pubkey(),      // owner
        &mint,           // mint
        &spl_token_2022::id(), // program_id
    );

    // Check if the account exists
    let client = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());
    if client.get_account_data(&associated_token_account).is_ok() {
        println!("Associated token exists with address {}", associated_token_account);
        return Ok(associated_token_account);
    }
    println!("Associated Token does not exists. Creating ...");
    let create_ata_instruction = create_associated_token_account(
        &payer.pubkey(),      // funding address
        &payer.pubkey(),      // wallet address
        &mint,           // mint address
        &spl_token_2022::id(), // program id
    );

    send_batch_instructions(vec![create_ata_instruction])?;
    println!("Associated token has been created in address {}", associated_token_account);
    Ok(associated_token_account)
}