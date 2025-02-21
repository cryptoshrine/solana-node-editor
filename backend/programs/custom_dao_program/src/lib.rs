use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

declare_id!("3dxp2uBMGa4A2WQktjKbYH3emFTkwc4RfJVNW9JfVmV5");

#[program]
pub mod custom_dao_program {
    use super::*;

    // Initialize a new DAO
    pub fn initialize(
        ctx: Context<InitializeDao>,
        name: String,
        config: DaoConfig,
    ) -> Result<()> {
        let dao = &mut ctx.accounts.dao;
        dao.authority = ctx.accounts.authority.key();
        dao.name = name;
        dao.community_token = ctx.accounts.community_token.key();
        dao.config = config;
        dao.proposal_count = 0;
        Ok(())
    }

    // Create a new proposal
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        description: String,
    ) -> Result<()> {
        let dao = &ctx.accounts.dao;
        let proposal = &mut ctx.accounts.proposal;
        let clock = Clock::get()?;

        proposal.creator = ctx.accounts.authority.key();
        proposal.description = description;
        proposal.dao = dao.key();
        proposal.for_votes = 0;
        proposal.against_votes = 0;
        proposal.start_time = clock.unix_timestamp;
        proposal.end_time = clock.unix_timestamp + dao.config.max_voting_time;
        proposal.executed = false;
        proposal.status = ProposalStatus::Active;

        Ok(())
    }

    // Cast a vote on a proposal
    pub fn cast_vote(
        ctx: Context<CastVote>,
        in_favor: bool,
        vote_weight: u64,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp < proposal.end_time,
            CustomError::VotingEnded
        );

        require!(
            proposal.status == ProposalStatus::Active,
            CustomError::InvalidProposalStatus
        );

        if in_favor {
            proposal.for_votes = proposal.for_votes.checked_add(vote_weight)
                .ok_or(CustomError::VoteOverflow)?;
        } else {
            proposal.against_votes = proposal.against_votes.checked_add(vote_weight)
                .ok_or(CustomError::VoteOverflow)?;
        }

        Ok(())
    }

    // Execute a passed proposal
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        let dao = &ctx.accounts.dao;
        let proposal = &mut ctx.accounts.proposal;
        let clock = Clock::get()?;

        require!(
            !proposal.executed,
            CustomError::ProposalAlreadyExecuted
        );

        require!(
            clock.unix_timestamp >= proposal.end_time + dao.config.hold_up_time,
            CustomError::HoldUpTimeNotPassed
        );

        let total_votes = proposal.for_votes
            .checked_add(proposal.against_votes)
            .ok_or(CustomError::VoteOverflow)?;

        let threshold = (total_votes as u128)
            .checked_mul(dao.config.voting_threshold as u128)
            .ok_or(CustomError::MathOverflow)?
            .checked_div(100)
            .ok_or(CustomError::MathOverflow)? as u64;

        require!(
            proposal.for_votes >= threshold,
            CustomError::ProposalNotPassed
        );

        proposal.executed = true;
        proposal.status = ProposalStatus::Executed;

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct DaoConfig {
    pub voting_threshold: u8,    // Percentage needed to pass (1-100)
    pub max_voting_time: i64,    // Maximum time to vote in seconds
    pub hold_up_time: i64,       // Time to wait after voting before execution
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum ProposalStatus {
    Active,
    Executed,
    Defeated,
    Expired,
}

#[account]
pub struct Dao {
    pub authority: Pubkey,           // DAO admin
    pub name: String,                // DAO name
    pub community_token: Pubkey,     // Token used for voting
    pub config: DaoConfig,           // DAO configuration
    pub proposal_count: u64,         // Number of proposals created
}

#[account]
pub struct Proposal {
    pub dao: Pubkey,                 // Parent DAO
    pub creator: Pubkey,             // Proposal creator
    pub description: String,         // Proposal description
    pub for_votes: u64,              // Votes in favor
    pub against_votes: u64,          // Votes against
    pub start_time: i64,             // When voting starts
    pub end_time: i64,               // When voting ends
    pub executed: bool,              // Whether executed
    pub status: ProposalStatus,      // Current status
}

#[derive(Accounts)]
pub struct InitializeDao<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 32 + 32 + 8 + 200)]
    pub dao: Account<'info, Dao>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: This is the token mint used for voting
    pub community_token: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub dao: Account<'info, Dao>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 200 + 8 + 8 + 8 + 8 + 1 + 1,
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    pub dao: Account<'info, Dao>,
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub voter: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    pub dao: Account<'info, Dao>,
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub executor: Signer<'info>,
}

#[error_code]
pub enum CustomError {
    #[msg("Voting period has ended")]
    VotingEnded,
    #[msg("Invalid proposal status")]
    InvalidProposalStatus,
    #[msg("Vote calculation overflow")]
    VoteOverflow,
    #[msg("Proposal has already been executed")]
    ProposalAlreadyExecuted,
    #[msg("Hold up time has not passed")]
    HoldUpTimeNotPassed,
    #[msg("Proposal did not pass")]
    ProposalNotPassed,
    #[msg("Math overflow")]
    MathOverflow,
} 