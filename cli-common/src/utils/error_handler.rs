use anchor_client::{
    solana_client::{
        client_error::{ClientError as SolanaClientError, ClientErrorKind},
        rpc_request::{RpcError, RpcResponseErrorData},
    },
    ClientError,
};
use super::ui::LABEL;
use std::{
    error::Error,
    io
};

pub fn handle_error(error: ClientError) -> Box<dyn Error> {
    let logs = extract_tx_logs(&error);

    if let Some(tx_logs) = logs {
        println!("{} Error logs:\n\t{}", LABEL, tx_logs.join("\n\t"));
        Box::new(io::Error::other(tx_logs.join("\n\t")))
    } else {
        println!("{} Error logs:\n\t{}", LABEL, error.to_string());
        Box::new(io::Error::other(error.to_string()))
    }
}

fn extract_tx_logs(error: &ClientError) -> Option<Vec<String>> {
    if let ClientError::SolanaClientError(SolanaClientError {
      kind: ClientErrorKind::RpcError(
          RpcError::RpcResponseError {
              data: RpcResponseErrorData::SendTransactionPreflightFailure(preflight),
              ..
          }
      ),
      ..
  }) = error {
        return preflight.logs.clone();
    }

    None
}