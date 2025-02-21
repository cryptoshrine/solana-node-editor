use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("3dxp2uBMGa4A2WQktjKbYH3emFTkwc4RfJVNW9JfVmV5");

#[program]
pub mod custom_dao {
    use super::*;

    pub fn create_dao(
        ctx: Context<CreateDao>,
        name: String,
        voting_threshold: u8,
        max_voting_time: i64,
        hold_up_time: i64,
    ) -> Result<()> {
        let dao = &mut ctx.accounts.dao;
        dao.authority = ctx.accounts.authority.key();
        dao.name = name;
        dao.community_mint = ctx.accounts.community_mint.key();
        dao.voting_threshold = voting_threshold;
        dao.max_voting_time = max_voting_time;
        dao.hold_up_time = hold_up_time;
        dao.proposal_count = 0;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateDao<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 1 + 8 + 8 + 8 + 200,
        seeds = [b"dao", authority.key().as_ref()],
        bump
    )]
    pub dao: Account<'info, Dao>,
    pub community_mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct Dao {
    pub authority: Pubkey,
    pub name: String,
    pub community_mint: Pubkey,
    pub voting_threshold: u8,
    pub max_voting_time: i64,
    pub hold_up_time: i64,
    pub proposal_count: u64,
}
