use crate::common::seeds::seed_prefixes_v1::SeedPrefixesV1;

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
            SeedPrefixes::ConfigurationRegistry => SeedPrefixesV1::ConfigurationRegistry,
            SeedPrefixes::ProgramState => SeedPrefixesV1::ProgramState,
            SeedPrefixes::DenyListRegistry => SeedPrefixesV1::DenyListRegistry,
        };
        current_version.as_bytes()
    }
}