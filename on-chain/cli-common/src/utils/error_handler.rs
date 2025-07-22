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
    if let Some(logs) = extract_tx_logs(&error) {
        let message = format!(
            "Error: Transaction failed during simulation.\n  {LABEL} Error Message: {error}\n  {LABEL} Error Logs:\n      {}",
            logs.join("\n      ")
        );
        return Box::new(io::Error::other(message));
    }

    let message = format!(
        "Error: Error found without Logs.\n  {LABEL} Error Message: {error}"
    );
    Box::new(io::Error::other(message))
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