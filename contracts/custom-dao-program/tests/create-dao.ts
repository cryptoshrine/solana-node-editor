import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey } from '@solana/web3.js';
import { IDL } from '../target/types/custom_dao_program';

async function main() {
    // Configure the client
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Get the program by ID
    const programId = new PublicKey("3dxp2uBMGa4A2WQktjKbYH3emFTkwc4RfJVNW9JfVmV5");
    const program = new Program(IDL, programId, provider);

    // Create the DAO account
    const dao = anchor.web3.Keypair.generate();
    
    // DAO Configuration
    const name = "Test DAO";
    const config = {
        votingThreshold: 51, // 51%
        maxVotingTime: new anchor.BN(7 * 24 * 60 * 60), // 1 week
        holdUpTime: new anchor.BN(24 * 60 * 60), // 1 day
    };

    // Community token mint (from our previous step)
    const communityTokenMint = new PublicKey("FeBLME44axxwFRXGADD6cCKafPzV54TGPKNbELUCg9vv");

    try {
        // Initialize the DAO
        const tx = await program.methods
            .initialize(name, config)
            .accounts({
                dao: dao.publicKey,
                authority: provider.wallet.publicKey,
                communityToken: communityTokenMint,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([dao])
            .rpc();

        console.log("Transaction signature:", tx);
        console.log("DAO address:", dao.publicKey.toString());

        // Fetch and display the DAO account data
        const daoAccount = await program.account.dao.fetch(dao.publicKey);
        console.log("\nDAO Account Data:");
        console.log("Name:", daoAccount.name);
        console.log("Authority:", daoAccount.authority.toString());
        console.log("Community Token:", daoAccount.communityToken.toString());
        console.log("Proposal Count:", daoAccount.proposalCount.toString());
        console.log("Voting Threshold:", daoAccount.config.votingThreshold);
        console.log("Max Voting Time:", daoAccount.config.maxVotingTime.toString());
        console.log("Hold Up Time:", daoAccount.config.holdUpTime.toString());
        console.log("Total Supply:", daoAccount.totalSupply.toString());

    } catch (error) {
        console.error("Error:", error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
    }
}

main().then(
    () => process.exit(0),
    (error) => {
        console.error(error);
        process.exit(1);
    }
); 