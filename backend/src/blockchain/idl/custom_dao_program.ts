export type CustomDaoProgram = {
  "version": "0.1.0",
  "name": "custom_dao_program",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "dao",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "communityToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "config",
          "type": {
            "defined": "DaoConfig"
          }
        }
      ]
    },
    {
      "name": "createProposal",
      "accounts": [
        {
          "name": "dao",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "proposer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "description",
          "type": "string"
        }
      ]
    },
    {
      "name": "castVote",
      "accounts": [
        {
          "name": "dao",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "voter",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "voteRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "voterTokenAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "voteType",
          "type": {
            "defined": "VoteType"
          }
        }
      ]
    },
    {
      "name": "executeProposal",
      "accounts": [
        {
          "name": "dao",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "executor",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "dao",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "communityToken",
            "type": "publicKey"
          },
          {
            "name": "proposalCount",
            "type": "u64"
          },
          {
            "name": "config",
            "type": {
              "defined": "DaoConfig"
            }
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "totalSupply",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "proposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "publicKey"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "forVotes",
            "type": "u64"
          },
          {
            "name": "againstVotes",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": "ProposalStatus"
            }
          }
        ]
      }
    },
    {
      "name": "voteRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voter",
            "type": "publicKey"
          },
          {
            "name": "proposal",
            "type": "publicKey"
          },
          {
            "name": "voted",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "DaoConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "votingThreshold",
            "type": "u8"
          },
          {
            "name": "maxVotingTime",
            "type": "i64"
          },
          {
            "name": "holdUpTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "ProposalStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Succeeded"
          },
          {
            "name": "Defeated"
          },
          {
            "name": "Executed"
          }
        ]
      }
    },
    {
      "name": "VoteType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "For"
          },
          {
            "name": "Against"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidVotingThreshold",
      "msg": "Voting threshold must be between 1 and 100"
    },
    {
      "code": 6001,
      "name": "InvalidVotingTime",
      "msg": "Max voting time must be positive"
    },
    {
      "code": 6002,
      "name": "InvalidHoldUpTime",
      "msg": "Hold up time must be positive"
    },
    {
      "code": 6003,
      "name": "VotingEnded",
      "msg": "Voting period has ended"
    },
    {
      "code": 6004,
      "name": "InsufficientTokens",
      "msg": "Insufficient tokens to vote"
    },
    {
      "code": 6005,
      "name": "AlreadyVoted",
      "msg": "Already voted on this proposal"
    },
    {
      "code": 6006,
      "name": "ProposalNotActive",
      "msg": "Proposal is not active"
    },
    {
      "code": 6007,
      "name": "ProposalNotSucceeded",
      "msg": "Proposal has not succeeded"
    },
    {
      "code": 6008,
      "name": "HoldUpTimeNotPassed",
      "msg": "Hold up time has not passed"
    }
  ]
};

export const IDL: CustomDaoProgram = {
  "version": "0.1.0",
  "name": "custom_dao_program",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "dao",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "communityToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "config",
          "type": {
            "defined": "DaoConfig"
          }
        }
      ]
    },
    {
      "name": "createProposal",
      "accounts": [
        {
          "name": "dao",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "proposer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "description",
          "type": "string"
        }
      ]
    },
    {
      "name": "castVote",
      "accounts": [
        {
          "name": "dao",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "voter",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "voteRecord",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "voterTokenAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "voteType",
          "type": {
            "defined": "VoteType"
          }
        }
      ]
    },
    {
      "name": "executeProposal",
      "accounts": [
        {
          "name": "dao",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "proposal",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "executor",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "dao",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "communityToken",
            "type": "publicKey"
          },
          {
            "name": "proposalCount",
            "type": "u64"
          },
          {
            "name": "config",
            "type": {
              "defined": "DaoConfig"
            }
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "totalSupply",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "proposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "publicKey"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "forVotes",
            "type": "u64"
          },
          {
            "name": "againstVotes",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": "ProposalStatus"
            }
          }
        ]
      }
    },
    {
      "name": "voteRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voter",
            "type": "publicKey"
          },
          {
            "name": "proposal",
            "type": "publicKey"
          },
          {
            "name": "voted",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "DaoConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "votingThreshold",
            "type": "u8"
          },
          {
            "name": "maxVotingTime",
            "type": "i64"
          },
          {
            "name": "holdUpTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "ProposalStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Succeeded"
          },
          {
            "name": "Defeated"
          },
          {
            "name": "Executed"
          }
        ]
      }
    },
    {
      "name": "VoteType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "For"
          },
          {
            "name": "Against"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidVotingThreshold",
      "msg": "Voting threshold must be between 1 and 100"
    },
    {
      "code": 6001,
      "name": "InvalidVotingTime",
      "msg": "Max voting time must be positive"
    },
    {
      "code": 6002,
      "name": "InvalidHoldUpTime",
      "msg": "Hold up time must be positive"
    },
    {
      "code": 6003,
      "name": "VotingEnded",
      "msg": "Voting period has ended"
    },
    {
      "code": 6004,
      "name": "InsufficientTokens",
      "msg": "Insufficient tokens to vote"
    },
    {
      "code": 6005,
      "name": "AlreadyVoted",
      "msg": "Already voted on this proposal"
    },
    {
      "code": 6006,
      "name": "ProposalNotActive",
      "msg": "Proposal is not active"
    },
    {
      "code": 6007,
      "name": "ProposalNotSucceeded",
      "msg": "Proposal has not succeeded"
    },
    {
      "code": 6008,
      "name": "HoldUpTimeNotPassed",
      "msg": "Hold up time has not passed"
    }
  ]
};