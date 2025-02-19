import * as anchor from "@project-serum/anchor";
import { Program, BN } from "@project-serum/anchor";
import { CustomDaoProgram } from "../target/types/custom_dao_program";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("custom-dao-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.CustomDaoProgram as Program<CustomDaoProgram>;
  let mint: anchor.web3.PublicKey;
  let tokenAccount: anchor.web3.PublicKey;
  let dao: anchor.web3.Keypair;
  let proposal: anchor.web3.Keypair;

  const daoName = "Test DAO";
  const votingThreshold = new BN(51); // 51%
  const maxVotingTime = new BN(5); // 5 seconds for testing
  const holdUpTime = new BN(2); // 2 seconds for testing

  it("Initializes the test token", async () => {
    // Create mint
    mint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      provider.wallet.publicKey,
      null,
      6
    );

    // Create token account
    tokenAccount = await createAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      provider.wallet.publicKey
    );

    // Mint some tokens
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      mint,
      tokenAccount,
      (provider.wallet as anchor.Wallet).payer,
      1000000 * Math.pow(10, 6)
    );

    const balance = await getAccount(provider.connection, tokenAccount);
    assert.equal(Number(balance.amount) / Math.pow(10, 6), 1000000);
  });

  it("Initializes the DAO", async () => {
    dao = anchor.web3.Keypair.generate();

    await program.methods
      .initialize(daoName, votingThreshold, maxVotingTime, holdUpTime)
      .accounts({
        dao: dao.publicKey,
        authority: provider.wallet.publicKey,
        communityToken: mint,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([dao])
      .rpc();

    const daoAccount = await program.account.dao.fetch(dao.publicKey);
    assert.equal(daoAccount.name, daoName);
    assert.equal(daoAccount.votingThreshold.toString(), votingThreshold.toString());
    assert.equal(daoAccount.maxVotingTime.toString(), maxVotingTime.toString());
    assert.equal(daoAccount.holdUpTime.toString(), holdUpTime.toString());
    assert.equal(daoAccount.proposalCount.toString(), "0");
  });

  it("Creates a proposal", async () => {
    proposal = anchor.web3.Keypair.generate();
    const description = "Test Proposal";

    await program.methods
      .createProposal(description)
      .accounts({
        dao: dao.publicKey,
        proposal: proposal.publicKey,
        proposer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([proposal])
      .rpc();

    const proposalAccount = await program.account.proposal.fetch(proposal.publicKey);
    assert.equal(proposalAccount.description, description);
    assert.equal(proposalAccount.forVotes.toString(), "0");
    assert.equal(proposalAccount.againstVotes.toString(), "0");
    assert.deepEqual(proposalAccount.status, { active: {} });

    const daoAccount = await program.account.dao.fetch(dao.publicKey);
    assert.equal(daoAccount.proposalCount.toString(), "1");
  });

  it("Casts a vote", async () => {
    const [voteRecord] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("vote"),
        proposal.publicKey.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .castVote({ for: {} })
      .accounts({
        dao: dao.publicKey,
        proposal: proposal.publicKey,
        voter: provider.wallet.publicKey,
        voteRecord,
        voterTokenAccount: tokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const proposalAccount = await program.account.proposal.fetch(proposal.publicKey);
    assert.equal(proposalAccount.forVotes.toString(), "1000000000000");
    assert.equal(proposalAccount.againstVotes.toString(), "0");
  });

  it("Prevents double voting", async () => {
    const [voteRecord] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("vote"),
        proposal.publicKey.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .castVote({ for: {} })
        .accounts({
          dao: dao.publicKey,
          proposal: proposal.publicKey,
          voter: provider.wallet.publicKey,
          voteRecord,
          voterTokenAccount: tokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      assert.fail("Expected error for double voting");
    } catch (error: any) {
      assert.include(error.toString(), "already in use");
    }
  });

  it("Executes a successful proposal after hold-up time", async () => {
    // Wait until just before voting period ends
    await new Promise((resolve) => setTimeout(resolve, (maxVotingTime.toNumber() - 1) * 1000));

    // Cast another vote to trigger status update
    const otherVoter = anchor.web3.Keypair.generate();
    const [voteRecord] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("vote"),
        proposal.publicKey.toBuffer(),
        otherVoter.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Wait for voting period to end
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify proposal status
    let proposalAccount = await program.account.proposal.fetch(proposal.publicKey);
    assert.deepEqual(proposalAccount.status, { succeeded: {} }, "Proposal should be succeeded");

    // Wait for hold-up time
    await new Promise((resolve) => setTimeout(resolve, (holdUpTime.toNumber() + 1) * 1000));

    // Execute proposal
    await program.methods
      .executeProposal()
      .accounts({
        dao: dao.publicKey,
        proposal: proposal.publicKey,
        executor: provider.wallet.publicKey,
      })
      .rpc();

    proposalAccount = await program.account.proposal.fetch(proposal.publicKey);
    assert.deepEqual(proposalAccount.status, { executed: {} }, "Proposal should be executed");
  });
});
