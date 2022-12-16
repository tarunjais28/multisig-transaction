# multisig-transaction
Solana Multi-signature transaction

Contract to perform following operations:-
1. Any wallet can send test sol to contract.
2. Only a multisig 2/3 wallet can call to release sol back to the original user. (The call can specify the amount to send, so it doesn't need to be stored in the contract)
