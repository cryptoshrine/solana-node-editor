import { execSync } from 'child_process';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@project-serum/anchor';
import { IDL } from '../target/types/custom_dao_program.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const PROGRAM_ID = new PublicKey('8gQrxcan9ehYJEaw8tG1dZYJNwoNoh6QxQ9MzmWESR11');
const LOCALNET_URL = 'http://localhost:8899';

async function deploy() {
    console.log('Starting DAO program deployment...');

    try {
        // 1. Build the program
        console.log('Building Anchor program...');
        execSync('anchor build', { stdio: 'inherit' });

        // 2. Get or create program keypair
        const programKeypairPath = path.join(
            'target',
            'deploy',
            'custom_dao_program-keypair.json'
        );

        if (!fs.existsSync(programKeypairPath)) {
            console.error('Program keypair not found. Please run "anchor keys generate" first.');
            process.exit(1);
        }

        // 3. Setup connection and wallet
        const connection = new Connection(LOCALNET_URL, 'confirmed');
        const walletKeypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
        const walletKeypair = Keypair.fromSecretKey(
            Buffer.from(JSON.parse(fs.readFileSync(walletKeypairPath, 'utf-8')))
        );
        
        const wallet = new Wallet(walletKeypair);
        const provider = new AnchorProvider(connection, wallet, {
            commitment: 'confirmed',
            preflightCommitment: 'confirmed',
        });

        console.log('Using wallet:', wallet.publicKey.toString());

        // 4. Deploy program
        console.log('Deploying program...');
        const programPath = path.join(
            'target',
            'deploy',
            'custom_dao_program.so'
        );

        const programBinary = fs.readFileSync(programPath);
        
        execSync(
            `solana program deploy --program-id ${programKeypairPath} ${programPath}`,
            { stdio: 'inherit' }
        );

        // 5. Verify deployment
        console.log('Verifying deployment...');
        const deployedProgram = await connection.getAccountInfo(PROGRAM_ID);
        
        if (!deployedProgram) {
            throw new Error('Program not found on chain');
        }

        if (!deployedProgram.executable) {
            throw new Error('Deployed program is not executable');
        }

        // 6. Initialize program client
        const program = new Program(IDL, PROGRAM_ID, provider);
        
        console.log('Program deployed successfully!');
        console.log('Program ID:', PROGRAM_ID.toString());
        console.log('Deployment verified and program is executable');

        return {
            success: true,
            programId: PROGRAM_ID.toString(),
            deployedBy: wallet.publicKey.toString()
        };

    } catch (error) {
        console.error('Deployment failed:', error);
        console.error('Stack trace:', error.stack);
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
}

// Add helper for checking program status
async function checkProgramStatus(connection, programId) {
    try {
        const programInfo = await connection.getAccountInfo(programId);
        return {
            exists: programInfo !== null,
            executable: programInfo?.executable || false,
            owner: programInfo?.owner?.toString(),
            dataSize: programInfo?.data.length
        };
    } catch (error) {
        console.error('Error checking program status:', error);
        return {
            exists: false,
            error: error.message
        };
    }
}

// Run deployment
deploy()
    .then((result) => {
        if (result.success) {
            console.log('Deployment completed successfully');
            process.exit(0);
        } else {
            console.error('Deployment failed:', result.error);
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('Deployment script error:', error);
        process.exit(1);
    }); 