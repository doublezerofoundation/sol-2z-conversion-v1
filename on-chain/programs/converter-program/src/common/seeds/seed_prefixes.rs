use crate::common::seeds::seed_prefixes_v2::SeedPrefixesV2;

#[derive(Debug, Clone, Copy)]
pub enum SeedPrefixes {
    ConfigurationRegistry,
    ProgramState,
    DenyListRegistry,
}

impl SeedPrefixes {
    pub fn as_bytes(&self) -> &'static [u8] {
        // Use current versions by default
        let current_version = match self {
            SeedPrefixes::ConfigurationRegistry => SeedPrefixesV2::ConfigurationRegistry,
            SeedPrefixes::ProgramState => SeedPrefixesV2::ProgramState,
            SeedPrefixes::DenyListRegistry => SeedPrefixesV2::DenyListRegistry,
        };
        current_version.as_bytes()
    }
}