import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { Commitment, ComputeBudgetProgram, Connection, PublicKey, Transaction } from "@solana/web3.js";
import Solflare from "@solflare-wallet/sdk";
import DLMM, { BinLiquidity, LbPosition } from "@meteora-ag/dlmm";

import * as css from "./theme.css";

const wallet = new Solflare();

wallet.on('connect', () => {
  alert(wallet.publicKey!.toString());
});
wallet.on('disconnect', () => {
  console.log('disconnected');
});

const App = () => {
  const connection = useMemo(() => new Connection("https://rpc.hellomoon.io/aef55734-29d9-4df6-847c-f5cdc8387b60"), []);
  const [pool, setPool] = useState<DLMM | null>(null);
  const [activeBin, setActiveBin] = useState<BinLiquidity | null>(null);
  const [positions, setPositions] = useState<LbPosition[] | null>(null);
  const [poolId, setPoolId] = useState(localStorage.getItem("poolId") ?? "");

  const onClick = async () => {
    const pool = await DLMM.create(connection, new PublicKey(poolId));
    const { activeBin, userPositions } = await pool.getPositionsByUserAndLbPair(wallet.publicKey!);

    setPool(pool);
    setActiveBin(activeBin);
    setPositions(userPositions);
  };

  const onClaimRewards = async () => {
    const commitment: Commitment = "confirmed";
    const { context: { slot: minContextSlot }, value: { blockhash, lastValidBlockHeight } } =
      await connection.getLatestBlockhashAndContext({ commitment });
    const priorityFee = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 140000 });
    const raws = await pool!.claimAllRewards({ owner: wallet.publicKey!, positions: positions! });
    const txs = raws.map(raw =>
      new Transaction({ blockhash, lastValidBlockHeight, feePayer: wallet.publicKey! })
        .add(priorityFee)
        .add(...raw.instructions));
    await wallet.signAllTransactions(txs);

    for await (const tx of txs) {
      const transactionId = await connection.sendRawTransaction(tx.serialize(), { minContextSlot });
      const status = await connection.confirmTransaction({
        signature: transactionId,
        minContextSlot,
        blockhash,
        lastValidBlockHeight,
      }, commitment);

      if (status.value.err) {
        throw new Error(status.value.err.toString());
      }
    }
  };

  return (
    <div>
      <div>App</div>
      <input placeholder="pool id" value={poolId} onChange={e => {
        localStorage.setItem("poolId", e.target.value);
        setPoolId(e.target.value);
      }} />
      <button onClick={async () => await wallet.connect()}>Connect</button>
      <button onClick={onClick}>Load position</button>
      <button onClick={onClaimRewards}>Claim Rewards</button>
      {positions?.map(x => <Position position={x} key={x.publicKey.toBase58()} />)}
    </div>
  );
};

const Position = ({ position }: { position: LbPosition }) =>
  <div className={css.position}>
    {position.publicKey.toBase58()}
  </div>

const root = createRoot(document.getElementById("root")!);
root.render(
  <App />
);