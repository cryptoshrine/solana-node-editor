import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey } from '@solana/web3.js';
import { IDL } from '../target/types/custom_dao_program';

async function main() {
    // Configure the client
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Get the program by ID
    const programId = new PublicKey("FpSSbLNqGCcEwdBdk34Gs8b722LTAvNGCET6xNr55oLC");
    const program = new Program(IDL, programId, provider);

    // ... rest of the code ...
} 