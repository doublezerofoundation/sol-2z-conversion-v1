// Current versions of all seed prefixes
// This file contains the active versions being used in production

#[derive(Debug, Clone, Copy)]
pub enum SeedPrefixVersions {
    ConfigurationRegistry,
    ProgramState,
    DenyListRegistry,
}

impl SeedPrefixVersions {
    pub fn as_bytes(&self) -> &'static [u8] {
        match self {
            SeedPrefixVersions::ConfigurationRegistry => b"system_config_v1",
            SeedPrefixVersions::ProgramState => b"state_v1",
            SeedPrefixVersions::DenyListRegistry => b"deny_list_v1",
        }
    }

    // Note: will be implemented during migration ticket
    // pub fn version(&self) -> &'static str {
    //     match self {
    //         SeedPrefixVersions::SOLVault => "v1",
    //         SeedPrefixVersions::ProtocolTreasury => "v1",
    //         SeedPrefixVersions::ConfigurationRegistry => "v1",
    //         SeedPrefixVersions::ProgramState => "v1",
    //         SeedPrefixVersions::DenyListRegistry => "v1",
    //     }
    // }
}
