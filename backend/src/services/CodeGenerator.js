import fs from 'fs';
import path from 'path';

const TEMPLATES_PATH = path.join(process.cwd(), 'src/templates');

const TEMPLATES = {
  account: ({ id, data }) => `#[derive(Accounts)]
pub struct ${data.name}<'info> {
    #[account(init, payer = user, space = 8 + 64)]
    pub data_account: Account<'info, ${data.type}>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}`,

  token: ({ id, data }) => `#[program]
mod ${data.name}_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, ${data.params}) -> Result<()> {
        // Initialization logic
        Ok(())
    }
}`,

  nft: ({ id, data }) => `#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    #[account(
        init,
        payer = mint_authority,
        mint::decimals = 0,
        mint::authority = mint_authority,
    )]
    pub mint: Account<'info, Mint>,
    // ... other accounts
}`,

  dao: ({ id, data }) => `pub struct DAOConfig {
    pub vote_threshold: u64,
    pub proposal_duration: i64,
    pub treasury: Pubkey,
}`,

  mint: ({ id, data }) => `pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
    // Minting logic
    Ok(())
}`
};

export default class CodeGenerator {
  generate(nodes) {
    const codeParts = nodes.map(node => {
      const template = TEMPLATES[node.type];
      if (!template) throw new Error(`No template for node type: ${node.type}`);
      
      return template({
        ...node.data,
        id: node.id,
        connections: node.connections
      });
    });

    return {
      rust: codeParts.join('\n\n'),
      typescript: this.generateClientCode(nodes)
    };
  }

  generateClientCode(nodes) {
    return nodes.map(node => 
      `// Client code for ${node.type} node\n` +
      `export const ${node.id} = {\n` +
      `  type: '${node.type}',\n` +
      `  data: ${JSON.stringify(node.data, null, 2).replace(/\n/g, '\n  ')}\n` +
      `};`
    ).join('\n\n');
  }
}