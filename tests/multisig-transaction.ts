import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { MultisigTransaction } from "../target/types/multisig_transaction";

describe("multisig-transaction", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.MultisigTransaction as Program<MultisigTransaction>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
