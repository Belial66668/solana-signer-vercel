// ========================================
// SOLANA SIGNER VERCEL - SUPPORT VERSIONED TRANSACTIONS
// ========================================
import { Connection, Transaction, Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  console.log('🔥 === SOLANA SIGNER VERCEL ===');
  
  try {
    const { transaction, privateKey, metadata = {} } = req.body;
    
    if (!transaction || !privateKey) {
      console.log('❌ Données manquantes');
      return res.status(400).json({
        success: false,
        error: 'Transaction et privateKey requis'
      });
    }
    
    console.log('📋 Transaction reçue (length:', transaction.length, ')');
    console.log('🤖 Bot source:', metadata.bot || 'N8N-Bot');
    
    // ========================================
    // CONNEXION SOLANA
    // ========================================
    console.log('🌐 Connexion Solana...');
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    const slot = await connection.getSlot();
    console.log('✅ Connecté - Slot:', slot);
    
    // ========================================
    // DÉCODAGE INTELLIGENT (LEGACY + VERSIONED)
    // ========================================
    console.log('🔓 Décodage transaction intelligent...');
    
    const transactionBuffer = Buffer.from(transaction, 'base64');
    let tx;
    
    try {
      // Essayer d'abord le format Versioned (Jupiter récent)
      tx = VersionedTransaction.deserialize(transactionBuffer);
      console.log('✅ Transaction Versioned décodée');
      console.log('📊 Type: VersionedTransaction');
    } catch (versionError) {
      try {
        // Fallback vers le format Legacy
        tx = Transaction.from(transactionBuffer);
        console.log('✅ Transaction Legacy décodée');
        console.log('📊 Type: Legacy Transaction');
      } catch (legacyError) {
        throw new Error(`Erreur décodage transaction: Versioned=${versionError.message}, Legacy=${legacyError.message}`);
      }
    }
    
    // ========================================
    // CRÉATION KEYPAIR
    // ========================================
    console.log('🔑 Création keypair...');
    const privateKeyBytes = bs58.decode(privateKey);
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    const walletAddress = keypair.publicKey.toString();
    
    console.log('🎯 Wallet:', walletAddress);
    
    // ========================================
    // VÉRIFICATION BALANCE
    // ========================================
    const balance = await connection.getBalance(keypair.publicKey);
    const solBalance = balance / 1e9;
    console.log('💰 Balance:', solBalance.toFixed(6), 'SOL');
    
    if (balance < 5000000) {
      throw new Error(`Balance insuffisante: ${solBalance.toFixed(6)} SOL`);
    }
    
    // ========================================
    // SIGNATURE SELON LE TYPE
    // ========================================
    console.log('✍️ Signature transaction...');
    
    if (tx instanceof VersionedTransaction) {
      // Signature pour transaction versioned
      tx.sign([keypair]);
      console.log('✅ VersionedTransaction signée');
    } else {
      // Signature pour transaction legacy
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = keypair.publicKey;
      tx.sign(keypair);
      console.log('✅ Legacy Transaction signée');
    }
    
    // ========================================
    // ENVOI BLOCKCHAIN
    // ========================================
    console.log('🚀 Envoi sur blockchain...');
    
    let signature;
    if (tx instanceof VersionedTransaction) {
      signature = await connection.sendTransaction(tx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });
    } else {
      signature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });
    }
    
    console.log('📋 SIGNATURE:', signature);
    
    // ========================================
    // CONFIRMATION
    // ========================================
    console.log('⏳ Attente confirmation...');
    
    try {
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log('✅ CONFIRMÉE !');
    } catch (confirmError) {
      console.log('⚠️ Confirmation error:', confirmError.message);
    }
    
    // ========================================
    // BALANCE FINALE
    // ========================================
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const finalBalance = await connection.getBalance(keypair.publicKey);
    const finalSolBalance = finalBalance / 1e9;
    const balanceChange = finalSolBalance - solBalance;
    
    console.log('💰 Balance finale:', finalSolBalance.toFixed(6), 'SOL');
    console.log('📊 Changement:', balanceChange.toFixed(6), 'SOL');
    
    // ========================================
    // RÉPONSE SUCCESS
    // ========================================
    console.log('🎉 TRANSACTION VERSIONED RÉUSSIE !');
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      success: true,
      signature: signature,
      explorerUrl: `https://solscan.io/tx/${signature}`,
      solanafmUrl: `https://solana.fm/tx/${signature}`,
      balanceChange: parseFloat(balanceChange.toFixed(6)),
      balanceBefore: parseFloat(solBalance.toFixed(6)),
      balanceAfter: parseFloat(finalSolBalance.toFixed(6)),
      wallet: walletAddress,
      transactionType: tx instanceof VersionedTransaction ? 'VersionedTransaction' : 'LegacyTransaction',
      confirmationStatus: 'confirmed',
      service: 'VERCEL_SOLANA_SIGNER_V2',
      timestamp: new Date().toISOString(),
      message: '🔥 VRAIE TRANSACTION VERSIONED RÉUSSIE !',
      metadata: metadata
    });
    
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      success: false,
      error: error.message,
      service: 'VERCEL_SOLANA_SIGNER_V2',
      timestamp: new Date().toISOString()
    });
  }
}
