use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

declare_id!("3dxp2uBMGa4A2WQktjKbYH3emFTkwc4RfJVNW9JfVmV5");

#[program]
pub mod custom_dao_program {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        name: String,
        config: DaoConfig,
    ) -> Result<()> {
        let dao = &mut ctx.accounts.dao;
        dao.authority = ctx.accounts.authority.key();
        dao.community_token = ctx.accounts.community_token.key();
        dao.proposal_count = 0;
        dao.config = config;
        dao.name = name;
        dao.total_supply = ctx.accounts.community_token.supply;
        Ok(())
    }

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        description: String,
    ) -> Result<()> {
        let dao = &mut ctx.accounts.dao;
        let proposal = &mut ctx.accounts.proposal;

        initialize_proposal(proposal, &description, ctx.accounts.proposer.key())?;
        dao.proposal_count = dao.proposal_count.saturating_add(1);
        Ok(())
    }

    pub fn cast_vote(
        ctx: Context<Vote>,
        vote_type: VoteType,
    ) -> Result<()> {
        validate_vote_eligibility(&ctx.accounts.proposal, &ctx.accounts.dao)?;
        process_vote(ctx, vote_type)
    }

    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        validate_execution(&ctx.accounts.proposal, &ctx.accounts.dao)?;
        finalize_proposal(&mut ctx.accounts.proposal)
    }
}

// Helper functions to reduce stack usage
fn validate_config(config: &DaoConfig) -> Result<()> {
    require!(
        config.voting_threshold > 0 && config.voting_threshold <= 100,
        DaoError::InvalidVotingThreshold
    );
    require!(config.max_voting_time > 0, DaoError::InvalidVotingTime);
    require!(config.hold_up_time > 0, DaoError::InvalidHoldUpTime);
    Ok(())
}

fn initialize_proposal(
    proposal: &mut Account<Proposal>,
    description: &str,
    creator: Pubkey,
) -> Result<()> {
    proposal.creator = creator;
    proposal.description = description.to_string();
    proposal.for_votes = 0;
    proposal.against_votes = 0;
    proposal.start_time = Clock::get()?.unix_timestamp;
    proposal.end_time = proposal.start_time + 7 * 24 * 60 * 60; // 1 week default
    proposal.status = ProposalStatus::Active;
    Ok(())
}

fn validate_vote_eligibility(
    proposal: &Account<Proposal>,
    dao: &Account<Dao>,
) -> Result<()> {
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp < proposal.end_time,
        DaoError::VotingEnded
    );
    require!(
        proposal.status == ProposalStatus::Active,
        DaoError::ProposalNotActive
    );
    Ok(())
}

fn process_vote(ctx: Context<Vote>, vote_type: VoteType) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let vote_amount = ctx.accounts.voter_token_account.amount;

    require!(vote_amount > 0, DaoError::InsufficientTokens);

    match vote_type {
        VoteType::For => proposal.for_votes = proposal.for_votes.saturating_add(vote_amount),
        VoteType::Against => proposal.against_votes = proposal.against_votes.saturating_add(vote_amount),
    }

    let vote_record = &mut ctx.accounts.vote_record;
    vote_record.voter = ctx.accounts.voter.key();
    vote_record.proposal = proposal.key();
    vote_record.voted = true;

    update_proposal_status(proposal, ctx.accounts.dao.total_supply, ctx.accounts.dao.config.voting_threshold)?;
    Ok(())
}

fn validate_execution(proposal: &Account<Proposal>, dao: &Account<Dao>) -> Result<()> {
    require!(
        proposal.status == ProposalStatus::Succeeded,
        DaoError::ProposalNotSucceeded
    );

    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= proposal.end_time + dao.config.hold_up_time,
        DaoError::HoldUpTimeNotPassed
    );
    Ok(())
}

fn finalize_proposal(proposal: &mut Account<Proposal>) -> Result<()> {
    proposal.status = ProposalStatus::Executed;
    Ok(())
}

fn update_proposal_status(proposal: &mut Account<Proposal>, total_supply: u64, voting_threshold: u8) -> Result<()> {
    let total_votes = proposal.for_votes.saturating_add(proposal.against_votes);
    let threshold = (total_supply as u128)
        .saturating_mul(voting_threshold as u128)
        .saturating_div(100) as u64;

    if total_votes >= threshold {
        proposal.status = if proposal.for_votes > proposal.against_votes {
            ProposalStatus::Succeeded
        } else {
            ProposalStatus::Defeated
        };
    }
    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct DaoConfig {
    pub voting_threshold: u8,
    pub max_voting_time: i64,
    pub hold_up_time: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum ProposalStatus {
    Active,
    Succeeded,
    Defeated,
    Executed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum VoteType {
    For,
    Against,
}

#[account]
pub struct Dao {
    pub authority: Pubkey,
    pub community_token: Pubkey,
    pub proposal_count: u64,
    pub config: DaoConfig,
    pub name: String,
    pub total_supply: u64,
}

#[account]
pub struct Proposal {
    pub creator: Pubkey,
    pub description: String,
    pub for_votes: u64,
    pub against_votes: u64,
    pub start_time: i64,
    pub end_time: i64,
    pub status: ProposalStatus,
}

#[account]
#[derive(Default)]
pub struct VoteRecord {
    pub voter: Pubkey,
    pub proposal: Pubkey,
    pub voted: bool,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 32 + 8 + 1 + 8 + 8 + 4 + 32 + 8)]
    pub dao: Account<'info, Dao>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub community_token: Account<'info, token::Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub dao: Account<'info, Dao>,
    #[account(init, payer = proposer, space = 8 + 32 + 4 + 64 + 8 + 8 + 8 + 8 + 1)]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub proposer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub dao: Account<'info, Dao>,
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub voter: Signer<'info>,
    #[account(
        init,
        payer = voter,
        space = 8 + 32 + 32 + 1,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    #[account(
        constraint = voter_token_account.mint == dao.community_token,
        constraint = voter_token_account.owner == voter.key()
    )]
    pub voter_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub dao: Account<'info, Dao>,
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    pub executor: Signer<'info>,
}

#[error_code]
pub enum DaoError {
    #[msg("Voting threshold must be between 1 and 100")]
    InvalidVotingThreshold,
    #[msg("Max voting time must be positive")]
    InvalidVotingTime,
    #[msg("Hold up time must be positive")]
    InvalidHoldUpTime,
    #[msg("Voting period has ended")]
    VotingEnded,
    #[msg("Insufficient tokens to vote")]
    InsufficientTokens,
    #[msg("Already voted on this proposal")]
    AlreadyVoted,
    #[msg("Proposal is not active")]
    ProposalNotActive,
    #[msg("Proposal has not succeeded")]
    ProposalNotSucceeded,
    #[msg("Hold up time has not passed")]
    HoldUpTimeNotPassed,
}
