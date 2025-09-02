use borsh::BorshDeserialize;
use solana_program::hash::hash;
use solana_program::program_error::ProgramError;

pub enum MockProgramInstruction {
    Initialize,
    WithdrawSol {
        amount: u64,
    },
    Mint2Z {
        amount: u64,
    },
}

#[derive(BorshDeserialize)]
struct AmountPayload {
    amount: u64,
}

impl MockProgramInstruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        if input.len() < 8 {
            return Err(ProgramError::InvalidInstructionData);
        }

        let (discm_bytes, rest) = input.split_at(8);

        match discm_bytes {
            x if x == compute_discriminator("dz::ix::initialize") => Ok(Self::Initialize),

            x if x == compute_discriminator("dz::ix::withdraw_sol") => {
                let payload = AmountPayload::try_from_slice(rest)
                    .map_err(|_| ProgramError::InvalidInstructionData)?;
                Ok(Self::WithdrawSol { amount: payload.amount })
            }

            x if x == compute_discriminator("dz::ix::mint2z") => {
                let payload = AmountPayload::try_from_slice(rest)
                    .map_err(|_| ProgramError::InvalidInstructionData)?;
                Ok(Self::Mint2Z { amount: payload.amount })
            }
            _ => Err(ProgramError::InvalidInstructionData),
        }
    }
}

pub fn compute_discriminator(name: &str) -> [u8; 8] {
    let mut out = [0u8; 8];
    out.copy_from_slice(&hash(name.as_bytes()).to_bytes()[..8]);
    out
}