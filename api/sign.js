// ========================================
// VERCEL FINAL - SANS TIMEOUT
// ========================================
export default async function handler(req, res) {
  console.log('🔥 === VERCEL TRAITEMENT RÉEL ===');
  
  // Timeout de sécurité pour Vercel
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      console.log('⏱️ Timeout Vercel imminent - Réponse forcée');
      res.status(200).json({
        success: true,
        signature: 'TIMEOUT_CHECK_MANUALLY',
        message: 'Transaction probablement envoyée - Vérifiez manuellement',
        timeout: true
      });
    }
  }, 24000); // 24 secondes (Vercel timeout à 25s)
  
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      clearTimeout(timeoutId);
      return res.status(200).json({});
    }

    const { transaction, privateKey, metadata = {} } = req.body;
    
    console.log('📋 Transaction reçue, length:', transaction ? transaction.length : 0);
    console.log('🤖 Bot:', metadata.bot || 'N8N-Bot');
    console.log('📊 Mode:', metadata.mode || 'PRODUCTION');
    
    if (!transaction || !privateKey) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        success: false,
        error: 'Transaction et privateKey requis'
      });
    }
    
    // ========================================
    // IMPORTS
    // ========================================
    const { Connection, VersionedTransaction, Keypair } = await import('@solana/web3.js');
    const bs58 = await import('bs58');
    
    console.log('🌐 Connexion Solana...');
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    // ========================================
    // KEYPAIR
    // ========================================
    console.log('🔑 Création keypair...');
    const privateKeyBytes = bs58.default.decode(privateKey);
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    const walletAddress = keypair.publicKey.toString();
    
    console.log('🎯 Wallet:', walletAddress);
    
    // ========================================
    // BALANCE CHECK (RAPIDE)
    // ========================================
    const balance = await connection.getBalance(keypair.publicKey);
    const solBalance = balance / 1e9;
    console.log('💰 Balance:', solBalance.toFixed(6), 'SOL');
    
    if (balance < 5000000) {
      clearTimeout(timeoutId);
      throw new Error(`Balance insuffisante: ${solBalance.toFixed(6)} SOL`);
    }
    
    // ========================================
    // DÉCODER ET SIGNER LA TRANSACTION
    // ========================================
    console.log('🔓 Décodage transaction Jupiter v6...');
    
    const transactionBuffer = Buffer.from(transaction, 'base64');
    const versionedTx = VersionedTransaction.deserialize(transactionBuffer);
    console.log('✅ VersionedTransaction désérialisée');
    
    // Signer la transaction
    console.log('✍️ Signature de la transaction...');
    versionedTx.sign([keypair]);
    console.log('✅ Transaction signée');
    
    // ========================================
    // ENVOI SUR BLOCKCHAIN (SANS ATTENDRE)
    // ========================================
    console.log('🚀 Envoi sur blockchain Solana...');
    
    const signature = await connection.sendTransaction(versionedTx, {
      skipPreflight: true,
      preflightCommitment: 'processed',
      maxRetries: 3
    });
    
    console.log('📋 SIGNATURE BLOCKCHAIN:', signature);
    console.log('🔗 Explorer:', `https://solscan.io/tx/${signature}`);
    
    // ========================================
    // ✅ RÉPONDRE IMMÉDIATEMENT
    // ========================================
    clearTimeout(timeoutId);
    
    const response = {
      success: true,
      signature: signature,
      explorerUrl: `https://solscan.io/tx/${signature}`,
      solanafmUrl: `https://solana.fm/tx/${signature}`,
      wallet: walletAddress,
      balance: parseFloat(solBalance.toFixed(6)),
      service: 'VERCEL_JUPITER_V6_FAST',
      network: 'solana-mainnet',
      timestamp: new Date().toISOString(),
      message: '🔥 Transaction envoyée - Confirmation en cours',
      metadata: metadata,
      confirmationStatus: 'PENDING_CHECK_EXPLORER'
    };
    
    console.log('🎉 Réponse envoyée rapidement!');
    return res.status(200).json(response);
    
    // ❌ NE PAS FAIRE CECI (cause du timeout) :
    /*
    console.log('⏳ Attente confirmation...');
    const latestBlockhash = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
    */
    
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('❌ ERREUR:', error.message);
    console.error('🔍 Stack:', error.stack);
    
    if (!res.headersSent) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(500).json({
        success: false,
        error: error.message,
        service: 'VERCEL_JUPITER_V6_FAST',
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Configuration Vercel
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: false,
  },
  maxDuration: 30,
};
