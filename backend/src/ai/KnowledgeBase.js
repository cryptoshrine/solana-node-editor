export default class KnowledgeBase {
  constructor() {
    this.context = {
      solanaVersion: '1.16.1',
      anchorVersion: '0.28.0',
      commonErrors: this.getCommonErrors(),
      nodeRequirements: this.getNodeRequirements(),
      securityPractices: this.getSecurityPractices()
    };
  }

  getSystemContext() {
    return `Solana Knowledge Base:
      - Network: ${process.env.SOLANA_NETWORK || 'devnet'}
      - RPC: ${process.env.RPC_URL || 'local validator'}
      ${JSON.stringify(this.context, null, 2)}`;
  }

  getErrorResolutionContext() {
    return `Error Resolution Context:
      ${JSON.stringify({
        commonErrors: this.context.commonErrors,
        securityPractices: this.context.securityPractices
      }, null, 2)}`;
  }

  getCommonErrors() {
    return {
      accountNotFound: 'Required account missing from transaction',
      invalidProgramId: 'Incorrect program ID for invoked instruction',
      rentExempt: 'Account not funded with minimum SOL for rent exemption',
      signatureVerification: 'Missing required signer',
      pdaDerivation: 'Incorrect PDA seeds or program ID'
    };
  }

  getNodeRequirements() {
    return {
      accountNode: {
        requiredParams: ['balance'],
        checks: ['balance >= 0.05 SOL for rent exemption']
      },
      tokenNode: {
        requiredParams: ['name', 'symbol', 'decimals'],
        validations: ['0 <= decimals <= 9']
      }
    };
  }

  getSecurityPractices() {
    return {
      walletHandling: 'Never store private keys in plaintext',
      transactionSigning: 'Validate all transaction instructions before signing',
      pdaSeeds: 'Use unique seeds for PDA derivation',
      errorHandling: 'Implement proper error mapping for custom programs'
    };
  }
}
