import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import pkg from '@project-serum/anchor';
const { Program, AnchorProvider, BN } = pkg;
import { IDL } from './idl/custom_dao_program.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

const CUSTOM_DAO_PROGRAM_ID = new PublicKey('3dxp2uBMGa4A2WQktjKbYH3emFTkwc4RfJVNW9JfVmV5');

export class CustomDaoClient {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
    this.provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
    this.program = new Program(IDL, CUSTOM_DAO_PROGRAM_ID, this.provider);
  }

  async createDao({ name, communityMint, votingThreshold, maxVotingTime, holdUpTime }) {
    try {
      // Generate a new keypair for the DAO account
      const daoKeypair = Keypair.generate();

      // Convert parameters to appropriate types
      const config = {
        votingThreshold: new BN(votingThreshold),
        maxVotingTime: new BN(maxVotingTime),
        holdUpTime: new BN(holdUpTime),
      };

      // Create the DAO
      const tx = await this.program.methods
        .initialize(name, config)
        .accounts({
          dao: daoKeypair.publicKey,
          authority: this.wallet.publicKey,
          communityToken: new PublicKey(communityMint),
          systemProgram: SystemProgram.programId,
        })
        .signers([daoKeypair])
        .rpc();

      // Fetch the created DAO account
      const daoAccount = await this.program.account.dao.fetch(daoKeypair.publicKey);

      return {
        address: daoKeypair.publicKey.toString(),
        name: daoAccount.name,
        authority: daoAccount.authority.toString(),
        communityToken: daoAccount.communityToken.toString(),
        votingThreshold: daoAccount.config.votingThreshold,
        maxVotingTime: daoAccount.config.maxVotingTime.toString(),
        holdUpTime: daoAccount.config.holdUpTime.toString(),
        proposalCount: daoAccount.proposalCount.toString(),
        totalSupply: daoAccount.totalSupply.toString(),
        txId: tx,
      };
    } catch (error) {
      console.error('DAO Creation Error:', error);
      throw new Error(`Failed to create DAO: ${error.message}`);
    }
  }

  async createProposal(daoAddress, { description }) {
    try {
      const proposalKeypair = Keypair.generate();

      const tx = await this.program.methods
        .createProposal(description)
        .accounts({
          dao: new PublicKey(daoAddress),
          proposal: proposalKeypair.publicKey,
          proposer: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([proposalKeypair])
        .rpc();

      const proposalAccount = await this.program.account.proposal.fetch(proposalKeypair.publicKey);

      return {
        address: proposalKeypair.publicKey.toString(),
        creator: proposalAccount.creator.toString(),
        description: proposalAccount.description,
        forVotes: proposalAccount.forVotes.toString(),
        againstVotes: proposalAccount.againstVotes.toString(),
        startTime: proposalAccount.startTime.toString(),
        endTime: proposalAccount.endTime.toString(),
        status: proposalAccount.status,
        txId: tx,
      };
    } catch (error) {
      console.error('Proposal Creation Error:', error);
      throw new Error(`Failed to create proposal: ${error.message}`);
    }
  }

  async castVote(daoAddress, proposalAddress, { voteType }) {
    try {
      // Derive the vote record PDA
      const [voteRecord] = await PublicKey.findProgramAddress(
        [
          Buffer.from('vote'),
          new PublicKey(proposalAddress).toBuffer(),
          this.wallet.publicKey.toBuffer(),
        ],
        this.program.programId
      );

      // Get the voter's token account
      const dao = await this.program.account.dao.fetch(new PublicKey(daoAddress));
      const voterTokenAccount = await getAssociatedTokenAddress(
        dao.communityToken,
        this.wallet.publicKey
      );

      const tx = await this.program.methods
        .castVote(voteType)
        .accounts({
          dao: new PublicKey(daoAddress),
          proposal: new PublicKey(proposalAddress),
          voter: this.wallet.publicKey,
          voteRecord,
          voterTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const proposalAccount = await this.program.account.proposal.fetch(new PublicKey(proposalAddress));

      return {
        proposalStatus: proposalAccount.status,
        forVotes: proposalAccount.forVotes.toString(),
        againstVotes: proposalAccount.againstVotes.toString(),
        txId: tx,
      };
    } catch (error) {
      console.error('Vote Casting Error:', error);
      throw new Error(`Failed to cast vote: ${error.message}`);
    }
  }

  async executeProposal(daoAddress, proposalAddress) {
    try {
      const tx = await this.program.methods
        .executeProposal()
        .accounts({
          dao: new PublicKey(daoAddress),
          proposal: new PublicKey(proposalAddress),
          executor: this.wallet.publicKey,
        })
        .rpc();

      const proposalAccount = await this.program.account.proposal.fetch(new PublicKey(proposalAddress));

      return {
        status: proposalAccount.status,
        txId: tx,
      };
    } catch (error) {
      console.error('Proposal Execution Error:', error);
      throw new Error(`Failed to execute proposal: ${error.message}`);
    }
  }
} 