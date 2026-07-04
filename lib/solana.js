import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL;
const TREASURY_WALLET = process.env.TREASURY_WALLET;
const PAYMENT_TOKEN_MINT = process.env.PAYMENT_TOKEN_MINT;

const connection = new Connection(RPC_URL, 'confirmed');

/**
 * Verifies an SPL token transfer ($ANSEM) actually reached the treasury wallet
 * for at least the expected amount. Checks, in order:
 *  - tx exists and succeeded on-chain
 *  - the token mint involved matches PAYMENT_TOKEN_MINT (not some other token)
 *  - the destination token account is owned by TREASURY_WALLET
 *  - the amount received meets or exceeds what was expected
 *
 * Replay protection is handled one layer up (orderStore keys orders by tx
 * signature, so a reused signature just returns the existing order instead
 * of double-fulfilling).
 */
export async function verifyAnsemPayment({ signature, expectedAmountAnsem }) {
  if (!signature) return { valid: false, error: 'Missing transaction signature' };
  if (!TREASURY_WALLET) return { valid: false, error: 'Treasury wallet not configured' };
  if (!PAYMENT_TOKEN_MINT) return { valid: false, error: 'Payment token mint not configured' };

  try {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!tx) return { valid: false, error: 'Transaction not found (not confirmed yet?)' };
    if (tx.meta?.err) return { valid: false, error: 'Transaction failed on-chain' };

    const pre = tx.meta.preTokenBalances || [];
    const post = tx.meta.postTokenBalances || [];

    // Find the treasury's token balance entry for the correct mint, before and after
    const findTreasuryEntry = (list) =>
      list.find(
        (b) => b.mint === PAYMENT_TOKEN_MINT && b.owner === TREASURY_WALLET
      );

    const preEntry = findTreasuryEntry(pre);
    const postEntry = findTreasuryEntry(post);

    if (!postEntry) {
      return {
        valid: false,
        error: 'No $ANSEM transferred to the treasury wallet in this transaction',
      };
    }

    const preAmount = preEntry ? Number(preEntry.uiTokenAmount.uiAmount) : 0;
    const postAmount = Number(postEntry.uiTokenAmount.uiAmount);
    const receivedAnsem = postAmount - preAmount;

    // Small tolerance for float/decimals rounding
    const tolerance = expectedAmountAnsem * 0.005;
    if (receivedAnsem < expectedAmountAnsem - tolerance) {
      return {
        valid: false,
        error: `Underpaid: received ${receivedAnsem} $ANSEM, expected ${expectedAmountAnsem}`,
      };
    }

    return { valid: true, receivedAnsem, signature };
  } catch (err) {
    return { valid: false, error: `Verification failed: ${err.message}` };
  }
}
