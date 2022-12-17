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

  // Constant Fields
  const THRESHOLD = new BN(2);
  const DEPOSIT_AMOUNT = new BN(anchor.web3.LAMPORTS_PER_SOL);

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

  const deposit = async () => {
    [pdaEscrow] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("escrow"), wallet.publicKey.toBuffer()],
      program.programId
    );

    // Creating deposit instruction
    let deposit = await program.methods
      .deposit(DEPOSIT_AMOUNT)
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

  const withdraw = async (amount) => {
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

    await deposit();

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
    [pdaGlobalAccount] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("global")],
      program.programId
    );

    [pdaEscrow] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("escrow"), wallet.publicKey.toBuffer()],
      program.programId
    );

    // Creating withdraw instruction and withdraw the deposited amount
    await withdraw(DEPOSIT_AMOUNT);

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
      await withdraw(DEPOSIT_AMOUNT)
    } catch (e) {
      let errorCode = e.error.errorCode.code;
      assert.equal(errorCode, "InsufficientFunds");
    }
  });
});
