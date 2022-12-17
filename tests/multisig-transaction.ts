import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { MultisigTransaction } from "../target/types/multisig_transaction";
import { SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { assert } from "chai";
import { BN } from "bn.js";

describe("multisig-transaction", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .MultisigTransaction as Program<MultisigTransaction>;

  // Create test keypairs
  const admin1 = anchor.web3.Keypair.generate();
  const admin2 = anchor.web3.Keypair.generate();
  const admin3 = anchor.web3.Keypair.generate();
  const wallet = anchor.web3.Keypair.generate();
  const unknownWallet = anchor.web3.Keypair.generate();

  // Constant Fields
  const THRESHOLD = new BN(2);
  const DEPOSIT_AMOUNT = new BN(anchor.web3.LAMPORTS_PER_SOL);
  const HALF_DEPOSIT_AMOUNT = new BN(anchor.web3.LAMPORTS_PER_SOL / 2);
  const EXCESS_AMOUNT = new BN(3 * anchor.web3.LAMPORTS_PER_SOL);

  // Declare PDAs
  let pdaGlobalAccount,
    pdaEscrow = null;

  const confirmTransaction = async (tx) => {
    const latestBlockHash = await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: tx,
    });
  };

  const init = async () => {
    [pdaGlobalAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("global")],
      program.programId
    );

    // Creating initialize instruction
    let init = await program.methods
      .initialize(
        [admin1.publicKey, admin2.publicKey, admin3.publicKey],
        THRESHOLD
      )
      .accounts({
        globalState: pdaGlobalAccount,
        authority: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([wallet])
      .rpc();

    await confirmTransaction(init);
  };

  const deposit = async (amount) => {
    [pdaEscrow] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("escrow"), wallet.publicKey.toBuffer()],
      program.programId
    );

    // Creating deposit instruction
    let deposit = await program.methods
      .deposit(amount)
      .accounts({
        escrowAccount: pdaEscrow,
        wallet: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([wallet])
      .rpc();

    await confirmTransaction(deposit);
  };

  const castVote = async (proposals) => {
    [pdaGlobalAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("global")],
      program.programId
    );

    // Creating council instruction
    let vote = await program.methods
      .council(proposals)
      .accounts({
        globalState: pdaGlobalAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([])
      .rpc();

    await confirmTransaction(vote);
  };

  const withdraw = async (amount, wallet) => {
    [pdaGlobalAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("global")],
      program.programId
    );

    // Creating council instruction
    let withdraw = await program.methods
      .withdraw(amount)
      .accounts({
        globalState: pdaGlobalAccount,
        escrowAccount: pdaEscrow,
        wallet: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([wallet])
      .rpc();

    await confirmTransaction(withdraw);
  };

  const reset = async () => {
    [pdaGlobalAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("global")],
      program.programId
    );

    // Creating reset instruction
    let reset = await program.methods
      .resetGlobalState(
        [admin1.publicKey, admin2.publicKey, admin3.publicKey],
        THRESHOLD
      )
      .accounts({
        globalState: pdaGlobalAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([])
      .rpc();

    await confirmTransaction(reset);
  };

  it("Initialize test accounts", async () => {
    // Airdrop sol to the test users
    let admin1Sol = await provider.connection.requestAirdrop(
      admin1.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await confirmTransaction(admin1Sol);

    let admin2Sol = await provider.connection.requestAirdrop(
      admin2.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await confirmTransaction(admin2Sol);

    let admin3Sol = await provider.connection.requestAirdrop(
      admin3.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await confirmTransaction(admin3Sol);

    let walletSol = await provider.connection.requestAirdrop(
      wallet.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await confirmTransaction(walletSol);

    let unknownWalletSol = await provider.connection.requestAirdrop(
      unknownWallet.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await confirmTransaction(unknownWalletSol);
  });

  it("Initialize global state", async () => {
    [pdaGlobalAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("global")],
      program.programId
    );

    await init();

    let globalAccount = await program.account.globalState.fetch(
      pdaGlobalAccount
    );
    assert.equal(Number(globalAccount.threshold), Number(THRESHOLD));
    assert.equal(Number(globalAccount.favourableVotes), 0);
    assert.equal(globalAccount.isVoted, false);
  });

  it("Testing Deposit", async () => {
    [pdaEscrow] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("escrow"), wallet.publicKey.toBuffer()],
      program.programId
    );

    await deposit(DEPOSIT_AMOUNT);

    // Checking Escrow Balance, must be equal to deposited amount
    let escrowBalance = await provider.connection.getBalance(pdaEscrow);
    assert.equal(escrowBalance, Number(DEPOSIT_AMOUNT));
  });

  it("Voting by Some of the council Members", async () => {
    // This call will throw `NotAllVoters` errors as some council members are
    // not participated.
    try {
      let proposals = {
        proposals: [
          { admin: admin1.publicKey, canWithdraw: true },
          { admin: admin2.publicKey, canWithdraw: true },
        ],
      };

      await castVote(proposals);
    } catch (e) {
      let errorCode = e.error.errorCode.code;
      assert.equal(errorCode, "NotAllVoters");
    }
  });

  it("Testing Council Voting", async () => {
    [pdaGlobalAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("global")],
      program.programId
    );

    // Creating proposals
    let proposals = {
      proposals: [
        { admin: admin1.publicKey, canWithdraw: true },
        { admin: admin2.publicKey, canWithdraw: true },
        { admin: admin3.publicKey, canWithdraw: false },
      ],
    };

    await castVote(proposals);

    let globalAccount = await program.account.globalState.fetch(
      pdaGlobalAccount
    );
    assert.equal(Number(globalAccount.favourableVotes), 2);
    assert.equal(globalAccount.isVoted, true);
  });

  it("Voting for Second Time", async () => {
    // This call will throw `VoteAlreadyCasted` errors as votes are already
    // casted by council members
    try {
      let proposals = {
        proposals: [
          { admin: admin1.publicKey, canWithdraw: true },
          { admin: admin2.publicKey, canWithdraw: true },
          { admin: admin3.publicKey, canWithdraw: false },
        ],
      };

      await castVote(proposals);
    } catch (e) {
      let errorCode = e.error.errorCode.code;
      assert.equal(errorCode, "VoteAlreadyCasted");
    }
  });

  it("Testing Withdraw", async () => {
    [pdaEscrow] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("escrow"), wallet.publicKey.toBuffer()],
      program.programId
    );

    // Creating withdraw instruction and withdraw the deposited amount
    await withdraw(DEPOSIT_AMOUNT, wallet);

    // Checking Escrow Balance, must be 0
    let escrowBalance = await provider.connection.getBalance(pdaEscrow);
    assert.equal(escrowBalance, 0);

    // Checking Wallet Balance, must be greater than amount deposited as some
    // are spent on gas fees
    let walletBalance = await provider.connection.getBalance(wallet.publicKey);
    assert.equal(walletBalance > Number(DEPOSIT_AMOUNT), true);
  });

  it("Withdrawing After Full Withdrawal", async () => {
    // This call will throw `InsufficientFunds` errors as escrow account is empty now
    try {
      await withdraw(DEPOSIT_AMOUNT, wallet);
    } catch (e) {
      let errorCode = e.error.errorCode.code;
      assert.equal(errorCode, "InsufficientFunds");
    }
  });

  it("Reset global state", async () => {
    [pdaGlobalAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("global")],
      program.programId
    );

    await reset();

    let globalAccount = await program.account.globalState.fetch(
      pdaGlobalAccount
    );
    assert.equal(Number(globalAccount.threshold), Number(THRESHOLD));
    assert.equal(Number(globalAccount.favourableVotes), 0);
    assert.equal(globalAccount.isVoted, false);
  });

  it("Withdrawing with less favoured transaction", async () => {
    // Depositing
    await deposit(DEPOSIT_AMOUNT);

    // This call will throw `ThresholdNotMet` errors as most council members are
    // against the transaction.
    try {
      let proposals = {
        proposals: [
          { admin: admin1.publicKey, canWithdraw: false },
          { admin: admin2.publicKey, canWithdraw: false },
          { admin: admin3.publicKey, canWithdraw: true },
        ],
      };

      await castVote(proposals);
    } catch (e) {
      let errorCode = e.error.errorCode.code;
      assert.equal(errorCode, "ThresholdNotMet");
    }
  });

  it("Voting by some of the non-council members", async () => {
    // Reseting
    await reset();

    // This call will throw `NotAllVoters` errors as some council members are
    // not participated.
    try {
      let proposals = {
        proposals: [
          { admin: admin1.publicKey, canWithdraw: true },
          { admin: admin2.publicKey, canWithdraw: true },
          { admin: unknownWallet.publicKey, canWithdraw: true },
        ],
      };

      await castVote(proposals);
    } catch (e) {
      let errorCode = e.error.errorCode.code;
      assert.equal(errorCode, "NotAllVoters");
    }
  });

  it("Voting by both of the non-council members and council members", async () => {
    // This call will throw `OutsiderVote` errors as both council and
    // non-council members are participated.
    try {
      let proposals = {
        proposals: [
          { admin: admin1.publicKey, canWithdraw: true },
          { admin: admin2.publicKey, canWithdraw: true },
          { admin: admin3.publicKey, canWithdraw: true },
          { admin: unknownWallet.publicKey, canWithdraw: true },
        ],
      };

      await castVote(proposals);
    } catch (e) {
      let errorCode = e.error.errorCode.code;
      assert.equal(errorCode, "OutsiderVote");
    }
  });

  it("Withdrawing by unknown wallet", async () => {
    // Creating proposal
    let proposals = {
      proposals: [
        { admin: admin1.publicKey, canWithdraw: false },
        { admin: admin2.publicKey, canWithdraw: true },
        { admin: admin3.publicKey, canWithdraw: true },
      ],
    };

    await castVote(proposals);

    // Withdraw by unknown wallet
    try {
      await withdraw(DEPOSIT_AMOUNT, unknownWallet);
    } catch (e) {
      let errorMessage = e.error.errorMessage;
      assert.equal(errorMessage, "A seeds constraint was violated");
    }
  });

  it("Partial Withdraw", async () => {
    [pdaEscrow] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("escrow"), wallet.publicKey.toBuffer()],
      program.programId
    );

    // Creating withdraw instruction and withdraw half deposited amount
    await withdraw(HALF_DEPOSIT_AMOUNT, wallet);

    // Checking Escrow Balance, must be halfed
    let escrowBalance = await provider.connection.getBalance(pdaEscrow);
    assert.equal(escrowBalance, Number(HALF_DEPOSIT_AMOUNT));

    // Creating withdraw instruction and withdraw other half deposited amount
    await withdraw(HALF_DEPOSIT_AMOUNT, wallet);

    // Checking Escrow Balance, must be 0
    escrowBalance = await provider.connection.getBalance(pdaEscrow);
    assert.equal(escrowBalance, 0);
  });
  it("Deposit by excess amount", async () => {
    // Reseting
    await reset();

    // This call will throw `InsufficientFunds` as wallet don't  balance is
    // lesser than deposited amount.
    try {
      await deposit(EXCESS_AMOUNT);
    } catch (e) {
      let errorCode = e.error.errorCode.code;
      assert.equal(errorCode, "InsufficientFunds");
    }
  });
});
