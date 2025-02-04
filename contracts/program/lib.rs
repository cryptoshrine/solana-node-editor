use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod solana_node_program {
    use super::*;

    // Create System Account
    pub fn create_account(ctx: Context<CreateAccount>, lamports: u64) -> Result<()> {
        let account = &mut ctx.accounts.new_account;
        **account.try_borrow_mut_lamports()? = lamports;
        Ok(())
    }

    // Transfer SOL between accounts
    pub fn transfer_sol(ctx: Context<TransferSol>, amount: u64) -> Result<()> {
        let from = &mut ctx.accounts.from;
        let to = &mut ctx.accounts.to;
        **from.try_borrow_mut_lamports()? -= amount;
        **to.try_borrow_mut_lamports()? += amount;
        Ok(())
    }

    // Create SPL Token
    pub fn create_token(ctx: Context<CreateToken>, decimals: u8) -> Result<()> {
        let mint = &mut ctx.accounts.mint;
        mint.decimals = decimals;
        Ok(())
    }

    // Mint NFT with Metadata
    pub fn mint_nft(ctx: Context<MintNFT>, metadata_uri: String) -> Result<()> {
        let metadata = &mut ctx.accounts.metadata;
        metadata.uri = metadata_uri;
        metadata.is_mutable = true;
        Ok(())
    }

    // Create DAO with Governance
    pub fn create_dao(ctx: Context<CreateDAO>, threshold: u64) -> Result<()> {
        let dao = &mut ctx.accounts.dao;
        dao.threshold = threshold;
        Ok(())
    }
}

// Account Contexts
#[derive(Accounts)]
pub struct CreateAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init, payer = payer, space = 8 + 8)]
    pub new_account: Account<'info, SystemAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferSol<'info> {
    #[account(mut)]
    pub from: Account<'info, SystemAccount>,
    #[account(mut)]
    pub to: Account<'info, SystemAccount>,
}

#[derive(Accounts)]
pub struct CreateToken<'info> {
    #[account(init, payer = payer, mint::decimals = 0, mint::authority = payer)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(init, payer = payer, associated_token::mint = mint, associated_token::authority = payer)]
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub metadata: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateDAO<'info> {
    #[account(init, payer = payer, space = 8 + 8 + 32)]
    pub dao: Account<'info, DAO>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Data Structures
#[account]
pub struct DAO {
    pub threshold: u64,
    pub council_mint: Pubkey,
}
