use clap::Subcommand;

#[derive(Subcommand, Debug)]
pub enum Commands {
    /**
    Initializes the system by creating the configuration registry, vault,
    protocol treasury, and program state account.Init, Change the configs of the system
    **/
    Init,
    /// Displays current configuration registry contents.
    ViewConfig,

    /// Updates configuration parameters using values from root directory config.json.
    UpdateConfig,

    /// View current system state.
    ViewSystemState,

    /// Toggles system between active and paused states.
    ToggleSystemState {
        /// Flag to activate
        #[arg(long, action, required = false)]
        activate: bool,

        /// Flag to pause
        #[arg(long, action, required = false)]
        pause: bool,
    },

    /// Sets Fills Consumer in the configuration Registry
    SetFillsConsumer {
        /// Address to add
        #[arg(short = 'a', long, required = true)]
        dequeuer: String,
    },

    /// Adds an address to the deny list registry
    AddToDenyList {
        #[arg(short = 'a', required = true)]
        address: String,
    },

    /// Removes an address from the deny list registry
    RemoveFromDenyList {
        #[arg(short = 'a', required = true)]
        address: String,
    },

    /// Displays all addresses in the deny list registry
    ViewDenyList,

    /// Sets the admin of the system
    SetAdmin {
        #[arg(short = 'a', required = true)]
        admin: String,
    },

    /// Sets the deny list authority of the system
    SetDenyAuthority {
        #[arg(short = 'a', required = true)]
        authority: String,
    },

    /// Initializes Mock Transfer Program Accounts
    InitMockProgram,

    /// Mints Mock 2Z token to specified address. If no address specified, defaults to ATA
    MockTokenMint {
        #[arg(short = 't')]
        to_address: Option<String>,

        #[arg(short = 'a', required = true)]
        amount: String,
    },

    /// Mints Mock 2Z token to protocol Treasury Account
    MintToMockProtocolTreasury {
        #[arg(short = 'a', required = true)]
        amount: String,
    },

    /// Airdrop to Mock Vault
    AirdropToMockVault{
        #[arg(short = 'a', required = true)]
        amount: String,
    },

    /// View Fills Registry, which tracks individual fill records and overall aggregate statistics
    ViewFills
}